/**
 * The two things in the product form that are silently wrong when they break.
 *
 * Money: the form holds strings and the wire carries integer minor units. A
 * float anywhere in between is the classic bug this page invites (B5 landmine).
 *
 * The matrix: the form previews the rows the API will generate. If the two
 * disagree about ordering or about which row survives an option edit, a save
 * reshuffles the table or drops the prices the merchant just typed — and
 * nothing throws. These assertions pin it to the API's rule.
 */
import type { Product } from '@merchant/contracts/products';
import { describe, expect, it } from 'vitest';
import {
  draftFromProduct,
  draftToInput,
  emptyDraft,
  matrixOf,
  reconcileVariants,
  stockChanges,
  validate,
  variantTitleOf,
} from './product-draft.ts';

const option = (name: string, values: string[]) => ({ name, values });

/** Indexed access with a real message, instead of `possibly undefined` everywhere. */
function at<T>(list: T[], index: number): T {
  const value = list[index];
  if (value === undefined) throw new Error(`No item at index ${index}`);
  return value;
}

const variant = (over: Partial<Product['variants'][number]> = {}): Product['variants'][number] => ({
  id: 'var_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  productId: 'prod_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  title: 'Default Title',
  sku: null,
  barcode: null,
  price: { amount: 1999, currencyCode: 'USD' },
  compareAtPrice: null,
  position: 0,
  optionValues: {},
  requiresShipping: true,
  taxable: true,
  weightGrams: null,
  inventoryPolicy: 'deny',
  inventoryQuantity: 0,
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
  ...over,
});

describe('the option matrix', () => {
  it('expands first-option-slowest, exactly like the API', () => {
    const options = [option('Size', ['S', 'M']), option('Color', ['Black', 'White'])];

    expect(matrixOf(options).map((values) => variantTitleOf(options, values))).toEqual([
      'S / Black',
      'S / White',
      'M / Black',
      'M / White',
    ]);
  });

  it('ignores a half-typed option, so the table does not flicker while typing', () => {
    expect(matrixOf([option('Size', ['S', 'M']), option('', [])])).toHaveLength(2);
    expect(matrixOf([option('Size', [])])).toEqual([{}]);
  });

  it('names the single row Default Title when there are no options', () => {
    expect(variantTitleOf([], {})).toBe('Default Title');
  });
});

describe('reconcileVariants', () => {
  it('keeps the price, sku and id of a combination that survives an option edit', () => {
    const before = reconcileVariants([option('Size', ['S', 'M'])], emptyDraft().variants).map(
      (row, i) => ({ ...row, id: `var_kept${i}`, price: `${10 + i}.00`, sku: `SKU-${i}` }),
    );

    const after = reconcileVariants([option('Size', ['S', 'M', 'L'])], before);

    expect(after.map((v) => v.title)).toEqual(['S', 'M', 'L']);
    expect(at(after, 0)).toMatchObject({ id: 'var_kept0', price: '10.00', sku: 'SKU-0' });
    expect(at(after, 1)).toMatchObject({ id: 'var_kept1', price: '11.00', sku: 'SKU-1' });
    // The new row inherits a price so it is not silently free, but never a sku.
    expect(at(after, 2).id).toBeUndefined();
    expect(at(after, 2).sku).toBe('');
    expect(at(after, 2).price).toBe('10.00');
  });

  it('drops the rows whose option value went away', () => {
    const before = reconcileVariants([option('Size', ['S', 'M'])], emptyDraft().variants);
    expect(reconcileVariants([option('Size', ['M'])], before).map((v) => v.title)).toEqual(['M']);
  });
});

describe('money', () => {
  it('sends integer minor units, never a float', () => {
    const draft = { ...emptyDraft(), title: 'Tee' };
    at(draft.variants, 0).price = '19.99';

    const input = draftToInput(draft, 'USD');

    expect(at(input.variants, 0).price).toEqual({ amount: 1999, currencyCode: 'USD' });
    expect(Number.isInteger(at(input.variants, 0).price.amount)).toBe(true);
  });

  it('rounds the half-cent case the way decimal arithmetic would, not binary', () => {
    const draft = { ...emptyDraft(), title: 'Tee' };
    at(draft.variants, 0).price = '1.005';
    // Math.round(1.005 * 100) is 100 — the bug this avoids.
    expect(at(draftToInput(draft, 'USD').variants, 0).price.amount).toBe(101);
  });

  it('treats an empty price as free rather than refusing to save', () => {
    const draft = { ...emptyDraft(), title: 'Sample' };
    expect(at(draftToInput(draft, 'USD').variants, 0).price.amount).toBe(0);
  });

  it('round-trips a loaded product back to the same minor units', () => {
    const product = {
      ...baseProduct,
      variants: [variant({ price: { amount: 2450, currencyCode: 'USD' } })],
    };
    const draft = draftFromProduct(product);

    expect(at(draft.variants, 0).price).toBe('24.50');
    expect(at(draftToInput(draft, 'USD').variants, 0).price.amount).toBe(2450);
  });
});

const baseProduct: Product = {
  id: 'prod_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  title: 'Tee',
  descriptionHtml: '',
  handle: 'tee',
  status: 'active',
  vendor: null,
  productType: null,
  tags: [],
  seo: { title: null, description: null },
  options: [],
  variants: [variant()],
  images: [],
  metadata: {},
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

describe('validate', () => {
  it('requires a title and accepts a price still being typed', () => {
    expect(validate({ ...emptyDraft(), title: '  ' }).title).toBe('Title is required');

    const typing = { ...emptyDraft(), title: 'Tee' };
    at(typing.variants, 0).price = '19.';
    expect(validate(typing).variants).toBe('Enter a valid price for every variant.');

    at(typing.variants, 0).price = '19.9';
    expect(validate(typing)).toEqual({});
  });

  it('refuses an option set past the variant ceiling before the API has to', () => {
    const draft = { ...emptyDraft(), title: 'Tee' };
    draft.options = [
      option(
        'A',
        Array.from({ length: 11 }, (_, i) => `a${i}`),
      ),
      option(
        'B',
        Array.from({ length: 11 }, (_, i) => `b${i}`),
      ),
    ];
    draft.variants = reconcileVariants(draft.options, draft.variants);
    expect(validate(draft).variants).toMatch(/limit is 100/);
  });
});

describe('stockChanges', () => {
  it('only reports quantities the merchant actually changed', () => {
    const saved = {
      ...baseProduct,
      variants: [variant({ id: 'var_a'.padEnd(30, 'A'), inventoryQuantity: 5 })],
    };
    const draft = draftFromProduct(saved);
    expect(stockChanges(draft, saved)).toEqual([]);

    at(draft.variants, 0).available = '12';
    expect(stockChanges(draft, saved)).toEqual([
      { variantId: at(saved.variants, 0).id, available: 12 },
    ]);
  });

  it('matches a just-created product’s rows by option values, which is all it has', () => {
    const options = [option('Size', ['S', 'M'])];
    const draft = { ...emptyDraft(), title: 'Tee', options };
    draft.variants = reconcileVariants(options, draft.variants);
    at(draft.variants, 1).available = '7';

    const saved = {
      ...baseProduct,
      variants: [
        variant({ id: 'var_s'.padEnd(30, 'S'), optionValues: { Size: 'S' } }),
        variant({ id: 'var_m'.padEnd(30, 'M'), optionValues: { Size: 'M' } }),
      ],
    };

    expect(stockChanges(draft, saved)).toEqual([
      { variantId: at(saved.variants, 1).id, available: 7 },
    ]);
  });
});
