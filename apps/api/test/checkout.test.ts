/**
 * E3 — checkout API.
 *
 * The scope is the money and the guards, against a real Postgres and the mock
 * processor. Checkout is where every other workstream's arithmetic meets: C1
 * prices, A4's rates and tax rate apply, B4's stock moves, D3 charges and C2
 * records. The failures worth testing are the ones that only appear when those
 * meet — totals that drift between the summary and the charge, a decline that
 * leaves an order behind, a double-click that bills twice, an oversell that
 * slips through because two shoppers raced.
 *
 * Deliberately absent: per-field PUT round-trips and address validation
 * (SPEC §14 forbids CRUD sweeps; §10 puts address validation out of scope).
 */
import { CART_COOKIE } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';
import { tokenizeCard } from '@merchant/pay/vault';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCustomer } from '../src/services/customers/customers.ts';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let locationId: string;
/** variant key → id */
const v: Record<string, string> = {};
/** card label → card_tok_ */
const tok: Record<string, string> = {};

const TAX_RATE = 8.5;
const STANDARD_RATE_ID = newId('event');
const FREE_RATE_ID = newId('event');
const FREE_SHIPPING_THRESHOLD = 15000;

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });
const host = () => `${shop.slug}.lvh.me:3002`;

/**
 * Every `inject` looks like 127.0.0.1, and `complete` is rate-limited to 5/min
 * per IP (SPEC §8). Without a distinct source address per request the suite
 * throttles itself and then reports 429s that have nothing to do with what it
 * was testing — the trap `helpers.ts` documents for login.
 */
let clientIp = 0;
const nextIp = () => {
  clientIp += 1;
  return `10.${Math.floor(clientIp / 65025)}.${Math.floor(clientIp / 255) % 255}.${clientIp % 255}`;
};

function req(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  options: { payload?: unknown; cookie?: string } = {},
) {
  return app.inject({
    method,
    url,
    remoteAddress: nextIp(),
    headers: { host: host(), ...(options.cookie ? { cookie: options.cookie } : {}) },
    ...(options.payload === undefined ? {} : { payload: options.payload }),
  });
}

/** A cart with the given lines, returned as its cookie header. */
async function cartWith(lines: Array<{ variantId: string; quantity: number }>): Promise<string> {
  const created = await req('POST', '/storefront/api/cart');
  const cookieValue = created.cookies.find((c) => c.name === CART_COOKIE)?.value;
  if (!cookieValue) throw new Error('no cart cookie');
  const cookie = `${CART_COOKIE}=${cookieValue}`;

  for (const line of lines) {
    const added = await req('POST', '/storefront/api/cart/lines', { cookie, payload: line });
    if (added.statusCode !== 200) throw new Error(`add line failed: ${added.body}`);
  }
  return cookie;
}

async function openCheckout(lines: Array<{ variantId: string; quantity: number }>) {
  const cookie = await cartWith(lines);
  const created = await req('POST', '/storefront/api/checkouts', { cookie });
  if (created.statusCode !== 201) throw new Error(`create checkout failed: ${created.body}`);
  return { cookie, checkout: created.json() as Record<string, never> & { token: string } };
}

/** Fill in everything `complete` requires, and return the final checkout state. */
async function readyToPay(
  token: string,
  extra: Record<string, unknown> = {},
  rateId: string = STANDARD_RATE_ID,
) {
  const response = await req('PUT', `/storefront/api/checkouts/${token}`, {
    payload: {
      email: 'shopper@example.com',
      shippingAddress: {
        firstName: 'Jane',
        lastName: 'Whitfield',
        address1: '1218 SE Ankeny St',
        city: 'Portland',
        province: 'Oregon',
        provinceCode: 'OR',
        country: 'United States',
        countryCode: 'US',
        zip: '97214',
      },
      selectedShippingRateId: rateId,
      ...extra,
    },
  });
  if (response.statusCode !== 200) throw new Error(`update failed: ${response.body}`);
  return response.json();
}

function pay(
  token: string,
  card: string,
  options: { idempotencyKey?: string; cookie?: string } = {},
) {
  return req('POST', `/storefront/api/checkouts/${token}/complete`, {
    payload: { cardTokenId: card, idempotencyKey: options.idempotencyKey ?? newId('event') },
    ...(options.cookie ? { cookie: options.cookie } : {}),
  });
}

