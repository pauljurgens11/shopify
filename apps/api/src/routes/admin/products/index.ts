/**
 * `/admin/api/products` (SPEC §7, §9). Owner: WS-B.
 *
 * Thin by design: every rule lives in `services/catalog/products.ts` so the
 * storefront (E1) and the seed (H1) get the same behaviour without going
 * through HTTP. These handlers validate, resolve the tenant's currency, call
 * the service, and emit the catalog webhook.
 */
import { deletedResponse, idParam } from '@merchant/contracts/common';
import {
  createProductInput,
  listProductsQuery,
  updateProductInput,
  updateVariantInput,
  variantParams,
} from '@merchant/contracts/products';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { notFound } from '../../../lib/errors.ts';
import { requirePermission } from '../../../lib/permissions.ts';
import { emitCatalogEvent } from '../../../services/catalog/events.ts';
import {
  createProduct,
  deleteProduct,
  getProduct,
  getVariant,
  listProducts,
  updateProduct,
  updateVariant,
} from '../../../services/catalog/products.ts';

/**
 * Money DTOs carry the shop's currency, which lives on the Shop row rather than
 * on each price column (SPEC §5). Read through `request.db`, so it can only
 * ever be this tenant's.
 */
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
    const query = listProductsQuery.parse(request.query);
    return listProducts(request.db, await shopCurrency(request), query);
  });

  /* ---------------------------------------------------------------- create */
  app.post('/', async (request, reply) => {
    const input = createProductInput.parse(request.body);
    const currencyCode = await shopCurrency(request);
    const product = await createProduct(request.db, shopIdOf(request), currencyCode, input);

    await emitCatalogEvent(shopIdOf(request), 'products/create', product);
    return reply.status(201).send(product);
  });

  /* ------------------------------------------------------------------- get */
  app.get('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    return getProduct(request.db, await shopCurrency(request), id);
  });

  /* ---------------------------------------------------------------- update */
  app.put('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    const input = updateProductInput.parse(request.body);
    const currencyCode = await shopCurrency(request);
    const product = await updateProduct(request.db, shopIdOf(request), currencyCode, id, input);

    await emitCatalogEvent(shopIdOf(request), 'products/update', product);
    return product;
  });

  /* ---------------------------------------------------------------- delete */
  app.delete('/:id', async (request) => {
    const { id } = idParam.parse(request.params);
    await deleteProduct(request.db, id);

    await emitCatalogEvent(shopIdOf(request), 'products/delete', { id });
    return deletedResponse.parse({ id, deleted: true });
  });

  /* ----------------------------------------------------- one variant, inline */
  app.get('/:id/variants/:variantId', async (request) => {
    const { id, variantId } = variantParams.parse(request.params);
    return getVariant(request.db, await shopCurrency(request), id, variantId);
  });

  app.put('/:id/variants/:variantId', async (request) => {
    const { id, variantId } = variantParams.parse(request.params);
    const input = updateVariantInput.parse(request.body);
    const currencyCode = await shopCurrency(request);
    const variant = await updateVariant(request.db, currencyCode, id, variantId, input);

    // Shopify has no variant-level topic: the product changed, so subscribers
    // get the same products/update payload they get from PUT /products/:id.
    await emitCatalogEvent(
      shopIdOf(request),
      'products/update',
      await getProduct(request.db, currencyCode, id),
    );
    return variant;
  });
}
