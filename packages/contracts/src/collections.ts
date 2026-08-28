/** Collections, manual + smart (SPEC §7). Owner: WS-B. */
import { z } from 'zod';
import {
  handleSchema,
  idSchema,
  paginated,
  paginationQuery,
  searchQuery,
  seoSchema,
  timestampsSchema,
} from './common.ts';

export const collectionTypeSchema = z.enum(['manual', 'smart']);

export const collectionSortOrderSchema = z.enum([
  'manual',
  'best-selling',
  'title-asc',
  'title-desc',
  'price-asc',
  'price-desc',
  'created-desc',
]);

/**
 * Smart-collection rule, matching Shopify's condition builder.
 *
 * Not every (column, relation) pair is meaningful, and the API rejects the ones
 * that are not rather than quietly matching nothing:
 *   - `title` / `type` / `vendor` — every text relation, case-insensitive.
 *   - `tag` — `equals` / `not_equals` only. Tags are an array column; there is
 *     no substring match over one.
 *   - `price` / `inventory_quantity` — `equals`, `not_equals`, `greater_than`,
 *     `less_than` only.
 */
export const collectionRuleSchema = z.object({
  column: z.enum(['title', 'type', 'vendor', 'tag', 'price', 'inventory_quantity']),
  relation: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'greater_than',
    'less_than',
  ]),
  condition: z
    .string()
    .min(1)
    .describe(
      'The value to compare against. For `price` this is an INTEGER IN MINOR ' +
        'UNITS (SPEC §5) — `2000` means $20.00, not $2000. For ' +
        '`inventory_quantity` it is a whole number of units available at a ' +
        'single location. Text columns compare case-insensitively.',
    ),
});

export const collectionRuleSetSchema = z.object({
  /** Shopify's "all conditions" vs "any condition" toggle. */
  appliedDisjunctively: z.boolean().default(false),
  rules: z.array(collectionRuleSchema).default([]),
});

export const collectionSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(255),
    handle: handleSchema,
    descriptionHtml: z.string().default(''),
    type: collectionTypeSchema,
    ruleSet: collectionRuleSetSchema.nullable().default(null),
    sortOrder: collectionSortOrderSchema.default('manual'),
    imageUrl: z.string().url().nullable().default(null),
    seo: seoSchema.default({ title: null, description: null }),
    productCount: z.number().int().nonnegative().default(0),
  })
  .merge(timestampsSchema);
export type Collection = z.infer<typeof collectionSchema>;

export const createCollectionInput = collectionSchema
  .omit({ id: true, createdAt: true, updatedAt: true, productCount: true })
  .partial({ handle: true, descriptionHtml: true, sortOrder: true, seo: true, ruleSet: true })
  .extend({ productIds: z.array(idSchema).default([]) });

export const updateCollectionInput = createCollectionInput.partial();

export const listCollectionsQuery = paginationQuery
  .merge(searchQuery)
  .extend({ type: collectionTypeSchema.optional() });

export const collectionListResponse = paginated(collectionSchema);

/** Manual collections only: reorder / add / remove members. */
export const updateCollectionProductsInput = z.object({
  add: z.array(idSchema).default([]),
  remove: z.array(idSchema).default([]),
  reorder: z.array(z.object({ productId: idSchema, position: z.number().int() })).default([]),
});

/**
 * Members of a collection, either type (`GET /admin/api/collections/:id/products`).
 *
 * `sortOrder` overrides the collection's stored order for this request — the
 * storefront's "Sort by" dropdown, and the admin's preview of a sort before it
 * is saved. `manual` is only honoured on a manual collection; a smart
 * collection has no stored positions and falls back to newest-first.
 */
export const listCollectionProductsQuery = paginationQuery.extend({
  sortOrder: collectionSortOrderSchema.optional(),
});

/**
 * What an UNSAVED rule set would match (`POST /admin/api/collections/preview`).
 *
 * The admin's condition builder needs this: without it the form would have to
 * re-implement the rule translator in the browser, and the two would drift the
 * first time a relation was added.
 */
export const previewCollectionInput = z.object({
  ruleSet: collectionRuleSetSchema,
  limit: z.number().int().min(1).max(50).default(10),
});
export type PreviewCollectionInput = z.infer<typeof previewCollectionInput>;

/* -------------------------------------------------------------------------- */
/* Types                                                                        */
/* -------------------------------------------------------------------------- */

export type CollectionType = z.infer<typeof collectionTypeSchema>;
export type CollectionSortOrder = z.infer<typeof collectionSortOrderSchema>;
export type CollectionRule = z.infer<typeof collectionRuleSchema>;
export type CollectionRuleSet = z.infer<typeof collectionRuleSetSchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionInput>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionInput>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuery>;
export type ListCollectionProductsQuery = z.infer<typeof listCollectionProductsQuery>;
export type UpdateCollectionProductsInput = z.infer<typeof updateCollectionProductsInput>;
