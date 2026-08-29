/**
 * C2 — orders: creation, the per-shop number sequence, cancel rules, timeline.
 *
 * Needs the compose stack up (`docker compose up -d`) and migrations applied.
 * Not per-endpoint CRUD coverage (SPEC §14 forbids that): every case here is a
 * rule that costs money or trust when it breaks — a duplicated order number, a
 * cancelled-but-not-restocked variant, a paid order voided without a refund.
 */
import { ORDER_NUMBER_START } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { createOrder } from '../src/services/orders/create.ts';
import { buildTestApp, createTestShop, deleteTestShops, sessionCookie } from './helpers.ts';

let app: FastifyInstance;
let shop: Awaited<ReturnType<typeof createTestShop>>;
let cookie: string;
const shopIds: string[] = [];

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

/** A product + variant + location + stock, so a cancel has something to restock. */
type Stocked = { productId: string; variantId: string; locationId: string };

async function stockedVariant(available: number, price = 2500): Promise<Stocked> {
  const productId = newId('product');
  const variantId = newId('variant');
  const locationId = newId('location');

  await dbAdmin.product.create({
    data: {
      id: productId,
      shopId: shop.shopId,
      title: 'Aurora Field Jacket',
      handle: `jacket-${productId.slice(-8).toLowerCase()}`,
      status: 'active',
      variants: {
        create: [
          { id: variantId, shopId: shop.shopId, title: 'M / Olive', sku: 'AUR-JKT-M', price },
        ],
      },
    },
  });
  await dbAdmin.location.create({
    data: { id: locationId, shopId: shop.shopId, name: 'Main warehouse' },
  });
  await dbAdmin.inventoryLevel.create({
    data: { id: newId('inventory'), shopId: shop.shopId, variantId, locationId, available },
  });

  return { productId, variantId, locationId };
}

/** Minimal well-formed order input; totals must already balance (C1/E3 price it). */
function orderInput(
  over: Partial<Parameters<typeof createOrder>[2]> = {},
): Parameters<typeof createOrder>[2] {
  return {
    email: 'shopper@example.com',
    currencyCode: 'USD',
    lineItems: [
      {
        productId: null,
        variantId: null,
        title: 'Aurora Field Jacket',
        variantTitle: 'M / Olive',
        sku: 'AUR-JKT-M',
        imageUrl: null,
        quantity: 1,
        price: usd(2500),
        totalDiscount: usd(0),
        requiresShipping: true,
        taxable: true,
      },
    ],
    totals: {
      subtotal: usd(2500),
      discountTotal: usd(0),
      shippingTotal: usd(500),
      taxTotal: usd(0),
      total: usd(3000),
    },
    ...over,
  };
}

const db = () => dbForShop(shop.shopId);

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  shopIds.push(shop.shopId);
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  // Orders and catalog rows have no FK to Shop, so deleteTestShops cannot reach
  // them — this file cleans up what it created.
  const where = { shopId: { in: shopIds } };
  await dbAdmin.orderEvent.deleteMany({ where });
  await dbAdmin.orderLineItem.deleteMany({ where });
  await dbAdmin.order.deleteMany({ where });
  await dbAdmin.discountRedemption.deleteMany({ where });
  await dbAdmin.discount.deleteMany({ where });
  await dbAdmin.inventoryAdjustment.deleteMany({ where });
  await dbAdmin.inventoryLevel.deleteMany({ where });
  await dbAdmin.location.deleteMany({ where });
  await dbAdmin.product.deleteMany({ where });
  await deleteTestShops(shopIds);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

/* -------------------------------------------------------------------------- */
/* createOrder — the service E3 calls at checkout completion                     */
/* -------------------------------------------------------------------------- */

