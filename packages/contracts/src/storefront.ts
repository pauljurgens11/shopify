/**
 * Public storefront read API (SPEC §10). No auth; shop resolved by Host header.
 * Everything here must be cacheable — see STOREFRONT_CACHE_CONTROL.
 * Owner: WS-E.
 */
import { z } from 'zod';
import { handleSchema, idSchema, moneySchema, paginated, paginationQuery } from './common.ts';
import { themeDocSchema } from './theme.ts';

export const storefrontVariantSchema = z.object({
  id: idSchema,
  title: z.string(),
  sku: z.string().nullable(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable(),
  optionValues: z.record(z.string()),
  available: z.boolean(),
  imageUrl: z.string().url().nullable(),
});

export const storefrontProductSchema = z.object({
  id: idSchema,
  title: z.string(),
  handle: handleSchema,
  descriptionHtml: z.string(),
  vendor: z.string().nullable(),
  productType: z.string().nullable(),
  tags: z.array(z.string()),
  images: z.array(z.object({ url: z.string().url(), altText: z.string().nullable() })),
  options: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  variants: z.array(storefrontVariantSchema),
  priceRange: z.object({ min: moneySchema, max: moneySchema }),
  available: z.boolean(),
  seo: z.object({ title: z.string().nullable(), description: z.string().nullable() }),
});
export type StorefrontProduct = z.infer<typeof storefrontProductSchema>;

export const storefrontCollectionSchema = z.object({
  id: idSchema,
  title: z.string(),
  handle: handleSchema,
  descriptionHtml: z.string(),
  imageUrl: z.string().url().nullable(),
  /** Live products only — a count that disagrees with the grid reads as a bug. */
  productCount: z.number().int().nonnegative(),
});
export type StorefrontCollection = z.infer<typeof storefrontCollectionSchema>;

export const listStorefrontProductsQuery = paginationQuery.extend({
  collection: handleSchema.optional(),
  query: z.string().max(255).optional(),
  sort: z
    .enum([
      'manual',
      'best-selling',
      'title-asc',
      'title-desc',
      'price-asc',
      'price-desc',
      'created-desc',
    ])
    .default('manual'),
});

export const storefrontProductListResponse = paginated(storefrontProductSchema);

/** Shop context every storefront page needs (SPEC §10). */
export const storefrontShopResponse = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  currencyCode: z.string().length(3),
  /** Published ThemeVersion id, or the preview id when `?preview=` is signed. */
  themeVersionId: idSchema,
});

/**
 * `GET /storefront/api/theme` — the whole published ThemeDoc, so E2 renders a
 * page in one hop rather than fetching the shop and then the theme.
 *
 * `isPreview` is true when a signed `?preview=` token overrode the published
 * version; the storefront uses it to show the builder's preview chrome and to
 * keep the response out of any shared cache.
 */
export const storefrontThemeResponse = z.object({
  themeVersionId: idSchema,
  theme: themeDocSchema,
  isPreview: z.boolean().default(false),
});
export type StorefrontThemeResponse = z.infer<typeof storefrontThemeResponse>;

/** `GET /storefront/api/collections/:handle/products` — collection plus its page. */
export const storefrontCollectionProductsResponse = paginated(storefrontProductSchema).extend({
  collection: storefrontCollectionSchema,
});
