/**
 * Daily analytics rollup (SPEC §13). Owner: WS-G.
 *
 * Repeatable every 5 minutes (registered at worker boot in `../index.ts`). Each
 * run re-aggregates TODAY and YESTERDAY for every shop: today because it is
 * still moving, yesterday because a beacon sent on unload can arrive after
 * midnight. Older days never change, so they are written once — by H1's seed
 * for the demo history, and by this job the first time it sees them.
 *
 * The metric definitions here MUST match `packages/db/prisma/seed/analytics.ts`.
 * The seed writes the closed days and this job writes the open ones, so any
 * disagreement shows up as a step in the chart exactly where history meets live
 * data. `analytics-rollup.test.ts` pins the seven metrics against real rows.
 */
import { QUEUES } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { JOB_NAMES } from '@merchant/config/queue';
// dbAdmin: rolling up every tenant is a platform-level sweep — there is no shop
// to scope the shop LIST itself to. This file is allowlisted in biome.json for
// exactly that one query; every read below it goes through dbForShop.
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import { logger } from '../lib/logger.ts';
import type { JobDefinition } from './types.ts';

/** Exactly the metrics H1's seed writes. Adding one means backfilling history. */
export const ROLLUP_METRICS = [
  'sales',
  'orders',
  'sessions',
  'product_views',
  'add_to_carts',
  'begin_checkouts',
  'purchases',
] as const;
export type RollupMetric = (typeof ROLLUP_METRICS)[number];

/** Event type → the metric it increments. `page_view` feeds `sessions` only. */
const EVENT_METRIC: Record<string, RollupMetric> = {
  product_view: 'product_views',
  add_to_cart: 'add_to_carts',
  begin_checkout: 'begin_checkouts',
  purchase: 'purchases',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** `AnalyticsRollupDaily.date` is a DATE column; buckets are UTC days. */
export function startOfUtcDay(when: Date): Date {
  return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
}

/**
 * Recompute one UTC day for one shop and upsert its metrics.
 *
 * Every metric gets a row even when it is zero: a series that skips empty days
 * draws a line straight through them, which reads as steady traffic rather than
 * no traffic.
 */
export async function rollupDay(
  db: TenantClient,
  shopId: string,
  day: Date,
): Promise<Record<RollupMetric, number>> {
  const date = startOfUtcDay(day);
  const window = { gte: date, lt: new Date(date.getTime() + DAY_MS) };

  const [byType, sessions, orders, sales] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ['type'], where: { occurredAt: window }, _count: true }),
    // Prisma has no countDistinct; grouping by sessionId and counting the groups
    // is the same query, and the (shopId, sessionId) index covers it.
    db.analyticsEvent.groupBy({ by: ['sessionId'], where: { occurredAt: window } }),
    // Orders, not purchase events: a cancelled order must leave the revenue it
    // never earned out of the chart, and only the order row knows it was cancelled.
    db.order.count({ where: { createdAt: window, cancelledAt: null } }),
    db.order.aggregate({ _sum: { total: true }, where: { createdAt: window, cancelledAt: null } }),
  ]);

  const values = Object.fromEntries(ROLLUP_METRICS.map((m) => [m, 0])) as Record<
    RollupMetric,
    number
  >;
  for (const row of byType) {
    const metric = EVENT_METRIC[row.type];
    if (metric) values[metric] = row._count;
  }
  values.sessions = sessions.length;
  values.orders = orders;
  values.sales = sales._sum.total ?? 0;

  for (const metric of ROLLUP_METRICS) {
    await db.analyticsRollupDaily.upsert({
      where: { shopId_date_metric: { shopId, date, metric } },
      create: { id: newId('event'), shopId, date, metric, value: values[metric] },
      update: { value: values[metric] },
    });
  }

  return values;
}

async function handler(): Promise<void> {
  const now = new Date();
  const days = [startOfUtcDay(now), new Date(startOfUtcDay(now).getTime() - DAY_MS)];

  const shops = await dbAdmin.shop.findMany({ select: { id: true } });
  for (const shop of shops) {
    const db = dbForShop(shop.id);
    for (const day of days) {
      // One bad shop must not stop the sweep for the rest.
      try {
        await rollupDay(db, shop.id, day);
      } catch (err) {
        logger.error('analytics rollup failed', {
          shopId: shop.id,
          day: day.toISOString().slice(0, 10),
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  logger.debug('analytics rollup swept', { shops: shops.length });
}

export const analyticsRollupJob: JobDefinition = {
  name: JOB_NAMES.analyticsRollup,
  queue: QUEUES.analytics,
  handler,
};
