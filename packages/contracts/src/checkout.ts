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
import { appliedDiscountSchema } from './discounts.ts';

export const checkoutStatusSchema = z.enum(['open', 'completed', 'expired']);

export const shippingOptionSchema = z.object({
  id: idSchema,
  title: z.string(),
  price: moneySchema,
  /** e.g. "3 to 5 business days" — Shopify shows this under the rate name. */
  estimatedDelivery: z.string().nullable().default(null),
});

export const checkoutTotalsSchema = z.object({
  subtotal: moneySchema,
  discountTotal: moneySchema,
  shippingTotal: moneySchema,
  taxTotal: moneySchema,
  total: moneySchema,
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
    totals: checkoutTotalsSchema,
    completedOrderId: idSchema.nullable().default(null),
  })
  .merge(timestampsSchema);
export type Checkout = z.infer<typeof checkoutSchema>;

export const createCheckoutInput = z.object({ cartToken: z.string().min(1) });

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

/** "Pay now". `cardTokenId` came from the vault; this API never sees a PAN. */
export const completeCheckoutInput = z.object({
  cardTokenId: z.string().startsWith('card_tok_'),
  saveCard: z.boolean().default(false),
  /** Client-generated, so a double-click cannot double-charge (SPEC §11). */
  idempotencyKey: z.string().min(8).max(128),
});

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
