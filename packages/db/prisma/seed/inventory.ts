/**
 * Inventory ledger for the seed (H1).
 *
 * CLAUDE.md §9: stock never moves by a raw `inventoryLevel.update` — every
 * change writes an `InventoryAdjustment` so the admin's inventory drawer has
 * history to show. The seed has no service to call, so it honours the invariant
 * by construction: it only ever records adjustments, and derives each
 * `InventoryLevel.available` from the sum of them at the end.
 *
 * That makes the level and its history impossible to disagree, which is exactly
 * what `seed.test.ts` asserts.
 */
import { newId } from '@merchant/config/ids';
import type { PrismaClient } from '@prisma/client';

export type AdjustmentReason = 'received' | 'sold' | 'restock' | 'correction' | 'damaged';

interface LedgerEntry {
  variantId: string;
  locationId: string;
  delta: number;
  reason: AdjustmentReason;
  referenceId: string | null;
  actor: string | null;
  createdAt: Date;
}

/**
 * Zero out a few variants so the empty states are demoable: the storefront's
 * sold-out badge, the admin inventory page's out-of-stock filter and B6's
 * per-location split all need stock that has actually run out. Written as
 * `correction` adjustments rather than by editing levels, so the ledger stays
 * the single source of truth.
 */
export function applyStockCorrections(
  ledger: InventoryLedger,
  variantIds: string[],
  locationIds: string[],
  at: Date,
): void {
  for (const variantId of variantIds) {
    for (const locationId of locationIds) {
      const available = ledger.availableAt(variantId, locationId);
      if (available <= 0) continue;
      ledger.record({
        variantId,
        locationId,
        delta: -available,
        reason: 'correction',
        actor: 'Maya Okonjo',
        createdAt: at,
      });
    }
  }
}

export class InventoryLedger {
  private readonly entries: LedgerEntry[] = [];

  constructor(private readonly shopId: string) {}

  record(entry: {
    variantId: string;
    locationId: string;
    delta: number;
    reason: AdjustmentReason;
    createdAt: Date;
    referenceId?: string;
    actor?: string;
  }): void {
    this.entries.push({
      referenceId: entry.referenceId ?? null,
      actor: entry.actor ?? null,
      ...entry,
    });
  }

  /** Current on-hand for a (variant, location), so orders never oversell. */
  availableAt(variantId: string, locationId: string): number {
    return this.entries
      .filter((e) => e.variantId === variantId && e.locationId === locationId)
      .reduce((acc, e) => acc + e.delta, 0);
  }

  /** Writes the adjustments, then the levels their sums imply. */
  async flush(db: PrismaClient): Promise<void> {
    await db.inventoryAdjustment.createMany({
      data: this.entries.map((e) => ({
        // Same prefix the live adjustment service writes (inv_adj_) — mixed
        // prefixes in one table start the moment real activity lands.
        id: newId('inventoryAdjustment'),
        shopId: this.shopId,
        variantId: e.variantId,
        locationId: e.locationId,
        delta: e.delta,
        reason: e.reason,
        referenceId: e.referenceId,
        actor: e.actor,
        createdAt: e.createdAt,
      })),
    });

    const totals = new Map<string, { variantId: string; locationId: string; available: number }>();
    for (const e of this.entries) {
      const key = `${e.variantId}:${e.locationId}`;
      const current = totals.get(key) ?? {
        variantId: e.variantId,
        locationId: e.locationId,
        available: 0,
      };
      current.available += e.delta;
      totals.set(key, current);
    }

    await db.inventoryLevel.createMany({
      data: [...totals.values()].map((t) => ({
        id: newId('inventory'),
        shopId: this.shopId,
        variantId: t.variantId,
        locationId: t.locationId,
        available: t.available,
      })),
    });
  }
}
