/**
 * Prisma rows → the `orders` contract. One place that knows the mapping, so a
 * route never hand-assembles a response and drifts from what C5 renders.
 *
 * Money lives in the database as bare integers with the currency on the order
 * row (SPEC §5); it leaves the API as `{ amount, currencyCode }`. This file is
 * the boundary where that happens.
 *
 * Owner: WS-C.
 */

import {
  type OrderDetail,
  type OrderSummary,
  orderDetailSchema,
  orderSummarySchema,
} from '@merchant/contracts/orders';
import type {
  OrderLineItem as LineRow,
  OrderEvent as OrderEventRow,
  Order as OrderRow,
  Payment as PaymentRow,
} from '@merchant/db/client';

const money = (amount: number, currencyCode: string) => ({ amount, currencyCode });

type CustomerRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
};

export type OrderWithLines = OrderRow & { lineItems: LineRow[] };
export type OrderWithDetail = OrderWithLines & {
  events?: OrderEventRow[];
  customer?: CustomerRow | null;
};

function line(row: LineRow, currencyCode: string) {
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    title: row.title,
    variantTitle: row.variantTitle,
    sku: row.sku,
    imageUrl: row.imageUrl,
    quantity: row.quantity,
    price: money(row.price, currencyCode),
    totalDiscount: money(row.totalDiscount, currencyCode),
    fulfilledQuantity: row.fulfilledQuantity,
    refundedQuantity: row.refundedQuantity,
    requiresShipping: row.requiresShipping,
    taxable: row.taxable,
  };
}

function event(row: OrderEventRow) {
  return {
    id: row.id,
    orderId: row.orderId,
    type: row.type,
    message: row.message,
    actor: row.actor,
    payload: row.payload ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}

function payment(row: PaymentRow) {
  return {
    id: row.id,
    orderId: row.orderId,
    checkoutId: row.checkoutId,
    amount: money(row.amount, row.currencyCode),
    refundedAmount: money(row.refundedAmount, row.currencyCode),
    status: row.status,
    processor: row.processor,
    processorTxnId: row.processorTxnId,
    cardTokenId: row.cardTokenId,
    last4: row.last4,
    brand: row.brand,
    errorCode: row.errorCode,
    routingTrail: row.routingTrail ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Shared between the summary and the detail shape. */
function base(order: OrderWithLines) {
  const currency = order.currencyCode;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    email: order.email,
    phone: order.phone,
    currencyCode: currency,

    subtotal: money(order.subtotal, currency),
    discountTotal: money(order.discountTotal, currency),
    shippingTotal: money(order.shippingTotal, currency),
    taxTotal: money(order.taxTotal, currency),
    total: money(order.total, currency),
    refundedTotal: money(order.refundedTotal, currency),

    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,

    shippingAddress: order.shippingAddress ?? null,
    billingAddress: order.billingAddress ?? null,
    shippingLine: order.shippingLine ?? null,
    discountCodes: order.discountCodes ?? [],

    lineItems: order.lineItems.map((l) => line(l, currency)),

    note: order.note,
    tags: order.tags,
    metadata: order.metadata ?? {},
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** Index-table row: no fulfillments, no refunds, no timeline. */
export function toOrderSummary(order: OrderWithLines): OrderSummary {
  return orderSummarySchema.parse(base(order));
}

export function toOrderDetail(
  order: OrderWithDetail,
  extras: { payments?: PaymentRow[] } = {},
): OrderDetail {
  return orderDetailSchema.parse({
    ...base(order),
    // C3 fills these in; until then an order simply has none.
    fulfillments: [],
    refunds: [],
    events: (order.events ?? []).map(event),
    customer: order.customer ?? null,
    payments: (extras.payments ?? []).map(payment),
  });
}
