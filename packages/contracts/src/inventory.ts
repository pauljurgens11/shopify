/**
 * Inventory (SPEC §7).
 *
 * Adjustments go through a service that writes an InventoryAdjustment — never a
 * raw update — so the history exists. The contract reflects that: you post a
 * DELTA with a reason, not a new absolute value.
 *
 * Owner: WS-B.
 */
import { z } from 'zod';
import { idSchema, paginated, paginationQuery, searchQuery, timestampsSchema } from './common.ts';

export const inventoryLevelSchema = z
  .object({
    id: idSchema,
    variantId: idSchema,
    locationId: idSchema,
    available: z.number().int(),
  })
  .merge(timestampsSchema);
export type InventoryLevel = z.infer<typeof inventoryLevelSchema>;

export const adjustmentReasonSchema = z.enum([
  'correction',
  'received',
  'sold',
  'restock',
  'damaged',
  'shrinkage',
  'promotion',
]);

export const adjustInventoryInput = z.object({
  variantId: idSchema,
  locationId: idSchema,
  /** Signed delta. Negative decrements. */
  delta: z.number().int(),
  reason: adjustmentReasonSchema.default('correction'),
  /** Order id, fulfillment id, etc. — whatever caused this. */
  referenceId: idSchema.optional(),
});

export const bulkAdjustInventoryInput = z.object({
  adjustments: z.array(adjustInventoryInput).min(1).max(250),
});

/**
 * Absolute quantity, for the admin's inventory table where the merchant types
 * the count they just did on the shelf. The service still records the DELTA it
 * had to apply, so the history stays complete either way.
 */
export const setInventoryInput = z.object({
  variantId: idSchema,
  locationId: idSchema,
  available: z.number().int().nonnegative(),
  reason: adjustmentReasonSchema.default('correction'),
  referenceId: idSchema.optional(),
});

export const bulkSetInventoryInput = z.object({
  levels: z.array(setInventoryInput).min(1).max(250),
});

/**
 * Both write endpoints take one change or a batch, and a batch is ALL-OR-
 * NOTHING: a fulfillment that cannot decrement its third line must not have
 * decremented the first two.
 */
export const adjustInventoryBody = z.union([bulkAdjustInventoryInput, adjustInventoryInput]);
export const setInventoryBody = z.union([bulkSetInventoryInput, setInventoryInput]);

export const inventoryLevelsResponse = z.object({ levels: z.array(inventoryLevelSchema) });

/** One row of the stock history behind a variant (SPEC §7 InventoryAdjustment). */
export const inventoryAdjustmentSchema = z.object({
  id: idSchema,
  variantId: idSchema,
  locationId: idSchema,
  delta: z.number().int(),
  reason: adjustmentReasonSchema,
  referenceId: idSchema.nullable().default(null),
  actor: z.string().nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
});
export type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>;

/** One row of the Inventory index: a variant with per-location quantities. */
export const inventoryRowSchema = z.object({
  variantId: idSchema,
  productId: idSchema,
  productTitle: z.string(),
  variantTitle: z.string(),
  sku: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  levels: z.array(z.object({ locationId: idSchema, available: z.number().int() })),
});
export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export const listInventoryQuery = paginationQuery.merge(searchQuery).extend({
  locationId: idSchema.optional(),
  /** One product's variants — the product form's Inventory card reads this. */
  productId: idSchema.optional(),
});

export const inventoryListResponse = paginated(inventoryRowSchema);
