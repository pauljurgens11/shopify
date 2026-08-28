/**
 * The routing table's draft state (D4). What is worth pinning here is the
 * arithmetic and grouping the server will 400 on — a draft the client thinks
 * is valid but the server refuses is a save bar that fails on click.
 */
import { describe, expect, it } from 'vitest';
import { moveRule, newRuleDraft, toDrafts, toRulesInput, validateDrafts } from './routing-draft.ts';

const CURRENCY = 'USD';

const rule = (over: Partial<Parameters<typeof toDrafts>[0][number]> = {}) => ({
  id: 'rule_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  processorConfigId: 'proc_01ARZ3NDEKTSV4RRFFQ69G5FAV',
  position: 0,
  weight: 100,
  conditions: {},
  ...over,
});

describe('draft round-trip', () => {
  it('converts rules to drafts and back, keeping order and minor units', () => {
    const drafts = toDrafts([
      rule({ weight: 70, conditions: { minAmount: { amount: 1050, currencyCode: CURRENCY } } }),
      rule({ weight: 30, position: 1, conditions: { cardBrands: ['visa'] } }),
    ]);

    expect(drafts[0]).toMatchObject({ weight: '70', minAmount: '10.50', maxAmount: '' });
    expect(drafts[1]).toMatchObject({ weight: '30', cardBrands: ['visa'] });

    const input = toRulesInput(drafts, CURRENCY);
    expect(input).toEqual([
      {
        processorConfigId: 'proc_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        position: 0,
        weight: 70,
        conditions: { minAmount: { amount: 1050, currencyCode: CURRENCY } },
      },
      {
        processorConfigId: 'proc_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        position: 1,
        weight: 30,
        conditions: { cardBrands: ['visa'] },
      },
    ]);
  });

  it('sends brands sorted so equivalent rules land in one server-side group', () => {
    // The server groups competing rules by canonical conditions but keeps
    // array order — [visa, amex] and [amex, visa] would silently become two
    // groups and dodge the <=100 check. The client normalizes before sending.
    const drafts = toDrafts([
      rule({ conditions: { cardBrands: ['visa', 'amex'] } }),
      rule({ conditions: { cardBrands: ['amex', 'visa'] } }),
    ]);
    const [first, second] = toRulesInput(drafts, CURRENCY);
    expect(first?.conditions.cardBrands).toEqual(second?.conditions.cardBrands);
  });
});

describe('validation', () => {
  it('flags rules whose same-condition weights exceed 100, in any brand order', () => {
    const drafts = [
      { ...newRuleDraft('proc_a'), weight: '60', cardBrands: ['visa', 'amex'] as const },
      { ...newRuleDraft('proc_a'), weight: '60', cardBrands: ['amex', 'visa'] as const },
      { ...newRuleDraft('proc_a'), weight: '90' }, // different conditions: fine
    ].map((d) => ({ ...d, cardBrands: [...d.cardBrands] }));

    const result = validateDrafts(drafts, CURRENCY);
    expect(result.byKey[drafts[0]?.key ?? '']).toMatch(/100/);
    expect(result.byKey[drafts[1]?.key ?? '']).toMatch(/100/);
    expect(result.byKey[drafts[2]?.key ?? '']).toBeUndefined();
    expect(result.valid).toBe(false);
  });

  it('accepts a 70/30 split on identical conditions', () => {
    const drafts = [
      { ...newRuleDraft('proc_a'), weight: '70' },
      { ...newRuleDraft('proc_b'), weight: '30' },
    ];
    expect(validateDrafts(drafts, CURRENCY).valid).toBe(true);
  });

  it('rejects fractional weights and a minimum above the maximum', () => {
    const fractional = { ...newRuleDraft('proc_a'), weight: '33.5' };
    expect(validateDrafts([fractional], CURRENCY).byKey[fractional.key]).toBeTruthy();

    const inverted = { ...newRuleDraft('proc_a'), minAmount: '50', maxAmount: '10' };
    expect(validateDrafts([inverted], CURRENCY).byKey[inverted.key]).toMatch(/minimum/i);
  });

  it('rejects a rule with no processor selected', () => {
    const empty = newRuleDraft('');
    expect(validateDrafts([empty], CURRENCY).valid).toBe(false);
  });
});

describe('ordering', () => {
  it('moves a rule up or down and clamps at the edges', () => {
    const [a, b, c] = [newRuleDraft('proc_a'), newRuleDraft('proc_b'), newRuleDraft('proc_c')];
    if (!a || !b || !c) throw new Error('unreachable');

    expect(moveRule([a, b, c], 2, -1)).toEqual([a, c, b]);
    expect(moveRule([a, b, c], 0, -1)).toEqual([a, b, c]);
    expect(moveRule([a, b, c], 2, 1)).toEqual([a, b, c]);
  });
});
