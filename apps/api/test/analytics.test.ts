/**
 * G2 — the analytics query API.
 *
 * What is worth testing here is the arithmetic the dashboard renders and the
 * places it can lie: a conversion rate that divides by zero, a series that
 * silently drops empty days, today's traffic missing because the reader only
 * looked at rollups, and a neighbour's revenue landing in your chart.
 *
 * Deliberately absent: per-endpoint CRUD round-trips (SPEC §14 forbids them)
 * and general cross-tenant sweeps, which are A2's suite.
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  createStaffUser,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let neighbour: TestShop;
let staleShop: TestShop;
let breakdownShop: TestShop;
let cookie: string;
let staleCookie: string;
let breakdownCookie: string;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Rollups cover closed days; "today" must come from raw events. */
const today = new Date(Date.UTC(2026, 7, 28));
const utcDay = (offset: number) => new Date(today.getTime() + offset * DAY_MS);
const startOfUtcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

async function rollup(shopId: string, day: Date, metrics: Record<string, number>) {
  for (const [metric, value] of Object.entries(metrics)) {
    await dbAdmin.analyticsRollupDaily.create({
      data: { id: newId('event'), shopId, date: day, metric, value },
    });
  }
}

async function event(
  shopId: string,
  type: string,
  sessionId: string,
  occurredAt: Date,
  value?: number,
) {
  await dbAdmin.analyticsEvent.create({
    data: {
      id: newId('event'),
      shopId,
      type,
      sessionId,
      path: '/',
      occurredAt,
      value: value ?? null,
    },
  });
}

function get(url: string, options: { cookie?: string } = {}) {
  return app.inject({
    method: 'GET',
    url,
    headers: { host: 'api.lvh.me:3001', cookie: options.cookie ?? cookie },
  });
}

