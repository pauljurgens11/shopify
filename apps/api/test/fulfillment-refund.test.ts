/**
 * C3 — fulfilling an order and refunding it (SPEC §9, §11).
 *
 * Needs the compose stack up and migrations applied. The processor is the mock
 * adapter charged through the real router, so the refund path here is the same
 * one the H2 smoke flow drives: buy → fulfil → refund it.
 *
 * The case worth reading first is the proration one. A refund that differs from
 * the line's share of the discount by a cent is money, and it compounds: two
 * half-refunds of a line must add up to exactly what one whole refund would.
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import { sealCredentials } from '@merchant/pay/credentials';
import { charge } from '@merchant/pay/router';
import { tokenizeCard } from '@merchant/pay/vault';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { createOrder } from '../src/services/orders/create.ts';
import { buildTestApp, createTestShop, deleteTestShops, sessionCookie } from './helpers.ts';

let app: FastifyInstance;
let shop: Awaited<ReturnType<typeof createTestShop>>;
let cookie: string;
let db: TenantClient;
let locationId: string;
const shopIds: string[] = [];

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });
const CSRF = { 'x-requested-with': 'merchant-admin' };

type Variant = { productId: string; variantId: string };

async function stockedVariant(available: number, price: number): Promise<Variant> {
  const productId = newId('product');
  const variantId = newId('variant');
  await dbAdmin.product.create({
    data: {
      id: productId,
      shopId: shop.shopId,
      title: 'Aurora Field Jacket',
      handle: `jacket-${productId.slice(-10).toLowerCase()}`,
      status: 'active',
      variants: {
        create: [{ id: variantId, shopId: shop.shopId, title: 'M / Olive', price }],
      },
    },
  });
  await dbAdmin.inventoryLevel.create({
    data: { id: newId('inventory'), shopId: shop.shopId, variantId, locationId, available },
  });
  return { productId, variantId };
}

const availableAt = async (variantId: string) =>
  (await dbAdmin.inventoryLevel.findFirstOrThrow({ where: { variantId, locationId } })).available;

type LineSpec = { variant: Variant; quantity: number; price: number; discount?: number };

/** An order whose totals balance, so createOrder accepts it (C2's guard). */
async function placeOrder(lines: LineSpec[], shipping = 0) {
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  const discountTotal = lines.reduce((n, l) => n + (l.discount ?? 0), 0);
  return createOrder(db, shop.shopId, {
    email: 'shopper@example.com',
    currencyCode: 'USD',
    lineItems: lines.map((l) => ({
      productId: l.variant.productId,
      variantId: l.variant.variantId,
      title: 'Aurora Field Jacket',
      variantTitle: 'M / Olive',
      sku: null,
      imageUrl: null,
      quantity: l.quantity,
      price: usd(l.price),
      totalDiscount: usd(l.discount ?? 0),
      requiresShipping: true,
      taxable: true,
    })),
    totals: {
      subtotal: usd(subtotal),
      discountTotal: usd(discountTotal),
      shippingTotal: usd(shipping),
      taxTotal: usd(0),
      total: usd(subtotal - discountTotal + shipping),
    },
    financialStatus: 'pending',
  });
}

/** Charge the order for real through the router, so a refund has a captured txn. */
async function payFor(order: { id: string; total: { amount: number } }) {
  const token = await tokenizeCard(db, shop.shopId, {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
  });
  const payment = await charge(db, shop.shopId, {
    cardTokenId: token.cardTokenId,
    amount: usd(order.total.amount),
    orderId: order.id,
    idempotencyKey: newId('event'),
  });
  await dbAdmin.order.update({ where: { id: order.id }, data: { financialStatus: 'paid' } });
  return payment;
}

const post = (url: string, payload: unknown) =>
  app.inject({ method: 'POST', url, headers: { cookie, ...CSRF }, payload });

