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
  })
  .merge(timestampsSchema);
export type Location = z.infer<typeof locationSchema>;

export const createLocationInput = locationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateLocationInput = createLocationInput.partial();
export const locationListResponse = z.object({ data: z.array(locationSchema) });
