/**
 * Admin API (Bearer) route plumbing — SPEC §8. Owner: WS-G.
 *
 * `/api/*` answers the same contracts as `/admin/api/*`, but a token is not a
 * staff user: `requirePermission` deliberately waves Bearer through, so what
 * authorizes a public Admin API call is the set of scopes the merchant granted
 * the app when they created it.
 *
 *   app.get('/', adminApiRoute('read_products'), handler)
 */
import { type PermissionArea, RATE_LIMITS } from '@merchant/config/constants';
import type {
  FastifyInstance,
  FastifyRequest,
  preHandlerHookHandler,
  RouteShorthandOptions,
} from 'fastify';
import { forbidden, unauthorized } from './errors.ts';

/**
 * The vocabulary of `appScopeSchema` (contracts/apps.ts) as a type. The
 * contract's `z.enum` is built from a runtime array and widens to `string`, so
 * restating the shape here is what turns a typo in a route into a compile
 * error rather than a permanent 403 nobody notices.
 */
export type AppScope = `read_${PermissionArea}` | `write_${PermissionArea}`;

/**
 * Shopify's rule: `write_x` implies `read_x`, so an app allowed to edit
 * products need not also ask permission to look at them. The converse never
 * holds — a read-only token writing is the case this whole module exists for.
 */
function granted(scopes: readonly string[], required: AppScope): boolean {
  if (scopes.includes(required)) return true;
  return required.startsWith('read_') && scopes.includes(`write_${required.slice(5)}`);
}

export function requireScope(scope: AppScope): preHandlerHookHandler {
  return async (request) => {
    // The token itself was already proved (or rejected) by the tenancy plugin.
    // Reaching here without a shop means the route is mounted outside `/api/*`.
    if (!request.shopId) throw unauthorized('Missing Admin API access token.');

    // An app granted nothing has access to nothing: an absent `appScopes` is
    // read as the empty set, never as a wildcard.
    if (!granted(request.appScopes ?? [], scope)) {
      throw forbidden(`This access token is missing the \`${scope}\` scope.`);
    }
  };
}

/**
 * SPEC §8: 40 req/s per token, bursting to 80. `@fastify/rate-limit` counts a
 * fixed window instead of draining a bucket, so the closest honest mapping is
 * the burst allowance over twice the window — 80 requests may land at once and
 * the sustained ceiling is still 40/s.
 *
 * Keyed by app rather than by IP, because the limit is per token: two
 * merchants' integrations behind one NAT must not throttle each other.
 */
const adminApiRateLimit = {
  max: RATE_LIMITS.adminApi.burst,
  timeWindow: RATE_LIMITS.adminApi.windowMs * 2,
  keyGenerator: (request: FastifyRequest) => request.appId ?? request.ip,
};

/** Everything a `/api/*` route needs that its `/admin/api/*` twin does not. */
export function adminApiRoute(scope: AppScope): RouteShorthandOptions {
  return { config: { rateLimit: adminApiRateLimit }, preHandler: requireScope(scope) };
}

/**
 * `App.lastUsedAt` is how a merchant spots a token nothing calls any more, so
 * it is stamped on every successful call. `onResponse` runs after the client
 * already has its answer, and the write is not awaited: failing to record a
 * timestamp must never fail the request that earned it.
 */
export function trackAppUsage(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    if (!request.appId || reply.statusCode >= 400) return;
    // `updateMany`, not `update`: the tenant client composes `shopId` into the
    // where clause, which a unique-only `update` filter will not accept.
    void request.db.app
      .updateMany({ where: { id: request.appId }, data: { lastUsedAt: new Date() } })
      .catch((error: unknown) => request.log.debug({ error }, 'could not stamp App.lastUsedAt'));
  });
}
