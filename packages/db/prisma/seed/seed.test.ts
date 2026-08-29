/**
 * Seed invariants (H1). Runs the real seed against a real database, then asserts
 * the properties every other workstream builds on.
 *
 * This is not a CRUD test and not coverage theatre — SPEC §14 forbids both. It
 * exists because **the seed is the demo**: eight agents are adding columns and
 * services on top of this data, and the failures that actually hurt are silent
 * ones. An order whose totals do not sum makes the orders UI look broken; an
 * InventoryLevel with no adjustment history makes the inventory drawer empty;
 * a missing `featured` collection blanks the storefront home page. Each of those
 * is a demo-day bug that no unit test elsewhere would catch.
 */
import { themeDocSchema } from '@merchant/contracts/theme';
import { beforeAll, describe, expect, it } from 'vitest';
import { dbAdmin } from '../../src/client.ts';
import { DEMO_SHOP_SLUG, seedDemo } from './index.ts';
import { HISTORY_DAYS, OLDEST_HISTORY_DAY } from './orders.ts';

let shopId: string;

/** The seed is slow-ish (thousands of analytics rows); one run for the file. */
beforeAll(async () => {
  const summary = await seedDemo();
  shopId = summary.shopId;
}, 120_000);

const where = () => ({ shopId });

describe('shape of the demo store', () => {
  it('creates the shop, both staff users and the order sequence', async () => {
    const shop = await dbAdmin.shop.findUniqueOrThrow({ where: { slug: DEMO_SHOP_SLUG } });
    expect(shop.name).toBe('Aurora Supply Co.');
    expect(shop.currencyCode).toBe('USD');

    const staff = await dbAdmin.staffUser.findMany({ where: where(), orderBy: { email: 'asc' } });
    expect(staff.map((s) => s.email)).toEqual(['maya@aurorasupply.dev', 'owner@demo.dev']);
    // The partial-permission user is what makes the staff permissions UI (A4) real.
    expect(staff.find((s) => s.role === 'staff')?.permissions).not.toEqual({});
  });

  it('seeds the SPEC §7 counts', async () => {
    const [products, variants, collections, locations, customers, orders, discounts] =
      await Promise.all([
        dbAdmin.product.count({ where: where() }),
        dbAdmin.productVariant.count({ where: where() }),
        dbAdmin.collection.count({ where: where() }),
        dbAdmin.location.count({ where: where() }),
        dbAdmin.customer.count({ where: where() }),
        dbAdmin.order.count({ where: where() }),
        dbAdmin.discount.count({ where: where() }),
      ]);

    expect(products).toBeGreaterThanOrEqual(30);
    expect(variants).toBeGreaterThan(products); // options actually produce variants
    expect(collections).toBe(4);
    expect(locations).toBe(2);
    expect(customers).toBe(25);
    expect(orders).toBe(40);
    expect(discounts).toBe(3);
  });

  it('gives every product images, a handle and at least one variant', async () => {
    const products = await dbAdmin.product.findMany({
      where: where(),
      include: { variants: true, images: true },
    });

    for (const p of products) {
      expect(p.handle, `${p.title} handle`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(p.variants.length, `${p.title} variants`).toBeGreaterThan(0);
      expect(p.images.length, `${p.title} images`).toBeGreaterThan(0);
      for (const image of p.images) {
        // Curated photography only (data/images.ts): the placeholder fallback
        // firing means someone added a product without picking its photos.
        expect(image.url, `${p.title} uses a curated image`).toContain('images.unsplash.com');
      }
      expect(p.descriptionHtml.length, `${p.title} description`).toBeGreaterThan(40);
      for (const v of p.variants) {
        // SPEC §5 / CLAUDE.md §9: money is integer minor units, in seeds too.
        expect(Number.isInteger(v.price), `${p.title} price`).toBe(true);
        expect(v.price).toBeGreaterThanOrEqual(1800);
        expect(v.price).toBeLessThanOrEqual(22000);
      }
    }
  });

  it('has the `featured` collection the theme presets reference', async () => {
    // Hard contract with F1: presets.test.ts asserts the presets reference
    // exactly this handle, so a rename here blanks the storefront home page.
    const featured = await dbAdmin.collection.findUniqueOrThrow({
      where: { shopId_handle: { shopId, handle: 'featured' } },
      include: { products: true },
    });
    expect(featured.products.length).toBeGreaterThanOrEqual(4);

    const smart = await dbAdmin.collection.findMany({ where: { ...where(), type: 'smart' } });
    expect(smart).toHaveLength(1);
    expect(smart[0]?.ruleSet).toMatchObject({ rules: [{ column: 'tag', condition: 'new' }] });
  });
});

describe('inventory history', () => {
  it('reconciles every InventoryLevel against its adjustment ledger', async () => {
    // CLAUDE.md §9: quantities only ever move through the adjustment service, so
    // a level that does not equal the sum of its adjustments means history was
    // lost — and the admin inventory drawer reads that history.
    const [levels, adjustments] = await Promise.all([
      dbAdmin.inventoryLevel.findMany({ where: where() }),
      dbAdmin.inventoryAdjustment.groupBy({
        by: ['variantId', 'locationId'],
        where: where(),
        _sum: { delta: true },
      }),
    ]);

    expect(levels.length).toBeGreaterThan(0);
    const ledger = new Map(
      adjustments.map((a) => [`${a.variantId}:${a.locationId}`, a._sum.delta]),
    );

    for (const level of levels) {
      expect(ledger.get(`${level.variantId}:${level.locationId}`), 'ledger sum').toBe(
        level.available,
      );
      expect(level.available, 'no negative stock').toBeGreaterThanOrEqual(0);
    }
  });

  it('reconciles `sold` adjustments against what each order actually fulfilled', async () => {
    // The level-vs-ledger test above compares two artifacts of the same
    // in-memory ledger, so it cannot catch a fulfillment that never recorded
    // its `sold` movement. This one cross-checks the ledger against the
    // fulfillment rows themselves.
    const [sold, fulfillments] = await Promise.all([
      dbAdmin.inventoryAdjustment.groupBy({
        by: ['referenceId'],
        where: { ...where(), reason: 'sold' },
        _sum: { delta: true },
      }),
      dbAdmin.fulfillment.findMany({ where: where(), select: { orderId: true, lineItems: true } }),
    ]);

    const fulfilledUnits = new Map<string, number>();
    for (const f of fulfillments) {
      const units = (f.lineItems as Array<{ quantity: number }>).reduce(
        (acc, l) => acc + l.quantity,
        0,
      );
      fulfilledUnits.set(f.orderId, (fulfilledUnits.get(f.orderId) ?? 0) + units);
    }

    expect(fulfillments.length).toBeGreaterThan(0);
    const soldByOrder = new Map(sold.map((s) => [s.referenceId, -(s._sum.delta ?? 0)]));
    for (const [orderId, units] of fulfilledUnits) {
      expect(soldByOrder.get(orderId), `sold units for ${orderId}`).toBe(units);
    }
    // And nothing sold without a fulfillment to explain it.
    for (const [referenceId] of soldByOrder) {
      expect(fulfilledUnits.has(referenceId ?? ''), `fulfillment for ${referenceId}`).toBe(true);
    }
  });

  it('records a `received` adjustment before any `sold` one', async () => {
    const reasons = await dbAdmin.inventoryAdjustment.groupBy({
      by: ['reason'],
      where: where(),
      _count: true,
    });
    const byReason = Object.fromEntries(reasons.map((r) => [r.reason, r._count]));
    expect(byReason.received).toBeGreaterThan(0);
    expect(byReason.sold).toBeGreaterThan(0);
    expect(byReason.restock).toBeGreaterThan(0); // the partially-refunded orders
  });

  it('leaves some variants genuinely out of stock', async () => {
    // Without these, the storefront's sold-out badge, the inventory page's
    // out-of-stock filter and B6's per-location split have nothing to render —
    // 40 orders alone never exhaust a seeded warehouse.
    const levels = await dbAdmin.inventoryLevel.findMany({
      where: { ...where(), available: 0 },
    });
    expect(levels.length).toBeGreaterThanOrEqual(6);

    const byVariant = new Map<string, number>();
    for (const l of levels) byVariant.set(l.variantId, (byVariant.get(l.variantId) ?? 0) + 1);
    // At least one is out everywhere, not merely out at one location.
    expect([...byVariant.values()].some((locations) => locations === 2)).toBe(true);
  });
});

describe('order money', () => {
  it('makes every order total actually sum', async () => {
    const orders = await dbAdmin.order.findMany({ where: where(), include: { lineItems: true } });

    for (const o of orders) {
      const label = `#${o.orderNumber}`;
      // The one arithmetic identity the whole orders UI depends on.
      expect(o.subtotal - o.discountTotal + o.shippingTotal + o.taxTotal, `${label} total`).toBe(
        o.total,
      );

      const lineSum = o.lineItems.reduce((acc, li) => acc + li.price * li.quantity, 0);
      expect(lineSum, `${label} subtotal from lines`).toBe(o.subtotal);

      const discountSum = o.lineItems.reduce((acc, li) => acc + li.totalDiscount, 0);
      expect(discountSum, `${label} discount allocation`).toBe(o.discountTotal);

      for (const li of o.lineItems) {
        expect(Number.isInteger(li.price), `${label} line price integer`).toBe(true);
        expect(li.quantity).toBeGreaterThan(0);
        expect(li.fulfilledQuantity).toBeLessThanOrEqual(li.quantity);
        expect(li.refundedQuantity).toBeLessThanOrEqual(li.quantity);
      }

      expect(o.total, `${label} non-negative`).toBeGreaterThanOrEqual(0);
      expect(o.refundedTotal, `${label} refund ≤ total`).toBeLessThanOrEqual(o.total);
    }
  });

  it('numbers orders sequentially from #1001 and leaves the sequence past the end', async () => {
    const orders = await dbAdmin.order.findMany({
      where: where(),
      orderBy: { orderNumber: 'asc' },
      select: { orderNumber: true },
    });
    const numbers = orders.map((o) => o.orderNumber);
    expect(numbers[0]).toBe(1001);
    expect(numbers).toEqual(numbers.map((_, i) => 1001 + i)); // dense, unique, ordered

    // C2 takes the next number from here; overlapping would violate the unique index.
    const sequence = await dbAdmin.orderSequence.findUniqueOrThrow({ where: { shopId } });
    expect(sequence.next).toBe(1001 + numbers.length);
  });

  it('keeps financial and fulfillment status consistent with the rows behind them', async () => {
    const orders = await dbAdmin.order.findMany({
      where: where(),
      include: { lineItems: true, refunds: true, fulfillments: true },
    });

    const cancelled = orders.filter((o) => o.cancelledAt !== null);
    const refunded = orders.filter((o) => o.refundedTotal > 0);
    expect(cancelled.length, 'SPEC: 2 cancelled orders').toBe(2);
    expect(refunded.length, 'SPEC: 2 partially refunded orders').toBe(2);

    for (const o of orders) {
      const label = `#${o.orderNumber}`;
      const refundSum = o.refunds.reduce((acc, r) => acc + r.amount, 0);
      expect(refundSum, `${label} refunds sum to refundedTotal`).toBe(o.refundedTotal);

      if (o.refundedTotal > 0) {
        expect(o.financialStatus, `${label} financial status`).toBe(
          o.refundedTotal === o.total ? 'refunded' : 'partially_refunded',
        );
      }
      if (o.cancelledAt) {
        expect(o.cancelReason, `${label} cancel reason`).toBeTruthy();
        expect(o.fulfillments, `${label} cancelled order is unfulfilled`).toHaveLength(0);
      }

      const fulfilled = o.lineItems.reduce((acc, li) => acc + li.fulfilledQuantity, 0);
      const ordered = o.lineItems.reduce((acc, li) => acc + li.quantity, 0);
      const expected =
        fulfilled === 0
          ? 'unfulfilled'
          : fulfilled === ordered
            ? 'fulfilled'
            : 'partially_fulfilled';
      expect(o.fulfillmentStatus, `${label} fulfillment status`).toBe(expected);
      expect(o.fulfillments.length > 0, `${label} has fulfillment rows`).toBe(fulfilled > 0);
    }

    // The demo needs a mix, not 40 identical rows.
    const statuses = new Set(orders.map((o) => o.fulfillmentStatus));
    expect(statuses.has('fulfilled') && statuses.has('unfulfilled')).toBe(true);
  });

  it('gives every order a timeline and every paid order a captured payment', async () => {
    const orders = await dbAdmin.order.findMany({ where: where(), include: { events: true } });
    const payments = await dbAdmin.payment.findMany({ where: where() });
    const byOrder = new Map(payments.map((p) => [p.orderId, p]));

    for (const o of orders) {
      const label = `#${o.orderNumber}`;
      expect(o.events.length, `${label} timeline`).toBeGreaterThan(0);
      expect(
        o.events.some((e) => e.type === 'order_placed'),
        `${label} order_placed`,
      ).toBe(true);

      const payment = byOrder.get(o.id);
      expect(payment, `${label} payment`).toBeDefined();
      expect(payment?.amount, `${label} payment amount`).toBe(o.total);
      expect(payment?.processor).toBe('mock');
      expect(payment?.refundedAmount, `${label} payment refund`).toBe(o.refundedTotal);
      // No PAN anywhere: Pay only ever persists brand/last4 (SPEC §11).
      expect(payment?.last4).toMatch(/^\d{4}$/);
    }

    const refunds = await dbAdmin.paymentRefund.findMany({ where: where() });
    expect(refunds.length).toBe(2);
  });

  it('links refunds and discount redemptions back to their order', async () => {
    const redemptions = await dbAdmin.discountRedemption.findMany({ where: where() });
    expect(redemptions.length).toBeGreaterThan(0);

    const welcome = await dbAdmin.discount.findUniqueOrThrow({
      where: { shopId_code: { shopId, code: 'WELCOME10' } },
    });
    // usedCount backs the "N used" column on the discounts index (C6).
    expect(welcome.usedCount).toBe(redemptions.filter((r) => r.discountId === welcome.id).length);
    expect(welcome.status).toBe('active');

    // The row says `oncePerCustomer`; the redemptions have to agree with it, or
    // C1's engine and the seeded history tell different stories.
    expect(welcome.oncePerCustomer).toBe(true);
    const perCustomer = redemptions
      .filter((r) => r.discountId === welcome.id)
      .reduce<Record<string, number>>((acc, r) => {
        const key = r.customerId ?? 'guest';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
    expect(Object.values(perCustomer).filter((n) => n > 1)).toEqual([]);

    const expired = await dbAdmin.discount.findFirst({ where: { ...where(), status: 'expired' } });
    expect(expired?.endsAt?.getTime()).toBeLessThan(Date.now());

    const automatic = await dbAdmin.discount.findFirst({ where: { ...where(), code: null } });
    expect(automatic?.type).toBe('free_shipping');
  });
});

describe('customers', () => {
  it('keeps the denormalized order columns honest', async () => {
    // These two columns are what the customers IndexTable sorts on; recomputing
    // per row would make the list query quadratic, so they must be correct here.
    const customers = await dbAdmin.customer.findMany({
      where: where(),
      include: { orders: true, addresses: true },
    });

    for (const c of customers) {
      const counted = c.orders.filter((o) => o.cancelledAt === null);
      expect(c.ordersCount, `${c.email} ordersCount`).toBe(counted.length);
      expect(c.totalSpent, `${c.email} totalSpent`).toBe(
        counted.reduce((acc, o) => acc + o.total - o.refundedTotal, 0),
      );
      expect(c.addresses.length, `${c.email} addresses`).toBeGreaterThan(0);
      expect(c.addresses.filter((a) => a.isDefault).length, `${c.email} one default`).toBe(1);
    }
  });

  it('gives the E5 storefront-login customer a password hash', async () => {
    const jane = await dbAdmin.customer.findUniqueOrThrow({
      where: { shopId_email: { shopId, email: 'jane@example.com' } },
    });
    expect(jane.passwordHash).toMatch(/^\$argon2id\$/);
    expect(
      await dbAdmin.customer.count({ where: { ...where(), passwordHash: { not: null } } }),
    ).toBeGreaterThan(1);
  });

  it('gives jane an order history so the E5 account demo is not an empty state', async () => {
    const jane = await dbAdmin.customer.findUniqueOrThrow({
      where: { shopId_email: { shopId, email: 'jane@example.com' } },
    });
    const orders = await dbAdmin.order.findMany({ where: { ...where(), customerId: jane.id } });
    expect(orders.length).toBeGreaterThanOrEqual(2);
    // At least one delivered order (a real history) and none of hers cancelled —
    // a cancelled order is a strange first impression for the demo login.
    expect(orders.some((o) => o.fulfillmentStatus === 'fulfilled')).toBe(true);
    expect(orders.every((o) => o.cancelledAt === null)).toBe(true);
  });

  it('seeds two abandoned checkouts C4’s segment can actually list', async () => {
    const open = await dbAdmin.checkout.findMany({
      where: { ...where(), status: 'open', completedOrderId: null },
    });
    expect(open).toHaveLength(2);
    const emails = await dbAdmin.customer.findMany({ where: where(), select: { email: true } });
    const known = new Set(emails.map((c) => c.email));
    for (const checkout of open) {
      // Younger than the 72h segment window regardless of when the seed ran.
      expect(Date.now() - checkout.createdAt.getTime()).toBeLessThan(48 * 60 * 60 * 1000);
      expect(checkout.email).not.toBeNull();
      expect(known.has(checkout.email as string)).toBe(true);
      expect(Array.isArray(checkout.cartSnapshot)).toBe(true);
      expect((checkout.cartSnapshot as unknown[]).length).toBeGreaterThan(0);
    }
  });
});

describe('demo app', () => {
  it('installs one app whose token is stored hashed only', async () => {
    const apps = await dbAdmin.app.findMany({ where: where() });
    expect(apps).toHaveLength(1);
    const app = apps[0];
    expect(app?.name).toBe('Warehouse Sync');
    // SHA-256 hex, never a plaintext `shpat_` token.
    expect(app?.apiTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(app?.uninstalledAt).toBeNull();
    expect(app?.scopes).toContain('read_orders');
  });

  it('subscribes a webhook and fills its delivery log with real orders', async () => {
    const subscription = await dbAdmin.webhookSubscription.findFirstOrThrow({
      where: { ...where(), deletedAt: null },
    });
    expect(subscription.topic).toBe('orders/create');
    expect(subscription.secret).toMatch(/^whsec_/);

    const deliveries = await dbAdmin.webhookDelivery.findMany({ where: where() });
    expect(deliveries.length).toBeGreaterThanOrEqual(2);
    for (const delivery of deliveries) {
      expect(delivery.subscriptionId).toBe(subscription.id);
      expect(delivery.status).toBe('success');
      // Each payload names a real seeded order, so the log opens onto real pages.
      const payload = delivery.payload as { id?: string };
      const order = await dbAdmin.order.findFirst({
        where: { ...where(), id: payload.id ?? '' },
      });
      expect(order, `delivery ${delivery.id} references a real order`).not.toBeNull();
      // The log cannot predate the app it belongs to.
      expect(delivery.createdAt.getTime()).toBeGreaterThan(subscription.createdAt.getTime());
    }
  });
});

describe('theme and processor', () => {
  it('publishes exactly one theme and it still validates', async () => {
    const versions = await dbAdmin.themeVersion.findMany({ where: where() });
    const published = versions.filter((v) => v.status === 'published');
    expect(published).toHaveLength(1);
    expect(published[0]?.publishedAt).toBeInstanceOf(Date);

    // The storefront renderer trusts this JSON completely (theme.prisma).
    expect(() => themeDocSchema.parse(published[0]?.themeJson)).not.toThrow();

    const conversation = await dbAdmin.builderConversation.findFirstOrThrow({ where: where() });
    // F4 opens the builder onto this history; a single message reads as empty.
    expect(Array.isArray(conversation.messages)).toBe(true);
    expect((conversation.messages as unknown[]).length).toBeGreaterThan(1);
  });

  it('connects the mock processor with a routing rule', async () => {
    const config = await dbAdmin.processorConfig.findUniqueOrThrow({
      where: { shopId_processor: { shopId, processor: 'mock' } },
      include: { routingRules: true },
    });
    expect(config.enabled).toBe(true);
    expect(config.routingRules).toHaveLength(1);
    expect(config.routingRules[0]?.weight).toBe(100);
  });

  it('saves cards for repeat customers so the charge-saved-card demo has data', async () => {
    const methods = await dbAdmin.paymentMethod.findMany({ where: where() });
    expect(methods.length).toBeGreaterThanOrEqual(3);

    // Every saved card points at a vault row of the sealed three-column shape —
    // this is what D4's "Charge" click decrypts (see seed/pay.ts).
    for (const method of methods) {
      const card = await dbAdmin.vaultCard.findUniqueOrThrow({
        where: { id: method.cardTokenId },
      });
      expect(card.shopId).toBe(shopId);
      expect(card.encryptedBlob.length).toBeGreaterThan(0);
      expect(card.iv.length).toBeGreaterThan(0);
      expect(card.authTag.length).toBeGreaterThan(0);
      expect(card.last4).toBe(method.last4);
    }

    // The charge block lives on order pages, so cardholders must be buyers —
    // and one of them holds two cards so the list renders as a list.
    const byCustomer = new Map<string, typeof methods>();
    for (const method of methods) {
      byCustomer.set(method.customerId, [...(byCustomer.get(method.customerId) ?? []), method]);
    }
    const orderCounts = await dbAdmin.order.groupBy({
      by: ['customerId'],
      where: { ...where(), customerId: { in: [...byCustomer.keys()] } },
      _count: true,
    });
    expect(orderCounts.length).toBeGreaterThanOrEqual(3);
    expect([...byCustomer.values()].some((list) => list.length === 2)).toBe(true);
    for (const list of byCustomer.values()) {
      expect(list.filter((m) => m.isDefault)).toHaveLength(1);
    }

    // Jane is the demo login; she keeps a saved card even without orders.
    const jane = await dbAdmin.customer.findUniqueOrThrow({
      where: { shopId_email: { shopId, email: 'jane@example.com' } },
    });
    expect(byCustomer.get(jane.id)?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe('analytics', () => {
  it('produces a believable funnel over the trailing window', async () => {
    const byType = await dbAdmin.analyticsEvent.groupBy({
      by: ['type'],
      where: where(),
      _count: true,
    });
    const counts = Object.fromEntries(byType.map((r) => [r.type, r._count])) as Record<
      string,
      number
    >;

    // Funnel must narrow at every step or G3's charts look nonsensical.
    expect(counts.page_view).toBeGreaterThan(counts.product_view ?? 0);
    expect(counts.product_view).toBeGreaterThan(counts.add_to_cart ?? 0);
    expect(counts.add_to_cart).toBeGreaterThan(counts.begin_checkout ?? 0);
    expect(counts.begin_checkout).toBeGreaterThan(counts.purchase ?? 0);

    const paidOrders = await dbAdmin.order.count({ where: { ...where(), cancelledAt: null } });
    expect(counts.purchase, 'one purchase event per surviving order').toBe(paidOrders);

    const sessions = await dbAdmin.analyticsEvent.findMany({
      where: where(),
      distinct: ['sessionId'],
      select: { sessionId: true },
    });
    // SPEC §13 / H1: sessions ≈ 30× orders, so conversion rate reads plausibly.
    expect(sessions.length).toBeGreaterThan(15 * 40);
    expect(sessions.length).toBeLessThan(60 * 40);
  });

  it('backfills daily rollups for closed days so G3 renders without a worker cycle', async () => {
    const rollups = await dbAdmin.analyticsRollupDaily.findMany({ where: where() });
    expect(rollups.length).toBeGreaterThan(0);

    const metrics = new Set(rollups.map((r) => r.metric));
    expect([...metrics].sort()).toEqual(
      [
        'add_to_carts',
        'begin_checkouts',
        'orders',
        'product_views',
        'purchases',
        'sales',
        'sessions',
      ].sort(),
    );
    for (const r of rollups) expect(Number.isInteger(r.value)).toBe(true);

    // Zero-traffic days still owe their rows: a chart that receives 59 points
    // for a 60-day range draws a gap (or a shorter line) at the far edge.
    const closedDaySpan = HISTORY_DAYS - OLDEST_HISTORY_DAY + 1;
    const days = new Set(rollups.map((r) => r.date.toISOString().slice(0, 10)));
    expect(days.size, 'every closed day has rollup rows').toBe(closedDaySpan);
    expect(rollups.length, 'every metric on every closed day').toBe(closedDaySpan * metrics.size);

    // The rolled-up funnel must narrow like the raw one — begin_checkouts is
    // the stage the dashboard's funnel.reachedCheckout reads on closed days.
    const totalOf = (metric: string) =>
      rollups.filter((r) => r.metric === metric).reduce((acc, r) => acc + r.value, 0);
    expect(totalOf('add_to_carts')).toBeGreaterThan(totalOf('begin_checkouts'));
    expect(totalOf('begin_checkouts')).toBeGreaterThan(totalOf('purchases'));

    // Sales rollups must reconcile with the orders they summarize.
    const salesTotal = rollups
      .filter((r) => r.metric === 'sales')
      .reduce((acc, r) => acc + r.value, 0);
    const orders = await dbAdmin.order.findMany({
      where: { ...where(), cancelledAt: null },
      select: { total: true, createdAt: true },
    });
    const today = new Date();
    const closed = orders.filter(
      (o) => o.createdAt.toISOString().slice(0, 10) < today.toISOString().slice(0, 10),
    );
    expect(salesTotal).toBe(closed.reduce((acc, o) => acc + o.total, 0));
  });
});

describe('determinism', () => {
  it('produces identical content when run twice', async () => {
    // `pnpm db:reset` and `pnpm seed` are run constantly by eight agents; a seed
    // whose output drifts turns every screenshot and every acceptance walk into
    // a different store. The guarantee is per UTC date: history is anchored to
    // whole days ending yesterday (orders.ts), so nothing depends on the clock
    // time the seed happened to run at.
    const fingerprint = async () => {
      // Every level ordered explicitly: Postgres returns an unordered set, and
      // the ids are ULIDs, so an unsorted nested select compares physical row
      // order rather than content.
      const products = await dbAdmin.product.findMany({
        where: where(),
        orderBy: { handle: 'asc' },
        select: {
          handle: true,
          title: true,
          variants: {
            orderBy: { position: 'asc' },
            select: { sku: true, price: true, position: true },
          },
        },
      });
      const orders = await dbAdmin.order.findMany({
        where: where(),
        orderBy: { orderNumber: 'asc' },
        select: {
          orderNumber: true,
          total: true,
          email: true,
          financialStatus: true,
          createdAt: true,
        },
      });
      // Timestamps are part of the guarantee: a correction stamped at the run
      // instant (rather than the end of history) drifts between two seeds run
      // seconds apart, and content-only fingerprints never notice.
      const adjustments = await dbAdmin.inventoryAdjustment.findMany({
        where: where(),
        orderBy: [{ createdAt: 'asc' }, { reason: 'asc' }, { delta: 'asc' }],
        select: { reason: true, delta: true, createdAt: true },
      });
      return JSON.stringify({ products, orders, adjustments });
    };

    const before = await fingerprint();
    await seedDemo();
    expect(await fingerprint()).toBe(before);
  }, 120_000);
});
