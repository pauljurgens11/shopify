/**
 * Shared primitives. Owned by WS-A; every other contract file builds on these.
 * Changing anything here is a breaking change to all eight workstreams.
 */

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@merchant/config/constants';
import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Identifiers                                                                  */
/* -------------------------------------------------------------------------- */

/** Prefixed ULID, e.g. `prod_01J8ZC…` (SPEC §5). */
export const idSchema = z.string().regex(/^[a-z_]+_[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid id');

export const prefixedId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`), `Expected a ${prefix}_ id`);

/** URL-safe, lowercase. Unique per shop for products/collections. */
export const handleSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must be lowercase, hyphen-separated');

/* -------------------------------------------------------------------------- */
/* Money (SPEC §5 — integer minor units, never floats)                          */
/* -------------------------------------------------------------------------- */

export const moneySchema = z.object({
  amount: z.number().int(),
  currencyCode: z.string().length(3).toUpperCase(),
});
export type MoneyDto = z.infer<typeof moneySchema>;

/** Non-negative money — prices, totals. Refunds and adjustments may be negative. */
export const positiveMoneySchema = moneySchema.extend({ amount: z.number().int().nonnegative() });

/* -------------------------------------------------------------------------- */
/* Time                                                                         */
/* -------------------------------------------------------------------------- */

/** ISO-8601 UTC in JSON, TIMESTAMPTZ in Postgres (SPEC §5). */
export const timestampSchema = z.string().datetime({ offset: true });

export const timestampsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/* -------------------------------------------------------------------------- */
/* Errors (SPEC §5 — EVERY non-2xx response has exactly this shape)             */
/* -------------------------------------------------------------------------- */

export const ERROR_CODES = [
  'invalid_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  /** Present for validation failures: the offending field path. */
  field: z.string().optional(),
});

export const errorResponseSchema = z.object({ errors: z.array(apiErrorSchema).min(1) });
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/** HTTP status for each code — one mapping, so routes never pick a status by hand. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

/* -------------------------------------------------------------------------- */
/* Pagination (SPEC §5 — cursor-based, max 250)                                 */
/* -------------------------------------------------------------------------- */

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Free-text search — every list endpoint whose Shopify page has a search box. */
export const searchQuery = z.object({ query: z.string().trim().max(255).optional() });

/**
 * Boolean query-string param. NEVER `z.coerce.boolean()` for query params —
 * `Boolean('false') === true`, so `?flag=false` would filter for true.
 */
export const booleanish = z
  .enum(['true', 'false'])
  .or(z.boolean())
  .transform((v) => v === true || v === 'true');

export const sortQuery = z.object({
  sortKey: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** `paginated(productSchema)` → `{ data: Product[]; nextCursor: string | null }`. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item), nextCursor: z.string().nullable() });
}
export type Paginated<T> = { data: T[]; nextCursor: string | null };

/* -------------------------------------------------------------------------- */
/* Shared value objects                                                         */
/* -------------------------------------------------------------------------- */

/** Shopify-shaped address. Used for shipping, billing, customer, and location. */
export const addressSchema = z.object({
  firstName: z.string().max(255).nullable().default(null),
  lastName: z.string().max(255).nullable().default(null),
  company: z.string().max(255).nullable().default(null),
  address1: z.string().max(255),
  address2: z.string().max(255).nullable().default(null),
  city: z.string().max(255),
  province: z.string().max(255).nullable().default(null),
  provinceCode: z.string().max(10).nullable().default(null),
  country: z.string().max(255),
  countryCode: z.string().length(2).toUpperCase(),
  zip: z.string().max(32),
  phone: z.string().max(64).nullable().default(null),
});
export type AddressDto = z.infer<typeof addressSchema>;

export const seoSchema = z.object({
  title: z.string().max(255).nullable().default(null),
  description: z.string().max(1024).nullable().default(null),
});

/** Free-form JSON column (SPEC §7 — `metadata JSONB`; the metafields stand-in). */
export const metadataSchema = z.record(z.unknown()).default({});

export const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(64).default([]);

/** Path param shape for the many `/:id` routes. */
export const idParam = z.object({ id: idSchema });

/** Standard 200 for a delete. */
export const deletedResponse = z.object({ id: idSchema, deleted: z.literal(true) });
