/**
 * Routing selection — the pure half of SPEC §11 routing, and part of the
 * mandatory §14.2 suite.
 *
 * No database and no processors here: this file is only about which processors
 * get tried and in what order. The execution half (failover, no-cascade,
 * idempotency, refunds) lives in router.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { type RoutingCandidate, ruleMatches, selectProcessorChain } from './routing.ts';

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

let seq = 0;
const rule = (over: Partial<RoutingCandidate> = {}): RoutingCandidate => ({
  processorConfigId: `proc_${++seq}`,
  processor: 'mock',
  position: 0,
  weight: 100,
  conditions: {},
  ...over,
});

/** Deterministic 0–1 sequence. The router takes `rng` precisely so this works. */
const rngOf = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
};

/** Seeded LCG — same numbers on every machine and every run. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

describe('ruleMatches', () => {
  it('matches everything when there are no conditions', () => {
    expect(ruleMatches(rule(), { amount: usd(2500), brand: 'visa' })).toBe(true);
  });

  it('filters on card brand', () => {
    const amex = rule({ conditions: { cardBrands: ['amex'] } });
    expect(ruleMatches(amex, { amount: usd(2500), brand: 'amex' })).toBe(true);
    expect(ruleMatches(amex, { amount: usd(2500), brand: 'visa' })).toBe(false);
  });

  it('treats an empty brand list as "any brand" — that is what an empty UI field means', () => {
    const any = rule({ conditions: { cardBrands: [] } });
    expect(ruleMatches(any, { amount: usd(2500), brand: 'visa' })).toBe(true);
  });

  it('applies min and max amount inclusively', () => {
    const band = rule({ conditions: { minAmount: usd(1000), maxAmount: usd(5000) } });
    expect(ruleMatches(band, { amount: usd(999), brand: 'visa' })).toBe(false);
    expect(ruleMatches(band, { amount: usd(1000), brand: 'visa' })).toBe(true);
    expect(ruleMatches(band, { amount: usd(5000), brand: 'visa' })).toBe(true);
    expect(ruleMatches(band, { amount: usd(5001), brand: 'visa' })).toBe(false);
  });

  it('does not match across currencies rather than comparing raw integers', () => {
    // 1000 JPY vs 1000 USD-minor-units are not comparable numbers. Shops are
    // single-currency (SPEC §2), so this only fires on a misconfiguration —
    // and silently matching would route on a meaningless comparison.
    const band = rule({ conditions: { minAmount: { amount: 1000, currencyCode: 'JPY' } } });
    expect(ruleMatches(band, { amount: usd(5000), brand: 'visa' })).toBe(false);
  });
});

describe('selectProcessorChain', () => {
  const ctx = { amount: usd(2500), brand: 'visa' as const };

  it('returns nothing when no rule matches, so the caller can fall back', () => {
    const amexOnly = rule({ conditions: { cardBrands: ['amex'] } });
    expect(selectProcessorChain([amexOnly], ctx)).toEqual([]);
  });

  it('picks by weight, and the rest follow in position order as the fallback chain', () => {
    const a = rule({ processorConfigId: 'proc_a', position: 0, weight: 70 });
    const b = rule({ processorConfigId: 'proc_b', position: 1, weight: 30 });

    // rng lands in A's 0–70 slice.
    expect(selectProcessorChain([a, b], ctx, rngOf(0.5)).map((c) => c.processorConfigId)).toEqual([
      'proc_a',
      'proc_b',
    ]);
    // rng lands in B's 70–100 slice: B is tried first, A becomes the fallback.
    expect(selectProcessorChain([a, b], ctx, rngOf(0.9)).map((c) => c.processorConfigId)).toEqual([
      'proc_b',
      'proc_a',
    ]);
  });

  it('splits exactly at the weight boundary', () => {
    const a = rule({ processorConfigId: 'proc_a', position: 0, weight: 70 });
    const b = rule({ processorConfigId: 'proc_b', position: 1, weight: 30 });
    const first = (r: number) => selectProcessorChain([a, b], ctx, rngOf(r))[0]?.processorConfigId;

    expect(first(0)).toBe('proc_a');
    expect(first(0.6999)).toBe('proc_a');
    expect(first(0.7)).toBe('proc_b');
    expect(first(0.9999)).toBe('proc_b');
  });

  it('honours the split over many draws, not just at the boundary', () => {
    const a = rule({ processorConfigId: 'proc_a', position: 0, weight: 70 });
    const b = rule({ processorConfigId: 'proc_b', position: 1, weight: 30 });
    const rng = lcg(20260828);

    let aCount = 0;
    const draws = 10_000;
    for (let i = 0; i < draws; i++) {
      if (selectProcessorChain([a, b], ctx, rng)[0]?.processorConfigId === 'proc_a') aCount++;
    }
    expect(aCount / draws).toBeGreaterThan(0.68);
    expect(aCount / draws).toBeLessThan(0.72);
  });

  it('never returns the same processor twice, even when two rules point at it', () => {
    const a1 = rule({ processorConfigId: 'proc_a', position: 0, weight: 50 });
    const a2 = rule({ processorConfigId: 'proc_a', position: 1, weight: 50 });
    const b = rule({ processorConfigId: 'proc_b', position: 2, weight: 50 });

    const chain = selectProcessorChain([a1, a2, b], ctx, rngOf(0.1)).map(
      (c) => c.processorConfigId,
    );
    expect(chain).toEqual(['proc_a', 'proc_b']);
  });

  it('falls back to position order when every weight is zero', () => {
    const a = rule({ processorConfigId: 'proc_a', position: 1, weight: 0 });
    const b = rule({ processorConfigId: 'proc_b', position: 0, weight: 0 });
    expect(selectProcessorChain([a, b], ctx, rngOf(0.9)).map((c) => c.processorConfigId)).toEqual([
      'proc_b',
      'proc_a',
    ]);
  });

  it('excludes non-matching rules from the fallback chain too', () => {
    const visa = rule({ processorConfigId: 'proc_a', position: 0, conditions: {} });
    const amexOnly = rule({
      processorConfigId: 'proc_b',
      position: 1,
      conditions: { cardBrands: ['amex'] },
    });
    expect(
      selectProcessorChain([visa, amexOnly], ctx, rngOf(0)).map((c) => c.processorConfigId),
    ).toEqual(['proc_a']);
  });
});
