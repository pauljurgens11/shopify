/**
 * The discount form's payload must satisfy the contract the API validates with.
 *
 * One round-trip test, not one per field (SPEC §14): what it actually proves is
 * the boundary conversion — dollars typed as a string become integer minor
 * units, and a draft rebuilt from a saved discount produces the same payload
 * again. A float reaching the wire here is the CLAUDE.md §9 landmine.
 */
import { createDiscountInput, discountSchema } from '@merchant/contracts/discounts';
import { describe, expect, it } from 'vitest';
import {
  draftFromDiscount,
  draftToInput,
  emptyDraft,
  serverFieldToDraftKey,
  validate,
} from '../app/store/[slug]/discounts/_components/discount-draft.ts';

describe('discount draft → API input', () => {
  it('sends a fixed value as integer minor units, and survives contract validation', () => {
    const draft = {
      ...emptyDraft('amount_off_order'),
      title: 'Ten dollars off',
      code: 'TENOFF',
      valueType: 'fixed' as const,
      value: '10.00',
      minimumKind: 'subtotal' as const,
      minimumSubtotal: '49.99',
      hasUsageLimit: true,
      usageLimit: '100',
    };

    const input = draftToInput(draft, 'USD');
    expect(input.value).toBe(1000);
    expect(input.minimumRequirement).toEqual({
      type: 'subtotal',
      value: { amount: 4999, currencyCode: 'USD' },
    });

    // The API parses with exactly this schema, so a payload that fails here is
    // a 400 the merchant sees as "nothing happened when I pressed Save".
    expect(() => createDiscountInput.parse(input)).not.toThrow();
  });

  it('rebuilds the same payload from a discount the API returned', () => {
    const draft = {
      ...emptyDraft('amount_off_products'),
      title: 'Quarter off the sale rail',
      code: 'SALE25',
      value: '25',
      appliesToScope: 'collections' as const,
      collectionIds: ['col_01J8ZC00000000000000000001'],
    };
    const input = draftToInput(draft, 'USD');

    // What the edit page loads: the contract's own shape, defaults applied.
    const saved = discountSchema.parse({
      ...createDiscountInput.parse(input),
      id: 'dis_01J8ZC00000000000000000002',
      usedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Reopening the discount and saving it again must not change it.
    expect(draftToInput(draftFromDiscount(saved, 'USD'), 'USD')).toEqual(input);
  });

  it('round-trips a free shipping discount', () => {
    const draft = { ...emptyDraft('free_shipping'), title: 'Free shipping', code: 'SHIPFREE' };
    const input = draftToInput(draft, 'USD');
    expect(input.value).toBe(100);

    const saved = discountSchema.parse({
      ...createDiscountInput.parse(input),
      id: 'dis_01J8ZC00000000000000000003',
      usedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(draftToInput(draftFromDiscount(saved, 'USD'), 'USD')).toEqual(input);
  });
});

describe('validate — the errors that used to be silent 400s or silent wrong saves', () => {
  const valid = {
    ...emptyDraft('amount_off_order'),
    title: 'Ten off',
    code: 'TENOFF',
    valueType: 'fixed' as const,
    value: '10.00',
  };

  it('accepts a well-formed draft', () => {
    expect(validate(valid, 'USD')).toEqual({});
  });

  it('requires a usage limit when the checkbox is on — empty must not save unlimited', () => {
    expect(validate({ ...valid, hasUsageLimit: true, usageLimit: '' }, 'USD')).toHaveProperty(
      'usageLimit',
    );
  });

  it('rejects a non-positive-integer usage limit the API would 400 on', () => {
    for (const usageLimit of ['0', '2.5', '-1', '1e3']) {
      expect(validate({ ...valid, hasUsageLimit: true, usageLimit }, 'USD')).toHaveProperty(
        'usageLimit',
      );
    }
    expect(validate({ ...valid, hasUsageLimit: true, usageLimit: '100' }, 'USD')).toEqual({});
  });

  it('requires a positive integer minimum quantity', () => {
    for (const minimumQuantity of ['', '0', '2.5', '1e2']) {
      expect(
        validate({ ...valid, minimumKind: 'quantity', minimumQuantity }, 'USD'),
      ).toHaveProperty('minimumQuantity');
    }
    expect(validate({ ...valid, minimumKind: 'quantity', minimumQuantity: '3' }, 'USD')).toEqual(
      {},
    );
  });

  it('catches an unparseable fixed value before save throws "Not a decimal amount"', () => {
    expect(validate({ ...valid, value: '1e5' }, 'USD')).toHaveProperty('value');
    // A trailing dot is something fromDecimal accepts, so validate must too.
    expect(validate({ ...valid, value: '10.' }, 'USD')).toEqual({});
  });

  it('catches an unparseable minimum subtotal', () => {
    expect(
      validate({ ...valid, minimumKind: 'subtotal', minimumSubtotal: '1e5' }, 'USD'),
    ).toHaveProperty('minimumSubtotal');
    expect(
      validate({ ...valid, minimumKind: 'subtotal', minimumSubtotal: '49.99' }, 'USD'),
    ).toEqual({});
  });

  it('catches a cleared start date before draftToInput throws a RangeError', () => {
    expect(validate({ ...valid, startsAt: '' }, 'USD')).toHaveProperty('startsAt');
    expect(validate({ ...valid, hasEndDate: true, endsAt: 'not-a-date' }, 'USD')).toHaveProperty(
      'endsAt',
    );
  });
});

describe('serverFieldToDraftKey — dotted API paths land on the input that renders them', () => {
  const base = emptyDraft('amount_off_order');

  it('maps minimumRequirement.value by the selected minimum kind', () => {
    expect(
      serverFieldToDraftKey('minimumRequirement.value', { ...base, minimumKind: 'quantity' }),
    ).toBe('minimumQuantity');
    expect(
      serverFieldToDraftKey('minimumRequirement.value', { ...base, minimumKind: 'subtotal' }),
    ).toBe('minimumSubtotal');
  });

  it('maps appliesTo subpaths onto the picker error and passes flat fields through', () => {
    expect(serverFieldToDraftKey('appliesTo.productIds', base)).toBe('appliesTo');
    expect(serverFieldToDraftKey('usageLimit', base)).toBe('usageLimit');
    expect(serverFieldToDraftKey('code', base)).toBe('code');
  });
});
