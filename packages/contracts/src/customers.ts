/** Customers (SPEC §7). Owner: WS-C. */
import { z } from 'zod';
import {
  addressSchema,
  booleanish,
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

export const customerAddressSchema = addressSchema.extend({
  id: idSchema,
  isDefault: z.boolean().default(false),
});
export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export const customerSchema = z
  .object({
    id: idSchema,
    email: z.string().email(),
    firstName: z.string().max(255).nullable().default(null),
    lastName: z.string().max(255).nullable().default(null),
    phone: z.string().max(64).nullable().default(null),
    acceptsMarketing: z.boolean().default(false),
    note: z.string().max(5000).nullable().default(null),
    tags: tagsSchema,
    addresses: z.array(customerAddressSchema).default([]),
    /** Denormalized for the index table — Shopify shows these columns. */
    ordersCount: z.number().int().nonnegative().default(0),
    totalSpent: moneySchema,
    /** True once the customer sets a storefront password (SPEC §8, optional). */
    hasAccount: z.boolean().default(false),
    metadata: metadataSchema,
  })
  .merge(timestampsSchema);
export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInput = customerSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    ordersCount: true,
    totalSpent: true,
    hasAccount: true,
    addresses: true,
  })
  .partial({ acceptsMarketing: true, tags: true, note: true, metadata: true })
  .extend({ addresses: z.array(customerAddressSchema.omit({ id: true })).default([]) });

export const updateCustomerInput = createCustomerInput.partial();

export const listCustomersQuery = paginationQuery
  .merge(searchQuery)
  .merge(sortQuery)
  .extend({
    acceptsMarketing: booleanish.optional(),
    tag: z.string().optional(),
    /** "segments-lite" (SPEC §2). */
    segment: z.enum(['all', 'returning', 'new', 'abandoned-checkout']).optional(),
  });

export const customerListResponse = paginated(customerSchema);

/** Storefront customer account (SPEC §8 — optional, guest checkout is default). */
export const customerLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export const customerRegisterInput = customerLoginInput.extend({
  firstName: z.string().max(255).optional(),
  lastName: z.string().max(255).optional(),
  acceptsMarketing: z.boolean().default(false),
});
