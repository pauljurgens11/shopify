/**
 * `/admin/api/collections` (SPEC §7, §9). Owner: WS-B.
 *
 * Mounted at /admin/api/collections by the autoloader. The directory is kept
 * index-free on purpose: `@fastify/autoload` treats an `index.ts` as the whole
 * directory and silently skips its siblings, so a second file added here later
 * would 404 with no error (AGENT-LOG, WS-D).
 *
 * Thin by design — every rule lives in `services/catalog/collections.ts`, so
 * E1's storefront collection page and H1's seed get the same membership
 * resolution without going through HTTP.
 *
 * Collections live under Products in the admin nav and share its permission
 * area; there is no `collections` permission (SPEC §8).
 */
import {
  createCollectionInput,
  listCollectionProductsQuery,
  listCollectionsQuery,
  previewCollectionInput,
  updateCollectionInput,
  updateCollectionProductsInput,
} from '@merchant/contracts/collections';
import { deletedResponse, idParam } from '@merchant/contracts/common';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollectionProducts,
  listCollections,
  previewSmartCollection,
  updateCollection,
  updateCollectionProducts,
} from '../../../services/catalog/collections.ts';

/** Money DTOs carry the shop's currency (SPEC §5); it lives on the Shop row. */
async function shopCurrency(request: FastifyRequest): Promise<string> {
  const shop = await request.db.shop.findFirst({ select: { currencyCode: true } });
  if (!shop) throw notFound('Shop');
  return shop.currencyCode;
}

/** `request.shopId` is set by the tenancy plugin before requirePermission passes. */
const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', requirePermission('products'));

  /* ------------------------------------------------------------------ list */
  app.get('/', async (request) => {
    const query = listCollectionsQuery.parse(request.query);
    return listCollections(request.db, query);
  });

  /* ---------------------------------------------------------------- create */
  app.post('/', async (request, reply) => {
    const input = createCollectionInput.parse(request.body);
    const collection = await createCollection(request.db, shopIdOf(request), input);
    return reply.status(201).send(collection);
  });

  /* --------------------------------------------------------------- preview */
  // Declared before `/:id` so "preview" is never read as a collection id.
  // B6's condition builder calls this on every edit; nothing is written.
  app.post('/preview', async (request) => {
    const { ruleSet, limit } = previewCollectionInput.parse(request.body);
    return previewSmartCollection(request.db, await shopCurrency(request), ruleSet, limit);
  });

  /* ------------------------------------------------------------------- get */
  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return getCollection(request.db, id);
  });

  /* ---------------------------------------------------------------- update */
  app.put('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const input = updateCollectionInput.parse(request.body);
    return updateCollection(request.db, shopIdOf(request), id, input);
  });

  /* ---------------------------------------------------------------- delete */
  app.delete('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteCollection(request.db, id);
    return deletedResponse.parse({ id, deleted: true });
  });

  /* -------------------------------------------------------------- members */
  // The resolved product list, either type — manual positions or the smart
  // rule set, with the collection's sort order applied.
  app.get('/:id/products', async (request) => {
    const { id } = idParam.parse(request.params);
    const query = listCollectionProductsQuery.parse(request.query);
    return listCollectionProducts(request.db, await shopCurrency(request), id, query);
  });

  // Manual collections only: add, remove and reorder in one request, because
  // that is what one save of the admin's product picker produces.
  app.post('/:id/products', async (request) => {
    const { id } = idParam.parse(request.params);
    const input = updateCollectionProductsInput.parse(request.body);
    return updateCollectionProducts(request.db, shopIdOf(request), id, input);
  });
}
