/**
 * Tenant resolution (SPEC §6). Decorates every request with `shopId` and a
 * tenant-scoped Prisma client, so route handlers cannot forget to scope.
 *
 * Three entry paths resolve a shop:
 *   /admin/api/*      → staff session cookie
 *   /storefront/api/* → Host header (shopSlug.lvh.me)
 *   /api/*            → Bearer Admin API token
 *
 * Owner: WS-A. Other workstreams consume `request.db`; they do not edit this.
 */

import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import fp from 'fastify-plugin';
import { unauthorized } from '../lib/errors.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved tenant. Throws rather than returning undefined — see requireShop(). */
    shopId?: string;
    shopSlug?: string;
    staffUserId?: string;
    /** Tenant-scoped Prisma client. ALWAYS use this, never dbAdmin (SPEC §6). */
    db: TenantClient;
  }
}

export default fp(
  async (app) => {
    app.decorateRequest('shopId', undefined);
    app.decorateRequest('shopSlug', undefined);
    app.decorateRequest('staffUserId', undefined);

    // Getter, so `request.db` is impossible to read before a shop is resolved.
    // dbForShop memoizes per shopId, so repeated reads are cheap.
    app.decorateRequest('db', {
      getter(this: { shopId?: string }) {
        if (!this.shopId) {
          throw new Error(
            'request.db read before tenant resolution. Register this route under a scope that resolves a shop.',
          );
        }
        return dbForShop(this.shopId);
      },
    });

    // TODO(WS-A): resolve shopId here per the three paths above.
    // Left unimplemented on purpose — this is the skeleton seam, and auth lands
    // with the session store in the same slice.
    app.addHook('onRequest', async (request) => {
      void request;
    });
  },
  { name: 'tenancy' },
);

/** Narrowing helper for route handlers: `const shopId = requireShop(request);` */
export function requireShop(request: { shopId?: string }): string {
  if (!request.shopId) throw unauthorized('No shop context for this request.');
  return request.shopId;
}
