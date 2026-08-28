/** Orders, fulfillments, refunds, timeline (SPEC §7). Owner: WS-C. */
import { z } from 'zod';
import {
  addressSchema,
  idSchema,
  metadataSchema,
  moneySchema,
  paginated,
  paginationQuery,
  searchQuery,
  sortQuery,
  tagsSchema,
  timestampsSchema,
} from './common.ts';
import { appliedDiscountSchema } from './discounts.ts';
import { paymentSchema } from './pay.ts';

export const financialStatusSchema = z.enum([
  'pending',
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'voided',
]);

export const fulfillmentStatusSchema = z.enum(['unfulfilled', 'partially_fulfilled', 'fulfilled']);

export const orderLineItemSchema = z.object({
  id: idSchema,
  productId: idSchema.nullable(),
  variantId: idSchema.nullable(),
  /** Snapshotted at purchase time — the product may be edited or deleted later. */
  title: z.string(),
  variantTitle: z.string().nullable(),
  sku: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  quantity: z.number().int().positive(),
  price: moneySchema,
  totalDiscount: moneySchema,
  fulfilledQuantity: z.number().int().nonnegative().default(0),
  refundedQuantity: z.number().int().nonnegative().default(0),
  requiresShipping: z.boolean().default(true),
  taxable: z.boolean().default(true),
});
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;

export const shippingLineSchema = z.object({
  title: z.string(),
  price: moneySchema,
  shippingRateId: idSchema.nullable().default(null),
});

export const fulfillmentSchema = z
  .object({
    id: idSchema,
    orderId: idSchema,
    locationId: idSchema,
    status: z.enum(['pending', 'success', 'cancelled']).default('success'),
    trackingNumber: z.string().max(255).nullable().default(null),
    trackingUrl: z.string().url().nullable().default(null),
    trackingCompany: z.string().max(255).nullable().default(null),
    lineItems: z.array(z.object({ lineItemId: idSchema, quantity: z.number().int().positive() })),
    notifyCustomer: z.boolean().default(true),
  })
  .merge(timestampsSchema);
export type Fulfillment = z.infer<typeof fulfillmentSchema>;

export const refundSchema = z
  .object({
    id: idSchema,
    orderId: idSchema,
    amount: moneySchema,
    reason: z.string().max(512).nullable().default(null),
    note: z.string().max(2000).nullable().default(null),
    lineItems: z
      .array(z.object({ lineItemId: idSchema, quantity: z.number().int().positive() }))
      .default([]),
    restock: z.boolean().default(true),
    /** The part of `amount` that came off shipping rather than off lines. */
    shippingAmount: moneySchema.default({ amount: 0, currencyCode: 'USD' }),
    /** Set once Pay confirms the processor refund (SPEC §11). */
    paymentRefundId: idSchema.nullable().default(null),
  })
  .merge(timestampsSchema);
export type Refund = z.infer<typeof refundSchema>;

/** Order detail timeline (SPEC §9). Append-only. */
export const orderEventSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  type: z.enum([
    'order_placed',
    'payment_authorized',
    'payment_captured',
    'payment_failed',
    'fulfillment_created',
    'refund_created',
    'order_cancelled',
    'note_added',
    'email_sent',
    'discount_applied',
  ]),
  message: z.string(),
  /** null = the system did it (webhook, worker, checkout). */
  actor: z.string().nullable().default(null),
  payload: metadataSchema,
  createdAt: z.string().datetime({ offset: true }),
});
export type OrderEvent = z.infer<typeof orderEventSchema>;

export const orderSchema = z
  .object({
    id: idSchema,
    /** Per-shop sequential, starts at #1001 (SPEC §5). Display as `#${orderNumber}`. */
    orderNumber: z.number().int(),
    customerId: idSchema.nullable().default(null),
    email: z.string().email(),
    phone: z.string().max(64).nullable().default(null),
    currencyCode: z.string().length(3),

    subtotal: moneySchema,
    discountTotal: moneySchema,
    shippingTotal: moneySchema,
    taxTotal: moneySchema,
    total: moneySchema,
    refundedTotal: moneySchema,

    financialStatus: financialStatusSchema,
    fulfillmentStatus: fulfillmentStatusSchema,
    cancelledAt: z.string().datetime({ offset: true }).nullable().default(null),
    cancelReason: z
      .enum(['customer', 'fraud', 'inventory', 'declined', 'other'])
      .nullable()
      .default(null),

    shippingAddress: addressSchema.nullable().default(null),
    billingAddress: addressSchema.nullable().default(null),
    shippingLine: shippingLineSchema.nullable().default(null),
    discountCodes: z.array(appliedDiscountSchema).default([]),

    lineItems: z.array(orderLineItemSchema).default([]),
    fulfillments: z.array(fulfillmentSchema).default([]),
    refunds: z.array(refundSchema).default([]),

    note: z.string().max(5000).nullable().default(null),
    tags: tagsSchema,
    metadata: metadataSchema,
  })
  .merge(timestampsSchema);
export type Order = z.infer<typeof orderSchema>;

/* --- requests ------------------------------------------------------------- */

export const listOrdersQuery = paginationQuery
  .merge(searchQuery)
  .merge(sortQuery)
  .extend({
    financialStatus: financialStatusSchema.optional(),
    fulfillmentStatus: fulfillmentStatusSchema.optional(),
    customerId: idSchema.optional(),
    /** Index tabs: Shopify's Open / Unfulfilled / Unpaid / Closed. */
    tab: z.enum(['all', 'open', 'unfulfilled', 'unpaid', 'closed']).default('all'),
    createdAtMin: z.string().datetime({ offset: true }).optional(),
    createdAtMax: z.string().datetime({ offset: true }).optional(),
  });