describe('createOrder', () => {
  it('gives concurrent orders distinct sequential numbers starting at #1001', async () => {
    // The classic race: two shoppers pay at the same instant. Without a row lock
    // on OrderSequence both read the same `next` and one order is lost to the
    // unique (shopId, orderNumber) index.
    const [a, b] = await Promise.all([
      createOrder(db(), shop.shopId, orderInput()),
      createOrder(db(), shop.shopId, orderInput()),
    ]);

    expect([a.orderNumber, b.orderNumber].sort()).toEqual([
      ORDER_NUMBER_START,
      ORDER_NUMBER_START + 1,
    ]);
    expect(a.id).toMatch(/^ord_/);
  });

  it('snapshots line items so later catalog edits cannot rewrite history', async () => {
    const stocked = await stockedVariant(10);
    const order = await createOrder(
      db(),
      shop.shopId,
      orderInput({
        lineItems: [
          {
            productId: stocked.productId,
            variantId: stocked.variantId,
            title: 'Aurora Field Jacket',
            variantTitle: 'M / Olive',
            sku: 'AUR-JKT-M',
            imageUrl: null,
            quantity: 2,
            price: usd(2500),
            totalDiscount: usd(500),
            requiresShipping: true,
            taxable: true,
          },
        ],
        totals: {
          subtotal: usd(5000),
          discountTotal: usd(500),
          shippingTotal: usd(0),
          taxTotal: usd(0),
          total: usd(4500),
        },
      }),
    );

    await dbAdmin.product.update({
      where: { id: stocked.productId },
      data: { title: 'Renamed after the sale' },
    });
    await dbAdmin.productVariant.update({
      where: { id: stocked.variantId },
      data: { price: 9999, sku: 'CHANGED' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/admin/api/orders/${order.id}`,
      headers: { cookie },
    });
    const detail = res.json();
    expect(res.statusCode).toBe(200);
    expect(detail.lineItems[0].title).toBe('Aurora Field Jacket');
    expect(detail.lineItems[0].sku).toBe('AUR-JKT-M');
    expect(detail.lineItems[0].price).toEqual(usd(2500));
    expect(detail.total).toEqual(usd(4500));
  });

  it('refuses totals that do not balance rather than storing a wrong order', async () => {
    await expect(
      createOrder(
        db(),
        shop.shopId,
        orderInput({
          totals: {
            subtotal: usd(2500),
            discountTotal: usd(0),
            shippingTotal: usd(500),
            taxTotal: usd(0),
            total: usd(2999), // one cent adrift
          },
        }),
      ),
    ).rejects.toThrow(/total/i);
  });

  it('counts a redemption against each discount that was applied', async () => {
    const discountId = newId('discount');
    await dbAdmin.discount.create({
      data: {
        id: discountId,
        shopId: shop.shopId,
        title: 'Launch 10%',
        code: 'LAUNCH10',
        type: 'amount_off_order',
        valueType: 'percentage',
        value: 10,
        usageLimit: 100,
      },
    });

    const order = await createOrder(
      db(),
      shop.shopId,
      orderInput({
        discountCodes: [
          {
            discountId,
            code: 'LAUNCH10',
            title: 'Launch 10%',
            amount: usd(250),
            lineAllocations: [],
            appliesToShipping: false,
          },
        ],
        totals: {
          subtotal: usd(2500),
          discountTotal: usd(250),
          shippingTotal: usd(500),
          taxTotal: usd(0),
          total: usd(2750),
        },
      }),
    );

    const discount = await dbAdmin.discount.findUniqueOrThrow({ where: { id: discountId } });
    expect(discount.usedCount).toBe(1);
    // The counter alone cannot answer "has THIS customer used it" (schema note).
    const redemption = await dbAdmin.discountRedemption.findFirst({
      where: { discountId, orderId: order.id },
    });
    expect(redemption?.amount).toBe(250);
  });

  it('does not burn a usage for a zero-value code, and never overshoots the limit', async () => {
    const discountId = newId('discount');
    await dbAdmin.discount.create({
      data: {
        id: discountId,
        shopId: shop.shopId,
        title: 'Last one',
        code: 'LASTONE',
        type: 'amount_off_order',
        valueType: 'fixed',
        value: 250,
        usageLimit: 1,
      },
    });

    const applied = (amount: number) => ({
      discountCodes: [
        {
          discountId,
          code: 'LASTONE',
          title: 'Last one',
          amount: usd(amount),
          lineAllocations: [],
          appliesToShipping: false,
        },
      ],
      totals: {
        subtotal: usd(2500),
        discountTotal: usd(amount),
        shippingTotal: usd(500),
        taxTotal: usd(0),
        total: usd(3000 - amount),
      },
    });

    // A code that took nothing off the order must not consume a limited use.
    const freebie = await createOrder(db(), shop.shopId, orderInput(applied(0)));
    let discount = await dbAdmin.discount.findUniqueOrThrow({ where: { id: discountId } });
    expect(discount.usedCount).toBe(0);
    expect(
      await dbAdmin.discountRedemption.findFirst({ where: { discountId, orderId: freebie.id } }),
    ).toBeNull();

    // Two real uses against usageLimit 1: the counter stops at the limit even
    // though both orders exist (the second checkout already took the money —
    // enforcement at pricing time is WS-E's seam, this only keeps the counter honest).
    await createOrder(db(), shop.shopId, orderInput(applied(250)));
    await createOrder(db(), shop.shopId, orderInput(applied(250)));
    discount = await dbAdmin.discount.findUniqueOrThrow({ where: { id: discountId } });
    expect(discount.usedCount).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Timeline                                                                      */
/* -------------------------------------------------------------------------- */

describe('timeline', () => {
  it('records every mutation, in order, for the detail page to render', async () => {
    const order = await createOrder(db(), shop.shopId, orderInput());

    const placed = await app.inject({
      method: 'GET',
      url: `/admin/api/orders/${order.id}`,
      headers: { cookie },
    });
    expect(placed.json().events.map((e: { type: string }) => e.type)).toEqual(['order_placed']);

    const note = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/events`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { message: 'Customer asked to ship to the office.' },
    });
    expect(note.statusCode).toBe(201);

    const cancelled = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/cancel`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'customer' },
    });
    expect(cancelled.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: `/admin/api/orders/${order.id}`,
      headers: { cookie },
    });
    const events = after.json().events;
    expect(events.map((e: { type: string }) => e.type)).toEqual([
      'order_placed',
      'note_added',
      'order_cancelled',
    ]);
    expect(events[1].message).toContain('office');
    // Who did it — C5 renders the actor next to every entry.
    expect(events[1].actor).toBe(shop.ownerEmail);
    expect(events[0].actor).toBeNull();
  });

  it('records an entry when PATCH edits note/tags/contact', async () => {
    const order = await createOrder(db(), shop.shopId, orderInput());

    const res = await app.inject({
      method: 'PATCH',
      url: `/admin/api/orders/${order.id}`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { note: 'Gift wrap it.', tags: ['vip'] },
    });
    expect(res.statusCode).toBe(200);

    const events = res.json().events;
    expect(events).toHaveLength(2);
    expect(events[1].message).toContain('note');
    expect(events[1].message).toContain('tags');
    expect(events[1].actor).toBe(shop.ownerEmail);
    expect(events[1].payload.updatedFields).toEqual(['note', 'tags']);
  });
});

/* -------------------------------------------------------------------------- */
/* Cancel                                                                        */
/* -------------------------------------------------------------------------- */

describe('POST /admin/api/orders/:id/cancel', () => {
  it('restocks exactly the quantities that were ordered', async () => {
    const stocked = await stockedVariant(10);
    const order = await createOrder(
      db(),
      shop.shopId,
      orderInput({
        lineItems: [
          {
            productId: stocked.productId,
            variantId: stocked.variantId,
            title: 'Aurora Field Jacket',
            variantTitle: 'M / Olive',
            sku: 'AUR-JKT-M',
            imageUrl: null,
            quantity: 3,
            price: usd(2500),
            totalDiscount: usd(0),
            requiresShipping: true,
            taxable: true,
          },
        ],
        totals: {
          subtotal: usd(7500),
          discountTotal: usd(0),
          shippingTotal: usd(0),
          taxTotal: usd(0),
          total: usd(7500),
        },
      }),
    );

    // Checkout decremented stock when the order was placed; cancelling gives it back.
    await dbAdmin.inventoryLevel.updateMany({
      where: { variantId: stocked.variantId, locationId: stocked.locationId },
      data: { available: 7 },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/cancel`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'inventory', restock: true },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().financialStatus).toBe('voided');
    expect(res.json().cancelReason).toBe('inventory');

    const level = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: stocked.variantId, locationId: stocked.locationId },
    });
    expect(level.available).toBe(10);

    // History, not just a number — the inventory drawer reads these (CLAUDE.md §9).
    const adjustment = await dbAdmin.inventoryAdjustment.findFirstOrThrow({
      where: { variantId: stocked.variantId, referenceId: order.id },
    });
    expect(adjustment.delta).toBe(3);
    expect(adjustment.reason).toBe('restock');
  });

  it('refuses to cancel a paid order — it must be refunded first', async () => {
    const order = await createOrder(db(), shop.shopId, orderInput({ financialStatus: 'paid' }));

    const res = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/cancel`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'customer' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().errors[0].code).toBe('conflict');

    const untouched = await dbAdmin.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(untouched.cancelledAt).toBeNull();
    expect(untouched.financialStatus).toBe('paid');
  });

  it('is idempotent enough not to cancel twice', async () => {
    const order = await createOrder(db(), shop.shopId, orderInput());
    const once = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/cancel`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'other' },
    });
    expect(once.statusCode).toBe(200);

    const twice = await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${order.id}/cancel`,
      headers: { cookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'other' },
    });
    expect(twice.statusCode).toBe(409);
  });
});

/* -------------------------------------------------------------------------- */
/* Index                                                                         */
/* -------------------------------------------------------------------------- */

describe('GET /admin/api/orders', () => {
  /**
   * Shopify's orders index shows "Hiroshi Tanabe", not an email address. The
   * summary carried only `customerId` and `email`, so the admin's Customer
   * column had nothing but the email to render — every row of the index read
   * as a mailing list. The name has to come down with the row: the index does
   * not fetch each customer separately.
   */
  it('carries the customer name on the index row, not just the email', async () => {
    const nameShop = await createTestShop();
    shopIds.push(nameShop.shopId);
    const nameCookie = await sessionCookie(app, {
      shopId: nameShop.shopId,
      staffUserId: nameShop.ownerId,
    });
    const nameDb = dbForShop(nameShop.shopId);

    const customerId = newId('customer');
    await dbAdmin.customer.create({
      data: {
        id: customerId,
        shopId: nameShop.shopId,
        email: 'hiroshi.tanabe@example.com',
        firstName: 'Hiroshi',
        lastName: 'Tanabe',
      },
    });

    await createOrder(
      nameDb,
      nameShop.shopId,
      orderInput({ customerId, email: 'hiroshi.tanabe@example.com' }),
    );
    // A guest order has no customer row at all, and must still serialize.
    await createOrder(nameDb, nameShop.shopId, orderInput({ email: 'guest@example.com' }));

    const res = await app.inject({
      method: 'GET',
      url: '/admin/api/orders',
      headers: { cookie: nameCookie },
    });
    expect(res.statusCode).toBe(200);
    const rows: { email: string; customer: { firstName: string; lastName: string } | null }[] =
      res.json().data;

    const named = rows.find((r) => r.email === 'hiroshi.tanabe@example.com');
    expect(named?.customer).toEqual({ firstName: 'Hiroshi', lastName: 'Tanabe' });

    const guest = rows.find((r) => r.email === 'guest@example.com');
    expect(guest?.customer).toBeNull();
  });

  it('filters by tab, searches, and pages with a cursor', async () => {
    const listShop = await createTestShop();
    shopIds.push(listShop.shopId);
    const listCookie = await sessionCookie(app, {
      shopId: listShop.shopId,
      staffUserId: listShop.ownerId,
    });
    const listDb = dbForShop(listShop.shopId);

    const paid = await createOrder(
      listDb,
      listShop.shopId,
      orderInput({ email: 'ada@example.com', financialStatus: 'paid' }),
    );
    const unpaid = await createOrder(
      listDb,
      listShop.shopId,
      orderInput({ email: 'grace@example.com', financialStatus: 'pending' }),
    );
    const cancelled = await createOrder(listDb, listShop.shopId, orderInput());
    await app.inject({
      method: 'POST',
      url: `/admin/api/orders/${cancelled.id}/cancel`,
      headers: { cookie: listCookie, 'x-requested-with': 'merchant-admin' },
      payload: { reason: 'other' },
    });

    const list = async (query: string) => {
      const res = await app.inject({
        method: 'GET',
        url: `/admin/api/orders${query}`,
        headers: { cookie: listCookie },
      });
      expect(res.statusCode).toBe(200);
      return res.json();
    };

    const all = await list('');
    expect(all.data).toHaveLength(3);
    // Newest first, like Shopify's index.
    expect(all.data[0].orderNumber).toBeGreaterThan(all.data[2].orderNumber);

    expect((await list('?tab=unpaid')).data.map((o: { id: string }) => o.id)).toEqual([unpaid.id]);
    expect((await list('?tab=closed')).data.map((o: { id: string }) => o.id)).toEqual([
      cancelled.id,
    ]);
    expect((await list('?tab=open')).data).toHaveLength(2);

    // `?query=` covers order number and email — the two things staff paste in.
    expect((await list('?query=ada@example.com')).data.map((o: { id: string }) => o.id)).toEqual([
      paid.id,
    ]);
    expect(
      (await list(`?query=%23${paid.orderNumber}`)).data.map((o: { id: string }) => o.id),
    ).toEqual([paid.id]);

    // Filters INTERSECT. Both tabFilter and searchFilter produce OR fragments;
    // built by object spread the later one clobbered the earlier, so the Closed
    // tab + a search for an open order's email returned the open order.
    expect((await list('?tab=closed&query=grace@example.com')).data).toEqual([]);
    expect(
      (await list('?tab=unpaid&query=grace@example.com')).data.map((o: { id: string }) => o.id),
    ).toEqual([unpaid.id]);
    // tab=unpaid pins financialStatus to pending/authorized; &financialStatus=paid
    // must intersect to nothing, not override the tab.
    expect((await list('?tab=unpaid&financialStatus=paid')).data).toEqual([]);
    expect(
      (await list('?tab=unpaid&financialStatus=pending')).data.map((o: { id: string }) => o.id),
    ).toEqual([unpaid.id]);

    // A pasted tracking number parses as an integer wider than int32 — that is
    // an empty result, not a Prisma overflow 500.
    expect((await list('?query=99999999999999999999')).data).toEqual([]);

    const firstPage = await list('?limit=2');
    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await list(`?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`);
    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
    // No row appears on both pages.
    const ids = [...firstPage.data, ...secondPage.data].map((o: { id: string }) => o.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('never returns another shop’s orders', async () => {
    // The load-bearing wall (SPEC §6). A2 covers this broadly; orders are where
    // it is most expensive to get wrong.
    const res = await app.inject({
      method: 'GET',
      url: '/admin/api/orders',
      headers: { cookie },
    });
    const shopIdsSeen = await dbAdmin.order.findMany({
      where: { id: { in: res.json().data.map((o: { id: string }) => o.id) } },
      select: { shopId: true },
    });
    expect(new Set(shopIdsSeen.map((o) => o.shopId))).toEqual(new Set([shop.shopId]));
  });
});
