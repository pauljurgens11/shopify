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

export const listInventoryQuery = paginationQuery
  .merge(searchQuery)
  .extend({ locationId: idSchema.optional() });

export const inventoryListResponse = paginated(inventoryRowSchema);
