/**
 * Storefront product reads (SPEC §10). Owner: WS-E.
 *
 * A separate projection from B1's admin service on purpose. The admin DTO
 * carries status, metadata and per-location inventory; the storefront must
 * carry none of that, and needs two things the admin does not: a derived
 * `available` flag per variant and a `priceRange` for the card. Mapping admin
 * DTOs into storefront ones would drop the inventory joins these need, so the
 * read is expressed once, here, against the shapes the theme actually renders.
 *
 * Only `active` products are ever visible. That is the load-bearing rule on
 * this surface — a draft leaking onto a live storefront is a demo-killer.
 */
import type { Paginated } from '@merchant/contracts/common';
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { storefrontProductSchema } from '@merchant/contracts/storefront';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, notFound } from '../../lib/errors.ts';

const BY_POSITION = { position: 'asc' } as const;

const PRODUCT_INCLUDE = {
  options: { orderBy: BY_POSITION },
  variants: {
    orderBy: BY_POSITION,
    // Summed into the `available` flag. The storefront never shows a number —
    // Shopify does not either — but it needs to know whether it can be bought.
    include: { inventoryLevels: { select: { available: true } } },
  },
  images: { orderBy: BY_POSITION },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;
type VariantRow = ProductRow['variants'][number];

/** Live products only. Every query on this surface starts from here. */
const VISIBLE = { status: 'active' } satisfies Prisma.ProductWhereInput;

const asOptionValues = (value: Prisma.JsonValue): Record<string, string> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};

export function stockOf(variant: { inventoryLevels: Array<{ available: number }> }): number {
  return variant.inventoryLevels.reduce((sum, level) => sum + level.available, 0);
}

/**
 * `continue` means the merchant accepts overselling — pre-orders and made-to-
 * order. `deny` means the shopper cannot buy what is not on a shelf.
 */
export function isPurchasable(variant: {
  inventoryPolicy: string;
  inventoryLevels: Array<{ available: number }>;
}): boolean {
  return variant.inventoryPolicy === 'continue' || stockOf(variant) > 0;
}

/** The variant image if it has one, else the product's first — Shopify's rule. */
function variantImage(row: ProductRow, variant: VariantRow): string | null {
  const own = row.images.find((image) => image.variantIds.includes(variant.id));
  return own?.url ?? row.images[0]?.url ?? null;
}

export function toStorefrontProduct(row: ProductRow, currencyCode: string): StorefrontProduct {
  const prices = row.variants.map((variant) => variant.price);
  return storefrontProductSchema.parse({
    id: row.id,
    title: row.title,
    handle: row.handle,
    descriptionHtml: row.descriptionHtml,
    vendor: row.vendor,
    productType: row.productType,
    tags: row.tags,
    images: row.images.map((image) => ({ url: image.url, altText: image.altText })),
    options: row.options.map((option) => ({ name: option.name, values: option.values })),
    variants: row.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      sku: variant.sku,
      price: { amount: variant.price, currencyCode },
      compareAtPrice:
        variant.compareAtPrice === null ? null : { amount: variant.compareAtPrice, currencyCode },
      optionValues: asOptionValues(variant.optionValues),
      available: isPurchasable(variant),
      imageUrl: variantImage(row, variant),
    })),
    priceRange: {
      // A product with no variants cannot happen through B1, but a zeroed range
      // is still better than NaN reaching a price label.
      min: { amount: prices.length > 0 ? Math.min(...prices) : 0, currencyCode },
      max: { amount: prices.length > 0 ? Math.max(...prices) : 0, currencyCode },
    },
    available: row.variants.some(isPurchasable),
    seo: { title: row.seoTitle, description: row.seoDescription },
  });
}

/**
 * Sorts that map straight onto a product column. Cursor pagination uses
 * Prisma's own cursor for these, with an id tiebreak so a tie cannot make the
 * cursor skip or repeat a row.
 */
const COLUMN_ORDER: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  manual: [{ createdAt: 'desc' }],
  'title-asc': [{ title: 'asc' }],
  'title-desc': [{ title: 'desc' }],
  'created-desc': [{ createdAt: 'desc' }],
};

/** Sorts that live on another table and have to be ranked before paging. */
const DERIVED_SORTS = new Set(['price-asc', 'price-desc', 'best-selling']);

