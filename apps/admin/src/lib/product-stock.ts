/**
 * The Inventory card's per-location quantities, and the diff that saves them.
 * Owner: WS-B (B5).
 *
 * These live OUTSIDE `ProductDraft` on purpose. Stock never rides along with
 * the product write — it moves only through B4's adjustment service, so an
 * `InventoryAdjustment` exists for every change (CLAUDE.md §9) — and the levels
 * arrive in a second request that lands after the draft has been seeded.
 * Folding them into the draft would either make an untouched form dirty when
 * that response came back, or throw away what the merchant had already typed.
 *
 * Pure and React-free so the diff can be tested without rendering.
 */
import type { InventoryRow } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';

/** locationId → the quantity as typed. Always a string; `''` means "leave it". */
export type StockByLocation = Record<string, string>;

/** Every location at zero — a product that has never been stocked anywhere. */
export function emptyStock(locations: readonly Location[]): StockByLocation {
  return Object.fromEntries(locations.map((location) => [location.id, '0']));
}

/**
 * The default variant's levels, padded with a 0 for every location it has never
 * been stocked at: levels are created lazily, and a blank cell would read as a
 * bug rather than as "none here".
 */
export function stockFromRows(
  rows: readonly InventoryRow[],
  locations: readonly Location[],
  variantId: string | undefined,
): StockByLocation {
  const row = variantId ? rows.find((candidate) => candidate.variantId === variantId) : rows[0];
  const available = new Map(
    (row?.levels ?? []).map((level) => [level.locationId, level.available]),
  );
  return Object.fromEntries(
    locations.map((location) => [location.id, String(available.get(location.id) ?? 0)]),
  );
}

/**
 * What `POST /admin/api/inventory/set` should carry: only the cells that
 * actually changed, so an unrelated save writes no adjustment history.
 *
 * A blank or non-numeric cell is skipped rather than saved as 0 — mid-edit is
 * not the same as "none left".
 */
export function stockLevelChanges(
  current: StockByLocation,
  baseline: StockByLocation,
  variantId: string,
): Array<{ variantId: string; locationId: string; available: number }> {
  const changes: Array<{ variantId: string; locationId: string; available: number }> = [];
  for (const [locationId, value] of Object.entries(current)) {
    const wanted = Number.parseInt(value, 10);
    if (!Number.isFinite(wanted) || wanted < 0) continue;
    if (String(wanted) === (baseline[locationId] ?? '')) continue;
    changes.push({ variantId, locationId, available: wanted });
  }
  return changes;
}
