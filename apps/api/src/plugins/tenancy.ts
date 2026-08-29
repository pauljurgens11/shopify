/**
 * Tenant resolution (SPEC §6). Decorates every request with `shopId` and a
 * tenant-scoped Prisma client, so route handlers cannot forget to scope.
 *
 * Three entry paths resolve a shop:
 *   /admin/api/*      → staff session cookie
 *   /storefront/api/* → Host header (shopSlug.lvh.me)
 *   /api/*            → Bearer Admin API token
 *
 * Everything else (`/auth/*`, `/health`, `/vault/*`) resolves nothing. Reading
 * `request.db` on those paths throws, which is the point: an unscoped route is
 * a bug that should be loud in development, not silent in production.
 *
 * Owner: WS-A. Other workstreams consume `request.db`; they do not edit this.
 */

import { createHash } from 'node:crypto';
import type { StaffRole } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import type { Permissions } from '@merchant/contracts/auth';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { clearCustomDomainCache, shopForCustomDomain } from '../lib/custom-domains.ts';
import { notFound, unauthorized } from '../lib/errors.ts';
import { shopSlugFromHost } from '../lib/host.ts';
import { getSession, sessionIdFromRequest, setSessionCookie } from '../lib/sessions.ts';
import { ttlCache } from '../lib/ttl-cache.ts';

/** How the shop on this request was proved. Drives CSRF and requirePermission. */
export type AuthKind = 'session' | 'host' | 'bearer';

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved tenant. Throws rather than returning undefined — see requireShop(). */
    shopId?: string;
    shopSlug?: string;
    staffUserId?: string;
    staffRole?: StaffRole;
    staffPermissions?: Permissions;
    /** Bearer requests only: the installed app and the scopes it was granted. */
    appId?: string;
    appScopes?: string[];
    /** Present on session requests; logout needs it. */
    sessionId?: string;
    authKind?: AuthKind;
    /** Tenant-scoped Prisma client. ALWAYS use this, never dbAdmin (SPEC §6). */
    db: TenantClient;
  }
}

/**
 * Slug → shop for the storefront, which is the only path where the lookup is
 * per-page-view rather than per-API-call. Short TTL so a renamed or deleted
 * shop stops resolving quickly.
 *
 * Admin API tokens are deliberately NOT cached: uninstalling an app has to cut
 * it off on the next request, and Bearer traffic is nowhere near hot enough to
 * pay for a revocation window.
 */
const shopBySlug = ttlCache<{ id: string; slug: string }>(30_000);

/** Exported so A2's suite and A4's settings pages can invalidate after a write. */
export function clearTenantCaches(): void {
  shopBySlug.clear();
  clearCustomDomainCache();
}

function pathOf(request: FastifyRequest): string {
  // request.url includes the query string; the prefix match must not.
  const url = request.url;
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/**
 * Attach a staff session to the request, or 401. Exported because `/auth/me`
 * and `/auth/logout` live outside the `/admin/api/*` prefix but still need the
 * session — they are how you get one.
 */
export async function resolveFromSession(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const sessionId = sessionIdFromRequest(request);
  if (!sessionId) throw unauthorized('Sign in to continue.');

  const session = await getSession(sessionId);
  if (!session) throw unauthorized('Your session has expired. Sign in again.');

  // getSession slid the Redis TTL; re-issuing the cookie slides the browser's
  // copy with it, so an active user is not signed out 7 days after login.
  setSessionCookie(reply, sessionId);

  request.sessionId = sessionId;
  request.shopId = session.shopId;
  request.staffUserId = session.staffUserId;
  request.staffRole = session.role;
  request.staffPermissions = session.permissions;
  request.authKind = 'session';
}

async function resolveFromHost(request: FastifyRequest): Promise<void> {
  const slug = shopSlugFromHost(request.headers.host, env().STOREFRONT_BASE_DOMAIN);

  // A host outside `{slug}.{base}` can still be a merchant's own domain (A5,
  // SPEC §17) — the CustomDomain table decides. Hosts *under* the base domain
  // never take this path: they are slug-or-nothing.
  if (!slug) {
    const shop = await shopForCustomDomain(request.headers.host);
    if (!shop) throw notFound('Store');
    request.shopId = shop.id;
    request.shopSlug = shop.slug;
    request.authKind = 'host';
    return;
  }

  let shop = shopBySlug.get(slug);
  if (!shop) {
    // Platform-level lookup: which tenant is this? One of the sanctioned
    // unscoped call sites (SPEC §6) — there is no shop to scope to yet.
    // A miss is NOT cached: caching it would keep a storefront 404ing for 30s
    // after the shop is seeded or signed up, which reads as a broken demo.
    shop =
      (await dbAdmin.shop.findUnique({ where: { slug }, select: { id: true, slug: true } })) ??
      undefined;
    if (!shop) throw notFound('Store');
    shopBySlug.set(slug, shop);
  }

  request.shopId = shop.id;
  request.shopSlug = shop.slug;
  request.authKind = 'host';
}

async function resolveFromBearer(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw unauthorized('Missing Admin API access token.');

  // Only the SHA-256 hash is ever stored (SPEC §8), so the lookup is by hash.
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const installed = await dbAdmin.app.findUnique({
    where: { apiTokenHash: tokenHash },
    select: { id: true, shopId: true, uninstalledAt: true, scopes: true },
  });
  if (!installed || installed.uninstalledAt) {
    throw unauthorized('Invalid Admin API access token.');
  }

  request.shopId = installed.shopId;
  request.appId = installed.id;
  // `requirePermission` waves Bearer through; `requireScope` (G4) is what
  // actually authorizes an Admin API call, and it reads these.
  request.appScopes = installed.scopes;
  request.authKind = 'bearer';
}

export default fp(
  async (app) => {
    app.decorateRequest('shopId', undefined);
    app.decorateRequest('shopSlug', undefined);
    app.decorateRequest('staffUserId', undefined);
    app.decorateRequest('staffRole', undefined);
    app.decorateRequest('staffPermissions', undefined);
    app.decorateRequest('sessionId', undefined);
    app.decorateRequest('authKind', undefined);
    app.decorateRequest('appId', undefined);
    app.decorateRequest('appScopes', undefined);

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

    app.addHook('onRequest', async (request, reply) => {
      const path = pathOf(request);

      if (path.startsWith('/admin/api/')) return resolveFromSession(request, reply);
      if (path.startsWith('/storefront/api/')) return resolveFromHost(request);
      if (path.startsWith('/api/')) return resolveFromBearer(request);
      // /auth/*, /health, /vault/* resolve their own shop or none at all.
    });
  },
  { name: 'tenancy' },
);

/** Narrowing helper for route handlers: `const shopId = requireShop(request);` */
export function requireShop(request: { shopId?: string }): string {
  if (!request.shopId) throw unauthorized('No shop context for this request.');
  return request.shopId;
}
