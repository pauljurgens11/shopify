/**
 * The Inventory card's per-location diff. Owner: WS-B.
 *
 * Every entry this returns becomes an `InventoryAdjustment` row, so reporting a
 * cell that did not change is not a cosmetic bug — it invents stock history.
 */
import type { InventoryRow } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';
import { describe, expect, it } from 'vitest';
import { emptyStock, stockFromRows, stockLevelChanges } from './product-stock.ts';

const location = (id: string, name: string): Location => ({
  id,
  name,
  address: null,
  isActive: true,
  fulfillsOnlineOrders: true,
  stockedVariantCount: 0,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
});

const DOWNTOWN = location('loc_01ARZ3NDEKTSV4RRFFQ69G5FAV', 'Downtown Store');
const WAREHOUSE = location('loc_01ARZ3NDEKTSV4RRFFQ69G5FAW', 'Warehouse');
const LOCATIONS = [DOWNTOWN, WAREHOUSE];

const VARIANT = 'var_01ARZ3NDEKTSV4RRFFQ69G5FAV';

const row = (levels: InventoryRow['levels']): InventoryRow => ({
  variantId: VARIANT,
  productId: 'prod_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  productTitle: 'Tee',
  variantTitle: 'Default Title',
  sku: null,
  imageUrl: null,
  levels,
});

describe('seeding the card', () => {
  it('starts a new product at zero everywhere', () => {
    expect(emptyStock(LOCATIONS)).toEqual({ [DOWNTOWN.id]: '0', [WAREHOUSE.id]: '0' });
  });

  it('fills in a 0 for a location the variant has never been stocked at', () => {
    // Levels are created lazily, so a location can simply be absent — an empty
    // cell there would read as a bug rather than as "none here".
    const seeded = stockFromRows(
      [row([{ locationId: DOWNTOWN.id, available: 12 }])],
      LOCATIONS,
      VARIANT,
    );
    expect(seeded).toEqual({ [DOWNTOWN.id]: '12', [WAREHOUSE.id]: '0' });
  });
});

describe('stockLevelChanges', () => {
  const baseline = { [DOWNTOWN.id]: '12', [WAREHOUSE.id]: '4' };

  it('reports only the cells that moved', () => {
    expect(stockLevelChanges({ ...baseline, [WAREHOUSE.id]: '9' }, baseline, VARIANT)).toEqual([
      { variantId: VARIANT, locationId: WAREHOUSE.id, available: 9 },
    ]);
  });

  it('reports nothing when nothing changed, so an unrelated save writes no history', () => {
    expect(stockLevelChanges(baseline, baseline, VARIANT)).toEqual([]);
  });

  it('skips a cell that is mid-edit rather than saving it as zero', () => {
    expect(stockLevelChanges({ ...baseline, [DOWNTOWN.id]: '' }, baseline, VARIANT)).toEqual([]);
  });

  it('treats a re-typed identical number as unchanged, leading zeros included', () => {
    expect(stockLevelChanges({ ...baseline, [DOWNTOWN.id]: '012' }, baseline, VARIANT)).toEqual([]);
  });
});
