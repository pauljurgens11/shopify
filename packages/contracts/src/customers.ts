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
import { financialStatusSchema, fulfillmentStatusSchema } from './orders.ts';

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

/* --- storefront account surface (E5) -------------------------------------- */

/**
 * What the account pages and E4's checkout pre-fill see. Deliberately smaller
 * than `customerSchema`: no note/tags/metadata (merchant-facing), no
 * ordersCount/totalSpent (the order list is the source of truth here), and
 * `defaultAddress` pulled out so consumers never re-derive "the" address.
 */
export const storefrontCustomerSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  firstName: z.string().max(255).nullable().default(null),
  lastName: z.string().max(255).nullable().default(null),
  phone: z.string().max(64).nullable().default(null),
  acceptsMarketing: z.boolean().default(false),
  addresses: z.array(customerAddressSchema).default([]),
  defaultAddress: customerAddressSchema.nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
});
export type StorefrontCustomer = z.infer<typeof storefrontCustomerSchema>;

/** `GET|PUT /storefront/api/customers/me`, and login/register responses. */
export const storefrontCustomerResponse = z.object({ customer: storefrontCustomerSchema });
export type StorefrontCustomerResponse = z.infer<typeof storefrontCustomerResponse>;

/**
 * The account page's one edit form (SPEC §8 keeps this surface minimal —
 * default address only, no address book). `defaultAddress` replaces the
 * default address; omitting it leaves addresses untouched.
 */
export const updateStorefrontCustomerInput = z.object({
  firstName: z.string().max(255).nullable().optional(),
  lastName: z.string().max(255).nullable().optional(),
  phone: z.string().max(64).nullable().optional(),
  acceptsMarketing: z.boolean().optional(),
  defaultAddress: addressSchema.optional(),
});

/**
 * One row of the account order-history table: number, date, total, status.
 * A subset of C2's `orderSummarySchema` — shoppers never see cost-side fields.
 */
export const storefrontOrderSummarySchema = z.object({
  id: idSchema,
  /** Display as `#${orderNumber}`. */
  orderNumber: z.number().int(),
  createdAt: z.string().datetime({ offset: true }),
  total: moneySchema,
  financialStatus: financialStatusSchema,
  fulfillmentStatus: fulfillmentStatusSchema,
  cancelledAt: z.string().datetime({ offset: true }).nullable().default(null),
  itemCount: z.number().int().nonnegative(),
});
export type StorefrontOrderSummary = z.infer<typeof storefrontOrderSummarySchema>;

/** `GET /storefront/api/customers/me/orders`. */
export const storefrontCustomerOrdersResponse = paginated(storefrontOrderSummarySchema);
