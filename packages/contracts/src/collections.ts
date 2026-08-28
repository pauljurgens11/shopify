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

/** Smart-collection rule, matching Shopify's condition builder. */
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
  condition: z.string().min(1),
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
