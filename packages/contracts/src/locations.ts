/** Locations (SPEC §7 Inventory). Owner: WS-B. */
import { z } from 'zod';
import { addressSchema, idSchema, timestampsSchema } from './common.ts';

export const locationSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    address: addressSchema.partial().nullable().default(null),
    isActive: z.boolean().default(true),
    fulfillsOnlineOrders: z.boolean().default(true),
    /**
     * How many variants still hold units here. Read-only, and the reason the
     * admin can grey out Delete without paging the whole inventory.
     */
    stockedVariantCount: z.number().int().nonnegative().default(0),
  })
  .merge(timestampsSchema);
export type Location = z.infer<typeof locationSchema>;

export const createLocationInput = locationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  stockedVariantCount: true,
});
export const updateLocationInput = createLocationInput.partial();
export const locationListResponse = z.object({ data: z.array(locationSchema) });