/** Refund over HTTP, as C5 will. Returns the updated order, or throws its error. */
async function refund(orderId: string, input: Record<string, unknown>) {
  const res = await post(`/admin/api/orders/${orderId}/refunds`, { restock: false, ...input });
  if (res.statusCode !== 201) {
    throw new Error(`${res.statusCode} ${res.json().errors?.[0]?.message ?? res.body}`);
  }
  return res.json();
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  shopIds.push(shop.shopId);
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
  db = dbForShop(shop.shopId);

  locationId = newId('location');
  await dbAdmin.location.create({
    data: { id: locationId, shopId: shop.shopId, name: 'Downtown' },
  });

  const sealed = sealCredentials({ secretKey: 'sk_test_x' });
  await dbAdmin.processorConfig.create({
    data: {
      id: newId('processor'),
      shopId: shop.shopId,
      processor: 'mock',
      displayName: 'mock',
      enabled: true,
      encryptedCredentials: sealed.ciphertext,
      credentialsIv: sealed.iv,
      credentialsAuthTag: sealed.authTag,
    },
  });
});

afterAll(async () => {
  const where = { shopId: { in: shopIds } };
  await dbAdmin.orderEvent.deleteMany({ where });
  await dbAdmin.refund.deleteMany({ where });
  await dbAdmin.fulfillment.deleteMany({ where });
  await dbAdmin.orderLineItem.deleteMany({ where });
  await dbAdmin.order.deleteMany({ where });
  await dbAdmin.paymentRefund.deleteMany({ where });
  await dbAdmin.payment.deleteMany({ where });
  await dbAdmin.processorConfig.deleteMany({ where });
  await dbAdmin.vaultCard.deleteMany({ where });
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
/* Fulfillment                                                                  */
/* -------------------------------------------------------------------------- */

describe('POST /admin/api/orders/:id/fulfillments', () => {
  it('walks unfulfilled → partially_fulfilled → fulfilled and takes the stock', async () => {
    const jacket = await stockedVariant(10, 2500);
    const cap = await stockedVariant(4, 1500);
    const order = await placeOrder([
      { variant: jacket, quantity: 2, price: 2500 },
      { variant: cap, quantity: 1, price: 1500 },
    ]);
    const [jacketLine, capLine] = order.lineItems;

    const partial = await post(`/admin/api/orders/${order.id}/fulfillments`, {
      locationId,
      lineItems: [{ lineItemId: jacketLine?.id, quantity: 1 }],
    });
    expect(partial.statusCode).toBe(201);
    expect(partial.json().fulfillmentStatus).toBe('partially_fulfilled');
    expect(await availableAt(jacket.variantId)).toBe(9);

    // Stock moves only through the adjustment service, so the history exists.
    const sold = await dbAdmin.inventoryAdjustment.findFirstOrThrow({
      where: { variantId: jacket.variantId, reason: 'sold' },
    });
    expect(sold.delta).toBe(-1);
    expect(sold.referenceId).toBe(partial.json().fulfillments.at(-1).id);

    const rest = await post(`/admin/api/orders/${order.id}/fulfillments`, {
      locationId,
      lineItems: [
        { lineItemId: jacketLine?.id, quantity: 1 },
        { lineItemId: capLine?.id, quantity: 1 },
      ],
    });
    expect(rest.statusCode).toBe(201);
    expect(rest.json().fulfillmentStatus).toBe('fulfilled');
    expect(await availableAt(jacket.variantId)).toBe(8);
    expect(await availableAt(cap.variantId)).toBe(3);

    const events = rest.json().events.map((e: { type: string }) => e.type);
    expect(events.filter((t: string) => t === 'fulfillment_created')).toHaveLength(2);
  });

  it('refuses to fulfil more than the line has left', async () => {
    const jacket = await stockedVariant(10, 2500);
    const order = await placeOrder([{ variant: jacket, quantity: 2, price: 2500 }]);
    const lineId = order.lineItems[0]?.id;

    await post(`/admin/api/orders/${order.id}/fulfillments`, {
      locationId,
      lineItems: [{ lineItemId: lineId, quantity: 2 }],
    });

    const over = await post(`/admin/api/orders/${order.id}/fulfillments`, {
      locationId,
      lineItems: [{ lineItemId: lineId, quantity: 1 }],
    });
    expect(over.statusCode).toBe(409);
    expect(over.json().errors[0].code).toBe('conflict');
    // The rejected attempt must not have moved stock.
    expect(await availableAt(jacket.variantId)).toBe(8);
  });
});

/* -------------------------------------------------------------------------- */
/* Refund arithmetic                                                            */
/* -------------------------------------------------------------------------- */

describe('refund proration', () => {
  it('splits a line discount across its units without losing a cent', async () => {
    // 2 x $25.00 less a $9.99 order discount = $40.01 net, which does not halve
    // evenly. Refunding one unit and then the other must total exactly $40.01.
    const jacket = await stockedVariant(10, 2500);
    const order = await placeOrder([{ variant: jacket, quantity: 2, price: 2500, discount: 999 }]);
    const lineId = order.lineItems[0]?.id;
    await payFor(order);

    const preview = await post(`/admin/api/orders/${order.id}/refunds/calculate`, {
      lineItems: [{ lineItemId: lineId, quantity: 1 }],
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().total).toEqual(usd(2001));
    expect(preview.json().maximumRefundable).toEqual(usd(4001));

    const first = await refund(order.id, { lineItems: [{ lineItemId: lineId, quantity: 1 }] });
    expect(first.refunds.at(-1).amount).toEqual(usd(2001));
    expect(first.financialStatus).toBe('partially_refunded');

    const second = await refund(order.id, { lineItems: [{ lineItemId: lineId, quantity: 1 }] });
    expect(second.refunds.at(-1).amount).toEqual(usd(2000));

    // The whole point: the halves add up to the whole.
    expect(second.refundedTotal).toEqual(usd(4001));
    expect(second.financialStatus).toBe('refunded');
  });

  it('refunds shipping on top of lines, and only once', async () => {
    const jacket = await stockedVariant(10, 2500);
    const order = await placeOrder([{ variant: jacket, quantity: 1, price: 2500 }], 500);
    const lineId = order.lineItems[0]?.id;
    await payFor(order);

    const withShipping = await refund(order.id, {
      lineItems: [{ lineItemId: lineId, quantity: 1 }],
      shippingAmount: usd(500),
    });
    expect(withShipping.refunds.at(-1).amount).toEqual(usd(3000));
    expect(withShipping.refundedTotal).toEqual(usd(3000));

    // Shipping is refundable once, even though the order total still has room.
    await expect(refund(order.id, { lineItems: [], shippingAmount: usd(500) })).rejects.toThrow(
      /shipping is left/i,
    );
  });

  it('caps a refund at what is left on the order', async () => {
    const jacket = await stockedVariant(10, 2500);
    const order = await placeOrder([{ variant: jacket, quantity: 1, price: 2500 }]);
    const lineId = order.lineItems[0]?.id;
    await payFor(order);

    // Over the line's own quantity — refused over HTTP, so the route surfaces
    // a conflict rather than a 500.
    const tooMuch = await post(`/admin/api/orders/${order.id}/refunds`, {
      lineItems: [{ lineItemId: lineId, quantity: 2 }],
      restock: false,
    });
    expect(tooMuch.statusCode).toBe(409);
    expect(tooMuch.json().errors[0].code).toBe('conflict');

    await refund(order.id, { lineItems: [{ lineItemId: lineId, quantity: 1 }] });

    // Fully refunded: there is no shipping and no line left to give back.
    await expect(refund(order.id, { lineItems: [], shippingAmount: usd(1) })).rejects.toThrow();
  });

  it('restocks only when asked, and records the adjustment', async () => {
    const jacket = await stockedVariant(10, 2500);
    const order = await placeOrder([{ variant: jacket, quantity: 2, price: 2500 }]);
    const lineId = order.lineItems[0]?.id;
    await payFor(order);

    await refund(order.id, { lineItems: [{ lineItemId: lineId, quantity: 1 }], restock: false });
    expect(await availableAt(jacket.variantId)).toBe(10);

    const returned = await refund(order.id, {
      lineItems: [{ lineItemId: lineId, quantity: 1 }],
      restock: true,
    });
    expect(await availableAt(jacket.variantId)).toBe(11);

    const adjustment = await dbAdmin.inventoryAdjustment.findFirstOrThrow({
      where: { variantId: jacket.variantId, reason: 'restock' },
    });
    expect(adjustment.delta).toBe(1);
    expect(adjustment.referenceId).toBe(returned.refunds.at(-1).id);
  });
});