async function makeProduct(input: {
  handle: string;
  title: string;
  price: number;
  tags?: string[];
  variants: Array<{ key: string; stock: number; policy?: string }>;
}) {
  const productId = newId('product');
  await dbAdmin.product.create({
    data: {
      id: productId,
      shopId: shop.shopId,
      title: input.title,
      handle: input.handle,
      descriptionHtml: `<p>${input.title}</p>`,
      status: 'active',
      tags: input.tags ?? [],
      images: {
        create: [
          {
            id: newId('image'),
            shopId: shop.shopId,
            url: `https://picsum.photos/seed/${input.handle}/1200/1500`,
            position: 0,
          },
        ],
      },
    },
  });
  for (const [position, variant] of input.variants.entries()) {
    const variantId = newId('variant');
    v[variant.key] = variantId;
    await dbAdmin.productVariant.create({
      data: {
        id: variantId,
        shopId: shop.shopId,
        productId,
        title: `V${position + 1}`,
        sku: `SKU-${variant.key}`,
        price: input.price,
        position,
        inventoryPolicy: variant.policy ?? 'deny',
      },
    });
    await dbAdmin.inventoryLevel.create({
      data: {
        id: newId('inventory'),
        shopId: shop.shopId,
        variantId,
        locationId,
        available: variant.stock,
      },
    });
  }
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();

  locationId = newId('location');
  await dbAdmin.location.create({
    data: { id: locationId, shopId: shop.shopId, name: 'Warehouse', fulfillsOnlineOrders: true },
  });

  // A4's settings, which checkout prices from.
  await dbAdmin.shop.update({
    where: { id: shop.shopId },
    data: {
      taxSettings: { ratePercentage: TAX_RATE, pricesIncludeTax: false },
      shippingRates: [
        {
          id: STANDARD_RATE_ID,
          name: 'Standard shipping',
          price: usd(895),
          minOrderSubtotal: null,
          maxOrderSubtotal: null,
        },
        {
          id: FREE_RATE_ID,
          name: 'Free shipping',
          price: usd(0),
          minOrderSubtotal: usd(FREE_SHIPPING_THRESHOLD),
          maxOrderSubtotal: null,
        },
      ],
    },
  });

  await makeProduct({
    handle: 'alpine-merino-crewneck',
    title: 'Alpine Merino Crewneck',
    price: 14800,
    tags: ['knitwear'],
    variants: [
      { key: 'alpine', stock: 10 },
      { key: 'scarce', stock: 1 },
      { key: 'backorder', stock: 0, policy: 'continue' },
    ],
  });
  await makeProduct({
    handle: 'basin-wool-socks',
    title: 'Basin Wool Socks',
    price: 1800,
    variants: [{ key: 'socks', stock: 50 }],
  });

  // The mock processor, connected and taking 100% of traffic.
  const processorId = newId('processor');
  await dbAdmin.processorConfig.create({
    data: {
      id: processorId,
      shopId: shop.shopId,
      processor: 'mock',
      displayName: 'Mock Gateway (test)',
      enabled: true,
      testMode: true,
    },
  });
  await dbAdmin.routingRule.create({
    data: {
      id: newId('routingRule'),
      shopId: shop.shopId,
      processorConfigId: processorId,
      position: 0,
      weight: 100,
    },
  });

  await dbAdmin.discount.createMany({
    data: [
      {
        id: newId('discount'),
        shopId: shop.shopId,
        title: '10% off your first order',
        code: 'WELCOME10',
        type: 'amount_off_order',
        valueType: 'percentage',
        value: 10,
        appliesTo: { scope: 'all' },
        minimumRequirement: { type: 'none' },
        status: 'active',
        startsAt: new Date(Date.now() - 86_400_000),
      },
      {
        id: newId('discount'),
        shopId: shop.shopId,
        title: 'Summer sale',
        code: 'EXPIRED20',
        type: 'amount_off_order',
        valueType: 'percentage',
        value: 20,
        appliesTo: { scope: 'all' },
        minimumRequirement: { type: 'none' },
        status: 'expired',
        startsAt: new Date(Date.now() - 172_800_000),
        endsAt: new Date(Date.now() - 86_400_000),
      },
    ],
  });

  // Vault the test cards once; the API only ever sees `card_tok_…` (SPEC §11).
  const db = dbForShop(shop.shopId);
  for (const [label, number] of [
    ['approved', '4242424242424242'],
    ['declined', '4000000000000002'],
    ['insufficient', '4000000000009995'],
  ] as const) {
    const card = await tokenizeCard(db, shop.shopId, {
      number,
      expMonth: 12,
      expYear: new Date().getUTCFullYear() + 2,
      cvc: '123',
    });
    tok[label] = card.cardTokenId;
  }
}, 90_000);

