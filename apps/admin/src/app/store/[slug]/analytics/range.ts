/**
 * Date ranges, deltas and chart shaping for the Analytics dashboard (SPEC §13).
 * Owner: WS-G.
 *
 * Pure on purpose: this is where the dashboard can quietly lie — an off-by-one
 * range, a delta computed against zero, or an axis rendering 129900 instead of
 * $1,299.00 — and none of that is visible in a screenshot.
 */
import { type Money, minorUnitFactor } from '@merchant/config/money';

export type RangePreset = 'today' | '7d' | '30d' | '90d';

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days each preset covers, today included. */
const SPAN_DAYS: Record<RangePreset, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 };

function startOfUtcDay(when: Date): Date {
  return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
}

/**
 * The window a preset asks the API for, in UTC days.
 *
 * "Last 7 days" is today plus the six before it — seven buckets, not eight.
 * The API buckets by UTC day, so both ends are day starts.
 */
export function rangeFor(preset: RangePreset, now: Date): { from: Date; to: Date } {
  const to = startOfUtcDay(now);
  return { from: new Date(to.getTime() - (SPAN_DAYS[preset] - 1) * DAY_MS), to };
}

export function rangeQueryString(preset: RangePreset, now: Date): string {
  const { from, to } = rangeFor(preset, now);
  return `from=${from.toISOString()}&to=${to.toISOString()}`;
}

/**
 * Percent change against the comparison period, or null when there is nothing
 * to compare against — "+∞%" against a zero baseline is noise, and Shopify
 * shows no chip at all rather than a meaningless one.
 */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * The previous period's average order value, in minor units.
 *
 * The comparison payload carries sales and orders but not the AOV itself, and
 * the delta chip is only honest if this rounds exactly the way the API rounds
 * the current figure (`Math.round`, half-up, integer minor units).
 */
export function averageOrderValueOf(totalSales: number, orderCount: number): number {
  return orderCount === 0 ? 0 : Math.round(totalSales / orderCount);
}

export type FunnelStage = {
  label: string;
  value: number;
  /** Percent lost since the previous stage; null for the first. */
  dropoff: number | null;
};

export function funnelStages(funnel: {
  sessions: number;
  productViews: number;
  addedToCart: number;
  reachedCheckout: number;
  purchased: number;
}): FunnelStage[] {
  const raw = [
    { label: 'Sessions', value: funnel.sessions },
    { label: 'Viewed a product', value: funnel.productViews },
    { label: 'Added to cart', value: funnel.addedToCart },
    { label: 'Reached checkout', value: funnel.reachedCheckout },
    { label: 'Purchased', value: funnel.purchased },
  ];

  return raw.map((stage, index) => {
    const previous = index === 0 ? null : raw[index - 1]?.value;
    if (previous === null || previous === undefined) return { ...stage, dropoff: null };
    // A stage cannot lose what never arrived, and product views legitimately
    // exceed sessions (several per visit) — a negative "dropoff" is not a loss.
    if (previous === 0) return { ...stage, dropoff: 0 };
    return { ...stage, dropoff: Math.max(0, ((previous - stage.value) / previous) * 100) };
  });
}

/**
 * Money for a chart axis. polaris-viz plots plain numbers, so minor units have
 * to become major units HERE — passing 129900 straight through is the classic
 * slip that renders a $1,299.00 day as a 129,900 spike.
 */
export function toChartValue(amount: number, currencyCode: string): number {
  return amount / minorUnitFactor(currencyCode);
}

export function chartSeries(
  points: { bucket: string; value: number }[],
  currencyCode: string,
): { key: string; value: number }[] {
  return points.map((point) => ({
    key: point.bucket,
    value: toChartValue(point.value, currencyCode),
  }));
}

/** `2026-08-28T00:00:00.000Z` → `Aug 28`, the axis label Shopify uses. */
export function axisLabel(isoBucket: string): string {
  return new Date(isoBucket).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Percent with one decimal, the way the conversion-rate card reads. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDelta(percent: number): string {
  return `${percent >= 0 ? '' : '-'}${Math.abs(percent).toFixed(1)}%`;
}

export const moneyOf = (amount: number, currencyCode: string): Money => ({ amount, currencyCode });
