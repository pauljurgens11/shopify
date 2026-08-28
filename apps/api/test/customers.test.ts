/**
 * C4 — customers: the index segments, the derived aggregates, and the
 * `findOrCreateByEmail` seam E3 calls at checkout completion.
 *
 * Needs the compose stack up and migrations applied.
 *
 * The aggregate fixture is built to fail three plausible wrong answers, not
 * just to pass the right one: it contains a cancelled order (must not count),
 * a partially refunded one (must count net) and an unpaid one (must count
 * toward the order count but not toward money spent).
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { findOrCreateByEmail } from '../src/services/customers/customers.ts';
import { buildTestApp, createTestShop, deleteTestShops, sessionCookie } from './helpers.ts';

let app: FastifyInstance;
let shop: Awaited<ReturnType<typeof createTestShop>>;
let cookie: string;
let db: TenantClient;
const shopIds: string[] = [];

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });
const CSRF = { 'x-requested-with': 'merchant-admin' };
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const ids: Record<string, string> = {};
let orderNumber = 5000;

async function customer(key: string, email: string, extra: Record<string, unknown> = {}) {
  const id = newId('customer');
  ids[key] = id;
  await dbAdmin.customer.create({
    data: { id, shopId: shop.shopId, email, firstName: key, ...extra },
  });
  return id;
}

async function order(
  customerId: string,
  input: {
    total: number;
    refundedTotal?: number;
    financialStatus?: string;
    cancelledAt?: Date | null;
    createdAt?: Date;
  },
) {
  orderNumber += 1;
  return dbAdmin.order.create({
    data: {
      id: newId('order'),
      shopId: shop.shopId,
      orderNumber,
      customerId,
      email: 'x@example.com',
      currencyCode: 'USD',
      subtotal: input.total,
      total: input.total,
      refundedTotal: input.refundedTotal ?? 0,
      financialStatus: input.financialStatus ?? 'paid',
      cancelledAt: input.cancelledAt ?? null,
      createdAt: input.createdAt ?? new Date(),
    },
  });
}

async function openCheckout(email: string, createdAt: Date) {
  await dbAdmin.checkout.create({
    data: {
      id: newId('checkout'),
      shopId: shop.shopId,
      token: newId('checkout'),
      cartSnapshot: {},
      email,
      status: 'open',
      completedOrderId: null,
      createdAt,
    },
  });
}

const get = (url: string) => app.inject({ method: 'GET', url, headers: { cookie } });
const send = (method: 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown) =>
  app.inject({ method, url, headers: { cookie, ...CSRF }, payload });

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  shopIds.push(shop.shopId);
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
  db = dbForShop(shop.shopId);

  // Ada — three live orders plus a cancelled one. Returning, not new.
  await customer('ada', 'ada@example.com', { lastName: 'Lovelace', phone: '+1-555-0100' });
  await order(ids.ada as string, { total: 10_000, createdAt: daysAgo(90) });
  await order(ids.ada as string, {
    total: 5_000,
    refundedTotal: 2_000,
    financialStatus: 'partially_refunded',
    createdAt: daysAgo(40),
  });
  await order(ids.ada as string, { total: 3_000, financialStatus: 'pending' });
  await order(ids.ada as string, {
    total: 9_999,
    financialStatus: 'voided',
    cancelledAt: new Date(),
  });

  // Grace — one order, ten days ago. New.
  await customer('grace', 'grace@example.com', { lastName: 'Hopper' });
  await order(ids.grace as string, { total: 2_500, createdAt: daysAgo(10) });

  // Linus — one order, long ago. Neither new nor returning.
  await customer('linus', 'linus@example.com');
  await order(ids.linus as string, { total: 1_000, createdAt: daysAgo(200) });

  // Katherine — no orders, an open checkout from yesterday. Abandoned.
  await customer('katherine', 'katherine@example.com', { acceptsMarketing: true });
  await openCheckout('katherine@example.com', daysAgo(1));

  // Barbara — an open checkout, but a stale one. Not abandoned any more.
  await customer('barbara', 'barbara@example.com');
  await openCheckout('barbara@example.com', daysAgo(10));
});

afterAll(async () => {
  const where = { shopId: { in: shopIds } };
  await dbAdmin.order.deleteMany({ where });
  await dbAdmin.checkout.deleteMany({ where });
  await dbAdmin.customerAddress.deleteMany({ where });
  await dbAdmin.customer.deleteMany({ where });
  await deleteTestShops(shopIds);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

const namesIn = (body: { data: Array<{ firstName: string | null }> }) =>
  body.data.map((c) => c.firstName).sort();

/* -------------------------------------------------------------------------- */
/* Segments                                                                     */
/* -------------------------------------------------------------------------- */

