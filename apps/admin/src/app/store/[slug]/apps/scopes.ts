/**
 * Access-scope arithmetic for the private-app forms (SPEC §8). Owner: WS-G.
 *
 * The contract stores scopes as a flat `read_orders | write_orders | …` list,
 * but the merchant thinks in areas with two levels, so the grid renders one row
 * per area and this module converts between the two. It is deliberately pure:
 * the create modal and the detail form both need the same invariants, and the
 * write-implies-read rule below is the sort of thing that silently rots when it
 * is retyped inside two `onChange` handlers.
 */
import { PERMISSION_AREAS, type PermissionArea } from '@merchant/config/constants';

/** Mirrors `appScopeSchema` in `contracts/apps.ts`, which widens to `string`. */
export type AppScope = `${ScopeLevel}_${PermissionArea}`;
export type ScopeLevel = 'read' | 'write';

export const SCOPE_AREAS = PERMISSION_AREAS;

/**
 * Merchant-facing names. The raw area keys leak our permission model — `apps`
 * and `builder` in particular read as internals rather than as store surfaces.
 */
const AREA_LABELS: Record<PermissionArea, string> = {
  products: 'Products',
  orders: 'Orders',
  customers: 'Customers',
  discounts: 'Discounts',
  analytics: 'Analytics',
  settings: 'Store settings',
  apps: 'Apps and tokens',
  builder: 'Storefront builder',
};

export function areaLabel(area: PermissionArea): string {
  return AREA_LABELS[area];
}

export function scopeFor(level: ScopeLevel, area: PermissionArea): AppScope {
  return `${level}_${area}`;
}

export function hasScope(scopes: readonly string[], level: ScopeLevel, area: PermissionArea) {
  return scopes.includes(scopeFor(level, area));
}

/**
 * Contract order is `read_products, write_products, read_orders, …`; sorting to
 * it makes two scope lists comparable by string, which is what the detail page's
 * dirty check and the API's own equality both rely on.
 */
export function sortScopes(scopes: readonly string[]): string[] {
  const order = new Map<string, number>();
  for (const area of SCOPE_AREAS) {
    order.set(scopeFor('read', area), order.size);
    order.set(scopeFor('write', area), order.size);
  }
  // Unknown scopes (an area added by a later migration) sort last rather than
  // being dropped — this function must never lose a grant it does not recognise.
  const rank = (scope: string) => order.get(scope) ?? Number.MAX_SAFE_INTEGER;
  return [...new Set(scopes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/**
 * Toggle one checkbox, keeping write ⊃ read: an app that may edit orders can
 * obviously read them, and a token whose read grant was revoked but whose write
 * grant survived would be a confusing half-state to render back.
 */
export function toggleScope(
  scopes: readonly string[],
  level: ScopeLevel,
  area: PermissionArea,
  checked: boolean,
): string[] {
  const next = new Set(scopes);
  const read = scopeFor('read', area);
  const write = scopeFor('write', area);

  if (level === 'read') {
    if (checked) next.add(read);
    else {
      next.delete(read);
      next.delete(write);
    }
  } else if (checked) {
    next.add(write);
    next.add(read);
  } else {
    next.delete(write);
  }

  return sortScopes([...next]);
}

/** Every scope, for the grid's "Select all" shortcut. */
export function allScopes(): string[] {
  return sortScopes(
    SCOPE_AREAS.flatMap((area) => [scopeFor('read', area), scopeFor('write', area)]),
  );
}

/** "6 scopes" — the index table's column, and the detail card's subtitle. */
export function scopeCountLabel(scopes: readonly string[]): string {
  const count = scopes.length;
  return `${count} scope${count === 1 ? '' : 's'}`;
}

/** True when two grants are the same set, whatever order they arrived in. */
export function sameScopes(a: readonly string[], b: readonly string[]): boolean {
  return sortScopes(a).join(',') === sortScopes(b).join(',');
}
