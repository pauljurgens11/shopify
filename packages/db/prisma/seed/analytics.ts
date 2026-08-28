/**
 * Sixty days of browsing traffic, plus the daily rollups (H1, SPEC §13).
 *
 * Two jobs. First, make the Analytics dashboard and Home cards (G3) look like a
 * real store: a funnel that narrows sensibly (sessions → product views → carts →
 * checkouts → purchases) and a session count around 30× orders, so the
 * conversion rate reads as a plausible ~3%. Second, backfill
 * `AnalyticsRollupDaily` for every *closed* day, because the dashboard reads
 * rollups rather than raw events — without the backfill G3 renders an empty
 * chart until the worker's next cycle.
 *
 * Today is deliberately left out of the rollups: it is still open, and the
 * dashboard is specified to read rollups plus today's raw events.
 */
import { newId } from '@merchant/config/ids';
import type { PrismaClient } from '@prisma/client';
import type { SeededProduct } from './catalog.ts';
import { dayKey, daysAgo, type SeedContext, startOfUtcDay } from './context.ts';
import type { SeededOrder } from './orders.ts';
import { HISTORY_DAYS, OLDEST_HISTORY_DAY } from './orders.ts';
import { skewRecent } from './random.ts';

/** SPEC §7: sessions ≈ 30 × orders. 40 orders → ~1,200 sessions over 60 days. */
const SESSIONS_PER_ORDER = 30;

interface EventRow {
  id: string;
  shopId: string;
  type: string;
  sessionId: string;
  path: string;
  productId: string | null;
  orderId: string | null;
  value: number | null;
  occurredAt: Date;
}

export async function createAnalytics(
  db: PrismaClient,
  ctx: SeedContext,
  input: { products: SeededProduct[]; orders: SeededOrder[] },
): Promise<void> {
  const sellable = input.products.filter((p) => p.status === 'active');
  const rows: EventRow[] = [];

  const push = (
    type: string,
    sessionId: string,
    path: string,
    occurredAt: Date,
    extra: { productId?: string; orderId?: string; value?: number } = {},
  ) => {
    rows.push({
      id: newId('event'),
      shopId: ctx.shopId,
      type,
      sessionId,
      path,
      productId: extra.productId ?? null,
      orderId: extra.orderId ?? null,
      value: extra.value ?? null,
      occurredAt,
    });
  };

  /* --- browsing traffic -------------------------------------------------- */
  const sessionCount = input.orders.length * SESSIONS_PER_ORDER;

  for (let i = 0; i < sessionCount; i++) {
    // Same recency skew as the orders, so traffic and revenue trend together.
    const day =
      OLDEST_HISTORY_DAY + Math.round((1 - skewRecent(ctx.rng, 1.6)) * (HISTORY_DAYS - 1));
    const start = daysAgo(ctx, day, ctx.rng.int(7, 22), ctx.rng.int(0, 59));

    const sessionId = `ses_${(i + 1).toString(36).padStart(6, '0')}`;
    let at = start;
    const step = () => {
      at = new Date(at.getTime() + ctx.rng.int(20, 180) * 1000);
      return at;
    };

    push('page_view', sessionId, '/', start);

    // Most visits bounce off the home page; the rest browse a collection.
    if (ctx.rng.chance(0.55)) {
      push('page_view', sessionId, '/collections/featured', step());
    }

    const viewed = ctx.rng.sample(sellable, ctx.rng.int(0, 3));
    for (const product of viewed) {
      const viewedAt = step();
      push('page_view', sessionId, `/products/${product.handle}`, viewedAt, {
        productId: product.id,
      });
      push('product_view', sessionId, `/products/${product.handle}`, viewedAt, {
        productId: product.id,
      });
    }

    // A quarter of browsing sessions add something, half of those start a
    // checkout, and well under half of those finish — most carts are abandoned,
    // which is what makes the funnel chart worth showing at all.
    if (viewed.length > 0 && ctx.rng.chance(0.26)) {
      const product = ctx.rng.pick(viewed);
      push('add_to_cart', sessionId, '/cart', step(), { productId: product.id });
      if (ctx.rng.chance(0.5)) push('begin_checkout', sessionId, '/checkout', step());
    }
  }

  /* --- purchases ---------------------------------------------------------- */
  // Recorded server-side at order creation (analytics.ts contract), so these are
  // exactly the surviving orders — one event each, valued at the order total.
  for (const order of input.orders) {
    if (order.cancelled) continue;
    push('purchase', `ses_order_${order.orderNumber}`, '/checkout/complete', order.createdAt, {
      orderId: order.id,
      value: order.total,
    });
  }

  // Chunked: a single 20k-row createMany exceeds Postgres' parameter limit.
  for (let i = 0; i < rows.length; i += 2000) {
    await db.analyticsEvent.createMany({ data: rows.slice(i, i + 2000) });
  }

  await createRollups(db, ctx, rows, input.orders);
}

/**
 * Daily rollups for closed days only. Computed from the same in-memory rows the
 * events were written from, so the rollups and the raw data cannot disagree —
 * which is what makes G2's rollup job verifiable against this baseline.
 */
async function createRollups(
  db: PrismaClient,
  ctx: SeedContext,
  events: EventRow[],
  orders: SeededOrder[],
): Promise<void> {
  const today = dayKey(ctx.now);
  const buckets = new Map<string, Map<string, number | Set<string>>>();

  const bump = (day: string, metric: string, by: number) => {
    const bucket = buckets.get(day) ?? new Map<string, number | Set<string>>();
    bucket.set(metric, ((bucket.get(metric) as number) ?? 0) + by);
    buckets.set(day, bucket);
  };
  const track = (day: string, metric: string, sessionId: string) => {
    const bucket = buckets.get(day) ?? new Map<string, number | Set<string>>();
    const set = (bucket.get(metric) as Set<string>) ?? new Set<string>();
    set.add(sessionId);
    bucket.set(metric, set);
    buckets.set(day, bucket);
  };

  for (const event of events) {
    const day = dayKey(event.occurredAt);
    if (day >= today) continue; // today is still open

    track(day, 'sessions', event.sessionId);
    if (event.type === 'product_view') bump(day, 'product_views', 1);
    if (event.type === 'add_to_cart') bump(day, 'add_to_carts', 1);
    if (event.type === 'purchase') bump(day, 'purchases', 1);
  }

  for (const order of orders) {
    const day = dayKey(order.createdAt);
    if (day >= today || order.cancelled) continue;
    bump(day, 'orders', 1);
    bump(day, 'sales', order.total);
  }

  const METRICS = ['sales', 'orders', 'sessions', 'product_views', 'add_to_carts', 'purchases'];

  await db.analyticsRollupDaily.createMany({
    data: [...buckets.entries()].flatMap(([day, bucket]) =>
      // Every metric gets a row for every day, zeros included — a chart that
      // skips empty days draws a misleading line.
      METRICS.map((metric) => {
        const raw = bucket.get(metric);
        const value = raw instanceof Set ? raw.size : (raw ?? 0);
        return {
          id: newId('event'),
          shopId: ctx.shopId,
          date: startOfUtcDay(new Date(`${day}T00:00:00.000Z`)),
          metric,
          value,
        };
      }),
    ),
  });
}
