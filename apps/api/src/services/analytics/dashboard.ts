/**
 * The analytics dashboard query (SPEC §13). Owner: WS-G.
 *
 * SPEC is explicit about the read model: **rollups plus today's raw**. Closed
 * days come from `AnalyticsRollupDaily` — written by H1's seed for history and
 * by the worker's 5-minute job since — and any day the rollup has not closed
 * yet is aggregated from raw events at read time. That is what keeps a dashboard
 * that must feel live off a table with millions of rows in it.
 *
 * Every amount stays integer minor units the whole way through; the chart layer
 * formats (SPEC §5).
 */
import { DEFAULT_CURRENCY } from '@merchant/config/money';
import type { AnalyticsDashboard } from '@merchant/contracts/analytics';
import type { TenantClient } from '@merchant/db/tenant';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_WINDOW_MS = 30 * 60 * 1000;

/** Mirrors the worker's rollup metric names; the two read and write one table. */
type Metric =
  | 'sales'
  | 'orders'
  | 'sessions'
  | 'product_views'
  | 'add_to_carts'
  | 'begin_checkouts'
  | 'purchases';

type Totals = Record<Metric, number>;

const EVENT_METRIC: Record<string, Metric> = {
  product_view: 'product_views',
  add_to_cart: 'add_to_carts',
  begin_checkout: 'begin_checkouts',
  purchase: 'purchases',
};

function emptyTotals(): Totals {
  return {
    sales: 0,
    orders: 0,
    sessions: 0,
    product_views: 0,
    add_to_carts: 0,
    begin_checkouts: 0,
    purchases: 0,
  };
}

function startOfUtcDay(when: Date): Date {
  return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
}

/** Every UTC day touched by [from, to], so the series can report the quiet ones. */
function daysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let d = startOfUtcDay(from); d <= startOfUtcDay(to); d = new Date(d.getTime() + DAY_MS)) {
    days.push(d);
  }
  return days;
}

const money = (amount: number, currencyCode: string) => ({ amount, currencyCode });

/**
 * Per-day totals for a window: rollup rows for the days that have them, raw
 * events (and Orders) for the days that do not.
 */
async function dailyTotals(db: TenantClient, from: Date, to: Date): Promise<Map<number, Totals>> {
  const days = daysBetween(from, to);
  const byDay = new Map<number, Totals>(days.map((d) => [d.getTime(), emptyTotals()]));
  if (days.length === 0) return byDay;

  const windowStart = days[0] as Date;
  const windowEnd = new Date((days[days.length - 1] as Date).getTime() + DAY_MS);

  const rollups = await db.analyticsRollupDaily.findMany({
    where: { date: { gte: windowStart, lt: windowEnd } },
    select: { date: true, metric: true, value: true },
  });

  const rolledUp = new Set<number>();
  for (const row of rollups) {
    const bucket = byDay.get(startOfUtcDay(row.date).getTime());
    if (!bucket) continue;
    rolledUp.add(startOfUtcDay(row.date).getTime());
    if (row.metric in bucket) bucket[row.metric as Metric] = row.value;
  }

  // Days the worker has not closed yet — today, and anything it has not reached.
  const open = days.filter((d) => !rolledUp.has(d.getTime()));
  if (open.length === 0) return byDay;

  const openStart = open[0] as Date;
  const openEnd = new Date((open[open.length - 1] as Date).getTime() + DAY_MS);

  const [events, sessions, orders] = await Promise.all([
    db.analyticsEvent.findMany({
      where: { occurredAt: { gte: openStart, lt: openEnd } },
      select: { type: true, occurredAt: true },
    }),
    db.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { occurredAt: { gte: openStart, lt: openEnd } },
      _min: { occurredAt: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: openStart, lt: openEnd }, cancelledAt: null },
      select: { total: true, createdAt: true },
    }),
  ]);

  const openDays = new Set(open.map((d) => d.getTime()));
  const bucketFor = (when: Date): Totals | undefined => {
    const key = startOfUtcDay(when).getTime();
    return openDays.has(key) ? byDay.get(key) : undefined;
  };

  for (const event of events) {
    const bucket = bucketFor(event.occurredAt);
    const metric = EVENT_METRIC[event.type];
    if (bucket && metric) bucket[metric] += 1;
  }
  for (const session of sessions) {
    // A session is counted on the day it started, so one that straddles
    // midnight is not counted twice.
    const first = session._min.occurredAt;
    if (!first) continue;
    const bucket = bucketFor(first);
    if (bucket) bucket.sessions += 1;
  }
  for (const order of orders) {
    const bucket = bucketFor(order.createdAt);
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.sales += order.total;
  }

  return byDay;
}

function sumTotals(byDay: Map<number, Totals>): Totals {
  const total = emptyTotals();
  for (const day of byDay.values()) {
    for (const metric of Object.keys(total) as Metric[]) total[metric] += day[metric];
  }
  return total;
}

