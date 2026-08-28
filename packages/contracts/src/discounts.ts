/**
 * Discounts (SPEC §7, §10).
 *
 * The engine is a PURE FUNCTION: (cart, discounts) -> applied + new totals.
 * Keeping it pure is what makes SPEC §14.3 (stacking, 100%-off, discount >
 * subtotal) testable without a database.
 *
 * Owner: WS-C.
 */
import { z } from 'zod';
import {
  idSchema,
  moneySchema,
  paginated,
  paginationQuery,
  searchQuery,
  timestampsSchema,
} from './common.ts';

export const discountTypeSchema = z.enum([
  'amount_off_order',
  'amount_off_products',
  'free_shipping',
]);
export const discountValueTypeSchema = z.enum(['percentage', 'fixed']);
export const discountStatusSchema = z.enum(['active', 'scheduled', 'expired', 'disabled']);

/** What the discount applies to. `all` for order-level. */
export const discountAppliesToSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('all') }),
  z.object({ scope: z.literal('collections'), collectionIds: z.array(idSchema).min(1) }),
  z.object({ scope: z.literal('products'), productIds: z.array(idSchema).min(1) }),
]);
export type DiscountAppliesTo = z.infer<typeof discountAppliesToSchema>;

export const minimumRequirementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('subtotal'), value: moneySchema }),
  z.object({ type: z.literal('quantity'), value: z.number().int().positive() }),
]);

export const discountSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(255),
    /** null = automatic discount (no code needed at checkout). */
    code: z.string().min(1).max(64).nullable().default(null),
    type: discountTypeSchema,
    valueType: discountValueTypeSchema,
    /** percentage: integer 0–100. fixed: integer minor units (SPEC §5 — never floats). */
    value: z.number().int().nonnegative(),
    appliesTo: discountAppliesToSchema.default({ scope: 'all' }),
    minimumRequirement: minimumRequirementSchema.default({ type: 'none' }),
    usageLimit: z.number().int().positive().nullable().default(null),
    oncePerCustomer: z.boolean().default(false),
    usedCount: z.number().int().nonnegative().default(0),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }).nullable().default(null),
    status: discountStatusSchema.default('active'),
  })
  .merge(timestampsSchema);
export type Discount = z.infer<typeof discountSchema>;

export const createDiscountInput = discountSchema
  .omit({ id: true, createdAt: true, updatedAt: true, usedCount: true, status: true })
  .partial({ code: true, appliesTo: true, minimumRequirement: true, oncePerCustomer: true });

export const updateDiscountInput = createDiscountInput.partial();

export const listDiscountsQuery = paginationQuery
  .merge(searchQuery)
  .extend({ status: discountStatusSchema.optional() });

export const discountListResponse = paginated(discountSchema);

/* --- engine I/O (SPEC §14.3 tests target exactly these shapes) ------------- */

export const discountableLineSchema = z.object({
  lineId: z.string(),
  productId: idSchema,
  variantId: idSchema,
  collectionIds: z.array(idSchema).default([]),
  unitPrice: moneySchema,
  quantity: z.number().int().positive(),
});
export type DiscountableLine = z.infer<typeof discountableLineSchema>;

export const appliedDiscountSchema = z.object({
  discountId: idSchema,
  code: z.string().nullable(),
  title: z.string(),
  /** Total value taken off the order by this discount. */
  amount: moneySchema,
  /** Attribution back to lines, allocated with money.allocate() so cents balance. */
  lineAllocations: z.array(z.object({ lineId: z.string(), amount: moneySchema })).default([]),
  appliesToShipping: z.boolean().default(false),
});
export type AppliedDiscount = z.infer<typeof appliedDiscountSchema>;

export const discountResultSchema = z.object({
  applied: z.array(appliedDiscountSchema),
  /** Codes the shopper entered that did not apply, with a shopper-facing reason. */
  rejected: z.array(z.object({ code: z.string(), reason: z.string() })).default([]),
  discountTotal: moneySchema,
  shippingDiscount: moneySchema,
});
export type DiscountResult = z.infer<typeof discountResultSchema>;

/**
 * Why an entered code did not apply. Automatic discounts never surface a
 * rejection — they simply don't apply. Shopper-facing copy lives in the UI.
 */
export const discountRejectionReasonSchema = z.enum([
  'expired',
  'not_started',
  'minimum_not_met',
  'usage_limit',
  'invalid',
]);
export type DiscountRejectionReason = z.infer<typeof discountRejectionReasonSchema>;

/** A cart line after the engine has run. `lineTotal` is pre-discount. */
export const discountedLineSchema = discountableLineSchema.extend({
  lineTotal: moneySchema,
  totalDiscount: moneySchema,
});
export type DiscountedLine = z.infer<typeof discountedLineSchema>;

/**
 * Full engine output. `discountTotal` covers line discounts only and
 * `shippingTotal` is already net of `shippingDiscount`, so a caller's order
 * total is `subtotal - discountTotal + shippingTotal + tax` with nothing
 * counted twice (see DECISIONS.md).
 */
export const discountEngineResultSchema = discountResultSchema.extend({
  lines: z.array(discountedLineSchema),
  rejected: z
    .array(z.object({ code: z.string(), reason: discountRejectionReasonSchema }))
    .default([]),
  /** Pre-discount sum of line totals. */
  subtotal: moneySchema,
  /** `shippingPrice - shippingDiscount`. */
  shippingTotal: moneySchema,
});
export type DiscountEngineResult = z.infer<typeof discountEngineResultSchema>;