afterAll(async () => {
  await deleteTestShops([shop.shopId]);
  await app.close();
});

describe('lifecycle', () => {
  it('snapshots the cart, and the snapshot does not move when the price does', async () => {
    // The cart reprices on read (E1); a checkout must not. The shopper is
    // committing to the number in front of them.
    const { checkout } = await openCheckout([{ variantId: v.alpine, quantity: 2 }]);
    expect(checkout.status).toBe('open');
    expect(checkout.lines).toHaveLength(1);
    expect(checkout.totals.subtotal).toEqual(usd(29600));

    await dbAdmin.productVariant.update({ where: { id: v.alpine }, data: { price: 20000 } });
    try {
      const reread = await req('GET', `/storefront/api/checkouts/${checkout.token}`);
      expect(reread.json().totals.subtotal, 'frozen at snapshot').toEqual(usd(29600));
    } finally {
      await dbAdmin.productVariant.update({ where: { id: v.alpine }, data: { price: 14800 } });
    }
  });

  it('leaves the cart intact so an abandoned checkout is recoverable', async () => {
    const { cookie } = await openCheckout([{ variantId: v.alpine, quantity: 1 }]);
    const cart = await req('GET', '/storefront/api/cart', { cookie });
    expect(cart.json().lines).toHaveLength(1);
  });

  it('404s an unknown token and refuses a checkout from an empty cart', async () => {
    expect((await req('GET', '/storefront/api/checkouts/chk_nope')).statusCode).toBe(404);

    const created = await req('POST', '/storefront/api/cart');
    const cookie = `${CART_COOKIE}=${created.cookies.find((c) => c.name === CART_COOKIE)?.value}`;
    const empty = await req('POST', '/storefront/api/checkouts', { cookie });
    expect(empty.statusCode).toBe(409);
  });
});

describe('totals', () => {
  it('applies tax to the discounted subtotal and balances the identity', async () => {
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 3 }]);
    const state = await readyToPay(checkout.token);

    const subtotal = 5400;
    const shipping = 895;
    const tax = Math.round((subtotal * TAX_RATE) / 100);
    expect(state.totals).toEqual({
      subtotal: usd(subtotal),
      discountTotal: usd(0),
      shippingTotal: usd(shipping),
      taxTotal: usd(tax),
      total: usd(subtotal + shipping + tax),
    });
  });

  it('prices WELCOME10 exactly as the C1 engine does, taxing the discounted base', async () => {
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 3 }]);
    const state = await readyToPay(checkout.token, { discountCode: 'WELCOME10' });

    const subtotal = 5400;
    const discount = 540; // 10%
    const shipping = 895;
    // The base is subtotal − discounts. Taxing the gross would overcharge every
    // discounted order by the tax on the discount.
    const tax = Math.round(((subtotal - discount) * TAX_RATE) / 100);

    expect(state.totals).toEqual({
      subtotal: usd(subtotal),
      discountTotal: usd(discount),
      shippingTotal: usd(shipping),
      taxTotal: usd(tax),
      total: usd(subtotal - discount + shipping + tax),
    });
    expect(state.appliedDiscounts).toHaveLength(1);
    expect(state.appliedDiscounts[0].code).toBe('WELCOME10');
    expect(state.rejectedDiscount).toBeNull();
  });

  it('reports a bad code inline and leaves the totals alone', async () => {
    // E4 renders this next to the input. It is not an HTTP error: the shopper
    // mistyping a coupon must not look like the checkout broke.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 3 }]);
    const before = (await readyToPay(checkout.token)).totals;

    for (const [code, reason] of [
      ['NOSUCHCODE', 'invalid'],
      ['EXPIRED20', 'expired'],
    ] as const) {
      const state = await readyToPay(checkout.token, { discountCode: code });
      expect(state.rejectedDiscount, code).toEqual({ code, reason });
      expect(state.totals, code).toEqual(before);
      expect(state.appliedDiscounts, code).toEqual([]);
    }
  });

  it('offers a conditional rate only once the discounted subtotal qualifies', async () => {
    // The threshold is evaluated AFTER discounts, so a code can price the
    // shopper out of free shipping — which is what Shopify does.
    // 9 x 1800 = 16200, over the 15000 threshold; 10% off leaves 14580, under it.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 9 }]);

    const full = await req('GET', `/storefront/api/checkouts/${checkout.token}/shipping-rates`);
    expect(full.json().map((r: { id: string }) => r.id)).toContain(FREE_RATE_ID);

    await readyToPay(checkout.token, { discountCode: 'WELCOME10' });
    const reduced = await req('GET', `/storefront/api/checkouts/${checkout.token}/shipping-rates`);
    expect(reduced.json().map((r: { id: string }) => r.id)).not.toContain(FREE_RATE_ID);
  });

  it('drops a selected rate that stops being applicable', async () => {
    // Otherwise the shopper keeps free shipping they no longer qualify for, and
    // the charge silently disagrees with the sidebar.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 9 }]);
    const free = await readyToPay(checkout.token, {}, FREE_RATE_ID);
    expect(free.selectedShippingRateId).toBe(FREE_RATE_ID);
    expect(free.totals.shippingTotal).toEqual(usd(0));

    const after = await readyToPay(checkout.token, { discountCode: 'WELCOME10' }, FREE_RATE_ID);
    expect(after.selectedShippingRateId).toBeNull();
  });
});

