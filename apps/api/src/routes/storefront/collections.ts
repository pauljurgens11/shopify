/**
 * `GET /storefront/api/collections/:handle/products` (SPEC §10). Owner: WS-E.
 *
 * Returns the collection alongside its page of products: the collection page
 * needs the title, description and image for its header, and a second round
 * trip for them would sit in the critical path of every collection view.
 */
import {
  listStorefrontProductsQuery,
  storefrontCollectionProductsResponse,
} from '@merchant/contracts/storefront';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cacheable } from '../../services/storefront/cache.ts';
import {
  collectionSortOrder,
  getStorefrontCollection,
} from '../../services/storefront/collections.ts';
import { listStorefrontProducts } from '../../services/storefront/products.ts';
import { shopCurrency } from '../../services/storefront/shop.ts';

const handleParam = z.object({ handle: z.string().min(1).max(255) });
/** `sort` is optional here: unset means "use the collection's own order". */
const collectionQuery = listStorefrontProductsQuery.partial({ sort: true });

export default async function routes(app: FastifyInstance) {
  app.get('/collections/:handle/products', async (request, reply) => {
    const { handle } = handleParam.parse(request.params);
    const query = collectionQuery.parse(request.query);

    const { id, collection } = await getStorefrontCollection(request.db, handle);
    const page = await listStorefrontProducts(request.db, await shopCurrency(request.db), {
      limit: query.limit,
      cursor: query.cursor,
      query: query.query,
      // The merchant's chosen order is the default; an explicit ?sort= wins.
      sort: query.sort ?? (await collectionSortOrder(request.db, id)),
      collectionId: id,
    });

    cacheable(reply);
    return storefrontCollectionProductsResponse.parse({ ...page, collection });
  });
}