const range = (fromOffset: number, toOffset: number) =>
  `from=${utcDay(fromOffset).toISOString()}&to=${utcDay(toOffset).toISOString()}`;

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  neighbour = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });

  // Three closed days. Day -2 is deliberately empty of everything but zeros,
  // to prove the series does not skip it.
  await rollup(shop.shopId, utcDay(-3), {
    sales: 30_000,
    orders: 3,
    sessions: 100,
    product_views: 40,
    add_to_carts: 12,
    begin_checkouts: 6,
    purchases: 3,
  });
  await rollup(shop.shopId, utcDay(-2), {
    sales: 0,
    orders: 0,
    sessions: 0,
    product_views: 0,
    add_to_carts: 0,
    begin_checkouts: 0,
    purchases: 0,
  });
  await rollup(shop.shopId, utcDay(-1), {
    sales: 20_000,
    orders: 2,
    sessions: 50,
    product_views: 20,
    add_to_carts: 8,
    begin_checkouts: 4,
    purchases: 2,
  });

  // Today, raw only — no rollup row exists yet, which is the point.
  await event(shop.shopId, 'page_view', 'ses_t1', today);
  await event(shop.shopId, 'product_view', 'ses_t1', today);
  await event(shop.shopId, 'add_to_cart', 'ses_t2', today);
  await event(shop.shopId, 'purchase', 'ses_t2', today, 5_000);
  // Revenue is read from Order rows even on open days, so a cancelled order
  // cannot inflate the chart. The purchase event above is what `recordPurchaseEvent`
  // writes alongside it at order creation.
  await dbAdmin.order.create({
    data: {
      id: newId('order'),
      shopId: shop.shopId,
      orderNumber: 5001,
      email: 'buyer@example.com',
      currencyCode: 'USD',
      subtotal: 5_000,
      total: 5_000,
      createdAt: today,
    },
  });

  // The neighbour is loud on every day in range.
  await rollup(neighbour.shopId, utcDay(-1), { sales: 999_999, orders: 99, sessions: 999 });
  await event(neighbour.shopId, 'purchase', 'ses_n', today, 999_999);

  // A shop whose TODAY — the real clock's UTC day, not the fixed dates above —
  // already has rollup rows. That is the normal case, not an edge: the worker
  // upserts the current day every 5 minutes, so today's rollup exists and is
  // up to 5 minutes stale. Its own shop, so the real clock never collides with
  // the fixed-date seeds.
  staleShop = await createTestShop();
  staleCookie = await sessionCookie(app, {
    shopId: staleShop.shopId,
    staffUserId: staleShop.ownerId,
  });
  const now = new Date();
  await rollup(staleShop.shopId, startOfUtcDay(now), {
    sales: 0,
    orders: 0,
    sessions: 0,
    product_views: 0,
    add_to_carts: 0,
    begin_checkouts: 0,
    purchases: 0,
  });
  await event(staleShop.shopId, 'page_view', 'ses_now', now);
  await event(staleShop.shopId, 'purchase', 'ses_now', now, 4_200);
  await dbAdmin.order.create({
    data: {
      id: newId('order'),
      shopId: staleShop.shopId,
      orderNumber: 1001,
      email: 'buyer@example.com',
      currencyCode: 'USD',
      subtotal: 4_200,
      total: 4_200,
      createdAt: now,
    },
  });

  // A shop whose orders carry every money component, so the breakdown card has
  // something to tie out against. Today and yesterday are both OPEN days here
  // (no rollup rows), which is the only state in which the rollup-backed `sales`
  // metric and the order-backed breakdown are reading the same underlying rows —
  // exactly the production case, where the worker computes the rollup FROM those
  // orders.
  breakdownShop = await createTestShop();
  breakdownCookie = await sessionCookie(app, {
    shopId: breakdownShop.shopId,
    staffUserId: breakdownShop.ownerId,
  });
  const breakdownToday = startOfUtcDay(now);
  const breakdownYesterday = new Date(breakdownToday.getTime() - DAY_MS);
  const order = (
    orderNumber: number,
    createdAt: Date,
    totals: {
      subtotal: number;
      discountTotal?: number;
      shippingTotal?: number;
      taxTotal?: number;
      total: number;
    },
    cancelledAt?: Date,
  ) =>
    dbAdmin.order.create({
      data: {
        id: newId('order'),
        shopId: breakdownShop.shopId,
        orderNumber,
        email: 'buyer@example.com',
        currencyCode: 'USD',
        createdAt,
        cancelledAt: cancelledAt ?? null,
        ...totals,
      },
    });

  // 10,000 - 1,500 + 500 + 800 = 9,800
  await order(2001, breakdownToday, {
    subtotal: 10_000,
    discountTotal: 1_500,
    shippingTotal: 500,
    taxTotal: 800,
    total: 9_800,
  });
  // 4,000 + 320 = 4,320
  await order(2002, breakdownToday, { subtotal: 4_000, taxTotal: 320, total: 4_320 });
  // Cancelled: revenue the store never earned must stay out of every row.
  await order(
    2003,
    breakdownToday,
    { subtotal: 99_999, total: 99_999 },
    new Date(breakdownToday.getTime() + 60_000),
  );
  await order(2004, breakdownYesterday, { subtotal: 5_000, total: 5_000 });
});

afterAll(async () => {
  await app.close();
  // Orders are not part of `deleteTestShops` (payments reference them), so this
  // suite clears its own.
  await dbAdmin.order.deleteMany({
    where: {
      shopId: { in: [shop.shopId, neighbour.shopId, staleShop.shopId, breakdownShop.shopId] },
    },
  });
  await deleteTestShops([shop.shopId, neighbour.shopId, staleShop.shopId, breakdownShop.shopId]);
});

