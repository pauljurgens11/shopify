/**
 * Date ranges, deltas and chart shaping for the Analytics dashboard (SPEC §13).
 * Owner: WS-G.
 *
 * Pure on purpose: this is where the dashboard can quietly lie — an off-by-one
 * range, a delta computed against zero, or an axis rendering 129900 instead of
 * $1,299.00 — and none of that is visible in a screenshot.
 */
import { type Money, toDecimal } from '@merchant/config/money';

export type RangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'wtd'
  | 'mtd'
  | 'qtd'
  | 'ytd'
  | 'custom';

export type DateRange = { from: Date; to: Date };

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'wtd', label: 'Week to date' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'qtd', label: 'Quarter to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom range' },
];

/**
 * The preset rail, grouped exactly the way Shopify's date-range popover groups
 * it (docs/parity/dashboard.md): Today/Yesterday, then the rolling windows,
 * then the period-to-date set, then Custom range — thin separator between each.
 *
 * Shopify nests `Last ⟩` and `Period to date ⟩` behind submenus; ours are
 * flattened (DECISIONS.md) — a submenu is two extra clicks for four options.
 */
export const PRESET_GROUPS: RangePreset[][] = [
  ['today', 'yesterday'],
  ['7d', '30d', '90d'],
  ['wtd', 'mtd', 'qtd', 'ytd'],
  ['custom'],
];

export function presetLabel(preset: RangePreset): string {
  return RANGE_OPTIONS.find((option) => option.value === preset)?.label ?? 'Custom range';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days each rolling preset covers, today included. */
const SPAN_DAYS: Record<'today' | 'yesterday' | '7d' | '30d' | '90d', number> = {
  today: 1,
  yesterday: 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function startOfUtcDay(when: Date): Date {
  return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
}

/**
 * The window a preset asks the API for, in UTC days.
 *
 * "Last 7 days" is today plus the six before it — seven buckets, not eight.
 * The API buckets by UTC day, so both ends are day starts and `to` is
 * INCLUSIVE. `custom` has no window of its own — the picker carries one — so it
 * falls back to today rather than throwing at render time.
 */
export function rangeFor(preset: RangePreset, now: Date): DateRange {
  const today = startOfUtcDay(now);

  switch (preset) {
    case 'yesterday': {
      const day = new Date(today.getTime() - DAY_MS);
      return { from: day, to: day };
    }
    case 'wtd': {
      // Weeks start on Sunday, matching the `Sun Mon Tue …` calendar header.
      return { from: new Date(today.getTime() - today.getUTCDay() * DAY_MS), to: today };
    }
    case 'mtd':
      return {
        from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
        to: today,
      };
    case 'qtd':
      return {
        from: new Date(
          Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3, 1),
        ),
        to: today,
      };
    case 'ytd':
      return { from: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)), to: today };
    case 'custom':
      return { from: today, to: today };
    default:
      return { from: new Date(today.getTime() - (SPAN_DAYS[preset] - 1) * DAY_MS), to: today };
  }
}

/** Whole UTC days in an inclusive range — the unit every comparison uses. */
export function spanDays(range: DateRange): number {
  return (
    Math.round((startOfUtcDay(range.to).getTime() - startOfUtcDay(range.from).getTime()) / DAY_MS) +
    1
  );
}

/**
 * The period the deltas are measured against: the same number of DAYS,
 * immediately before. This mirrors `getDashboard` exactly — the pill would
 * otherwise announce a window the server never compared against.
 */
export function comparisonRangeFor(range: DateRange): DateRange {
  const from = startOfUtcDay(range.from);
  const days = spanDays(range);
  return { from: new Date(from.getTime() - days * DAY_MS), to: new Date(from.getTime() - DAY_MS) };
}

export function rangeQueryString(preset: RangePreset, now: Date): string {
  return queryStringFor(rangeFor(preset, now));
}

export function queryStringFor(range: DateRange): string {
  return `from=${startOfUtcDay(range.from).toISOString()}&to=${startOfUtcDay(range.to).toISOString()}`;
}

/** `Aug 29, 2026` — the format both date inputs and both pills use. */
export function formatDay(day: Date): string {
  return day.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The pill's label: one day reads as a date, a span as `Aug 1–Aug 29, 2026`. */
export function formatRangeLabel(range: DateRange): string {
  const from = startOfUtcDay(range.from);
  const to = startOfUtcDay(range.to);
  const short = (day: Date) =>
    day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  if (from.getTime() === to.getTime()) {
    return to.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return `${short(from)}–${short(to)}, ${to.getUTCFullYear()}`;
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
  return toDecimal({ amount, currencyCode });
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

/**
 * Money for a y-axis TICK: currency symbol, no minor units — `$800`, not
 * `$800.00`. The parity capture's axis reads `€0 €5 €10`; cents on every tick
 * is the single loudest way our chart stops looking like Shopify's.
 *
 * Takes MAJOR units, because that is what the plot is drawn in.
 */
export function axisMoney(major: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(major);
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

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * Parse what someone typed into one of the popover's two date fields.
 *
 * Accepts exactly the two forms the field itself round-trips —
 * `August 29, 2026` (or `Aug 29 2026`) and `2026-08-29` — and returns a UTC day
 * start. Anything else is null, and the field snaps back.
 *
 * Deliberately NOT `new Date(text)`: V8's fallback parser turns `Augst 29` into
 * August 29 **2001**, so a typo would silently move the dashboard to a range
 * five years wrong with no error anywhere.
 */
export function parseDayInput(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const utcDay = (year: number, monthIndex: number, day: number): Date | null => {
    const parsed = new Date(Date.UTC(year, monthIndex, day));
    // Rejects the 31st of a 30-day month, which `Date.UTC` would roll forward.
    return parsed.getUTCMonth() === monthIndex && parsed.getUTCDate() === day ? parsed : null;
  };

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso?.[1] && iso[2] && iso[3]) {
    return utcDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const named = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(trimmed);
  if (named?.[1] && named[2] && named[3]) {
    const name = named[1].toLowerCase();
    const monthIndex = MONTH_NAMES.findIndex(
      (month) => month === name || month.slice(0, 3) === name,
    );
    if (monthIndex === -1) return null;
    return utcDay(Number(named[3]), monthIndex, Number(named[2]));
  }

  return null;
}

/** The preset whose window equals this range, or `custom` when none does. */
export function presetForRange(range: DateRange, now: Date): RangePreset {
  const from = startOfUtcDay(range.from).getTime();
  const to = startOfUtcDay(range.to).getTime();
  for (const { value } of RANGE_OPTIONS) {
    if (value === 'custom') continue;
    const candidate = rangeFor(value, now);
    if (candidate.from.getTime() === from && candidate.to.getTime() === to) return value;
  }
  return 'custom';
}
