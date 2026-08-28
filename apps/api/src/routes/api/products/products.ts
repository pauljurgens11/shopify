/**
 * `GET|POST /api/products`, `GET|PUT /api/products/:id` — the public Admin REST
 * API (SPEC §8). Owner: WS-G.
 *
 * The same contracts, the same B1 services and the same `{data,nextCursor}`
 * page as `/admin/api/products`: an integrator who reads one and calls the
 * other must not be able to tell them apart, which is this workstream's slice
 * of the KPI. Only authorization differs — a token scope instead of a staff
 * permission — plus the per-token rate limit.
 *
 * The subset is deliberate (SPEC §8 asks for a surface, not a mirror): delete
 * and the variant sub-resource stay admin-only for now.
 *
 * Not an `index.ts`: autoload treats one as the whole directory and silently
 * skips its siblings, so a second file added here later would 404 with no
 * error (AGENT-LOG, WS-D).
 */
import { idParam } from '@merchant/contracts/common';
import {
  createProductInput,
  listProductsQuery,
  updateProductInput,
} from '@merchant/contracts/products';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { adminApiRoute, trackAppUsage } from '../../../lib/scopes.ts';
import { emitCatalogEvent } from '../../../services/catalog/events.ts';
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../../../services/catalog/products.ts';
import { shopCurrency } from '../../../services/storefront/shop.ts';

/** The tenancy plugin resolved the token's shop before any scope check ran. */
const shopIdOf = (request: FastifyRequest): string => request.shopId as string;

export default async function routes(app: FastifyInstance) {
  trackAppUsage(app);

  /* ------------------------------------------------------------------ list */
  app.get('/', adminApiRoute('read_products'), async (request) => {
    const query = listProductsQuery.parse(request.query);
    return listProducts(request.db, await shopCurrency(request.db), query);
  });

  /* ---------------------------------------------------------------- create */
  app.post('/', adminApiRoute('write_products'), async (request, reply) => {
    const input = createProductInput.parse(request.body);
    const currencyCode = await shopCurrency(request.db);
    const product = await createProduct(request.db, shopIdOf(request), currencyCode, input);

    // A product created over the API is still a product created: subscribers
    // get the same topic they get when the merchant saves the form.
    await emitCatalogEvent(shopIdOf(request), 'products/create', product);
    return reply.status(201).send(product);
  });

  /* ------------------------------------------------------------------- get */
  app.get('/:id', adminApiRoute('read_products'), async (request) => {
    const { id } = idParam.parse(request.params);
    return getProduct(request.db, await shopCurrency(request.db), id);
  });

  /* ---------------------------------------------------------------- update */
  app.put('/:id', adminApiRoute('write_products'), async (request) => {
    const { id } = idParam.parse(request.params);
    const input = updateProductInput.parse(request.body);
    const currencyCode = await shopCurrency(request.db);
    const product = await updateProduct(request.db, shopIdOf(request), currencyCode, id, input);

    await emitCatalogEvent(shopIdOf(request), 'products/update', product);
    return product;
  });
}
