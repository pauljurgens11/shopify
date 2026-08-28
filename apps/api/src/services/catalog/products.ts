/**
 * Products & variants (SPEC §7). Owner: WS-B.
 *
 * All catalog business logic lives here; `routes/admin/products/index.ts` is a
 * thin zod-validated shell over it, so B5's product form, E1's storefront and
 * H1's seed all hit the same rules.
 *
 * Two things this module is deliberately strict about:
 *   - Money is integer minor units end to end. The DTO carries the shop's
 *     currency; the column carries the amount. A price in another currency is
 *     refused rather than silently reinterpreted (multi-currency is out of
 *     scope, SPEC §2).
 *   - The variant table is DERIVED from the option matrix, never taken
 *     verbatim from the caller. That is what makes "add a size" additive
 *     instead of destructive.
 *
 * Inventory is not touched here: quantities move only through B4's adjustment
 * service, so `InventoryLevel` is read (to sum `inventoryQuantity`) and never
 * written.
 */
import { newId } from '@merchant/config/ids';
import type { Paginated } from '@merchant/contracts/common';
import type {
  CreateProductInput,
  Product,
  ProductVariant,
  UpdateProductInput,
  UpdateVariantInput,
} from '@merchant/contracts/products';
import { productSchema, productVariantSchema } from '@merchant/contracts/products';
import { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { handleCandidates, handleFromTitle } from './handles.ts';
import {
  type NormalizedOption,
  normalizeOptions,
  optionSignature,
  type ResolvedVariant,
  resolveVariants,
  type VariantLike,
} from './variants.ts';

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                   */
/* -------------------------------------------------------------------------- */

const BY_POSITION = { position: 'asc' } as const;

const PRODUCT_INCLUDE = {
  options: { orderBy: BY_POSITION },
  variants: {
    orderBy: BY_POSITION,
    // Summed into `inventoryQuantity`; the per-location breakdown is B4's API.
    include: { inventoryLevels: { select: { available: true } } },
  },
  images: { orderBy: BY_POSITION },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;
type VariantRow = ProductRow['variants'][number];

/* -------------------------------------------------------------------------- */
/* DTO mapping                                                                  */
/* -------------------------------------------------------------------------- */

const asOptionValues = (value: Prisma.JsonValue): Record<string, string> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {};

/** Key order is not meaningful in a JSON object, so compare entries, not text. */
function sameOptionValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

function toVariantDto(row: VariantRow, currencyCode: string): ProductVariant {
  return productVariantSchema.parse({
    id: row.id,
    productId: row.productId,
    title: row.title,
    sku: row.sku,
    barcode: row.barcode,
    price: { amount: row.price, currencyCode },
    compareAtPrice:
      row.compareAtPrice === null ? null : { amount: row.compareAtPrice, currencyCode },
    position: row.position,
    optionValues: asOptionValues(row.optionValues),
    requiresShipping: row.requiresShipping,
    taxable: row.taxable,
    weightGrams: row.weightGrams,
    inventoryPolicy: row.inventoryPolicy,
    inventoryQuantity: row.inventoryLevels.reduce((sum, level) => sum + level.available, 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/**
 * Parsed through the contract on the way out, so a schema drift breaks here
 * rather than in the admin — `packages/contracts` is the integration contract,
 * not documentation.
 */
function toProductDto(row: ProductRow, currencyCode: string): Product {
  return productSchema.parse({
    id: row.id,
    title: row.title,
    descriptionHtml: row.descriptionHtml,
    handle: row.handle,
    status: row.status,
    vendor: row.vendor,
    productType: row.productType,
    tags: row.tags,
    seo: { title: row.seoTitle, description: row.seoDescription },
    options: row.options.map((option) => ({
      id: option.id,
      name: option.name,
      position: option.position,
      values: option.values,
    })),
    variants: row.variants.map((variant) => toVariantDto(variant, currencyCode)),
    images: row.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      position: image.position,
      variantIds: image.variantIds,
    })),
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/* -------------------------------------------------------------------------- */
/* Handles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * An explicitly chosen handle is honoured or refused — renaming what the
 * merchant typed would silently break the URL they meant to publish. A derived
 * one walks `-2`, `-3` … the way Shopify renames a duplicate product.
 */
async function assignHandle(
  db: TenantClient,
  desired: string | undefined,
  title: string,
  excludeProductId?: string,
): Promise<string> {
  const notSelf = excludeProductId ? { id: { not: excludeProductId } } : {};

  if (desired) {
    const taken = await db.product.findFirst({
      where: { handle: desired, ...notSelf },
      select: { id: true },
    });
    if (taken) throw conflict('Another product already uses that handle.', 'handle');
    return desired;
  }

  const candidates = handleCandidates(handleFromTitle(title));
  const taken = await db.product.findMany({
    where: { handle: { in: candidates }, ...notSelf },
    select: { handle: true },
  });
  const used = new Set(taken.map((row) => row.handle));
  const free = candidates.find((candidate) => !used.has(candidate));
  if (!free) throw conflict('Could not derive a unique handle for that title.', 'handle');
  return free;
}

/* -------------------------------------------------------------------------- */
/* Variant payload → column values                                              */
/* -------------------------------------------------------------------------- */

type VariantPayload = VariantLike & {
  id?: string;
  sku?: string | null;
  barcode?: string | null;
  price?: { amount: number; currencyCode: string };
  compareAtPrice?: { amount: number; currencyCode: string } | null;
  requiresShipping?: boolean;
  taxable?: boolean;
  weightGrams?: number | null;
  inventoryPolicy?: string;
};

function assertCurrency(
  money: { amount: number; currencyCode: string } | null | undefined,
  currencyCode: string,
  field: string,
): void {
  if (money && money.currencyCode !== currencyCode) {
    throw badRequest(
      `Prices must be in the store currency (${currencyCode}), got ${money.currencyCode}.`,
      field,
    );
  }
}

/** Every supplied price, including combinations that end up unused. */
function assertVariantCurrencies(
  variants: readonly VariantPayload[] | undefined,
  currencyCode: string,
): void {
  for (const variant of variants ?? []) {
    assertCurrency(variant.price, currencyCode, 'variants.price');
    assertCurrency(variant.compareAtPrice, currencyCode, 'variants.compareAtPrice');
  }
}

/**
 * Columns for one combination.
 *
 * `match` is the caller's variant for exactly this combination; `template` is
 * the caller's first variant, used for a combination they did not mention (add
 * a size and the new row inherits the price rather than appearing as free).
 * Identity-bearing fields — sku, barcode — come only from an exact match:
 * copying a sku onto a sibling would duplicate it across the variant table.
 */
function variantColumns(
  resolved: ResolvedVariant<VariantPayload>,
  template: VariantPayload | undefined,
  currencyCode: string,
) {
  const source = resolved.match ?? template;
  assertCurrency(source?.price, currencyCode, 'variants.price');
  assertCurrency(source?.compareAtPrice, currencyCode, 'variants.compareAtPrice');

  return {
    // Titles are always derived from the option values, like Shopify's — a
    // caller-supplied title would desync from the option matrix on the next edit.
    title: resolved.title,
    sku: resolved.match?.sku ?? null,
    barcode: resolved.match?.barcode ?? null,
    price: source?.price?.amount ?? 0,
    compareAtPrice: source?.compareAtPrice?.amount ?? null,
    position: resolved.position,
    optionValues: resolved.optionValues as Prisma.InputJsonValue,
    requiresShipping: source?.requiresShipping ?? true,
    taxable: source?.taxable ?? true,
    weightGrams: source?.weightGrams ?? null,
    inventoryPolicy: source?.inventoryPolicy ?? 'deny',
  };
}

const optionColumns = (option: NormalizedOption, shopId: string) => ({
  id: newId('option'),
  shopId,
  name: option.name,
  position: option.position,
  values: option.values,
});

const imageColumns = (
  image: { url: string; altText?: string | null; position?: number; variantIds?: string[] },
  index: number,
  shopId: string,
) => ({
  id: newId('image'),
  shopId,
  url: image.url,
  altText: image.altText ?? null,
  position: image.position ?? index,
  variantIds: image.variantIds ?? [],
});

/* -------------------------------------------------------------------------- */
/* Read                                                                         */
/* -------------------------------------------------------------------------- */

export type ListProductsOptions = {
  limit: number;
  cursor?: string;
  query?: string;
  status?: string;
  vendor?: string;
  productType?: string;
  tag?: string;
  collectionId?: string;
  sortKey?: string;
  sortOrder: 'asc' | 'desc';
};

/** Sortable columns the admin index offers. Anything else is a 400, not a 500. */
const SORT_KEYS = ['title', 'createdAt', 'updatedAt', 'vendor', 'productType'] as const;
type SortKey = (typeof SORT_KEYS)[number];

function orderBy(options: ListProductsOptions): Prisma.ProductOrderByWithRelationInput[] {
  const key = (options.sortKey ?? 'createdAt') as SortKey;
  if (!SORT_KEYS.includes(key)) {
    throw badRequest(`Cannot sort products by "${options.sortKey}".`, 'sortKey');
  }
  // The id tiebreak is what makes the cursor stable when the sort column ties.
  return [{ [key]: options.sortOrder }, { id: options.sortOrder }];
}

function listWhere(options: ListProductsOptions): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (options.status) where.status = options.status;
  if (options.vendor) where.vendor = options.vendor;
  if (options.productType) where.productType = options.productType;
  if (options.tag) where.tags = { has: options.tag };
  if (options.collectionId) where.collections = { some: { collectionId: options.collectionId } };

  const search = options.query?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { vendor: { contains: search, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  return where;
}

export async function listProducts(
  db: TenantClient,
  currencyCode: string,
  options: ListProductsOptions,
): Promise<Paginated<Product>> {
  // Prisma resolves a cursor by looking the row up; a stale or foreign id would
  // surface as an internal error instead of a bad request.
  if (options.cursor) {
    const anchor = await db.product.findFirst({
      where: { id: options.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const rows = await db.product.findMany({
    where: listWhere(options),
    include: PRODUCT_INCLUDE,
    orderBy: orderBy(options),
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, options.limit);
  return {
    data: page.map((row) => toProductDto(row, currencyCode)),
    nextCursor: rows.length > options.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

async function requireProduct(db: TenantClient, id: string): Promise<ProductRow> {
  const row = await db.product.findFirst({ where: { id }, include: PRODUCT_INCLUDE });
  // The tenant client already made another shop's row invisible, so "missing"
  // and "not yours" are the same 404 — which is what we want to leak.
  if (!row) throw notFound('Product');
  return row;
}

export async function getProduct(
  db: TenantClient,
  currencyCode: string,
  id: string,
): Promise<Product> {
  return toProductDto(await requireProduct(db, id), currencyCode);
}

/* -------------------------------------------------------------------------- */
/* Write                                                                        */
/* -------------------------------------------------------------------------- */

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/** Handle uniqueness is checked before the insert, so P2002 here is a race. */
function rethrowWrite(error: unknown): never {
  if (isUniqueViolation(error)) throw conflict('That handle is already taken.', 'handle');
  throw error;
}

export async function createProduct(
  db: TenantClient,
  shopId: string,
  currencyCode: string,
  input: CreateProductInput,
): Promise<Product> {
  const options = normalizeOptions(input.options);
  const resolved = resolveVariants<VariantPayload>(options, input.variants);
  const template = input.variants[0];
  assertVariantCurrencies(input.variants, currencyCode);
  const handle = await assignHandle(db, input.handle, input.title);

  try {
    const row = await db.product.create({
      data: {
        id: newId('product'),
        shopId,
        title: input.title,
        descriptionHtml: input.descriptionHtml ?? '',
        handle,
        status: input.status ?? 'draft',
        vendor: input.vendor ?? null,
        productType: input.productType ?? null,
        tags: input.tags,
        seoTitle: input.seo?.title ?? null,
        seoDescription: input.seo?.description ?? null,
        metadata: input.metadata as Prisma.InputJsonValue,
        options: { create: options.map((option) => optionColumns(option, shopId)) },
        variants: {
          create: resolved.map((variant) => ({
            id: newId('variant'),
            shopId,
            ...variantColumns(variant, template, currencyCode),
          })),
        },
        images: { create: input.images.map((image, i) => imageColumns(image, i, shopId)) },
      },
      include: PRODUCT_INCLUDE,
    });
    return toProductDto(row, currencyCode);
  } catch (error) {
    return rethrowWrite(error);
  }
}

/** An existing row seen as a caller payload, so an options-only edit keeps its attributes. */
const rowAsPayload = (row: VariantRow, currencyCode: string): VariantPayload => ({
  id: row.id,
  sku: row.sku,
  barcode: row.barcode,
  price: { amount: row.price, currencyCode },
  compareAtPrice: row.compareAtPrice === null ? null : { amount: row.compareAtPrice, currencyCode },
  optionValues: asOptionValues(row.optionValues),
  requiresShipping: row.requiresShipping,
  taxable: row.taxable,
  weightGrams: row.weightGrams,
  inventoryPolicy: row.inventoryPolicy,
});

/**
 * Pair every combination in the new matrix with the existing row it continues,
 * by explicit id first (the caller renamed an option value) and by option
 * signature otherwise (the caller regenerated the table from the options).
 * Whatever nothing claims is deleted.
 */
function planVariants(
  options: NormalizedOption[],
  resolved: ResolvedVariant<VariantPayload>[],
  existing: VariantRow[],
): {
  keep: Array<{ resolved: ResolvedVariant<VariantPayload>; row: VariantRow }>;
  create: ResolvedVariant<VariantPayload>[];
  remove: VariantRow[];
} {
  const byId = new Map(existing.map((row) => [row.id, row]));
  const bySignature = new Map<string, VariantRow>();
  for (const row of existing) {
    const key = optionSignature(options, asOptionValues(row.optionValues));
    if (!bySignature.has(key)) bySignature.set(key, row);
  }

  const claimed = new Set<string>();
  const keep: Array<{ resolved: ResolvedVariant<VariantPayload>; row: VariantRow }> = [];
  const create: ResolvedVariant<VariantPayload>[] = [];

  for (const variant of resolved) {
    const candidate =
      (variant.match?.id ? byId.get(variant.match.id) : undefined) ??
      bySignature.get(optionSignature(options, variant.optionValues));
    if (candidate && !claimed.has(candidate.id)) {
      claimed.add(candidate.id);
      keep.push({ resolved: variant, row: candidate });
    } else {
      create.push(variant);
    }
  }

  return { keep, create, remove: existing.filter((row) => !claimed.has(row.id)) };
}

export async function updateProduct(
  db: TenantClient,
  shopId: string,
  currencyCode: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  const existing = await requireProduct(db, id);

  // Renaming a product does NOT move its storefront URL — Shopify keeps the
  // handle until you edit it explicitly.
  const handle =
    input.handle === undefined
      ? undefined
      : await assignHandle(db, input.handle, input.title ?? existing.title, id);

  const touchesMatrix = input.options !== undefined || input.variants !== undefined;
  const options = input.options
    ? normalizeOptions(input.options)
    : existing.options.map((option) => ({
        name: option.name,
        position: option.position,
        values: option.values,
      }));
  // Omitting `variants` means "leave them alone": the existing rows stand in as
  // the payload so an options-only edit carries their prices across.
  const provided: VariantPayload[] =
    input.variants ?? existing.variants.map((row) => rowAsPayload(row, currencyCode));
  const template = provided[0];

  // Validated before the transaction opens, so a payload with one bad price
  // cannot leave the variant table half-written.
  assertVariantCurrencies(input.variants, currencyCode);

  // Derived only when the payload touches the matrix — a status-only edit must
  // not be able to trip the variant ceiling on a product that already exists.
  const plan = touchesMatrix
    ? planVariants(options, resolveVariants<VariantPayload>(options, provided), existing.variants)
    : null;

  try {
    await db.$transaction(async (tx) => {
      if (plan) {
        if (plan.remove.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: plan.remove.map((row) => row.id) } },
          });
        }
        for (const { resolved: variant, row } of plan.keep) {
          // A kept row the payload did not mention keeps its OWN values. The
          // template is for brand-new combinations only — falling back to it
          // here would reset prices and null skus on rows a partial `variants`
          // payload never touched.
          const match = variant.match ?? rowAsPayload(row, currencyCode);
          await tx.productVariant.update({
            where: { id: row.id },
            data: variantColumns({ ...variant, match }, template, currencyCode),
          });
        }
        if (plan.create.length > 0) {
          await tx.productVariant.createMany({
            data: plan.create.map((variant) => ({
              id: newId('variant'),
              shopId,
              productId: id,
              ...variantColumns(variant, template, currencyCode),
            })),
          });
        }
      }

      if (input.options !== undefined) {
        const byName = new Map(existing.options.map((option) => [option.name, option]));
        const wanted = new Set(options.map((option) => option.name));
        const stale = existing.options.filter((option) => !wanted.has(option.name));
        if (stale.length > 0) {
          await tx.productOption.deleteMany({ where: { id: { in: stale.map((o) => o.id) } } });
        }
        for (const option of options) {
          const current = byName.get(option.name);
          if (current) {
            await tx.productOption.update({
              where: { id: current.id },
              data: { position: option.position, values: option.values },
            });
          } else {
            await tx.productOption.create({
              data: { ...optionColumns(option, shopId), productId: id },
            });
          }
        }
      }

      if (input.images !== undefined) {
        // Wholesale replace. B2 owns media and will reconcile properly once
        // images are uploads rather than caller-supplied URLs.
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (input.images.length > 0) {
          await tx.productImage.createMany({
            data: input.images.map((image, i) => ({
              ...imageColumns(image, i, shopId),
              productId: id,
            })),
          });
        }
      }

      // Always written, so `updatedAt` moves even for a variants-only edit.
      await tx.product.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(handle !== undefined ? { handle } : {}),
          ...(input.descriptionHtml !== undefined
            ? { descriptionHtml: input.descriptionHtml }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.vendor !== undefined ? { vendor: input.vendor } : {}),
          ...(input.productType !== undefined ? { productType: input.productType } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.seo !== undefined
            ? { seoTitle: input.seo.title, seoDescription: input.seo.description }
            : {}),
          ...(input.metadata !== undefined
            ? { metadata: input.metadata as Prisma.InputJsonValue }
            : {}),
        },
      });
    });
  } catch (error) {
    rethrowWrite(error);
  }

  return getProduct(db, currencyCode, id);
}

/**
 * Shopify deletes outright: an order keeps its own snapshot of what was bought
 * (`OrderLineItem.title`, `.sku`, `.price`), which is exactly why those columns
 * are denormalized. Blocking the delete would be inventing a rule Shopify does
 * not have.
 */
export async function deleteProduct(db: TenantClient, id: string): Promise<void> {
  const existing = await db.product.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Product');
  await db.product.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Single variant (inline edits from the variants table)                        */
/* -------------------------------------------------------------------------- */

async function requireVariant(
  db: TenantClient,
  productId: string,
  variantId: string,
): Promise<VariantRow> {
  const row = await db.productVariant.findFirst({
    where: { id: variantId, productId },
    include: { inventoryLevels: { select: { available: true } } },
  });
  if (!row) throw notFound('Variant');
  return row;
}

export async function getVariant(
  db: TenantClient,
  currencyCode: string,
  productId: string,
  variantId: string,
): Promise<ProductVariant> {
  return toVariantDto(await requireVariant(db, productId, variantId), currencyCode);
}

export async function updateVariant(
  db: TenantClient,
  currencyCode: string,
  productId: string,
  variantId: string,
  input: UpdateVariantInput,
): Promise<ProductVariant> {
  const existing = await requireVariant(db, productId, variantId);
  assertCurrency(input.price, currencyCode, 'price');
  assertCurrency(input.compareAtPrice, currencyCode, 'compareAtPrice');

  // The admin echoes the whole variant back on an inline edit, so an UNCHANGED
  // optionValues is fine. Actually moving a variant to different option values
  // would desync it from the matrix; that edit belongs on the product, which
  // regenerates the table.
  if (
    input.optionValues !== undefined &&
    !sameOptionValues(input.optionValues, asOptionValues(existing.optionValues))
  ) {
    throw badRequest('Change option values by updating the product.', 'optionValues');
  }

  const row = await db.productVariant.update({
    where: { id: existing.id },
    data: {
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
      ...(input.price !== undefined ? { price: input.price.amount } : {}),
      ...(input.compareAtPrice !== undefined
        ? { compareAtPrice: input.compareAtPrice?.amount ?? null }
        : {}),
      ...(input.requiresShipping !== undefined ? { requiresShipping: input.requiresShipping } : {}),
      ...(input.taxable !== undefined ? { taxable: input.taxable } : {}),
      ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
      ...(input.inventoryPolicy !== undefined ? { inventoryPolicy: input.inventoryPolicy } : {}),
    },
    include: { inventoryLevels: { select: { available: true } } },
  });
  return toVariantDto(row, currencyCode);
}