describe('GET /admin/api/analytics', () => {
  it('sums closed days from rollups and merges today from raw events', async () => {
    const response = await get(`/admin/api/analytics?${range(-3, 0)}`);
    expect(response.statusCode).toBe(200);
    const body = response.json();

    // 30,000 + 0 + 20,000 from rollups, + 5,000 from today's raw purchase.
    expect(body.summary.totalSales).toEqual({ amount: 55_000, currencyCode: 'USD' });
    expect(body.summary.orderCount).toBe(6); // 3 + 0 + 2 rolled up, + 1 today
    expect(body.summary.sessionCount).toBe(152); // 100 + 0 + 50, + 2 today
  });

  it('reports every day in the range, zeros included', async () => {
    const body = (await get(`/admin/api/analytics?${range(-3, 0)}`)).json();

    expect(body.salesOverTime).toHaveLength(4);
    expect(body.salesOverTime.map((p: { value: number }) => p.value)).toEqual([
      30_000, 0, 20_000, 5_000,
    ]);
    // A chart that skips the quiet day draws a straight line through it.
    expect(body.salesOverTime[1].bucket).toBe(utcDay(-2).toISOString());
  });

  it('computes AOV and conversion rate from the period totals', async () => {
    const body = (await get(`/admin/api/analytics?${range(-3, 0)}`)).json();

    // 55,000 / 6 orders = 9,166.67 → integer minor units, no float cents.
    expect(body.summary.averageOrderValue.amount).toBe(9_167);
    expect(Number.isInteger(body.summary.averageOrderValue.amount)).toBe(true);
    // 6 purchases / 152 sessions = 3.947%
    expect(body.summary.conversionRate).toBeCloseTo(3.95, 1);
  });

  it('returns zeros rather than NaN for a period with no traffic at all', async () => {
    const body = (await get(`/admin/api/analytics?${range(-30, -20)}`)).json();

    expect(body.summary.conversionRate).toBe(0);
    expect(body.summary.averageOrderValue).toEqual({ amount: 0, currencyCode: 'USD' });
    expect(body.summary.totalSales).toEqual({ amount: 0, currencyCode: 'USD' });
    expect(body.summary.orderCount).toBe(0);
  });

  it('compares against the immediately preceding period of equal length', async () => {
    const body = (await get(`/admin/api/analytics?${range(-1, 0)}`)).json();

    // Range is 2 days (-1, 0); the comparison window is days -3 and -2.
    expect(body.summary.comparison).not.toBeNull();
    expect(body.summary.comparison.totalSales).toEqual({ amount: 30_000, currencyCode: 'USD' });
    expect(body.summary.comparison.orderCount).toBe(3);
  });

  it('counts the funnel down the stages', async () => {
    const body = (await get(`/admin/api/analytics?${range(-3, 0)}`)).json();

    expect(body.funnel).toEqual({
      sessions: 152,
      productViews: 61, // 40 + 0 + 20 rolled up, + 1 today
      addedToCart: 21, // 12 + 0 + 8, + 1 today
      reachedCheckout: 10, // 6 + 0 + 4, none today
      purchased: 6, // 3 + 0 + 2, + 1 today
    });
  });

  it('reports a single Online Store channel carrying the period total', async () => {
    const body = (await get(`/admin/api/analytics?${range(-3, 0)}`)).json();

    expect(body.salesByChannel).toEqual([
      { channel: 'Online Store', revenue: { amount: 55_000, currencyCode: 'USD' } },
    ]);
  });

  it("reads today from raw data even though the worker's rollup row for it exists", async () => {
    const utcToday = startOfUtcDay(new Date());
    const query = `from=${utcToday.toISOString()}&to=${utcToday.toISOString()}`;
    const body = (await get(`/admin/api/analytics?${query}`, { cookie: staleCookie })).json();

    // The rollup for today says zero across the board — it is up to 5 minutes
    // behind. The raw order and events are what the merchant must see.
    expect(body.summary.totalSales).toEqual({ amount: 4_200, currencyCode: 'USD' });
    expect(body.summary.orderCount).toBe(1);
    expect(body.summary.sessionCount).toBe(1);
    expect(body.salesOverTime).toEqual([{ bucket: utcToday.toISOString(), value: 4_200 }]);
  });

  it('never counts a neighbouring shop', async () => {
    const body = (await get(`/admin/api/analytics?${range(-3, 0)}`)).json();
    expect(body.summary.totalSales.amount).toBe(55_000);
    expect(body.summary.sessionCount).toBe(152);
  });

  it('rejects a range it cannot parse', async () => {
    const response = await get('/admin/api/analytics?from=yesterday&to=today');
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });

  it('requires the analytics permission', async () => {
    const staffUserId = await createStaffUser(shop.shopId, {
      email: 'nosy@example.com',
      role: 'staff',
      permissions: { products: true },
    });
    const staffCookie = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId,
      role: 'staff',
      permissions: { products: true },
    });

    const response = await get(`/admin/api/analytics?${range(-1, 0)}`, { cookie: staffCookie });
    expect(response.statusCode).toBe(403);
    expect(response.json().errors[0].code).toBe('forbidden');
  });
});

