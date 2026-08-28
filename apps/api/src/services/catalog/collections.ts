/**
 * Collections, manual and smart (SPEC §7). Owner: WS-B.
 *
 * The load-bearing idea: **a smart collection is a `where` clause, not a
 * materialized list.** Rules translate to Prisma filters and membership is
 * resolved on read, so a page of 24 products costs one indexed query instead of
 * loading the catalog to filter it in memory — and there is no republishing job
 * to be stale.
 *
 * Two consequences worth knowing before you edit this file:
 *
 *   - A (column, relation) pair we cannot express as a filter is a 400, never a
 *     dropped clause. "Tag contains 'sal'" has no array-substring operator in
 *     Postgres; silently ignoring it would publish a collection that quietly
 *     means something else.
 *   - Product rows are read through `services/catalog/products.ts`, so a
 *     collection page and the products index return byte-identical DTOs.
 *
 * `price` conditions are integer minor units (SPEC §5): `2000` is $20.00. The
 * contract's `.describe()` says so, and `intCondition` refuses `20.00` rather
 * than letting a `NaN` reach a where clause.
 */
import { newId } from '@merchant/config/ids';
import type {
  Collection,
  CollectionRule,
  CollectionSortOrder,
  CreateCollectionInput,
  UpdateCollectionInput,
  UpdateCollectionProductsInput,
} from '@merchant/contracts/collections';
import { collectionRuleSetSchema, collectionSchema } from '@merchant/contracts/collections';
import type { Paginated } from '@merchant/contracts/common';
import type { Product } from '@merchant/contracts/products';
import { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { handleCandidates, handleFromTitle } from './handles.ts';
import { productsByIds, productsMatching } from './products.ts';

type RuleSet = { appliedDisjunctively: boolean; rules: CollectionRule[] };

/* -------------------------------------------------------------------------- */
/* Rule → Prisma where                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Assignable to both `StringFilter` and `StringNullableFilter`, so one builder
 * serves `title` (never null) and `vendor` / `productType` (nullable).
 */
type TextMatch = {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  mode: 'insensitive';
};

const NEGATED = new Set(['not_equals', 'not_contains']);

const unsupported = (rule: CollectionRule) =>
  badRequest(
    `A "${rule.column}" condition cannot use "${rule.relation}".`,
    'ruleSet.rules.relation',
  );

/** Text relations, case-insensitive like Shopify's condition builder. */
function textMatch(rule: CollectionRule): TextMatch {
  const value = rule.condition;
  switch (rule.relation) {
    case 'equals':
    case 'not_equals':
      return { equals: value, mode: 'insensitive' };
    case 'contains':
    case 'not_contains':
      return { contains: value, mode: 'insensitive' };
    case 'starts_with':
      return { startsWith: value, mode: 'insensitive' };
    case 'ends_with':
      return { endsWith: value, mode: 'insensitive' };
    default:
      throw unsupported(rule);
  }
}

/**
 * A negated rule must include rows where the column is NULL: SQL's
 * `vendor <> 'Northwind'` is NULL — and therefore not true — for a product with
 * no vendor, but "vendor is not Northwind" plainly describes it.
 */
function nullableText(
  column: 'vendor' | 'productType',
  rule: CollectionRule,
): Prisma.ProductWhereInput {
  const match = textMatch(rule);
  if (!NEGATED.has(rule.relation)) return { [column]: match };
  return { OR: [{ [column]: null }, { NOT: { [column]: match } }] };
}

/** `2000` means $20.00. A decimal is the merchant's mistake, not a rounding job. */
function intCondition(rule: CollectionRule): number {
  if (!/^-?\d+$/.test(rule.condition.trim())) {
    throw badRequest(
      rule.column === 'price'
        ? 'A price condition is a whole number of minor units — 2000 for $20.00.'
        : 'An inventory condition is a whole number of units.',
      'ruleSet.rules.condition',
    );
  }
  return Number(rule.condition.trim());
}

function intMatch(rule: CollectionRule): Prisma.IntFilter {
  const value = intCondition(rule);
  switch (rule.relation) {
    case 'equals':
    case 'not_equals':
      return { equals: value };
    case 'greater_than':
      return { gt: value };
    case 'less_than':
      return { lt: value };
    default:
      throw unsupported(rule);
  }
}

/** `NOT { some }` is "no variant matches", which is what "is not" means here. */
const negatable = (rule: CollectionRule, clause: Prisma.ProductWhereInput) =>
  NEGATED.has(rule.relation) ? { NOT: clause } : clause;

function ruleToWhere(rule: CollectionRule): Prisma.ProductWhereInput {
  switch (rule.column) {
    case 'title': {
      const match = textMatch(rule);
      return NEGATED.has(rule.relation) ? { NOT: { title: match } } : { title: match };
    }
    case 'vendor':
      return nullableText('vendor', rule);
    // Shopify calls the product-type column "type" in the condition builder.
    case 'type':
      return nullableText('productType', rule);
    case 'tag':
      // `tags` is a text[]; Postgres has no substring operator over one, so the
      // relations that would need it are refused rather than approximated.
      if (rule.relation !== 'equals' && rule.relation !== 'not_equals') throw unsupported(rule);
      return negatable(rule, { tags: { has: rule.condition } });
    case 'price':
      // A product is in the collection when ANY of its variants matches, which
      // is how a price filter reads on a product grid.
      return negatable(rule, { variants: { some: { price: intMatch(rule) } } });
    case 'inventory_quantity':
      // Stock held at a single location. Summing across locations is not
      // expressible as a relation filter, and per-location is the number the
      // merchant sees in the inventory table (DECISIONS.md).
      return negatable(rule, {
        variants: { some: { inventoryLevels: { some: { available: intMatch(rule) } } } },
      });
  }
}

/**
 * The whole rule set as one `where`. Exported so E1's storefront collection
 * page and F3's AI builder can resolve a rule set without going through HTTP.
 */
export function smartCollectionWhere(ruleSet: RuleSet): Prisma.ProductWhereInput {
  const clauses = ruleSet.rules.map(ruleToWhere);
  // Belt and braces: a smart collection with no rules is refused on write, and
  // if one ever existed it must resolve to nothing rather than the catalog.
  if (clauses.length === 0) return { id: { in: [] } };
  return ruleSet.appliedDisjunctively ? { OR: clauses } : { AND: clauses };
}

/* -------------------------------------------------------------------------- */
/* Row shapes and DTO mapping                                                   */
/* -------------------------------------------------------------------------- */

const COLLECTION_INCLUDE = {
  _count: { select: { products: true } },
} satisfies Prisma.CollectionInclude;

type CollectionRow = Prisma.CollectionGetPayload<{ include: typeof COLLECTION_INCLUDE }>;

/** A stored rule set is JSON; parsing it here means a bad row fails loudly. */
function parseRuleSet(value: Prisma.JsonValue): RuleSet | null {
  if (value === null || value === undefined) return null;
  return collectionRuleSetSchema.parse(value);
}

function membershipWhere(row: CollectionRow): Prisma.ProductWhereInput {
  if (row.type === 'manual') return { collections: { some: { collectionId: row.id } } };
  const ruleSet = parseRuleSet(row.ruleSet);
  return ruleSet ? smartCollectionWhere(ruleSet) : { id: { in: [] } };
}

/**
 * `productCount` is derived, never stored: for a manual collection it is the
 * join count Prisma already returns, for a smart one a `COUNT(*)` over the same
 * where clause the products endpoint uses. Nothing to keep in sync.
 */
async function productCount(db: TenantClient, row: CollectionRow): Promise<number> {
  if (row.type === 'manual') return row._count.products;
  return db.product.count({ where: membershipWhere(row) });
}

function toCollectionDto(row: CollectionRow, count: number): Collection {
  return collectionSchema.parse({
    id: row.id,
    title: row.title,
    handle: row.handle,
    descriptionHtml: row.descriptionHtml,
    type: row.type,
    ruleSet: parseRuleSet(row.ruleSet),
    sortOrder: row.sortOrder,
    imageUrl: row.imageUrl,
    seo: { title: row.seoTitle, description: row.seoDescription },
    productCount: count,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

const hydrate = async (db: TenantClient, row: CollectionRow): Promise<Collection> =>
  toCollectionDto(row, await productCount(db, row));

/* -------------------------------------------------------------------------- */
/* Handles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Same rules as products (`handles.ts`), against the collections table: an
 * explicit handle is honoured or refused, a derived one walks `-2`, `-3` …
 * The `featured-collection` theme section addresses collections by handle, so
 * these have to be as stable and as unique as a product's.
 */
async function assignHandle(
  db: TenantClient,
  desired: string | undefined,
  title: string,
  excludeId?: string,
): Promise<string> {
  const notSelf = excludeId ? { id: { not: excludeId } } : {};

  if (desired) {
    const taken = await db.collection.findFirst({
      where: { handle: desired, ...notSelf },
      select: { id: true },
    });
    if (taken) throw conflict('Another collection already uses that handle.', 'handle');
    return desired;
  }

  const candidates = handleCandidates(handleFromTitle(title));
  const taken = await db.collection.findMany({
    where: { handle: { in: candidates }, ...notSelf },
    select: { handle: true },
  });
  const used = new Set(taken.map((row) => row.handle));
  const free = candidates.find((candidate) => !used.has(candidate));
  if (!free) throw conflict('Could not derive a unique handle for that title.', 'handle');
  return free;
}

/* -------------------------------------------------------------------------- */
/* Input validation                                                             */
/* -------------------------------------------------------------------------- */

type ResolvedShape = { type: 'manual' | 'smart'; ruleSet: RuleSet | null };

/**
 * The one invariant that keeps both kinds honest: a smart collection has rules
 * and a manual one does not. A smart collection with an empty rule set would
 * publish the entire catalog under whatever title the merchant typed.
 */
function resolveShape(type: 'manual' | 'smart', ruleSet: RuleSet | null): ResolvedShape {
  if (type === 'smart') {
    if (!ruleSet || ruleSet.rules.length === 0) {
      throw badRequest('A smart collection needs at least one condition.', 'ruleSet');
    }
    // Translating now means an unsupported condition is refused on save, where
    // the merchant can still fix it, rather than on every later read.
    smartCollectionWhere(ruleSet);
    return { type, ruleSet };
  }
  if (ruleSet && ruleSet.rules.length > 0) {
    throw badRequest('Only a smart collection has conditions.', 'ruleSet');
  }
  return { type, ruleSet: null };
}

/**
 * `manual` sort order means "the positions the merchant dragged", which a smart
 * collection has none of. Shopify does not offer the option there; a payload
 * that carries it anyway (the contract's default) gets newest-first.
 */
const resolveSortOrder = (sortOrder: CollectionSortOrder, type: 'manual' | 'smart') =>
  type === 'smart' && sortOrder === 'manual' ? 'created-desc' : sortOrder;

/** Membership is by id, and an id from another shop is simply not found here. */
async function assertProductsExist(db: TenantClient, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const found = await db.product.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (found.length !== unique.length) throw notFound('Product');
}

/* -------------------------------------------------------------------------- */
/* Read                                                                         */
/* -------------------------------------------------------------------------- */

export type ListCollectionsOptions = {
  limit: number;
  cursor?: string;
  query?: string;
  type?: 'manual' | 'smart';
};

export async function listCollections(
  db: TenantClient,
  options: ListCollectionsOptions,
): Promise<Paginated<Collection>> {
  if (options.cursor) {
    const anchor = await db.collection.findFirst({
      where: { id: options.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const where: Prisma.CollectionWhereInput = {};
  if (options.type) where.type = options.type;
  const search = options.query?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { handle: { contains: search, mode: 'insensitive' } },
    ];
  }

  const rows = await db.collection.findMany({
    where,
    include: COLLECTION_INCLUDE,
    // Alphabetical, like Shopify's collections index. The id tiebreak is what
    // makes the cursor stable when two collections share a title.
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, options.limit);
  return {
    // Smart collections cost one COUNT each; the admin pages at 50 and the
    // counts are independent, so they run together rather than in series.
    data: await Promise.all(page.map((row) => hydrate(db, row))),
    nextCursor: rows.length > options.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

async function requireCollection(db: TenantClient, id: string): Promise<CollectionRow> {
  const row = await db.collection.findFirst({ where: { id }, include: COLLECTION_INCLUDE });
  if (!row) throw notFound('Collection');
  return row;
}

export async function getCollection(db: TenantClient, id: string): Promise<Collection> {
  return hydrate(db, await requireCollection(db, id));
}

/* -------------------------------------------------------------------------- */
/* Members                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The members endpoint pages by offset behind an opaque cursor.
 *
 * SPEC §5 mandates the `?cursor=` shape, not what is inside it — and here it has
 * to be an offset: the sort key can be a related aggregate (cheapest variant,
 * units sold), which no single row id can anchor. A collection page is tens of
 * rows, so the offset costs nothing, and the opacity means this can become a
 * keyset cursor later without touching a caller.
 */
const encodeOffset = (offset: number): string =>
  Buffer.from(`offset:${offset}`, 'utf8').toString('base64url');

/** Postgres takes `OFFSET` as a signed 32-bit int; past that it is a 500. */
const MAX_OFFSET = 2_000_000_000;

function decodeOffset(cursor: string | undefined): number {
  if (!cursor) return 0;
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const match = /^offset:(\d+)$/.exec(decoded);
  const offset = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(offset) || offset > MAX_OFFSET) {
    throw badRequest('Unknown cursor.', 'cursor');
  }
  return offset;
}

/** Products ranked by units sold, unsold ones last in newest-first order. */
async function bestSellingIds(
  db: TenantClient,
  where: Prisma.ProductWhereInput,
): Promise<string[]> {
  // The only sort order that needs the collection's full id list: a product
  // with no sales does not appear in the aggregate at all, so it cannot be
  // paged from it. Ids only — no product rows are loaded until the page is cut.
  const rows = await db.product.findMany({
    where,
    select: { id: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return ids;

  const sold = await db.orderLineItem.groupBy({
    by: ['productId'],
    where: { productId: { in: ids } },
    _sum: { quantity: true },
  });
  const units = new Map(sold.map((group) => [group.productId, group._sum.quantity ?? 0]));
  // Array.prototype.sort is stable, so ties keep the newest-first order above.
  return ids.sort((a, b) => (units.get(b) ?? 0) - (units.get(a) ?? 0));
}

/** Product ids ordered by their cheapest variant — the storefront's price sort. */
async function priceSortedIds(
  db: TenantClient,
  where: Prisma.ProductWhereInput,
  direction: 'asc' | 'desc',
  skip: number,
  take: number,
): Promise<string[]> {
  const groups = await db.productVariant.groupBy({
    by: ['productId'],
    where: { product: where },
    _min: { price: true },
    orderBy: [{ _min: { price: direction } }, { productId: direction }],
    skip,
    take,
  });
  return groups.map((group) => group.productId);
}

export type ListCollectionProductsOptions = {
  limit: number;
  cursor?: string;
  sortOrder?: CollectionSortOrder;
};

export async function listCollectionProducts(
  db: TenantClient,
  currencyCode: string,
  id: string,
  options: ListCollectionProductsOptions,
): Promise<Paginated<Product>> {
  const row = await requireCollection(db, id);
  const where = membershipWhere(row);
  const offset = decodeOffset(options.cursor);
  // One more than the page, so "is there a next page" needs no COUNT.
  const take = options.limit + 1;

  const requested = options.sortOrder ?? (row.sortOrder as CollectionSortOrder);
  const sortOrder = resolveSortOrder(requested, row.type === 'smart' ? 'smart' : 'manual');

  let products: Product[];
  switch (sortOrder) {
    case 'manual': {
      const members = await db.collectionProduct.findMany({
        where: { collectionId: id },
        orderBy: [{ position: 'asc' }, { productId: 'asc' }],
        select: { productId: true },
        skip: offset,
        take,
      });
      products = await productsByIds(
        db,
        currencyCode,
        members.map((member) => member.productId),
      );
      break;
    }
    case 'best-selling': {
      const ranked = await bestSellingIds(db, where);
      products = await productsByIds(db, currencyCode, ranked.slice(offset, offset + take));
      break;
    }
    case 'price-asc':
    case 'price-desc': {
      const direction = sortOrder === 'price-asc' ? 'asc' : 'desc';
      const ids = await priceSortedIds(db, where, direction, offset, take);
      products = await productsByIds(db, currencyCode, ids);
      break;
    }
    default: {
      const direction = sortOrder === 'title-desc' ? 'desc' : 'asc';
      const orderBy: Prisma.ProductOrderByWithRelationInput[] =
        sortOrder === 'created-desc'
          ? [{ createdAt: 'desc' }, { id: 'desc' }]
          : [{ title: direction }, { id: direction }];
      products = await productsMatching(db, currencyCode, { where, orderBy, skip: offset, take });
    }
  }

  const page = products.slice(0, options.limit);
  return {
    data: page,
    nextCursor: products.length > options.limit ? encodeOffset(offset + options.limit) : null,
  };
}

/**
 * The products an unsaved rule set matches, for the admin's condition builder.
 *
 * Goes through exactly the same translator a saved smart collection does, so a
 * preview can never promise something the collection would not deliver. An
 * unsupported condition is refused here the way it is refused on save, rather
 * than quietly matching nothing.
 */
export async function previewSmartCollection(
  db: TenantClient,
  currencyCode: string,
  ruleSet: RuleSet,
  limit: number,
): Promise<Paginated<Product>> {
  if (ruleSet.rules.length === 0) {
    throw badRequest('Add a condition to see what it matches.', 'ruleSet');
  }
  const where = smartCollectionWhere(ruleSet);
  const products = await productsMatching(db, currencyCode, {
    where,
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
    skip: 0,
    take: limit + 1,
  });
  return {
    data: products.slice(0, limit),
    // A preview is a peek, not a paginated list: the form shows the first page
    // and a count, so the cursor is deliberately always null.
    nextCursor: null,
  };
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

/** A `Json?` column: clearing it needs `DbNull`, not a JSON `null` literal. */
const ruleSetColumn = (
  ruleSet: RuleSet | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =>
  ruleSet === null ? Prisma.DbNull : (ruleSet as unknown as Prisma.InputJsonValue);

/**
 * Join rows for a member list, in selection order.
 *
 * `collectionId` is deliberately absent: Prisma refuses it inside a nested
 * `createMany` (the parent supplies it), so the standalone calls add it and the
 * nested one does not. `shopId` is passed for Prisma's types even though the
 * tenant extension stamps it anyway (AGENT-LOG, WS-D).
 */
const memberRows = (shopId: string, productIds: string[], from = 0) =>
  productIds.map((productId, index) => ({ shopId, productId, position: from + index }));

const memberRowsIn = (shopId: string, collectionId: string, productIds: string[], from = 0) =>
  memberRows(shopId, productIds, from).map((row) => ({ ...row, collectionId }));

export async function createCollection(
  db: TenantClient,
  shopId: string,
  input: CreateCollectionInput,
): Promise<Collection> {
  const shape = resolveShape(input.type, input.ruleSet ?? null);
  const productIds = [...new Set(input.productIds)];
  if (shape.type === 'smart' && productIds.length > 0) {
    throw badRequest('A smart collection selects its products by condition.', 'productIds');
  }
  await assertProductsExist(db, productIds);

  const handle = await assignHandle(db, input.handle, input.title);
  const id = newId('collection');

  try {
    const row = await db.collection.create({
      data: {
        id,
        shopId,
        title: input.title,
        handle,
        descriptionHtml: input.descriptionHtml ?? '',
        type: shape.type,
        ruleSet: ruleSetColumn(shape.ruleSet),
        sortOrder: resolveSortOrder(input.sortOrder ?? 'manual', shape.type),
        imageUrl: input.imageUrl ?? null,
        seoTitle: input.seo?.title ?? null,
        seoDescription: input.seo?.description ?? null,
        // Selection order is the initial hand-sorted order, like dropping
        // products into a Shopify manual collection one at a time.
        products: { createMany: { data: memberRows(shopId, productIds) } },
      },
      include: COLLECTION_INCLUDE,
    });
    return hydrate(db, row);
  } catch (error) {
    return rethrowWrite(error);
  }
}

export async function updateCollection(
  db: TenantClient,
  shopId: string,
  id: string,
  input: UpdateCollectionInput,
): Promise<Collection> {
  const existing = await requireCollection(db, id);

  const type = input.type ?? (existing.type as 'manual' | 'smart');
  const ruleSet =
    input.ruleSet !== undefined ? (input.ruleSet ?? null) : parseRuleSet(existing.ruleSet);
  const shape = resolveShape(type, ruleSet);

  // Renaming a collection does NOT move its storefront URL, and the theme's
  // `featured-collection` section addresses it by handle — so the handle only
  // changes when the merchant edits it explicitly.
  const handle =
    input.handle === undefined
      ? undefined
      : await assignHandle(db, input.handle, input.title ?? existing.title, id);

  const productIds = input.productIds ? [...new Set(input.productIds)] : undefined;
  if (shape.type === 'smart' && productIds && productIds.length > 0) {
    throw badRequest('A smart collection selects its products by condition.', 'productIds');
  }
  if (productIds) await assertProductsExist(db, productIds);

  const sortOrder =
    input.sortOrder !== undefined
      ? resolveSortOrder(input.sortOrder, shape.type)
      : resolveSortOrder(existing.sortOrder as CollectionSortOrder, shape.type);

  try {
    await db.$transaction(async (tx) => {
      // Converting to smart drops the hand-picked members: they no longer
      // decide anything, and leaving them would resurrect a stale list if the
      // collection were ever converted back.
      if (shape.type === 'smart' || productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
      }
      if (shape.type === 'manual' && productIds && productIds.length > 0) {
        await tx.collectionProduct.createMany({ data: memberRowsIn(shopId, id, productIds) });
      }

      await tx.collection.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(handle !== undefined ? { handle } : {}),
          ...(input.descriptionHtml !== undefined
            ? { descriptionHtml: input.descriptionHtml }
            : {}),
          type: shape.type,
          ruleSet: ruleSetColumn(shape.ruleSet),
          sortOrder,
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.seo !== undefined
            ? { seoTitle: input.seo.title, seoDescription: input.seo.description }
            : {}),
        },
      });
    });
  } catch (error) {
    rethrowWrite(error);
  }

  return getCollection(db, id);
}

export async function deleteCollection(db: TenantClient, id: string): Promise<void> {
  const existing = await db.collection.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Collection');
  // CollectionProduct cascades; products themselves are untouched.
  await db.collection.delete({ where: { id } });
}

/**
 * Add / remove / reorder the members of a manual collection.
 *
 * Applied in that order on purpose: the admin's "add products" dialog sends the
 * new ids and the full running order in one request, so a reorder has to be
 * able to name a product the same payload just added.
 */
export async function updateCollectionProducts(
  db: TenantClient,
  shopId: string,
  id: string,
  input: UpdateCollectionProductsInput,
): Promise<Collection> {
  const collection = await requireCollection(db, id);
  if (collection.type !== 'manual') {
    throw badRequest('A smart collection selects its products by condition.', 'type');
  }
  await assertProductsExist(db, input.add);

  await db.$transaction(async (tx) => {
    if (input.add.length > 0) {
      const [existing, last] = await Promise.all([
        tx.collectionProduct.findMany({
          where: { collectionId: id, productId: { in: input.add } },
          select: { productId: true },
        }),
        tx.collectionProduct.findFirst({
          where: { collectionId: id },
          orderBy: { position: 'desc' },
          select: { position: true },
        }),
      ]);
      const already = new Set(existing.map((row) => row.productId));
      const fresh = [...new Set(input.add)].filter((productId) => !already.has(productId));
      if (fresh.length > 0) {
        // Appended after the current last position — Shopify drops new
        // products at the bottom of a hand-sorted collection.
        await tx.collectionProduct.createMany({
          data: memberRowsIn(shopId, id, fresh, (last?.position ?? -1) + 1),
        });
      }
    }

    if (input.remove.length > 0) {
      await tx.collectionProduct.deleteMany({
        where: { collectionId: id, productId: { in: input.remove } },
      });
    }

    for (const entry of input.reorder) {
      // updateMany, so a position for a product that is not (or no longer) a
      // member is a no-op instead of a 404 on an otherwise valid drag.
      await tx.collectionProduct.updateMany({
        where: { collectionId: id, productId: entry.productId },
        data: { position: entry.position },
      });
    }
  });

  return getCollection(db, id);
}
