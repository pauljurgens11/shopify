/**
 * Forty orders across sixty days (H1) — the demo's centre of gravity.
 *
 * Every order here is built to satisfy one arithmetic identity:
 *
 *     subtotal − discountTotal + shippingTotal + taxTotal === total
 *
 * plus two more that the admin UI depends on: line discounts sum exactly to
 * `discountTotal` (allocated with `money.allocate`, so no cent is lost), and
 * refunds sum exactly to `refundedTotal`. `seed.test.ts` asserts all three,
 * because an order whose numbers do not add up makes the orders page look like
 * a bug even when every component is perfect.
 *
 * Stock moves only through the ledger (CLAUDE.md §9): a fulfillment records a
 * `sold` adjustment, a restocking refund records a `restock` one.
 */

import { newId } from '@merchant/config/ids';
import { allocate, format, percentOf } from '@merchant/config/money';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { SeededProduct, SeededVariant } from './catalog.ts';
import { addHours, addMinutes, daysAgo, type SeedContext, startOfUtcDay } from './context.ts';
import type { SeededCustomer } from './customers.ts';
import { shippingAddressFor } from './customers.ts';
import type { SeededDiscount } from './discounts.ts';
import { WELCOME_CODE } from './discounts.ts';
import type { InventoryLedger } from './inventory.ts';
import { skewRecent } from './random.ts';
import {
  FREE_SHIPPING_THRESHOLD,
  type SeededLocation,
  SHIPPING_EXPRESS,
  SHIPPING_STANDARD,
} from './shop.ts';

export const ORDER_COUNT = 40;
export const HISTORY_DAYS = 60;
/**
 * History stops at the end of yesterday. Placing rows "today" would make every
 * timestamp depend on the time of day the seed happened to run, and the seed's
 * determinism guarantee is per UTC date — two runs a second apart must produce
 * the same store. It also keeps today genuinely open, which is what the
 * dashboard's rollups-plus-today's-raw-events split expects (SPEC §13).
 */
export const OLDEST_HISTORY_DAY = 1;
export const FIRST_ORDER_NUMBER = 1001;

/**
 * Brand and last4 only, never a PAN (SPEC §11). Kept in step with
 * `TEST_CARDS` in `packages/pay/src/adapters/test-cards.ts` by hand — db cannot
 * import pay without a package cycle (DECISIONS.md) — so if you add one here,
 * check it is not a last4 that `classifyTestCard` treats as declining. Every
 * seeded payment is captured, and a captured payment on a declining card would
 * contradict the router the moment someone re-ran it.
 */
const DEMO_CARDS = [
  { brand: 'visa', last4: '4242' },
  { brand: 'mastercard', last4: '4444' },
  { brand: 'amex', last4: '0005' },
  { brand: 'visa', last4: '1881' },
] as const;

