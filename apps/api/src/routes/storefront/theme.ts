/**
 * `GET /storefront/api/theme` (SPEC §10, §12). Owner: WS-E.
 *
 * Returns the whole published ThemeDoc rather than just its id, so E2 renders a
 * page in one hop. `?preview=<token>` serves an unpublished draft instead —
 * that is how F4's builder shows work in progress on the real storefront. The
 * token comes from `GET /admin/api/themes/preview-token` (WS-F).
 */
import { storefrontThemeResponse } from '@merchant/contracts/storefront';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireShop } from '../../plugins/tenancy.ts';
import { cacheable, privateResponse } from '../../services/storefront/cache.ts';
import { resolveTheme } from '../../services/storefront/theme.ts';

const themeQuery = z.object({ preview: z.string().max(512).optional() });

export default async function routes(app: FastifyInstance) {
  app.get('/theme', async (request, reply) => {
    const { preview } = themeQuery.parse(request.query);
    const resolved = await resolveTheme(request.db, requireShop(request), preview);

    // A preview is one person's unpublished draft; it must never be handed to
    // the next shopper by a shared cache.
    if (resolved.isPreview) privateResponse(reply);
    else cacheable(reply);

    return storefrontThemeResponse.parse(resolved);
  });
}