export const orderListResponse = paginated(orderSchema.omit({ fulfillments: true, refunds: true }));

export const createFulfillmentInput = fulfillmentSchema
  .omit({ id: true, orderId: true, createdAt: true, updatedAt: true, status: true })
  .partial({
    trackingNumber: true,
    trackingUrl: true,
    trackingCompany: true,
    notifyCustomer: true,
  });

export const createRefundInput = refundSchema
  .omit({
    id: true,
    orderId: true,
    createdAt: true,
    updatedAt: true,
    paymentRefundId: true,
    amount: true,
  })
  .partial({ reason: true, note: true, lineItems: true, restock: true, shippingAmount: true })
  .extend({
    /** So a double-clicked "Refund" button cannot refund twice (SPEC §11). */
    idempotencyKey: z.string().min(8).max(128).optional(),
  });
export type CreateRefundInput = z.input<typeof createRefundInput>;

/**
 * `POST /:id/refunds/calculate` — what C5's refund form shows before the
 * merchant commits, the same way Shopify previews a refund. Same body as the
 * refund itself; `restock` is irrelevant to the arithmetic and ignored.
 */
export const refundCalculationSchema = z.object({
  lineItems: z.array(
    z.object({
      lineItemId: idSchema,
      quantity: z.number().int().nonnegative(),
      /** Line price less its share of the discount, for the units being refunded. */
      amount: moneySchema,
    }),
  ),
  shippingAmount: moneySchema,
  subtotal: moneySchema,
  /** The refunded units' share of the order's tax — Shopify refunds tax with the items. */
  taxAmount: moneySchema,
  total: moneySchema,
  /** `order.total - order.refundedTotal`. The form caps its inputs at this. */
  maximumRefundable: moneySchema,
});
export type RefundCalculation = z.infer<typeof refundCalculationSchema>;

export type CreateFulfillmentInput = z.input<typeof createFulfillmentInput>;

export const cancelOrderInput = z.object({
  reason: z.enum(['customer', 'fraud', 'inventory', 'declined', 'other']).default('other'),
  refund: z.boolean().default(true),
  restock: z.boolean().default(true),
  notifyCustomer: z.boolean().default(true),
});

export const updateOrderInput = z.object({
  note: z.string().max(5000).nullable().optional(),
  tags: tagsSchema.optional(),
  email: z.string().email().optional(),
  shippingAddress: addressSchema.nullable().optional(),
});

export const addOrderNoteInput = z.object({ message: z.string().min(1).max(2000) });

export type ListOrdersQuery = z.infer<typeof listOrdersQuery>;
export type CancelOrderInput = z.input<typeof cancelOrderInput>;
export type UpdateOrderInput = z.input<typeof updateOrderInput>;

/* --- creation (C2 service input; E3 is the producer) ---------------------- */

/**
 * One purchased line, fully snapshotted. `price` is the UNIT price; the caller
 * has already priced the cart (C1 engine), so nothing here is recomputed.
 */
export const createOrderLineInput = orderLineItemSchema
  .omit({ id: true, fulfilledQuantity: true, refundedQuantity: true })
  .extend({
    productId: idSchema.nullable().default(null),
    variantId: idSchema.nullable().default(null),
    variantTitle: z.string().nullable().default(null),
    sku: z.string().nullable().default(null),
    imageUrl: z.string().url().nullable().default(null),
    /** Omitted means nothing was discounted; the currency comes from the order. */
    totalDiscount: moneySchema.optional(),
  });
export type CreateOrderLineInput = z.input<typeof createOrderLineInput>;

/** Totals arrive computed and must balance — the service records, it never prices. */
export const orderTotalsInput = z.object({
  subtotal: moneySchema,
  discountTotal: moneySchema,
  shippingTotal: moneySchema,
  taxTotal: moneySchema,
  total: moneySchema,
});

export const createOrderInput = z.object({
  customerId: idSchema.nullable().default(null),
  email: z.string().email(),
  phone: z.string().max(64).nullable().default(null),
  currencyCode: z.string().length(3).default('USD'),
  lineItems: z.array(createOrderLineInput).min(1),
  totals: orderTotalsInput,
  shippingAddress: addressSchema.nullable().default(null),
  billingAddress: addressSchema.nullable().default(null),
  shippingLine: shippingLineSchema.nullable().default(null),
  /** Straight from the C1 engine's `applied`; each one counts a redemption. */
  discountCodes: z.array(appliedDiscountSchema).default([]),
  /** Checkout sets this from the Pay result; the default is an unpaid order. */
  financialStatus: financialStatusSchema.default('pending'),
  note: z.string().max(5000).nullable().default(null),
  tags: tagsSchema,
  metadata: metadataSchema,
});
export type CreateOrderInput = z.input<typeof createOrderInput>;

/* --- responses ------------------------------------------------------------ */

/** What the index table needs. Fulfillments and refunds are detail-only. */
export const orderSummarySchema = orderSchema.omit({ fulfillments: true, refunds: true });
export type OrderSummary = z.infer<typeof orderSummarySchema>;

/**
 * Order detail. Payments are joined by `orderId` and read-only here — Pay (D3)
 * owns writing them, C3 owns refunding them.
 */
export const orderDetailSchema = orderSchema.extend({
  customer: z
    .object({
      id: idSchema,
      email: z.string(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      ordersCount: z.number().int().nonnegative(),
    })
    .nullable()
    .default(null),
  events: z.array(orderEventSchema).default([]),
  payments: z.array(paymentSchema).default([]),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;
