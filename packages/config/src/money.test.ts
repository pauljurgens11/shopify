/**
 * Money helper tests — part of the SPEC §14.3 mandatory suite. The discount
 * engine tests (issue C1) build on these primitives.
 */
import { describe, expect, it } from 'vitest';
import { allocate, fromDecimal, money, multiply, percentOf, sum } from './money.ts';

describe('fromDecimal', () => {
  it('parses ordinary amounts', () => {
    expect(fromDecimal('19.99').amount).toBe(1999);
    expect(fromDecimal('0.01').amount).toBe(1);
    expect(fromDecimal('100').amount).toBe(10000);
    expect(fromDecimal(19.99).amount).toBe(1999);
  });

  it('rounds half away from zero without float drift', () => {
    // Math.round(1.005 * 100) === 100 — the float path gets this wrong.
    expect(fromDecimal('1.005').amount).toBe(101);
    expect(fromDecimal('2.675').amount).toBe(268);
    expect(fromDecimal('-1.005').amount).toBe(-101);
  });

  it('handles zero-decimal currencies', () => {
    expect(fromDecimal('1000', 'JPY')).toEqual({ amount: 1000, currencyCode: 'JPY' });
    expect(fromDecimal('1000.6', 'JPY').amount).toBe(1001);
  });

  it('accepts a bare fraction, the way merchants type it', () => {
    expect(fromDecimal('.99').amount).toBe(99);
    expect(fromDecimal('-.5').amount).toBe(-50);
  });

  it('rejects non-decimal input', () => {
    expect(() => fromDecimal('abc')).toThrow();
    expect(() => fromDecimal('1,99')).toThrow();
    expect(() => fromDecimal('')).toThrow();
    // A lone sign or dot is not an amount, even though the regex now allows
    // each part to be empty on its own.
    expect(() => fromDecimal('.')).toThrow();
    expect(() => fromDecimal('-')).toThrow();
    expect(() => fromDecimal('-.')).toThrow();
  });
});

describe('sum', () => {
  it('takes its currency from the items, not a USD default', () => {
    expect(sum([money(100, 'EUR'), money(50, 'EUR')])).toEqual({
      amount: 150,
      currencyCode: 'EUR',
    });
  });

  it('still throws on genuinely mixed currencies', () => {
    expect(() => sum([money(100, 'EUR'), money(50, 'USD')])).toThrow(/mismatch/i);
  });
});

describe('integer discipline', () => {
  it('money() rejects floats', () => {
    expect(() => money(19.99)).toThrow(/integer/);
  });

  it('multiply rejects fractional quantities', () => {
    expect(() => multiply(money(100), 1.5)).toThrow(/integer/i);
  });

  it('percentOf rounds to the minor unit', () => {
    expect(percentOf(money(999), 10).amount).toBe(100);
  });
});

describe('allocate', () => {
  it('loses not one cent', () => {
    const parts = allocate(money(1000), [1, 1, 1]);
    expect(parts.map((p) => p.amount)).toEqual([334, 333, 333]);
    expect(parts.reduce((a, p) => a + p.amount, 0)).toBe(1000);
  });

  it('handles zero weights', () => {
    expect(allocate(money(500), [0, 0]).map((p) => p.amount)).toEqual([0, 0]);
  });
});
