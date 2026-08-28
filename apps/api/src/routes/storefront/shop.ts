/**
 * `GET /storefront/api/shop` (SPEC §10). Owner: WS-E.
 * Mounted at /storefront/api by the autoloader.
 *
 * The shop context every storefront page needs before it renders anything:
 * name for the header and title, currency for every price label, and the
 * published theme version so pages can be cache-keyed on it.
 */
import { storefrontShopResponse } from '@merchant/contracts/storefront';
import type { FastifyInstance } from 'fastify';
import { notFound } from '../../lib/errors.ts';
import { cacheable } from '../../services/storefront/cache.ts';

export default async function routes(app: FastifyInstance) {
  app.get('/shop', async (request, reply) => {
    const shop = await request.db.shop.findFirst({
      select: { id: true, name: true, slug: true, currencyCode: true },
    });
    if (!shop) throw notFound('Store');

    const published = await request.db.themeVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: { id: true },
    });
    // A shop with no published theme cannot render a storefront at all; saying
    // so here is clearer than an empty page further down.
    if (!published) throw notFound('Published theme');

    cacheable(reply);
    return storefrontShopResponse.parse({ ...shop, themeVersionId: published.id });
  });
}