describe('GET /admin/api/customers', () => {
  it('sorts the five customers into Shopify’s segments', async () => {
    const segment = async (name: string) => {
      const res = await get(`/admin/api/customers?segment=${name}`);
      expect(res.statusCode).toBe(200);
      return namesIn(res.json());
    };

    expect(await segment('all')).toEqual(['ada', 'barbara', 'grace', 'katherine', 'linus']);
    // More than one order.
    expect(await segment('returning')).toEqual(['ada']);
    // First order within the last 30 days — Ada has three orders but started 90
    // days ago, so she is not new.
    expect(await segment('new')).toEqual(['grace']);
    // An open checkout younger than three days, and no order from it.
    expect(await segment('abandoned-checkout')).toEqual(['katherine']);
  });

  it('searches name, email and phone, and filters marketing opt-in', async () => {
    expect(namesIn((await get('/admin/api/customers?query=lovelace')).json())).toEqual(['ada']);
    expect(namesIn((await get('/admin/api/customers?query=grace@example')).json())).toEqual([
      'grace',
    ]);
    expect(namesIn((await get('/admin/api/customers?query=555-0100')).json())).toEqual(['ada']);

    // The rendered full name — no single column holds "Ada Lovelace", so this
    // exercises the token-AND branch, in either token order.
    expect(
      namesIn(
        (await get(`/admin/api/customers?query=${encodeURIComponent('Ada Lovelace')}`)).json(),
      ),
    ).toEqual(['ada']);
    expect(
      namesIn(
        (await get(`/admin/api/customers?query=${encodeURIComponent('lovelace ada')}`)).json(),
      ),
    ).toEqual(['ada']);

    // `?acceptsMarketing=false` must filter for false, not for "truthy string".
    expect(namesIn((await get('/admin/api/customers?acceptsMarketing=true')).json())).toEqual([
      'katherine',
    ]);
    expect(namesIn((await get('/admin/api/customers?acceptsMarketing=false')).json())).toEqual([
      'ada',
      'barbara',
      'grace',
      'linus',
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* Derived aggregates                                                           */
/* -------------------------------------------------------------------------- */

describe('order count and amount spent', () => {
  it('derives both from the orders, net of refunds and ignoring cancelled ones', async () => {
    const res = await get(`/admin/api/customers/${ids.ada}`);
    expect(res.statusCode).toBe(200);

    const body = res.json();
    // Three live orders; the cancelled one is not one of them.
    expect(body.ordersCount).toBe(3);
    // $100.00 paid + ($50.00 less $20.00 refunded). The unpaid $30.00 order is
    // counted above but not yet spent, and the cancelled $99.99 never was.
    expect(body.totalSpent).toEqual(usd(13_000));
  });

  it('reports the same numbers on the index, without a query per row', async () => {
    const res = await get('/admin/api/customers?segment=all');
    const rows = Object.fromEntries(
      res
        .json()
        .data.map((c: { firstName: string; ordersCount: number; totalSpent: unknown }) => [
          c.firstName,
          [c.ordersCount, c.totalSpent],
        ]),
    );
    expect(rows.ada).toEqual([3, usd(13_000)]);
    expect(rows.grace).toEqual([1, usd(2_500)]);
    expect(rows.katherine).toEqual([0, usd(0)]);
  });

  it('lists the customer’s own orders', async () => {
    const res = await get(`/admin/api/customers/${ids.ada}/orders`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(4); // cancelled orders still belong to them
    expect(res.json().data[0]).toHaveProperty('orderNumber');
  });
});

/* -------------------------------------------------------------------------- */
/* Writes                                                                       */
/* -------------------------------------------------------------------------- */

describe('creating and editing a customer', () => {
  it('stores addresses and keeps exactly one default', async () => {
    const created = await send('POST', '/admin/api/customers', {
      email: 'margaret@example.com',
      firstName: 'Margaret',
      lastName: 'Hamilton',
      // BOTH marked default — the form can send this, and the storefront would
      // otherwise pick between them arbitrarily on every render.
      addresses: [
        {
          address1: '1 Apollo Way',
          city: 'Cambridge',
          country: 'United States',
          countryCode: 'US',
          zip: '02139',
          isDefault: true,
        },
        {
          address1: '2 Draper Lab',
          city: 'Cambridge',
          country: 'United States',
          countryCode: 'US',
          zip: '02139',
          isDefault: true,
        },
      ],
    });
    expect(created.statusCode).toBe(201);
    const customerId = created.json().id;
    const created_defaults = created
      .json()
      .addresses.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(created_defaults).toHaveLength(1);
    expect(created_defaults[0].address1).toBe('1 Apollo Way');

    // And with none marked, the first address becomes the default rather than
    // the customer having no default at all.
    const updated = await send('PUT', `/admin/api/customers/${customerId}`, {
      addresses: [
        {
          address1: '2 Draper Lab',
          city: 'Cambridge',
          country: 'United States',
          countryCode: 'US',
          zip: '02139',
        },
        {
          address1: '1 Apollo Way',
          city: 'Cambridge',
          country: 'United States',
          countryCode: 'US',
          zip: '02139',
        },
      ],
    });
    expect(updated.statusCode).toBe(200);
    const defaults = updated.json().addresses.filter((a: { isDefault: boolean }) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].address1).toBe('2 Draper Lab');

    expect((await send('DELETE', `/admin/api/customers/${customerId}`)).statusCode).toBe(200);
    expect((await get(`/admin/api/customers/${customerId}`)).statusCode).toBe(404);
  });

  it('refuses to delete a customer who has placed orders', async () => {
    // Linus has one order; the FK is ON DELETE SET NULL, so deleting him would
    // orphan it. Shopify refuses this too.
    const res = await send('DELETE', `/admin/api/customers/${ids.linus}`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      errors: [
        {
          code: 'conflict',
          message: "Customers who have placed orders can't be deleted.",
          field: 'id',
        },
      ],
    });

    // And he is still there.
    expect((await get(`/admin/api/customers/${ids.linus}`)).statusCode).toBe(200);
  });

  it('refuses a duplicate email in the SPEC error shape', async () => {
    const res = await send('POST', '/admin/api/customers', {
      email: 'ada@example.com',
      firstName: 'Impostor',
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      errors: [{ code: 'conflict', message: expect.any(String), field: 'email' }],
    });
  });
});

/* -------------------------------------------------------------------------- */
/* The E3 seam                                                                  */
/* -------------------------------------------------------------------------- */

describe('findOrCreateByEmail', () => {
  it('is idempotent when two checkouts complete at once', async () => {
    // E3 calls this at checkout completion. Two shoppers finishing on the same
    // email in the same instant must not produce two customers — the unique
    // index would reject the second, and the checkout would fail after payment.
    const [first, second] = await Promise.all([
      findOrCreateByEmail(db, shop.shopId, { email: 'race@example.com', firstName: 'Race' }),
      findOrCreateByEmail(db, shop.shopId, { email: 'race@example.com' }),
    ]);

    expect(first.id).toBe(second.id);
    expect(
      await dbAdmin.customer.count({ where: { shopId: shop.shopId, email: 'race@example.com' } }),
    ).toBe(1);
  });

  it('matches an existing customer case-insensitively instead of duplicating them', async () => {
    const found = await findOrCreateByEmail(db, shop.shopId, { email: 'ADA@Example.com' });
    expect(found.id).toBe(ids.ada);
  });
});
