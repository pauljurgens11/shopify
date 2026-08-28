/**
 * Checkout (SPEC §10).
 *
 * Note the PAN never appears here. The browser posts card data straight to
 * `/vault/tokenize` (see pay.ts) and only `cardTokenId` reaches this API — that
 * is the whole point of the hosted-fields component.
 *
 * Owner: WS-E.
 */
import { z } from 'zod';
import { cartLineSchema } from './cart.ts';
import { addressSchema, idSchema, moneySchema, timestampsSchema } from './common.ts';
import { appliedDiscountSchema, discountRejectionReasonSchema } from './discounts.ts';

export const checkoutStatusSchema = z.enum(['open', 'completed', 'expired']);

export const shippingOptionSchema = z.object({
  id: idSchema,
  title: z.string(),
  price: moneySchema,
  /** e.g. "3 to 5 business days" — Shopify shows this under the rate name. */
  estimatedDelivery: z.string().nullable().default(null),
});
export type ShippingOption = z.infer<typeof shippingOptionSchema>;

export const checkoutTotalsSchema = z.object({
  subtotal: moneySchema.describe('Sum of the snapshotted line totals, before anything else.'),
  discountTotal: moneySchema.describe(
    'Line-level discounts only; a free-shipping discount shows up in shippingTotal.',
  ),
  shippingTotal: moneySchema.describe(
    'The selected rate, already net of any free-shipping discount.',
  ),
  taxTotal: moneySchema.describe(
    'The shop tax rate applied once to (subtotal − discountTotal). Shipping is not taxed.',
  ),
  total: moneySchema.describe('subtotal − discountTotal + shippingTotal + taxTotal, exactly.'),
});
export type CheckoutTotals = z.infer<typeof checkoutTotalsSchema>;

export const checkoutSchema = z
  .object({
    id: idSchema,
    token: z.string(),
    status: checkoutStatusSchema,
    currencyCode: z.string().length(3),
    email: z.string().email().nullable().default(null),
    phone: z.string().max(64).nullable().default(null),
    acceptsMarketing: z.boolean().default(false),
    lines: z.array(cartLineSchema),
    shippingAddress: addressSchema.nullable().default(null),
    billingAddress: addressSchema.nullable().default(null),
    billingSameAsShipping: z.boolean().default(true),
    shippingOptions: z.array(shippingOptionSchema).default([]),
    selectedShippingRateId: idSchema.nullable().default(null),
    discountCode: z.string().nullable().default(null),
    appliedDiscounts: z.array(appliedDiscountSchema).default([]),
    /**
     * The code the shopper typed that did not apply, for E4's inline error. A
     * rejected code is not an HTTP error — mistyping a coupon must not look
     * like the checkout broke — and it never changes the totals.
     */
    rejectedDiscount: z
      .object({ code: z.string(), reason: discountRejectionReasonSchema })
      .nullable()
      .default(null),
    totals: checkoutTotalsSchema,
    completedOrderId: idSchema.nullable().default(null),
  })
  .merge(timestampsSchema);
export type Checkout = z.infer<typeof checkoutSchema>;

export const createCheckoutInput = z.object({ cartToken: z.string().min(1) });
export type CreateCheckoutInput = z.infer<typeof createCheckoutInput>;

/** Partial save as the shopper moves through the sections. */
export const updateCheckoutInput = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(64).nullable().optional(),
  acceptsMarketing: z.boolean().optional(),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.nullable().optional(),
  billingSameAsShipping: z.boolean().optional(),
  selectedShippingRateId: idSchema.nullable().optional(),
  discountCode: z.string().max(64).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});
export type UpdateCheckoutInput = z.infer<typeof updateCheckoutInput>;

/** "Pay now". `cardTokenId` came from the vault; this API never sees a PAN. */
export const completeCheckoutInput = z.object({
  cardTokenId: z.string().startsWith('card_tok_'),
  saveCard: z.boolean().default(false),
  /** Client-generated, so a double-click cannot double-charge (SPEC §11). */
  idempotencyKey: z.string().min(8).max(128),
});
export type CompleteCheckoutInput = z.infer<typeof completeCheckoutInput>;

export const completeCheckoutResponse = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    orderId: idSchema,
    orderNumber: z.number().int(),
    /** Where to send the browser: the Shopify-style thank-you page. */
    confirmationUrl: z.string(),
  }),
  z.object({
    status: z.literal('failed'),
    /** Shopper-facing. Never leak processor internals here. */
    message: z.string(),
    code: z.enum([
      'declined',
      'insufficient_funds',
      'expired_card',
      'processor_error',
      'invalid_card',
    ]),
  }),
]);
export type CompleteCheckoutResponse = z.infer<typeof completeCheckoutResponse>;
