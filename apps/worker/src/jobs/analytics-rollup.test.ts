/**
 * The rollup is the only thing standing between the dashboard and a lie, and
 * every rule it implements is a SQL aggregate — so this runs against the real
 * Postgres with real rows rather than asserting a mocked query was called.
 *
 * The rules are not invented here: H1's seed writes the closed days from the
 * same definitions (`packages/db/prisma/seed/analytics.ts`), and this job writes
 * today and yesterday. If the two disagree, the chart steps at the boundary
 * between seeded history and live data — so the seed IS the specification, and
 * these tests pin the same seven metrics it emits.
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROLLUP_METRICS, rollupDay, startOfUtcDay } from './analytics-rollup.ts';

const DAY = new Date('2026-08-20T00:00:00.000Z');
const OTHER_DAY = new Date('2026-08-21T00:00:00.000Z');

let shopId: string;
let neighbourId: string;

/** `2026-08-20T13:00Z` — mid-day, so a UTC bucket bug shows up as a wrong day. */
const at = (day: Date, hours: number) => new Date(day.getTime() + hours * 60 * 60 * 1000);

async function event(
  shop: string,
  type: string,
  sessionId: string,
  occurredAt: Date,
  extra: { value?: number; orderId?: string } = {},
) {
  await dbAdmin.analyticsEvent.create({
    data: {
      id: newId('event'),
      shopId: shop,
      type,
      sessionId,
      path: '/',
      occurredAt,
      value: extra.value ?? null,
      orderId: extra.orderId ?? null,
    },
  });
}

async function order(shop: string, total: number, createdAt: Date, cancelled = false) {
  const id = newId('order');
  await dbAdmin.order.create({
    data: {
      id,
      shopId: shop,
      orderNumber: Math.floor(Math.random() * 1_000_000),
      email: 'buyer@example.com',
      currencyCode: 'USD',
      subtotal: total,
      total,
      createdAt,
      cancelledAt: cancelled ? createdAt : null,
    },
  });
  return id;
}

beforeAll(async () => {
  for (const slug of ['rollup-main', 'rollup-neighbour']) {
    const id = newId('shop');
    await dbAdmin.shop.create({ data: { id, slug: `${slug}-${newId('event')}`, name: slug } });
    if (slug === 'rollup-main') shopId = id;
    else neighbourId = id;
  }

  // Two sessions, one of which browses twice — `sessions` counts DISTINCT ids.
  await event(shopId, 'page_view', 'ses_a', at(DAY, 9));
  await event(shopId, 'page_view', 'ses_a', at(DAY, 10));
  await event(shopId, 'product_view', 'ses_a', at(DAY, 10));
  await event(shopId, 'product_view', 'ses_b', at(DAY, 11));
  await event(shopId, 'add_to_cart', 'ses_b', at(DAY, 11));
  await event(shopId, 'begin_checkout', 'ses_b', at(DAY, 12));
  await event(shopId, 'purchase', 'ses_b', at(DAY, 12), { value: 5000 });

  // Just outside the window on both sides — 23:59:59 the day before and 00:00
  // the day after. An inclusive end or a local-timezone boundary catches these.
  await event(shopId, 'page_view', 'ses_early', new Date(DAY.getTime() - 1));
  await event(shopId, 'page_view', 'ses_late', OTHER_DAY);

  await order(shopId, 5000, at(DAY, 12));
  await order(shopId, 2500, at(DAY, 13));
  await order(shopId, 9999, at(DAY, 14), true); // cancelled — excluded from sales
  await order(shopId, 7777, OTHER_DAY); // wrong day

  // The neighbour's traffic must never reach the main shop's numbers.
  for (let i = 0; i < 5; i += 1) {
    await event(neighbourId, 'page_view', `ses_n${i}`, at(DAY, 10));
  }
  await order(neighbourId, 100_000, at(DAY, 10));
});

afterAll(async () => {
  for (const id of [shopId, neighbourId]) {
    await dbAdmin.analyticsEvent.deleteMany({ where: { shopId: id } });
    await dbAdmin.analyticsRollupDaily.deleteMany({ where: { shopId: id } });
    await dbAdmin.order.deleteMany({ where: { shopId: id } });
    await dbAdmin.shop.delete({ where: { id } });
  }
  await dbAdmin.$disconnect();
});

async function storedMetrics(shop: string, day: Date): Promise<Record<string, number>> {
  const rows = await dbAdmin.analyticsRollupDaily.findMany({
    where: { shopId: shop, date: startOfUtcDay(day) },
  });
  return Object.fromEntries(rows.map((r) => [r.metric, r.value]));
}

describe('rollupDay', () => {
  it('aggregates one UTC day into the seven metrics the seed writes', async () => {
    await rollupDay(dbForShop(shopId), shopId, DAY);

    expect(await storedMetrics(shopId, DAY)).toEqual({
      sessions: 2, // ses_a and ses_b; ses_early/ses_late fall outside the day
      product_views: 2,
      add_to_carts: 1,
      begin_checkouts: 1,
      purchases: 1,
      orders: 2, // the cancelled one does not count
      sales: 7500, // 5000 + 2500, cancelled 9999 excluded, other day excluded
    });
  });

  it('writes every metric even when the day saw nothing — a gap draws a lying chart', async () => {
    const quiet = new Date('2026-08-25T00:00:00.000Z');
    await rollupDay(dbForShop(shopId), shopId, quiet);

    const stored = await storedMetrics(shopId, quiet);
    expect(Object.keys(stored).sort()).toEqual([...ROLLUP_METRICS].sort());
    expect(Object.values(stored).every((v) => v === 0)).toBe(true);
  });

  it('is idempotent — the job reruns every 5 minutes over the same open day', async () => {
    await rollupDay(dbForShop(shopId), shopId, DAY);
    await rollupDay(dbForShop(shopId), shopId, DAY);

    const rows = await dbAdmin.analyticsRollupDaily.findMany({
      where: { shopId, date: startOfUtcDay(DAY) },
    });
    expect(rows).toHaveLength(ROLLUP_METRICS.length);
    expect(await storedMetrics(shopId, DAY)).toMatchObject({ sales: 7500, orders: 2 });
  });

  it('picks up late-arriving events on a day it already rolled up', async () => {
    await event(shopId, 'add_to_cart', 'ses_c', at(DAY, 15));
    await rollupDay(dbForShop(shopId), shopId, DAY);

    const stored = await storedMetrics(shopId, DAY);
    expect(stored.add_to_carts).toBe(2);
    expect(stored.sessions).toBe(3);
  });

  it('counts only its own tenant', async () => {
    await rollupDay(dbForShop(neighbourId), neighbourId, DAY);

    const neighbour = await storedMetrics(neighbourId, DAY);
    expect(neighbour.sessions).toBe(5);
    expect(neighbour.sales).toBe(100_000);

    // And the main shop's numbers did not move.
    expect((await storedMetrics(shopId, DAY)).sales).toBe(7500);
  });
});

describe('startOfUtcDay', () => {
  it('truncates to UTC midnight regardless of the local timezone', () => {
    expect(startOfUtcDay(new Date('2026-08-20T23:59:59.999Z')).toISOString()).toBe(
      '2026-08-20T00:00:00.000Z',
    );
    expect(startOfUtcDay(new Date('2026-08-20T00:00:00.000Z')).toISOString()).toBe(
      '2026-08-20T00:00:00.000Z',
    );
  });
});