const CARRIERS = [
  { company: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { company: 'UPS', url: 'https://www.ups.com/track?tracknum=' },
  { company: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr=' },
] as const;

type OrderKind = 'fulfilled' | 'unfulfilled' | 'refunded' | 'cancelled';

/**
 * History ends at the last instant of yesterday, not at the run instant:
 * clamping against `ctx.now` re-introduced the run-time dependence that
 * OLDEST_HISTORY_DAY exists to remove (DECISIONS.md, the "whole UTC days"
 * line) — two seeds a minute apart must stamp identical timestamps.
 */
export const endOfHistory = (ctx: SeedContext): Date =>
  new Date(startOfUtcDay(ctx.now).getTime() - 1);

const notAfterHistoryEnd = (ctx: SeedContext, at: Date): Date => {
  const cap = endOfHistory(ctx);
  return at > cap ? cap : at;
};

export interface SeededOrder {
  id: string;
  orderNumber: number;
  customerId: string;
  total: number;
  refundedTotal: number;
  cancelled: boolean;
  createdAt: Date;
}

interface DraftLine {
  id: string;
  product: SeededProduct;
  variant: SeededVariant;
  quantity: number;
}

/**
 * Which of the 40 orders gets which shape. Fixed indices rather than random
 * draws: the demo needs exactly the SPEC §7 mix (2 cancelled, 2 partially
 * refunded, some unfulfilled), and "roughly two" is not a mix you can screenshot.
 * Indices are into the date-sorted list, so the unfulfilled ones are the newest —
 * which is what an active store actually looks like.
 */
function orderKind(index: number): OrderKind {
  if (index === 6 || index === 23) return 'cancelled';
  if (index === 12 || index === 29) return 'refunded';
  if (index >= ORDER_COUNT - 6) return 'unfulfilled';
  return 'fulfilled';
}

/**
 * Orders pinned to `jane@example.com`, the storefront demo login (issue H5) —
 * without them her E5 account page demos an empty order history. Fixed indices
 * like `orderKind`: two delivered mid-history orders and one recent unfulfilled
 * one, so the account page shows both a history and something "on the way".
 */
const JANE_ORDER_INDICES = new Set([15, 26, 36]);

export async function createOrders(
  db: PrismaClient,
  ctx: SeedContext,
  input: {
    products: SeededProduct[];
    customers: SeededCustomer[];
    locations: { retail: SeededLocation; warehouse: SeededLocation };
    discounts: { welcome: SeededDiscount };
    ledger: InventoryLedger;
  },
): Promise<SeededOrder[]> {
  const { products, customers, locations, discounts, ledger } = input;
  const sellable = products.filter((p) => p.status === 'active');

  // Recent-weighted: a flat spread over 60 days gives the analytics dashboard a
  // dead-flat trend line, which reads as "no data" rather than "growing store".
  const placedAt = Array.from({ length: ORDER_COUNT }, () => {
    const day =
      OLDEST_HISTORY_DAY + Math.round((1 - skewRecent(ctx.rng, 1.6)) * (HISTORY_DAYS - 1));
    return daysAgo(ctx, day, ctx.rng.int(8, 21), ctx.rng.int(0, 59));
  }).sort((a, b) => a.getTime() - b.getTime());

  const orders: SeededOrder[] = [];
  // WELCOME10 is `oncePerCustomer` (discounts.ts). Seeding a second redemption
  // for the same customer would contradict the flag on the discount row, and
  // C1's engine reads both — so the seed enforces it rather than hoping.
  const welcomeUsedBy = new Set<string>();
  const lineRows: Prisma.OrderLineItemCreateManyInput[] = [];
  const eventRows: Prisma.OrderEventCreateManyInput[] = [];
  const fulfillmentRows: Prisma.FulfillmentCreateManyInput[] = [];
  const refundRows: Prisma.RefundCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  const paymentRefundRows: Prisma.PaymentRefundCreateManyInput[] = [];
  const redemptionRows: Prisma.DiscountRedemptionCreateManyInput[] = [];
  const orderRows: Prisma.OrderCreateManyInput[] = [];

  for (let index = 0; index < ORDER_COUNT; index++) {
    const kind = orderKind(index);
    const createdAt = placedAt[index] as Date;
    const orderId = newId('order');
    const orderNumber = FIRST_ORDER_NUMBER + index;
    // Draw either way so pinning jane leaves every OTHER order's customer —
    // and everything downstream of the RNG stream — exactly as it was.
    const drawn = ctx.rng.pick(customers);
    const jane = customers.find((c) => c.email === 'jane@example.com');
    const customer = JANE_ORDER_INDICES.has(index) && jane ? jane : drawn;
    const card = ctx.rng.pick(DEMO_CARDS);

    /* --- lines ------------------------------------------------------------ */
    // Refunded orders need two lines so refunding one stays *partial*.
    const lineCount = kind === 'refunded' ? ctx.rng.int(2, 3) : ctx.rng.int(1, 3);
    const chosen = ctx.rng.sample(sellable, lineCount);
    const lines: DraftLine[] = chosen.map((product) => ({
      id: newId('lineItem'),
      product,
      variant: ctx.rng.pick(product.variants),
      quantity: ctx.rng.chance(0.25) ? 2 : 1,
    }));

    const subtotal = lines.reduce((acc, l) => acc + l.variant.price * l.quantity, 0);

    /* --- discount --------------------------------------------------------- */
    // A third of orders came in on the welcome code; the rest paid full price.
    const usesWelcome =
      kind !== 'cancelled' && !welcomeUsedBy.has(customer.id) && ctx.rng.chance(0.3);
    if (usesWelcome) welcomeUsedBy.add(customer.id);
    const discountTotal = usesWelcome
      ? percentOf({ amount: subtotal, currencyCode: ctx.currencyCode }, discounts.welcome.value)
          .amount
      : 0;

    // Allocate back to lines by line value so the parts sum to the whole exactly.
    const allocations = allocate(
      { amount: discountTotal, currencyCode: ctx.currencyCode },
      lines.map((l) => l.variant.price * l.quantity),
    );

    /* --- shipping --------------------------------------------------------- */
    // The seeded "Free shipping" rate carries the $150 threshold, so a qualifying
    // order simply ships on it. Modelling free shipping as a rate rather than as
    // a discount keeps `discountTotal` purely line-level, which is what the
    // line-allocation invariant above needs.
    const netSubtotal = subtotal - discountTotal;
    const shipping =
      netSubtotal >= FREE_SHIPPING_THRESHOLD
        ? { title: 'Free shipping', price: 0 }
        : ctx.rng.chance(0.2)
          ? { title: SHIPPING_EXPRESS.name, price: SHIPPING_EXPRESS.price }
          : { title: SHIPPING_STANDARD.name, price: SHIPPING_STANDARD.price };

    /* --- tax and total ---------------------------------------------------- */
    // Through money.ts, not by hand: CLAUDE.md §5 routes every money computation
    // there so rounding is one behaviour rather than one per call site.
    const taxTotal = percentOf(
      { amount: netSubtotal, currencyCode: ctx.currencyCode },
      ctx.taxRatePercentage,
    ).amount;
    const total = netSubtotal + shipping.price + taxTotal;

    /* --- fulfillment ------------------------------------------------------ */
    const fulfil = kind === 'fulfilled' || kind === 'refunded';
    // One location for the whole order, warehouse-first — it carries the depth.
    const location =
      fulfil &&
      lines.every((l) => ledger.availableAt(l.variant.id, locations.warehouse.id) >= l.quantity)
        ? locations.warehouse
        : fulfil &&
            lines.every((l) => ledger.availableAt(l.variant.id, locations.retail.id) >= l.quantity)
          ? locations.retail
          : null;

    // Capped at `now`: a shipment stamped in the future is nonsense, and the
    // offset can run past midnight for the most recent orders.
    const fulfilledAt = notAfterHistoryEnd(ctx, addHours(createdAt, ctx.rng.int(6, 40)));
    const fulfillmentId = location ? newId('fulfillment') : null;

    if (location && fulfillmentId) {
      for (const line of lines) {
        ledger.record({
          variantId: line.variant.id,
          locationId: location.id,
          delta: -line.quantity,
          reason: 'sold',
          referenceId: orderId,
          createdAt: fulfilledAt,
        });
      }

      const carrier = ctx.rng.pick(CARRIERS);
      const trackingNumber = `1Z${ctx.rng.int(100000, 999999)}${ctx.rng.int(1000, 9999)}`;
      fulfillmentRows.push({
        id: fulfillmentId,
        shopId: ctx.shopId,
        orderId,
        locationId: location.id,
        status: 'success',
        trackingNumber,
        trackingUrl: `${carrier.url}${trackingNumber}`,
        trackingCompany: carrier.company,
        lineItems: lines.map((l) => ({ lineItemId: l.id, quantity: l.quantity })),
        notifyCustomer: true,
        createdAt: fulfilledAt,
        updatedAt: fulfilledAt,
      });
    }

    const fulfilledQuantityFor = (line: DraftLine) => (location ? line.quantity : 0);
    const fulfilledUnits = lines.reduce((acc, l) => acc + fulfilledQuantityFor(l), 0);
    const orderedUnits = lines.reduce((acc, l) => acc + l.quantity, 0);
    const fulfillmentStatus =
      fulfilledUnits === 0
        ? 'unfulfilled'
        : fulfilledUnits === orderedUnits
          ? 'fulfilled'
          : 'partially_fulfilled';

    const paymentId = newId('payment');

    /* --- refund ----------------------------------------------------------- */
    // Refund the first line in full: value plus the tax that was charged on it,
    // less the discount it carried, so the refund is a number a merchant could
    // actually have issued.
    let refundedTotal = 0;
    const refundedLine = lines[0] as DraftLine;
    const refundedQuantityFor = (line: DraftLine) =>
      kind === 'refunded' && line.id === refundedLine.id ? line.quantity : 0;

    let refundedAt: Date | null = null;
    if (kind === 'refunded') {
      // Tax comes back the way the live refund engine hands it out: the stored
      // taxTotal allocated across lines by net, largest remainder. A fresh
      // percentOf rounding here can disagree with that allocation by 1¢ on
      // multi-line orders, and then refunding the remainder through the admin
      // can never land on exactly `total` (DECISIONS.md, the calculateRefund
      // tax line).
      const lineNets = lines.map(
        (l, i) => l.variant.price * l.quantity - (allocations[i]?.amount ?? 0),
      );
      const taxShare = allocate({ amount: taxTotal, currencyCode: ctx.currencyCode }, lineNets)[0];
      refundedTotal = (lineNets[0] ?? 0) + (taxShare?.amount ?? 0);

      refundedAt = notAfterHistoryEnd(ctx, addHours(fulfilledAt, ctx.rng.int(24, 120)));
      const paymentRefundId = newId('refund');

      // Restock only what actually left a shelf.
      if (location) {
        ledger.record({
          variantId: refundedLine.variant.id,
          locationId: location.id,
          delta: refundedLine.quantity,
          reason: 'restock',
          referenceId: orderId,
          createdAt: refundedAt,
        });
      }

      refundRows.push({
        id: newId('refund'),
        shopId: ctx.shopId,
        orderId,
        amount: refundedTotal,
        reason: 'customer',
        note: 'Customer reported the fit ran small. Returned in original condition.',
        lineItems: [{ lineItemId: refundedLine.id, quantity: refundedLine.quantity }],
        restock: location !== null,
        paymentRefundId,
        createdAt: refundedAt,
        updatedAt: refundedAt,
      });
      paymentRefundRows.push({
        id: paymentRefundId,
        shopId: ctx.shopId,
        paymentId,
        amount: refundedTotal,
        reason: 'customer',
        processorTxnId: `mock_re_${orderNumber}`,
        status: 'succeeded',
        createdAt: refundedAt,
      });
    }

    /* --- payment ---------------------------------------------------------- */
    const capturedAt = addMinutes(createdAt, 1);
    const cancelledAtRaw = kind === 'cancelled' ? addHours(createdAt, ctx.rng.int(2, 20)) : null;
    const cancelledAt = cancelledAtRaw && notAfterHistoryEnd(ctx, cancelledAtRaw);

    paymentRows.push({
      id: paymentId,
      shopId: ctx.shopId,
      orderId,
      checkoutId: null,
      amount: total,
      refundedAmount: refundedTotal,
      currencyCode: ctx.currencyCode,
      status: cancelledAt ? 'voided' : refundedTotal > 0 ? 'partially_refunded' : 'captured',
      processor: 'mock',
      processorTxnId: `mock_ch_${orderNumber}`,
      cardTokenId: null,
      last4: card.last4,
      brand: card.brand,
      // One attempt, no failover: the seeded routing table has a single 100%
      // rule, and a trail that claims otherwise would mislead whoever debugs D3.
      routingTrail: [{ processor: 'mock', outcome: 'succeeded', at: capturedAt.toISOString() }],
      idempotencyKey: `seed_${orderNumber}`,
      createdAt: capturedAt,
      // A refunded or voided payment was touched after capture; its updatedAt
      // saying otherwise reads as a data bug on the order page.
      updatedAt: refundedAt ?? cancelledAt ?? capturedAt,
    });

    /* --- order ------------------------------------------------------------ */
    const financialStatus = cancelledAt
      ? 'voided'
      : refundedTotal > 0
        ? refundedTotal === total
          ? 'refunded'
          : 'partially_refunded'
        : 'paid';

    orderRows.push({
      id: orderId,
      shopId: ctx.shopId,
      orderNumber,
      customerId: customer.id,
      email: customer.email,
      phone: customer.phone,
      currencyCode: ctx.currencyCode,
      subtotal,
      discountTotal,
      shippingTotal: shipping.price,
      taxTotal,
      total,
      refundedTotal,
      financialStatus,
      fulfillmentStatus: cancelledAt ? 'unfulfilled' : fulfillmentStatus,
      cancelledAt,
      cancelReason: cancelledAt ? 'customer' : null,
      shippingAddress: shippingAddressFor(customer),
      billingAddress: shippingAddressFor(customer),
      shippingLine: {
        title: shipping.title,
        price: { amount: shipping.price, currencyCode: ctx.currencyCode },
        shippingRateId: null,
      },
      discountCodes: usesWelcome
        ? [
            {
              discountId: discounts.welcome.id,
              code: WELCOME_CODE,
              title: '10% off your first order',
              amount: { amount: discountTotal, currencyCode: ctx.currencyCode },
              lineAllocations: lines.map((l, i) => ({
                lineId: l.id,
                amount: {
                  amount: allocations[i]?.amount ?? 0,
                  currencyCode: ctx.currencyCode,
                },
              })),
              appliesToShipping: false,
            },
          ]
        : [],
      note: null,
      tags: [],
      createdAt,
      updatedAt: cancelledAt ?? (location ? fulfilledAt : createdAt),
    });

    lines.forEach((line, i) => {
      lineRows.push({
        id: line.id,
        shopId: ctx.shopId,
        orderId,
        productId: line.product.id,
        variantId: line.variant.id,
        // Snapshotted: editing the product later must not rewrite history.
        title: line.product.title,
        variantTitle: line.variant.title === 'Default Title' ? null : line.variant.title,
        sku: line.variant.sku,
        imageUrl: line.product.imageUrl,
        quantity: line.quantity,
        price: line.variant.price,
        totalDiscount: allocations[i]?.amount ?? 0,
        fulfilledQuantity: cancelledAt ? 0 : fulfilledQuantityFor(line),
        refundedQuantity: refundedQuantityFor(line),
        requiresShipping: line.variant.requiresShipping,
        taxable: line.variant.taxable,
        createdAt,
        updatedAt: createdAt,
      });
    });

    if (usesWelcome) {
      redemptionRows.push({
        id: newId('event'),
        shopId: ctx.shopId,
        discountId: discounts.welcome.id,
        orderId,
        customerId: customer.id,
        amount: discountTotal,
        createdAt,
      });
    }

    /* --- timeline --------------------------------------------------------- */
    const event = (
      type: string,
      message: string,
      at: Date,
      actor: string | null = null,
      payload: Prisma.InputJsonValue = {},
    ) => {
      eventRows.push({
        id: newId('event'),
        shopId: ctx.shopId,
        orderId,
        type,
        message,
        actor,
        payload,
        createdAt: at,
      });
    };

    event('order_placed', `Order placed by ${customer.firstName} ${customer.lastName}.`, createdAt);
    if (usesWelcome) {
      event('discount_applied', `Discount code ${WELCOME_CODE} applied.`, createdAt, null, {
        code: WELCOME_CODE,
        amount: discountTotal,
      });
    }
    const asMoney = (amount: number) => format({ amount, currencyCode: ctx.currencyCode });

    event('payment_captured', `Payment of ${asMoney(total)} captured.`, capturedAt);
    event('email_sent', 'Order confirmation email sent.', addMinutes(capturedAt, 1), null, {
      template: 'order_confirmation',
    });

    if (location && fulfillmentId && !cancelledAt) {
      event(
        'fulfillment_created',
        `${lines.length} item${lines.length === 1 ? '' : 's'} fulfilled from ${location.name}.`,
        fulfilledAt,
        'Maya Okonjo',
        { locationId: location.id },
      );
    }
    if (refundedTotal > 0 && refundedAt) {
      // Stamped at the Refund row's own instant — the timeline and the refund
      // record render on the same order page and must not disagree by days.
      event(
        'refund_created',
        `Refund of ${asMoney(refundedTotal)} issued to the original payment method.`,
        refundedAt,
        'Aurora Owner',
      );
    }
    if (cancelledAt) {
      event(
        'order_cancelled',
        'Order cancelled at the customer’s request. Payment voided.',
        cancelledAt,
        'Aurora Owner',
        { reason: 'customer' },
      );
    }

    orders.push({
      id: orderId,
      orderNumber,
      customerId: customer.id,
      total,
      refundedTotal,
      cancelled: cancelledAt !== null,
      createdAt,
    });
  }

  await db.order.createMany({ data: orderRows });
  await db.orderLineItem.createMany({ data: lineRows });
  await db.fulfillment.createMany({ data: fulfillmentRows });
  await db.payment.createMany({ data: paymentRows });
  await db.refund.createMany({ data: refundRows });
  await db.paymentRefund.createMany({ data: paymentRefundRows });
  await db.orderEvent.createMany({ data: eventRows });
  await db.discountRedemption.createMany({ data: redemptionRows });

  // The sequence must resume past the last seeded number, or C2's first real
  // order collides with the unique (shopId, orderNumber) index.
  await db.orderSequence.create({
    data: { shopId: ctx.shopId, next: FIRST_ORDER_NUMBER + ORDER_COUNT },
  });

  await db.discount.update({
    where: { id: discounts.welcome.id },
    data: { usedCount: redemptionRows.length },
  });

  await reconcileCustomerTotals(db, orders);
  return orders;
}

/**
 * Backfill `ordersCount` / `totalSpent`. They are denormalized because the
 * customers IndexTable sorts on them (customers.prisma), which means the seed
 * has to keep them true rather than leaving them at zero.
 */
async function reconcileCustomerTotals(db: PrismaClient, orders: SeededOrder[]): Promise<void> {
  const totals = new Map<string, { count: number; spent: number }>();
  for (const order of orders) {
    if (order.cancelled) continue; // a cancelled order is not lifetime value
    const current = totals.get(order.customerId) ?? { count: 0, spent: 0 };
    current.count += 1;
    current.spent += order.total - order.refundedTotal;
    totals.set(order.customerId, current);
  }

  await Promise.all(
    [...totals.entries()].map(([customerId, t]) =>
      db.customer.update({
        where: { id: customerId },
        data: { ordersCount: t.count, totalSpent: t.spent },
      }),
    ),
  );
}