describe('sales breakdown and comparison series', () => {
  const todayOnly = () => {
    const day = startOfUtcDay(new Date()).toISOString();
    return `from=${day}&to=${day}`;
  };

  it('breaks the period down into rows that tie back to the headline figure', async () => {
    const body = (
      await get(`/admin/api/analytics?${todayOnly()}`, { cookie: breakdownCookie })
    ).json();

    expect(body.salesBreakdown).toEqual({
      grossSales: { amount: 14_000, currencyCode: 'USD' },
      discounts: { amount: 1_500, currencyCode: 'USD' },
      netSales: { amount: 12_500, currencyCode: 'USD' },
      shippingCharges: { amount: 500, currencyCode: 'USD' },
      taxes: { amount: 1_120, currencyCode: 'USD' },
      totalSales: { amount: 14_120, currencyCode: 'USD' },
    });

    // The card sits directly under the `Total sales` tile. If these two ever
    // disagree the dashboard is telling a merchant two different numbers.
    expect(body.salesBreakdown.totalSales).toEqual(body.summary.totalSales);

    // The identities the card renders as arithmetic the reader can follow.
    const { grossSales, discounts, netSales, shippingCharges, taxes, totalSales } =
      body.salesBreakdown;
    expect(netSales.amount).toBe(grossSales.amount - discounts.amount);
    expect(totalSales.amount).toBe(netSales.amount + shippingCharges.amount + taxes.amount);
  });

  it('leaves a cancelled order out of every breakdown row', async () => {
    const body = (
      await get(`/admin/api/analytics?${todayOnly()}`, { cookie: breakdownCookie })
    ).json();

    // Order 2003 is 99,999 and cancelled — it must not appear anywhere.
    expect(body.salesBreakdown.grossSales.amount).toBe(14_000);
    expect(body.summary.orderCount).toBe(2);
  });

  it('returns the previous period as its own breakdown, for the delta chips', async () => {
    const body = (
      await get(`/admin/api/analytics?${todayOnly()}`, { cookie: breakdownCookie })
    ).json();

    expect(body.comparisonSalesBreakdown.totalSales).toEqual({
      amount: 5_000,
      currencyCode: 'USD',
    });
  });

  it('returns a comparison series aligned to the current one, index for index', async () => {
    const body = (
      await get(`/admin/api/analytics?${todayOnly()}`, { cookie: breakdownCookie })
    ).json();

    // The chart overlays the two lines on one x-axis, so a length mismatch
    // silently shifts the dashed line by a day.
    expect(body.comparisonSalesOverTime).toHaveLength(body.salesOverTime.length);
    expect(body.comparisonSalesOverTime[0].value).toBe(5_000);
    expect(body.salesOverTime[0].value).toBe(14_120);
  });

  it('reports zeroed rows, not missing ones, for a period with no orders', async () => {
    const body = (await get(`/admin/api/analytics?${range(-30, -20)}`)).json();

    expect(body.salesBreakdown.totalSales).toEqual({ amount: 0, currencyCode: 'USD' });
    expect(body.salesBreakdown.grossSales).toEqual({ amount: 0, currencyCode: 'USD' });
  });
});

describe('GET /admin/api/analytics/live', () => {
  it('counts only the last 30 minutes', async () => {
    const now = new Date();
    await event(shop.shopId, 'page_view', 'ses_live', new Date(now.getTime() - 60_000));
    await event(shop.shopId, 'page_view', 'ses_stale', new Date(now.getTime() - 60 * 60_000));

    const body = (await get('/admin/api/analytics/live')).json();

    expect(body.visitors).toBe(1);
    expect(typeof body.ordersToday).toBe('number');
  });
});