export type ListOptions = {
  limit: number;
  cursor?: string;
  query?: string;
  sort: string;
  /** Collection membership as a `where`, from `getStorefrontCollection`. */
  membership?: Prisma.ProductWhereInput;
};

function listWhere(options: ListOptions): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...VISIBLE };
  // ANDed as its own clause: a smart collection's rule set is an arbitrary
  // where, which may itself carry OR/AND and must not collide with the search
  // clause below.
  if (options.membership) where.AND = [options.membership];

  const search = options.query?.trim();
  if (search) {
    // ANDed with VISIBLE rather than ORed into it: an OR at the top level would
    // make every draft product matching the text visible.
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { productType: { contains: search, mode: 'insensitive' } },
      { tags: { has: search.toLowerCase() } },
    ];
  }
  return where;
}

/**
 * Ids for a sort Prisma cannot express as an `orderBy`: price lives on the
 * variant table and best-selling lives on order line items.
 *
 * Ranks the whole matching set, then pages it in memory. That is the right
 * trade at this scale — a shop's live catalogue is tens to low hundreds of
 * products (SPEC §2 puts no bulk catalogue in scope), and the alternative is a
 * raw SQL window function that would then need its own tenancy review. If a
 * catalogue ever outgrows it, this is the one function to replace.
 */
async function rankedIds(db: TenantClient, options: ListOptions): Promise<string[]> {
  const products = await db.product.findMany({
    where: listWhere(options),
    select: { id: true, createdAt: true, variants: { select: { price: true } } },
  });

  if (options.sort === 'best-selling') {
    const sold = await db.orderLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
    });
    const units = new Map(sold.map((row) => [row.productId, row._sum.quantity ?? 0]));
    return products
      .sort(
        (a, b) =>
          (units.get(b.id) ?? 0) - (units.get(a.id) ?? 0) ||
          // Never-sold products keep a stable, meaningful order behind the rest.
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .map((product) => product.id);
  }

  const direction = options.sort === 'price-asc' ? 1 : -1;
  const priceOf = (variants: Array<{ price: number }>) =>
    variants.length > 0 ? Math.min(...variants.map((variant) => variant.price)) : 0;

  return products
    .sort(
      (a, b) => direction * (priceOf(a.variants) - priceOf(b.variants)) || a.id.localeCompare(b.id),
    )
    .map((product) => product.id);
}

export async function listStorefrontProducts(
  db: TenantClient,
  currencyCode: string,
  options: ListOptions,
): Promise<Paginated<StorefrontProduct>> {
  if (DERIVED_SORTS.has(options.sort)) {
    const ordered = await rankedIds(db, options);
    // The cursor is still a product id, so the two paging strategies are
    // interchangeable from the caller's point of view.
    const start = options.cursor ? ordered.indexOf(options.cursor) + 1 : 0;
    if (options.cursor && start === 0) throw badRequest('Unknown cursor.', 'cursor');

    const pageIds = ordered.slice(start, start + options.limit);
    const rows = await db.product.findMany({
      where: { id: { in: pageIds } },
      include: PRODUCT_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    return {
      // `findMany` returns rows in the database's order, not the ranked one.
      data: pageIds.flatMap((id) => {
        const row = byId.get(id);
        return row ? [toStorefrontProduct(row, currencyCode)] : [];
      }),
      nextCursor: start + options.limit < ordered.length ? (pageIds.at(-1) ?? null) : null,
    };
  }

  if (options.cursor) {
    // Prisma resolves a cursor by looking the row up; a stale or foreign id
    // would surface as an internal error instead of a bad request.
    const anchor = await db.product.findFirst({
      where: { id: options.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const rows = await db.product.findMany({
    where: listWhere(options),
    include: PRODUCT_INCLUDE,
    orderBy: [...(COLUMN_ORDER[options.sort] ?? COLUMN_ORDER.manual ?? []), { id: 'desc' }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, options.limit);
  return {
    data: page.map((row) => toStorefrontProduct(row, currencyCode)),
    nextCursor: rows.length > options.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getStorefrontProduct(
  db: TenantClient,
  currencyCode: string,
  handle: string,
): Promise<StorefrontProduct> {
  const row = await db.product.findFirst({
    where: { ...VISIBLE, handle },
    include: PRODUCT_INCLUDE,
  });
  // A draft product 404s exactly like a missing one: the storefront must not
  // reveal that an unreleased handle exists.
  if (!row) throw notFound('Product');
  return toStorefrontProduct(row, currencyCode);
}
