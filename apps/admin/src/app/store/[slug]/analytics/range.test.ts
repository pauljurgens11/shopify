/**
 * The dashboard's arithmetic. Everything here is a way the page can show a
 * confident, wrong number — which a screenshot review would never catch.
 *
 * SPEC §14 forbids component tests, so the cards themselves are verified by
 * running the page against the seeded store (see the PR); this covers the
 * logic underneath them.
 */
import { format } from '@merchant/config/money';
import { describe, expect, it } from 'vitest';
import {
  axisLabel,
  chartSeries,
  comparisonRangeFor,
  deltaPercent,
  formatDelta,
  formatPercent,
  formatRangeLabel,
  funnelStages,
  parseDayInput,
  presetForRange,
  rangeFor,
  spanDays,
  toChartValue,
} from './range.ts';

// Mid-afternoon UTC, so a range built from local time would land on a different day.
const NOW = new Date('2026-08-28T15:30:00.000Z');

describe('rangeFor', () => {
  it('covers today only, as a single UTC day', () => {
    const { from, to } = rangeFor('today', NOW);
    expect(from.toISOString()).toBe('2026-08-28T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-28T00:00:00.000Z');
  });

  it('counts "last 7 days" inclusive — seven buckets, not eight', () => {
    const { from, to } = rangeFor('7d', NOW);
    expect(from.toISOString()).toBe('2026-08-22T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-28T00:00:00.000Z');

    const days = (to.getTime() - from.getTime()) / 86_400_000 + 1;
    expect(days).toBe(7);
  });

  it('spans 30 and 90 days the same way', () => {
    const span = (preset: '30d' | '90d') => {
      const { from, to } = rangeFor(preset, NOW);
      return (to.getTime() - from.getTime()) / 86_400_000 + 1;
    };
    expect(span('30d')).toBe(30);
    expect(span('90d')).toBe(90);
  });

  it('is timezone-proof — a late-evening UTC time is still the same day', () => {
    const late = rangeFor('today', new Date('2026-08-28T23:59:59.999Z'));
    expect(late.from.toISOString()).toBe('2026-08-28T00:00:00.000Z');
  });

  it('makes "yesterday" a single closed day, not today minus one open one', () => {
    const { from, to } = rangeFor('yesterday', NOW);
    expect(from.toISOString()).toBe('2026-08-27T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-08-27T00:00:00.000Z');
  });

  it('anchors every period-to-date preset at its own boundary', () => {
    // 2026-08-28 is a Friday, so the week began on Sunday the 23rd.
    expect(rangeFor('wtd', NOW).from.toISOString()).toBe('2026-08-23T00:00:00.000Z');
    expect(rangeFor('mtd', NOW).from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    // August is in Q3, which starts in July.
    expect(rangeFor('qtd', NOW).from.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(rangeFor('ytd', NOW).from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    for (const preset of ['wtd', 'mtd', 'qtd', 'ytd'] as const) {
      expect(rangeFor(preset, NOW).to.toISOString()).toBe('2026-08-28T00:00:00.000Z');
    }
  });
});

describe('comparisonRangeFor', () => {
  it('matches the server: the same number of DAYS, immediately before', () => {
    // `getDashboard` compares [from - spanDays, from - 1 day]. If the pill said
    // anything else it would announce a window the deltas were not measured on.
    const previous = comparisonRangeFor(rangeFor('7d', NOW));
    expect(previous.from.toISOString()).toBe('2026-08-15T00:00:00.000Z');
    expect(previous.to.toISOString()).toBe('2026-08-21T00:00:00.000Z');
    expect(spanDays(previous)).toBe(7);
  });

  it('compares a single day against the single day before it', () => {
    const previous = comparisonRangeFor(rangeFor('today', NOW));
    expect(previous.from.toISOString()).toBe('2026-08-27T00:00:00.000Z');
    expect(previous.to.toISOString()).toBe('2026-08-27T00:00:00.000Z');
  });
});

describe('presetForRange', () => {
  it('recognises a hand-picked range that happens to equal a preset', () => {
    expect(presetForRange(rangeFor('30d', NOW), NOW)).toBe('30d');
    expect(presetForRange(rangeFor('yesterday', NOW), NOW)).toBe('yesterday');
  });

  it('falls back to custom for anything else', () => {
    const range = {
      from: new Date('2026-08-03T00:00:00.000Z'),
      to: new Date('2026-08-11T00:00:00.000Z'),
    };
    expect(presetForRange(range, NOW)).toBe('custom');
  });
});

describe('parseDayInput', () => {
  it('reads what the popover prints back, as the SAME UTC day', () => {
    // The landmine: `new Date('August 29, 2026')` is local midnight, which is
    // the 28th in UTC for anyone west of Greenwich.
    expect(parseDayInput('August 29, 2026')?.toISOString()).toBe('2026-08-29T00:00:00.000Z');
    expect(parseDayInput('2026-08-29')?.toISOString()).toBe('2026-08-29T00:00:00.000Z');
  });

  it('returns null for text that is not a date, instead of 1970', () => {
    expect(parseDayInput('Augst 29')).toBeNull();
    expect(parseDayInput('')).toBeNull();
    expect(parseDayInput('2026-13-01')).toBeNull();
  });
});

describe('formatRangeLabel', () => {
  it('prints one day as a date and a span as a range', () => {
    expect(formatRangeLabel(rangeFor('today', NOW))).toBe('Aug 28, 2026');
    expect(formatRangeLabel(rangeFor('7d', NOW))).toBe('Aug 22–Aug 28, 2026');
  });
});

describe('deltaPercent', () => {
  it('reports growth and decline against the previous period', () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(100, 100)).toBe(0);
  });

  it('returns null rather than Infinity when the previous period was empty', () => {
    // The chip is hidden instead: "+∞%" against a zero baseline says nothing.
    expect(deltaPercent(500, 0)).toBeNull();
    expect(deltaPercent(0, 0)).toBeNull();
  });
});

describe('funnelStages', () => {
  const funnel = {
    sessions: 1000,
    productViews: 800,
    addedToCart: 200,
    reachedCheckout: 100,
    purchased: 25,
  };

  it('labels the five stages in order with no dropoff on the first', () => {
    const stages = funnelStages(funnel);
    expect(stages.map((s) => s.label)).toEqual([
      'Sessions',
      'Viewed a product',
      'Added to cart',
      'Reached checkout',
      'Purchased',
    ]);
    expect(stages[0]?.dropoff).toBeNull();
  });

  it('computes each stage loss against the one before it', () => {
    const stages = funnelStages(funnel);
    expect(stages[1]?.dropoff).toBeCloseTo(20); // 1000 → 800
    expect(stages[2]?.dropoff).toBeCloseTo(75); // 800 → 200
    expect(stages[4]?.dropoff).toBeCloseTo(75); // 100 → 25
  });

  it('never divides by zero, and never reports a negative loss', () => {
    const empty = funnelStages({
      sessions: 0,
      productViews: 0,
      addedToCart: 0,
      reachedCheckout: 0,
      purchased: 0,
    });
    expect(empty.every((s) => Number.isFinite(s.dropoff ?? 0))).toBe(true);

    // Product views legitimately exceed sessions — several per visit — and that
    // is not a gain of shoppers, so it clamps to 0 rather than reading "-54%".
    const busy = funnelStages({ ...funnel, productViews: 1540 });
    expect(busy[1]?.dropoff).toBe(0);
  });
});

describe('chart money', () => {
  it('converts minor units to the major units a chart axis plots', () => {
    // The named G3 landmine: 129900 on the axis instead of $1,299.00.
    expect(toChartValue(129_900, 'USD')).toBe(1299);
    expect(format({ amount: 129_900, currencyCode: 'USD' })).toBe('$1,299.00');
  });

  it('respects zero-decimal currencies', () => {
    expect(toChartValue(12_995, 'JPY')).toBe(12_995);
  });

  it('maps a series to chart points, keeping the bucket as the key', () => {
    const series = chartSeries(
      [
        { bucket: '2026-08-27T00:00:00.000Z', value: 30_000 },
        { bucket: '2026-08-28T00:00:00.000Z', value: 0 },
      ],
      'USD',
    );
    expect(series).toEqual([
      { key: '2026-08-27T00:00:00.000Z', value: 300 },
      // A quiet day is a real zero, not a gap.
      { key: '2026-08-28T00:00:00.000Z', value: 0 },
    ]);
  });

  it('labels an axis tick in UTC, so the last bucket is not yesterday', () => {
    expect(axisLabel('2026-08-28T00:00:00.000Z')).toBe('Aug 28');
  });
});

describe('display formatting', () => {
  it('renders a conversion rate and a delta the way the cards read', () => {
    expect(formatPercent(2.9333)).toBe('2.9%');
    expect(formatDelta(12.345)).toBe('12.3%');
    expect(formatDelta(-8.4)).toBe('-8.4%');
  });
});
