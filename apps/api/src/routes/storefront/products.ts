/**
 * `GET /storefront/api/products` (SPEC §10). Owner: WS-E.
 *
 * Thin over `services/storefront/products.ts`, which owns the one rule that
 * matters here: only `active` products exist on this surface.
 */
import {
  listStorefrontProductsQuery,
  storefrontProductListResponse,
} from '@merchant/contracts/storefront';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cacheable } from '../../services/storefront/cache.ts';
import { getStorefrontCollection } from '../../services/storefront/collections.ts';
import {
  getStorefrontProduct,
  listStorefrontProducts,
} from '../../services/storefront/products.ts';
import { shopCurrency } from '../../services/storefront/shop.ts';

const handleParam = z.object({ handle: z.string().min(1).max(255) });

export default async function routes(app: FastifyInstance) {
  app.get('/products', async (request, reply) => {
    const query = listStorefrontProductsQuery.parse(request.query);

    // `?collection=` is the search page's filter; the collection page itself
    // uses /collections/:handle/products, which also returns the collection.
    const collectionId = query.collection
      ? (await getStorefrontCollection(request.db, query.collection)).id
      : undefined;

    cacheable(reply);
    return storefrontProductListResponse.parse(
      await listStorefrontProducts(request.db, await shopCurrency(request.db), {
        ...query,
        collectionId,
      }),
    );
  });

  app.get('/products/:handle', async (request, reply) => {
    const { handle } = handleParam.parse(request.params);
    const product = await getStorefrontProduct(request.db, await shopCurrency(request.db), handle);
    cacheable(reply);
    return product;
  });
}
