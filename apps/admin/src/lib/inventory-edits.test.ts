/**
 * Every entry `changedLevels` returns becomes a permanent `InventoryAdjustment`
 * row, so the cases that matter are the ones that would write stock nobody
 * asked to change: a cell typed into and restored, a cell mid-edit, a cell
 * cleared to empty.
 */
import type { InventoryRow } from '@merchant/contracts/inventory';
import { describe, expect, it } from 'vitest';
import { changedLevels, parseAvailable } from './inventory-edits.ts';

const WAREHOUSE = 'loc_01ARZ3NDEKTSV4RRFFQ69G5FAV';
const STORE = 'loc_01ARZ3NDEKTSV4RRFFQ69G5FAW';

const row = (variantId: string, available: number, at = WAREHOUSE): InventoryRow => ({
  variantId,
  productId: 'prod_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  productTitle: 'Rain Jacket',
  variantTitle: 'Default Title',
  sku: null,
  imageUrl: null,
  levels: [{ locationId: at, available }],
});

describe('parseAvailable', () => {
  it('accepts a whole non-negative count', () => {
    expect(parseAvailable('0')).toBe(0);
    expect(parseAvailable('12')).toBe(12);
    expect(parseAvailable(' 7 ')).toBe(7);
  });

  it('rejects anything that is not one yet, rather than guessing', () => {
    // An empty cell is being edited — reading it as 0 would write off the stock.
    expect(parseAvailable('')).toBeNull();
    expect(parseAvailable('-3')).toBeNull();
    expect(parseAvailable('2.5')).toBeNull();
    expect(parseAvailable('abc')).toBeNull();
  });
});

describe('changedLevels', () => {
  it('writes only the cells whose value actually moved', () => {
    const rows = [row('var_a', 5), row('var_b', 8)];

    expect(changedLevels(rows, { var_a: '12' }, WAREHOUSE)).toEqual([
      { variantId: 'var_a', locationId: WAREHOUSE, available: 12 },
    ]);
  });

  it('ignores a cell typed into and put back — no zero-delta adjustment', () => {
    expect(changedLevels([row('var_a', 5)], { var_a: '5' }, WAREHOUSE)).toEqual([]);
  });

  it('ignores a cell that is mid-edit or cleared', () => {
    expect(changedLevels([row('var_a', 5)], { var_a: '' }, WAREHOUSE)).toEqual([]);
    expect(changedLevels([row('var_a', 5)], { var_a: '-' }, WAREHOUSE)).toEqual([]);
  });

  it('lets a real zero through, which is how stock is written off deliberately', () => {
    expect(changedLevels([row('var_a', 5)], { var_a: '0' }, WAREHOUSE)).toEqual([
      { variantId: 'var_a', locationId: WAREHOUSE, available: 0 },
    ]);
  });

  it('compares against the ACTIVE location, not whichever level came first', () => {
    const multi: InventoryRow = {
      ...row('var_a', 5),
      levels: [
        { locationId: WAREHOUSE, available: 5 },
        { locationId: STORE, available: 2 },
      ],
    };

    // 2 is unchanged at the store even though it differs from the warehouse.
    expect(changedLevels([multi], { var_a: '2' }, STORE)).toEqual([]);
    expect(changedLevels([multi], { var_a: '2' }, WAREHOUSE)).toEqual([
      { variantId: 'var_a', locationId: WAREHOUSE, available: 2 },
    ]);
  });

  it('treats a variant with no level at this location as zero', () => {
    const elsewhere = { ...row('var_a', 9, STORE) };
    expect(changedLevels([elsewhere], { var_a: '0' }, WAREHOUSE)).toEqual([]);
    expect(changedLevels([elsewhere], { var_a: '4' }, WAREHOUSE)).toEqual([
      { variantId: 'var_a', locationId: WAREHOUSE, available: 4 },
    ]);
  });

  it('writes nothing before a location is known', () => {
    expect(changedLevels([row('var_a', 5)], { var_a: '9' }, '')).toEqual([]);
  });
});
