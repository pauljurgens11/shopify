/**
 * Route-level authorization (SPEC §8). Owner: WS-A — every admin route in
 * workstreams B/C/D/F/G uses this and should not roll its own.
 *
 *   app.get('/', { preHandler: requirePermission('orders') }, handler)
 *
 * Roles: `owner` and `admin` bypass the map entirely; `staff` is checked
 * against its per-area booleans. The Admin API (Bearer) is not a staff user —
 * it carries scopes instead, enforced separately by G4 — so it passes here.
 */
import type { PermissionArea } from '@merchant/config/constants';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import { forbidden, unauthorized } from './errors.ts';

const ROLES_THAT_BYPASS = new Set(['owner', 'admin']);

export function hasPermission(request: FastifyRequest, area: PermissionArea): boolean {
  if (request.authKind === 'bearer') return true;
  if (!request.staffRole) return false;
  if (ROLES_THAT_BYPASS.has(request.staffRole)) return true;
  return request.staffPermissions?.[area] === true;
}

export function requirePermission(area: PermissionArea): preHandlerHookHandler {
  return async (request) => {
    if (!request.shopId) throw unauthorized('Sign in to continue.');
    if (!hasPermission(request, area)) {
      throw forbidden(`You do not have permission to manage ${area}.`);
    }
  };
}