/** Integer minor units, half-up. Never a fractional cent on a dashboard. */
function averageOrderValue(sales: number, orders: number): number {
  return orders === 0 ? 0 : Math.round(sales / orders);
}

function conversionRate(purchases: number, sessions: number): number {
  if (sessions === 0) return 0;
  return Math.min(100, (purchases / sessions) * 100);
}

function series(byDay: Map<number, Totals>, metric: Metric) {
  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, totals]) => ({ bucket: new Date(day).toISOString(), value: totals[metric] }));
}

async function topProducts(db: TenantClient, from: Date, to: Date, currencyCode: string) {
  // Revenue from ORDER LINE ITEMS rather than purchase events: an event carries
  // only the order total, so it cannot say which product earned what. Cancelled
  // orders are excluded to match the `sales` metric.
  const lines = await db.orderLineItem.findMany({
    where: {
      productId: { not: null },
      order: { createdAt: { gte: from, lt: to }, cancelledAt: null },
    },
    select: {
      productId: true,
      title: true,
      imageUrl: true,
      quantity: true,
      price: true,
      totalDiscount: true,
    },
  });

  const byProduct = new Map<
    string,
    { title: string; imageUrl: string | null; unitsSold: number; revenue: number }
  >();
  for (const line of lines) {
    if (!line.productId) continue;
    const entry = byProduct.get(line.productId) ?? {
      title: line.title,
      imageUrl: line.imageUrl,
      unitsSold: 0,
      revenue: 0,
    };
    entry.unitsSold += line.quantity;
    entry.revenue += line.price * line.quantity - line.totalDiscount;
    byProduct.set(line.productId, entry);
  }

  return [...byProduct.entries()]
    .map(([productId, entry]) => ({
      productId,
      title: entry.title,
      imageUrl: entry.imageUrl,
      unitsSold: entry.unitsSold,
      revenue: money(entry.revenue, currencyCode),
    }))
    .sort((a, b) => b.revenue.amount - a.revenue.amount)
    .slice(0, 10);
}

export async function getDashboard(
  db: TenantClient,
  shopId: string,
  range: { from: Date; to: Date },
): Promise<AnalyticsDashboard> {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { currencyCode: true },
  });
  const currencyCode = shop?.currencyCode ?? DEFAULT_CURRENCY;

  const byDay = await dailyTotals(db, range.from, range.to);
  const totals = sumTotals(byDay);

  // The comparison window is the same length, immediately before. Measured in
  // DAYS, not in elapsed milliseconds: a range covering the 27th and the 28th
  // spans two days but only 24h of clock, and comparing it against a single day
  // makes every delta chip on the dashboard wrong.
  const spanMs = daysBetween(range.from, range.to).length * DAY_MS;
  const previous = await dailyTotals(
    db,
    new Date(startOfUtcDay(range.from).getTime() - spanMs),
    new Date(startOfUtcDay(range.from).getTime() - DAY_MS),
  );
  const previousTotals = sumTotals(previous);

  return {
    summary: {
      totalSales: money(totals.sales, currencyCode),
      orderCount: totals.orders,
      averageOrderValue: money(averageOrderValue(totals.sales, totals.orders), currencyCode),
      sessionCount: totals.sessions,
      conversionRate: conversionRate(totals.purchases, totals.sessions),
      comparison: {
        totalSales: money(previousTotals.sales, currencyCode),
        orderCount: previousTotals.orders,
        sessionCount: previousTotals.sessions,
      },
    },
    salesOverTime: series(byDay, 'sales'),
    ordersOverTime: series(byDay, 'orders'),
    sessionsOverTime: series(byDay, 'sessions'),
    topProducts: await topProducts(
      db,
      range.from,
      new Date(range.to.getTime() + DAY_MS),
      currencyCode,
    ),
    // SPEC §13: render one channel, do not architect channels.
    salesByChannel: [{ channel: 'Online Store', revenue: money(totals.sales, currencyCode) }],
    funnel: {
      sessions: totals.sessions,
      productViews: totals.product_views,
      addedToCart: totals.add_to_carts,
      reachedCheckout: totals.begin_checkouts,
      purchased: totals.purchases,
    },
  };
}

/** "Right now" card: last 30 minutes of traffic, plus orders so far today. */
export async function getLiveView(
  db: TenantClient,
  now: Date = new Date(),
): Promise<{ visitors: number; ordersToday: number }> {
  const [sessions, ordersToday] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: { occurredAt: { gte: new Date(now.getTime() - LIVE_WINDOW_MS) } },
    }),
    db.order.count({ where: { createdAt: { gte: startOfUtcDay(now) }, cancelledAt: null } }),
  ]);

  return { visitors: sessions.length, ordersToday };
}