describe('complete', () => {
  it('charges, creates the order and matches the checkout to the cent', async () => {
    const { cookie, checkout } = await openCheckout([
      { variantId: v.alpine, quantity: 1 },
      { variantId: v.socks, quantity: 2 },
    ]);
    const priced = await readyToPay(checkout.token, { discountCode: 'WELCOME10' });

    const stockBefore = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.alpine, locationId },
    });

    const response = await pay(checkout.token, tok.approved, { cookie });
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();
    expect(body.status).toBe('success');
    expect(body.orderNumber).toBeGreaterThanOrEqual(1001);
    expect(body.confirmationUrl).toContain(checkout.token);

    // The one invariant the whole flow exists to hold: what the sidebar showed
    // is what the card was charged and what the order records.
    const order = await dbAdmin.order.findUniqueOrThrow({
      where: { id: body.orderId },
      include: { lineItems: true },
    });
    expect(order.subtotal).toBe(priced.totals.subtotal.amount);
    expect(order.discountTotal).toBe(priced.totals.discountTotal.amount);
    expect(order.shippingTotal).toBe(priced.totals.shippingTotal.amount);
    expect(order.taxTotal).toBe(priced.totals.taxTotal.amount);
    expect(order.total).toBe(priced.totals.total.amount);
    expect(order.subtotal - order.discountTotal + order.shippingTotal + order.taxTotal).toBe(
      order.total,
    );
    expect(order.financialStatus).toBe('paid');
    expect(order.email).toBe('shopper@example.com');
    expect(order.lineItems).toHaveLength(2);

    const payment = await dbAdmin.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(payment.amount, 'charged exactly the order total').toBe(order.total);
    expect(payment.status).toBe('captured');

    // Stock moved through B4, so the history exists.
    const stockAfter = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.alpine, locationId },
    });
    expect(stockAfter.available).toBe(stockBefore.available - 1);
    const sold = await dbAdmin.inventoryAdjustment.findMany({
      where: { variantId: v.alpine, reason: 'sold', referenceId: order.id },
    });
    expect(sold).toHaveLength(1);

    // A completed checkout is closed, and its cart is gone.
    const reread = await req('GET', `/storefront/api/checkouts/${checkout.token}`);
    expect(reread.json().status).toBe('completed');
    expect(reread.json().completedOrderId).toBe(order.id);
    expect((await req('GET', '/storefront/api/cart', { cookie })).json().lines).toEqual([]);

    // A second attempt returns the SAME order rather than an error: a refreshed
    // thank-you page or a retried request must not look like a failed purchase,
    // and must certainly not charge again.
    const again = await pay(checkout.token, tok.approved);
    expect(again.statusCode).toBe(200);
    expect(again.json()).toMatchObject({ status: 'success', orderId: order.id });
    expect(await dbAdmin.payment.count({ where: { orderId: order.id } })).toBe(1);
  });

  it('attaches a customer and reuses them on a second order', async () => {
    const first = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    await readyToPay(first.checkout.token, { email: 'repeat@example.com' });
    const one = await pay(first.checkout.token, tok.approved);
    expect(one.statusCode, one.body).toBe(200);

    const second = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    await readyToPay(second.checkout.token, { email: 'REPEAT@example.com' });
    const two = await pay(second.checkout.token, tok.approved);
    expect(two.statusCode, two.body).toBe(200);

    const customers = await dbAdmin.customer.findMany({
      where: { shopId: shop.shopId, email: 'repeat@example.com' },
    });
    // Case-folded: Shopify treats an email as one identity regardless of case.
    expect(customers).toHaveLength(1);
    const orders = await dbAdmin.order.findMany({ where: { customerId: customers[0]?.id } });
    expect(orders).toHaveLength(2);
  });

  it('refuses a oncePerCustomer code the same email already redeemed', async () => {
    await dbAdmin.discount.create({
      data: {
        id: newId('discount'),
        shopId: shop.shopId,
        title: 'One per customer',
        code: 'ONCE15',
        type: 'amount_off_order',
        valueType: 'percentage',
        value: 15,
        appliesTo: { scope: 'all' },
        minimumRequirement: { type: 'none' },
        oncePerCustomer: true,
        status: 'active',
        startsAt: new Date(Date.now() - 86_400_000),
      },
    });

    const first = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    const priced = await readyToPay(first.checkout.token, {
      email: 'loyal@example.com',
      discountCode: 'ONCE15',
    });
    expect(priced.appliedDiscounts[0]?.code).toBe('ONCE15');
    const paid = await pay(first.checkout.token, tok.approved);
    expect(paid.statusCode, paid.body).toBe(200);

    // The same shopper again — case-folded, like the customer identity is. The
    // code is rejected inline, not applied and silently unwound later.
    const second = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    const rejected = await readyToPay(second.checkout.token, {
      email: 'LOYAL@example.com',
      discountCode: 'ONCE15',
    });
    expect(rejected.rejectedDiscount).toEqual({ code: 'ONCE15', reason: 'usage_limit' });
    expect(rejected.appliedDiscounts).toEqual([]);
    expect(rejected.totals.discountTotal.amount).toBe(0);

    // A different customer — and a guest-shaped brand-new email — still gets it.
    const other = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    const applied = await readyToPay(other.checkout.token, {
      email: 'first-timer@example.com',
      discountCode: 'ONCE15',
    });
    expect(applied.appliedDiscounts[0]?.code).toBe('ONCE15');
  });

  it('leaves the checkout payable after a decline, with no order and no stock movement', async () => {
    const { checkout } = await openCheckout([{ variantId: v.alpine, quantity: 1 }]);
    // Its own email, so the "no order" assertion cannot see another test's.
    await readyToPay(checkout.token, { email: 'declined@example.com' });

    const before = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.alpine, locationId },
    });

    const declined = await pay(checkout.token, tok.declined);
    // The contract models a decline as a response, not an HTTP error: SPEC §5
    // fixes the error-code set and has nothing that means "the bank said no".
    expect(declined.statusCode).toBe(200);
    expect(declined.json()).toMatchObject({ status: 'failed', code: 'declined' });

    const state = await req('GET', `/storefront/api/checkouts/${checkout.token}`);
    expect(state.json().status, 'shopper can try another card').toBe('open');
    expect(state.json().completedOrderId).toBeNull();

    const after = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.alpine, locationId },
    });
    expect(after.available, 'reserved stock released').toBe(before.available);

    const failed = await dbAdmin.payment.findMany({
      where: { checkoutId: state.json().id, status: 'failed' },
    });
    expect(failed.length).toBeGreaterThan(0);
    expect(
      await dbAdmin.order.count({ where: { shopId: shop.shopId, email: state.json().email } }),
    ).toBe(0);

    // The same checkout now succeeds on a good card.
    const retry = await pay(checkout.token, tok.approved);
    expect(retry.statusCode, retry.body).toBe(200);
    expect(retry.json().status).toBe('success');
  });

  it('keeps a declined attempt out of the order’s inventory history', async () => {
    // A decline reserves and releases stock. That history is real, but it is
    // the checkout's, not the order's — an inventory drawer showing a sale that
    // never happened is worse than showing nothing.
    const { checkout } = await openCheckout([{ variantId: v.alpine, quantity: 1 }]);
    await readyToPay(checkout.token, { email: 'history@example.com' });

    expect((await pay(checkout.token, tok.declined)).json().status).toBe('failed');
    const paid = await pay(checkout.token, tok.approved);
    expect(paid.statusCode, paid.body).toBe(200);

    const linked = await dbAdmin.inventoryAdjustment.findMany({
      where: { shopId: shop.shopId, referenceId: paid.json().orderId },
    });
    expect(linked.map((a) => a.reason)).toEqual(['sold']);
    expect(linked).toHaveLength(1);
  });

  it('shows the purchase in the admin’s customer aggregates', async () => {
    // A shopper who just bought must not read "0 orders" in the admin. C4
    // derives `ordersCount`/`totalSpent` from the order rows per request
    // (DECISIONS) — this asserts through that surface, the one the admin reads.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 2 }]);
    await readyToPay(checkout.token, { email: 'counted@example.com' });
    const paid = await pay(checkout.token, tok.approved);
    expect(paid.statusCode, paid.body).toBe(200);

    const order = await dbAdmin.order.findUniqueOrThrow({ where: { id: paid.json().orderId } });
    const customer = await dbAdmin.customer.findFirstOrThrow({
      where: { shopId: shop.shopId, email: 'counted@example.com' },
    });
    const detail = await getCustomer(dbForShop(shop.shopId), customer.id);
    expect(detail.ordersCount).toBe(1);
    expect(detail.totalSpent).toEqual(usd(order.total));
  });

  it('keeps a charged checkout closed even if the order cannot be recorded', async () => {
    // Break order creation after the money has moved. Reopening the checkout
    // here would invite a second charge; a merchant finishing one order by hand
    // is the better failure.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    await readyToPay(checkout.token, { email: 'halfway@example.com' });

    // An order number collision is the cheapest way to make createOrder throw
    // after the charge: the sequence is about to hand out this exact number.
    const sequence = await dbAdmin.orderSequence.findFirstOrThrow({
      where: { shopId: shop.shopId },
    });
    const blockerId = newId('order');
    await dbAdmin.order.create({
      data: {
        id: blockerId,
        shopId: shop.shopId,
        orderNumber: sequence.next,
        email: 'blocker@example.com',
        currencyCode: 'USD',
      },
    });

    try {
      const response = await pay(checkout.token, tok.approved);
      expect(response.statusCode, 'the failure is surfaced, not swallowed').toBeGreaterThanOrEqual(
        400,
      );

      const after = await dbAdmin.checkout.findFirstOrThrow({ where: { token: checkout.token } });
      expect(after.status, 'stays closed so it cannot be paid twice').toBe('completed');

      const payments = await dbAdmin.payment.findMany({ where: { checkoutId: after.id } });
      expect(
        payments.filter((p) => p.status === 'captured'),
        'charged exactly once',
      ).toHaveLength(1);
    } finally {
      // Undo the sabotage. The sequence is shared across the file, and leaving a
      // squatted order number would fail every test after this one.
      await dbAdmin.order.deleteMany({ where: { id: blockerId } });
      await dbAdmin.orderSequence.update({
        where: { shopId: shop.shopId },
        data: { next: sequence.next },
      });
    }
  });

  it('surfaces the processor’s reason, not a generic failure', async () => {
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    await readyToPay(checkout.token);
    const response = await pay(checkout.token, tok.insufficient);
    expect(response.json()).toMatchObject({ status: 'failed', code: 'insufficient_funds' });
  });

  it('creates exactly one order when Pay now is double-clicked', async () => {
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    await readyToPay(checkout.token);

    // Same idempotency key: one click, two requests in flight.
    const key = newId('event');
    const [a, b] = await Promise.all([
      pay(checkout.token, tok.approved, { idempotencyKey: key }),
      pay(checkout.token, tok.approved, { idempotencyKey: key }),
    ]);

    const ok = [a, b].filter((r) => r.statusCode === 200 && r.json().status === 'success');
    expect(ok.length, 'at least one succeeds').toBeGreaterThanOrEqual(1);

    const orderIds = new Set(ok.map((r) => r.json().orderId));
    expect(orderIds.size, 'one order, however many requests').toBe(1);

    const orderId = [...orderIds][0] as string;
    const payments = await dbAdmin.payment.findMany({ where: { orderId } });
    expect(payments, 'charged once').toHaveLength(1);
  });

  it('refuses to oversell a deny-policy variant when two shoppers race', async () => {
    // One unit left, two checkouts already priced. Exactly one may win, and the
    // loser must not be charged.
    const one = await openCheckout([{ variantId: v.scarce, quantity: 1 }]);
    const two = await openCheckout([{ variantId: v.scarce, quantity: 1 }]);
    await readyToPay(one.checkout.token);
    await readyToPay(two.checkout.token);

    const results = await Promise.all([
      pay(one.checkout.token, tok.approved),
      pay(two.checkout.token, tok.approved),
    ]);

    const succeeded = results.filter((r) => r.statusCode === 200 && r.json().status === 'success');
    const conflicted = results.filter((r) => r.statusCode === 409);
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(1);
    expect(conflicted[0]?.json().errors[0].code).toBe('conflict');

    const level = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.scarce, locationId },
    });
    expect(level.available, 'never negative under deny').toBe(0);

    // The loser was not charged for stock it did not get.
    const loserToken = results[0]?.statusCode === 409 ? one.checkout.token : two.checkout.token;
    const loser = await dbAdmin.checkout.findFirstOrThrow({ where: { token: loserToken } });
    expect(loser.status).toBe('open');
    expect(await dbAdmin.payment.count({ where: { checkoutId: loser.id } })).toBe(0);
  });

  it('sells a continue-policy variant that is out of stock', async () => {
    const { checkout } = await openCheckout([{ variantId: v.backorder, quantity: 2 }]);
    await readyToPay(checkout.token);
    const response = await pay(checkout.token, tok.approved);
    expect(response.statusCode, response.body).toBe(200);

    const level = await dbAdmin.inventoryLevel.findFirstOrThrow({
      where: { variantId: v.backorder, locationId },
    });
    expect(level.available, 'oversell is the merchant’s explicit choice').toBe(-2);
  });

  it('refuses to complete until email, address and rate are all present', async () => {
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 1 }]);
    const bare = await pay(checkout.token, tok.approved);
    expect(bare.statusCode).toBe(400);
    expect(bare.json().errors[0].code).toBe('invalid_request');

    await req('PUT', `/storefront/api/checkouts/${checkout.token}`, {
      payload: { email: 'shopper@example.com' },
    });
    const stillMissing = await pay(checkout.token, tok.approved);
    expect(stillMissing.statusCode).toBe(400);
    expect(stillMissing.json().errors[0].field).toBeTruthy();
  });

  it('recomputes at complete rather than trusting what the client last saw', async () => {
    // The client's displayed totals are a view, never an input. A price change
    // between pricing and paying must reach the card, not the stale sidebar.
    const { checkout } = await openCheckout([{ variantId: v.socks, quantity: 2 }]);
    const priced = await readyToPay(checkout.token);

    // Move the tax rate under the shopper's feet.
    await dbAdmin.shop.update({
      where: { id: shop.shopId },
      data: { taxSettings: { ratePercentage: 20, pricesIncludeTax: false } },
    });
    try {
      const response = await pay(checkout.token, tok.approved);
      expect(response.statusCode, response.body).toBe(200);
      const order = await dbAdmin.order.findUniqueOrThrow({
        where: { id: response.json().orderId },
      });
      const expectedTax = Math.round((order.subtotal - order.discountTotal) * 0.2);
      expect(order.taxTotal).toBe(expectedTax);
      expect(order.taxTotal).not.toBe(priced.totals.taxTotal.amount);

      const payment = await dbAdmin.payment.findFirstOrThrow({ where: { orderId: order.id } });
      expect(payment.amount, 'charged the recomputed total').toBe(order.total);
    } finally {
      await dbAdmin.shop.update({
        where: { id: shop.shopId },
        data: { taxSettings: { ratePercentage: TAX_RATE, pricesIncludeTax: false } },
      });
    }
  });
});
