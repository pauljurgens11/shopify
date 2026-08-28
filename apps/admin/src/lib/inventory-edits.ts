/**
 * What the inventory table's editable cells actually intend to write.
 * Owner: WS-B (B6).
 *
 * Pure, because getting it wrong writes stock: every entry this returns becomes
 * an `InventoryAdjustment` row, so a cell the merchant typed into and then
 * restored must NOT produce a zero-delta adjustment, and a half-typed or
 * negative value must not be sent at all.
 */
import type { InventoryRow } from '@merchant/contracts/inventory';

export type LevelWrite = { variantId: string; locationId: string; available: number };

/**
 * A whole, non-negative count, or null if it is not one yet.
 *
 * An empty cell is `null`, not 0: clearing a field while typing must not read
 * as "set this to zero" and silently write off the stock.
 */
export function parseAvailable(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * The cells whose value differs from what the server last reported.
 *
 * Unchanged and unparseable cells are dropped, so saving writes exactly the
 * adjustments the merchant meant and nothing else.
 */
export function changedLevels(
  rows: readonly InventoryRow[],
  drafts: Readonly<Record<string, string>>,
  locationId: string,
): LevelWrite[] {
  if (locationId === '') return [];

  const writes: LevelWrite[] = [];
  for (const row of rows) {
    const typed = drafts[row.variantId];
    if (typed === undefined) continue;

    const available = parseAvailable(typed);
    if (available === null) continue;

    const current = row.levels.find((level) => level.locationId === locationId)?.available ?? 0;
    if (available === current) continue;

    writes.push({ variantId: row.variantId, locationId, available });
  }
  return writes;
}
