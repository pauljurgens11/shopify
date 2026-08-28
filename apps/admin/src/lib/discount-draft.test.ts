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
});
