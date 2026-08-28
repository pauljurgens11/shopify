/** Catalog (SPEC §7). Owner: WS-B. */
import { z } from 'zod';
import {
  handleSchema,
  idSchema,
  metadataSchema,
  moneySchema,
  paginated,
  paginationQuery,
  searchQuery,
  seoSchema,
  sortQuery,
  tagsSchema,
  timestampsSchema,
} from './common.ts';

export const productStatusSchema = z.enum(['active', 'draft', 'archived']);
export const inventoryPolicySchema = z.enum(['deny', 'continue']);

export const productImageSchema = z.object({
  id: idSchema,
  url: z.string().url(),
  altText: z.string().max(512).nullable().default(null),
  position: z.number().int().nonnegative(),
  /** Empty = applies to the whole product. */
  variantIds: z.array(idSchema).default([]),
});
export type ProductImage = z.infer<typeof productImageSchema>;

/** e.g. { name: 'Size', position: 0, values: ['S','M','L'] } */
export const productOptionSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(255),
  position: z.number().int().nonnegative(),
  values: z.array(z.string().min(1).max(255)).min(1),
});

export const productVariantSchema = z
  .object({
    id: idSchema,
    productId: idSchema,
    title: z.string(),
    sku: z.string().max(255).nullable().default(null),
    barcode: z.string().max(255).nullable().default(null),
    price: moneySchema,
    compareAtPrice: moneySchema.nullable().default(null),
    position: z.number().int().nonnegative(),
    /** { Size: 'M', Color: 'Blue' } — keys match ProductOption.name. */
    optionValues: z.record(z.string()).default({}),
    requiresShipping: z.boolean().default(true),
    taxable: z.boolean().default(true),
    weightGrams: z.number().int().nonnegative().nullable().default(null),
    inventoryPolicy: inventoryPolicySchema.default('deny'),
    /** Summed across locations; per-location detail lives in inventory.ts. */
    inventoryQuantity: z.number().int().default(0),
  })
  .merge(timestampsSchema);
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(255),
    descriptionHtml: z.string().default(''),
    handle: handleSchema,
    status: productStatusSchema.default('draft'),
    vendor: z.string().max(255).nullable().default(null),
    productType: z.string().max(255).nullable().default(null),
    tags: tagsSchema,
    seo: seoSchema.default({ title: null, description: null }),
    options: z.array(productOptionSchema).default([]),
    variants: z.array(productVariantSchema).default([]),
    images: z.array(productImageSchema).default([]),
    metadata: metadataSchema,
  })
  .merge(timestampsSchema);
export type Product = z.infer<typeof productSchema>;

/* --- requests ------------------------------------------------------------- */

export const createVariantInput = productVariantSchema
  .omit({ id: true, productId: true, createdAt: true, updatedAt: true, inventoryQuantity: true })
  .partial({ title: true, position: true })
  .extend({ inventoryQuantity: z.number().int().default(0) });

export const createProductInput = productSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    options: true,
    variants: true,
    images: true,
  })
  .partial({ handle: true, status: true, descriptionHtml: true, seo: true })
  .extend({
    options: z.array(productOptionSchema.omit({ id: true })).default([]),
    /** Empty means "create the single default variant", as Shopify does. */
    variants: z.array(createVariantInput).default([]),
    images: z.array(productImageSchema.omit({ id: true }).partial({ position: true })).default([]),
  });
export type CreateProductInput = z.infer<typeof createProductInput>;

/**
 * A variant inside a product update. `id` is optional because the admin form
 * regenerates the variant table from the option matrix and does not always
 * carry ids back; the API matches a payload variant to an existing row by id
 * when given one and by option values otherwise, so editing options preserves
 * the rows B4's inventory levels hang off.
 */
export const upsertVariantInput = createVariantInput.extend({ id: idSchema.optional() });

/**
 * Every field is optional and `undefined` means "leave it alone" — in
 * particular, omitting `variants` keeps the existing variants rather than
 * deleting them, and a partial `variants` list only touches the rows it names.
 * To collapse a product back to the single default variant, send `options: []`.
 */
export const updateProductInput = createProductInput
  .partial()
  .extend({ variants: z.array(upsertVariantInput).optional() });
export type UpdateProductInput = z.infer<typeof updateProductInput>;

/** Inline edits from the variants table (price, sku, …) — one variant at a time. */
export const updateVariantInput = createVariantInput.partial();
export type UpdateVariantInput = z.infer<typeof updateVariantInput>;

/** Path params for `/admin/api/products/:id/variants/:variantId`. */
export const variantParams = z.object({ id: idSchema, variantId: idSchema });

export const listProductsQuery = paginationQuery.merge(searchQuery).merge(sortQuery).extend({
  status: productStatusSchema.optional(),
  collectionId: idSchema.optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tag: z.string().optional(),
});

export const productListResponse = paginated(productSchema);
