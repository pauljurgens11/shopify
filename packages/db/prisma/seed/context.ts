/** Shared state threaded through every seed module (H1). */
import type { Rng } from './random.ts';

export interface SeedContext {
  shopId: string;
  /** Captured once, so every relative date in one run agrees with the others. */
  now: Date;
  rng: Rng;
  currencyCode: string;
  /** Flat rate, matching Shop.taxSettings (SPEC §10 — no tax providers). */
  taxRatePercentage: number;
}

/** `days` whole days before `now`, at a plausible hour rather than midnight. */
export function daysAgo(ctx: SeedContext, days: number, hour = 12, minute = 0): Date {
  const d = new Date(ctx.now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

/** UTC calendar day, the key both AnalyticsRollupDaily and the charts group on. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(`${dayKey(date)}T00:00:00.000Z`);
}
