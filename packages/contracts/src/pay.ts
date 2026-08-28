/**
 * Pay — vault, processor adapters, routing (SPEC §11). Owner: WS-D.
 *
 * Boundary rule: only `packages/pay` may decrypt a card blob or talk to a
 * processor SDK. Everything else in the monorepo speaks these types and nothing
 * more. If a type here would leak a PAN, it is the wrong type.
 */
import { z } from 'zod';
import { addressSchema, idSchema, moneySchema, timestampsSchema } from './common.ts';

export const processorKeySchema = z.enum(['mock', 'stripe', 'maverick']);
export type ProcessorKey = z.infer<typeof processorKeySchema>;

/* --- vault ---------------------------------------------------------------- */

/**
 * Posted by the browser DIRECTLY to /vault/tokenize. This shape must never
 * appear in a request to any other endpoint, or in a log line.
 */
export const tokenizeCardInput = z.object({
  number: z.string().regex(/^\d{12,19}$/, 'Card number must be 12–19 digits'),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  cvc: z.string().regex(/^\d{3,4}$/),
  cardholderName: z.string().max(255).optional(),
});

/** Everything the rest of the system is allowed to know about a card. */
export const cardTokenSchema = z.object({
  cardTokenId: z.string().startsWith('card_tok_'),
  brand: z.enum(['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unknown']),
  last4: z.string().length(4),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int(),
});
export type CardToken = z.infer<typeof cardTokenSchema>;

/* --- processor adapter (SPEC §11) ----------------------------------------- */

export const authorizeRequestSchema = z.object({
  cardTokenId: z.string().startsWith('card_tok_'),
  amount: moneySchema,
  /** false = authorize only; capture later from the admin. */
  capture: z.boolean().default(true),
  customer: z
    .object({ id: idSchema.nullable(), email: z.string().email(), name: z.string().nullable() })
    .optional(),
  billingAddress: addressSchema.nullable().optional(),
  /** Required. Replaying the same key must NOT double-charge. */
  idempotencyKey: z.string().min(8).max(128),
  reference: z.string().max(128).optional(),
});
export type AuthorizeRequest = z.infer<typeof authorizeRequestSchema>;

export const declineCodeSchema = z.enum([
  'declined',
  'insufficient_funds',
  'expired_card',
  'invalid_card',
  'processing_error',
]);

/**
 * `hard_failure` vs `declined` is the single most important distinction in this
 * package: a hard failure (network, 5xx, bad credentials) MAY fail over to the
 * next processor; a decline MUST NOT — the card was genuinely rejected and
 * retrying elsewhere is how you get flagged for card testing (SPEC §11).
 */
export const authResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('approved'),
    processor: processorKeySchema,
    processorTxnId: z.string(),
    captured: z.boolean(),
    amount: moneySchema,
    raw: z.record(z.unknown()).optional(),
  }),
  z.object({
    outcome: z.literal('declined'),
    processor: processorKeySchema,
    code: declineCodeSchema,
    message: z.string(),
    processorTxnId: z.string().nullable().default(null),
  }),
  z.object({
    outcome: z.literal('hard_failure'),
    processor: processorKeySchema,
    message: z.string(),
    retryable: z.literal(true),
  }),
]);
export type AuthResult = z.infer<typeof authResultSchema>;

export const processorResultSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('success'),
    processor: processorKeySchema,
    processorTxnId: z.string(),
    amount: moneySchema.optional(),
  }),
  z.object({
    outcome: z.literal('failure'),
    processor: processorKeySchema,
    message: z.string(),
    retryable: z.boolean().default(false),
  }),
]);
export type ProcessorResult = z.infer<typeof processorResultSchema>;

/* --- merchant configuration ----------------------------------------------- */

export const processorConfigSchema = z
  .object({
    id: idSchema,
    processor: processorKeySchema,
    displayName: z.string(),
    enabled: z.boolean().default(true),
    testMode: z.boolean().default(true),
    /** Credentials are AES-encrypted at rest and NEVER returned by the API. */
    connected: z.boolean(),
    lastVerifiedAt: z.string().datetime({ offset: true }).nullable().default(null),
  })
  .merge(timestampsSchema);
export type ProcessorConfig = z.infer<typeof processorConfigSchema>;

export const connectProcessorInput = z.object({
  processor: processorKeySchema,
  displayName: z.string().max(255).optional(),
  testMode: z.boolean().default(true),
  /** Adapter-specific: { secretKey } for stripe, { apiKey, merchantId } for maverick. */
  credentials: z.record(z.string()),
});

/** CheckoutChamp-style weighted routing with conditions (SPEC §11). */
export const routingRuleSchema = z.object({
  id: idSchema,
  processorConfigId: idSchema,
  position: z.number().int().nonnegative(),
  /** Percentage split across rules that match. */
  weight: z.number().int().min(0).max(100).default(100),
  conditions: z
    .object({
      cardBrands: z.array(cardTokenSchema.shape.brand).optional(),
      minAmount: moneySchema.optional(),
      maxAmount: moneySchema.optional(),
    })
    .default({}),
});
export type RoutingRule = z.infer<typeof routingRuleSchema>;

export const updateRoutingRulesInput = z.object({
  rules: z.array(routingRuleSchema.omit({ id: true }).partial({ position: true })),
});

/* --- payments ------------------------------------------------------------- */

export const paymentStatusSchema = z.enum([
  'authorized',
  'captured',
  'refunded',
  'partially_refunded',
  'voided',
  'failed',
]);

export const paymentSchema = z
  .object({
    id: idSchema,
    orderId: idSchema.nullable(),
    checkoutId: idSchema.nullable(),
    amount: moneySchema,
    refundedAmount: moneySchema,
    status: paymentStatusSchema,
    processor: processorKeySchema,
    processorTxnId: z.string().nullable(),
    cardTokenId: z.string().nullable(),
    last4: z.string().length(4).nullable(),
    brand: z.string().nullable(),
    errorCode: z.string().nullable(),
    /** Which routing rules were tried, in order — makes failover debuggable. */
    routingTrail: z
      .array(z.object({ processor: processorKeySchema, outcome: z.string() }))
      .default([]),
  })
  .merge(timestampsSchema);
export type Payment = z.infer<typeof paymentSchema>;

/** Saved card: the repeat-billing / subscription primitive (SPEC §11). */
export const paymentMethodSchema = z
  .object({
    id: idSchema,
    customerId: idSchema,
    cardTokenId: z.string(),
    brand: z.string(),
    last4: z.string().length(4),
    expMonth: z.number().int(),
    expYear: z.number().int(),
    isDefault: z.boolean().default(false),
  })
  .merge(timestampsSchema);

/** Admin "charge saved card" on order detail. */
export const chargeSavedCardInput = z.object({
  paymentMethodId: idSchema,
  amount: moneySchema,
  idempotencyKey: z.string().min(8).max(128),
});

export const refundPaymentInput = z.object({
  amount: moneySchema,
  reason: z.string().max(512).optional(),
  idempotencyKey: z.string().min(8).max(128),
});
