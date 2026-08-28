/**
 * B3 — collections API, manual and smart.
 *
 * The smart-rule translator is the part E1 (storefront collection pages), F1
 * (`featured-collection` section) and B6 (collections form) all sit on, so the
 * rule table below IS the spec: one case per (column, relation) pair we
 * support, plus the pairs we refuse. Everything runs against a real Postgres,
 * because "conditions become a `where` clause" is only true if Prisma agrees.
 *
 * Deliberately absent (SPEC §14 — no CRUD sweeps): get/delete round-trips,
 * per-field update echoes. General cross-tenant isolation is A2's suite; the
 * two cases here are the ones where a collection query could escape the shop —
 * a rule that matches a neighbour's product, and `?query=`.
 */
import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let cookie: string;
let neighbour: TestShop;

const COLLECTIONS = '/admin/api/collections';
const PRODUCTS = '/admin/api/products';

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

function get(url: string, as = cookie) {
  return app.inject({ method: 'GET', url, headers: { cookie: as } });
}

function write(method: 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown, as = cookie) {
  return app.inject({
    method,
    url,
    headers: { cookie: as, 'x-requested-with': CSRF_HEADER_VALUE },
    ...(payload === undefined ? {} : { payload }),
  });
}

type ProductDto = { id: string; title: string };
type CollectionDto = {
  id: string;
  title: string;
  handle: string;
  type: 'manual' | 'smart';
  sortOrder: string;
  productCount: number;
  ruleSet: { appliedDisjunctively: boolean; rules: unknown[] } | null;
};

/* -------------------------------------------------------------------------- */
/* Fixture                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Five products chosen so that every rule below has both a match and a
 * non-match, and so the null case (`Stratus Tee` has no vendor) is covered —
 * "vendor is not Northwind" must include a product with no vendor at all, the
 * way `NOT (vendor = 'Northwind')` in SQL does not.
 */
const CATALOG = [
  {
    key: 'jacket',
    title: 'Aurora Rain Jacket',
    vendor: 'Aurora Supply Co.',
    productType: 'Outerwear',
    tags: ['waterproof', 'new'],
    price: 12_000,
  },
  {
    key: 'pack',
    title: 'Aurora Trail Pack',
    vendor: 'Aurora Supply Co.',
    productType: 'Bags',
    tags: ['new'],
    price: 8_000,
  },
  {
    key: 'beanie',
    title: 'Nimbus Wool Beanie',
    vendor: 'Northwind',
    productType: 'Accessories',
    tags: ['sale'],
    price: 2_000,
  },
  {
    key: 'vest',
    title: 'Cirrus Down Vest',
    vendor: 'Northwind',
    productType: 'Outerwear',
    tags: ['sale', 'waterproof'],
    price: 15_000,
  },
  {
    key: 'tee',
    title: 'Stratus Tee',
    vendor: null,
    productType: 'Apparel',
    tags: [],
    price: 2_500,
  },
] as const;

type CatalogKey = (typeof CATALOG)[number]['key'];

const products = {} as Record<CatalogKey, ProductDto>;

async function createProduct(payload: Record<string, unknown>, as = cookie): Promise<ProductDto> {
  const response = await write('POST', PRODUCTS, payload, as);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}

async function createCollection(
  payload: Record<string, unknown>,
  expected = 201,
): Promise<CollectionDto> {
  const response = await write('POST', COLLECTIONS, payload);
  expect(response.statusCode, response.body).toBe(expected);
  return response.json();
}

/** Titles of a collection's members, in the order the API returned them. */
async function memberTitles(collectionId: string, query = ''): Promise<string[]> {
  const response = await get(`${COLLECTIONS}/${collectionId}/products${query}`);
  expect(response.statusCode, response.body).toBe(200);
  return response.json().data.map((product: ProductDto) => product.title);
}

/** A throwaway smart collection for one rule set, and the titles it resolves to. */
async function resolve(
  rules: Array<{ column: string; relation: string; condition: string }>,
  appliedDisjunctively = false,
): Promise<string[]> {
  const collection = await createCollection({
    title: `Rule probe ${rules.map((r) => `${r.column}-${r.relation}`).join(' ')}`,
    type: 'smart',
    sortOrder: 'title-asc',
    ruleSet: { appliedDisjunctively, rules },
  });
  return memberTitles(collection.id);
}

/** The status and error code of a rule set the API should refuse. */
async function reject(rule: {
  column: string;
  relation: string;
  condition: string;
}): Promise<{ status: number; code: string }> {
  const response = await write('POST', COLLECTIONS, {
    title: `Bad rule ${rule.column} ${rule.relation} ${rule.condition}`,
    type: 'smart',
    ruleSet: { rules: [rule] },
  });
  return { status: response.statusCode, code: response.json().errors?.[0]?.code };
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });

  for (const entry of CATALOG) {
    products[entry.key] = await createProduct({
      title: entry.title,
      status: 'active',
      vendor: entry.vendor,
      productType: entry.productType,
      tags: entry.tags,
      variants: [{ price: usd(entry.price) }],
    });
  }

  // A neighbouring shop whose product answers to the same rules and the same
  // `?query=`. Nothing this suite asks for may ever return it.
  neighbour = await createTestShop();
  const neighbourCookie = await sessionCookie(app, {
    shopId: neighbour.shopId,
    staffUserId: neighbour.ownerId,
  });
  await createProduct(
    {
      title: 'Aurora Ghost Jacket',
      status: 'active',
      vendor: 'Aurora Supply Co.',
      productType: 'Outerwear',
      tags: ['new'],
      variants: [{ price: usd(12_000) }],
    },
    neighbourCookie,
  );
  await write(
    'POST',
    COLLECTIONS,
    { title: 'Aurora Ghost Collection', type: 'manual' },
    neighbourCookie,
  );
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId, neighbour.shopId]);
});

/* -------------------------------------------------------------------------- */
/* Smart rules — one case per supported (column, relation) pair                 */
/* -------------------------------------------------------------------------- */

describe('smart rule translation', () => {
  it('matches text columns case-insensitively across every text relation', async () => {
    expect(await resolve([{ column: 'title', relation: 'contains', condition: 'aurora' }])).toEqual(
      ['Aurora Rain Jacket', 'Aurora Trail Pack'],
    );
    expect(
      await resolve([{ column: 'title', relation: 'starts_with', condition: 'nimbus' }]),
    ).toEqual(['Nimbus Wool Beanie']);
    expect(await resolve([{ column: 'title', relation: 'ends_with', condition: 'VEST' }])).toEqual([
      'Cirrus Down Vest',
    ]);
    expect(
      await resolve([{ column: 'title', relation: 'equals', condition: 'stratus tee' }]),
    ).toEqual(['Stratus Tee']);
    expect(
      await resolve([{ column: 'vendor', relation: 'equals', condition: 'northwind' }]),
    ).toEqual(['Cirrus Down Vest', 'Nimbus Wool Beanie']);
    // `type` is Shopify's name for the product type column.
    expect(await resolve([{ column: 'type', relation: 'equals', condition: 'Outerwear' }])).toEqual(
      ['Aurora Rain Jacket', 'Cirrus Down Vest'],
    );
  });

  it('includes rows with a NULL column in a negated text rule', async () => {
    // `vendor <> 'Northwind'` is NULL — and therefore false — for a product
    // with no vendor. Shopify's "is not" includes it; so does ours.
    expect(
      await resolve([{ column: 'vendor', relation: 'not_equals', condition: 'Northwind' }]),
    ).toEqual(['Aurora Rain Jacket', 'Aurora Trail Pack', 'Stratus Tee']);
    expect(
      await resolve([{ column: 'title', relation: 'not_contains', condition: 'aurora' }]),
    ).toEqual(['Cirrus Down Vest', 'Nimbus Wool Beanie', 'Stratus Tee']);
  });

  it('matches a whole tag, never a substring of one', async () => {
    expect(await resolve([{ column: 'tag', relation: 'equals', condition: 'sale' }])).toEqual([
      'Cirrus Down Vest',
      'Nimbus Wool Beanie',
    ]);
    expect(await resolve([{ column: 'tag', relation: 'not_equals', condition: 'sale' }])).toEqual([
      'Aurora Rain Jacket',
      'Aurora Trail Pack',
      'Stratus Tee',
    ]);
  });

  it('compares price in integer minor units', async () => {
    // 10_000 minor units is $100.00 — the landmine this suite exists to pin.
    expect(
      await resolve([{ column: 'price', relation: 'greater_than', condition: '10000' }]),
    ).toEqual(['Aurora Rain Jacket', 'Cirrus Down Vest']);
    expect(await resolve([{ column: 'price', relation: 'less_than', condition: '3000' }])).toEqual([
      'Nimbus Wool Beanie',
      'Stratus Tee',
    ]);
    expect(await resolve([{ column: 'price', relation: 'equals', condition: '8000' }])).toEqual([
      'Aurora Trail Pack',
    ]);
  });

  it('refuses a condition a column cannot answer, instead of matching nothing', async () => {
    // Every one of these would silently resolve to an empty collection if the
    // translator just dropped the clause it could not express.
    expect(await reject({ column: 'tag', relation: 'contains', condition: 'sal' })).toEqual({
      status: 400,
      code: 'invalid_request',
    });
    expect(await reject({ column: 'price', relation: 'contains', condition: '20' })).toEqual({
      status: 400,
      code: 'invalid_request',
    });
    expect(await reject({ column: 'title', relation: 'greater_than', condition: 'a' })).toEqual({
      status: 400,
      code: 'invalid_request',
    });
    // A price typed as dollars is the mistake the contract's `.describe()`
    // warns about; it must not become `NaN` in a where clause.
    expect(await reject({ column: 'price', relation: 'less_than', condition: '20.00' })).toEqual({
      status: 400,
      code: 'invalid_request',
    });
  });

  it('never reaches another shop, even for a rule that matches its products', async () => {
    // The neighbour's "Aurora Ghost Jacket" answers this rule exactly.
    expect(await resolve([{ column: 'title', relation: 'contains', condition: 'aurora' }])).toEqual(
      ['Aurora Rain Jacket', 'Aurora Trail Pack'],
    );
  });
});

describe('rule sets', () => {
  const outerwear = { column: 'type', relation: 'equals', condition: 'Outerwear' };
  const onSale = { column: 'tag', relation: 'equals', condition: 'sale' };

  it('intersects rules by default and unions them when applied disjunctively', async () => {
    expect(await resolve([outerwear, onSale], false)).toEqual(['Cirrus Down Vest']);
    expect(await resolve([outerwear, onSale], true)).toEqual([
      'Aurora Rain Jacket',
      'Cirrus Down Vest',
      'Nimbus Wool Beanie',
    ]);
  });

  it('combines a text rule with a price rule', async () => {
    expect(
      await resolve([
        { column: 'vendor', relation: 'equals', condition: 'Aurora Supply Co.' },
        { column: 'price', relation: 'greater_than', condition: '10000' },
      ]),
    ).toEqual(['Aurora Rain Jacket']);
  });

  it('refuses a smart collection with no rules rather than publishing the whole catalog', async () => {
    const response = await write('POST', COLLECTIONS, {
      title: 'Everything',
      type: 'smart',
      ruleSet: { rules: [] },
    });
    expect(response.statusCode, response.body).toBe(400);
  });

  it('refuses rules on a manual collection', async () => {
    const response = await write('POST', COLLECTIONS, {
      title: 'Confused',
      type: 'manual',
      ruleSet: { rules: [{ column: 'title', relation: 'contains', condition: 'a' }] },
    });
    expect(response.statusCode, response.body).toBe(400);
  });

  it('re-resolves membership on every read, with no materialization step', async () => {
    const collection = await createCollection({
      title: 'Everything tagged clearance',
      type: 'smart',
      sortOrder: 'title-asc',
      ruleSet: { rules: [{ column: 'tag', relation: 'equals', condition: 'clearance' }] },
    });
    expect(await memberTitles(collection.id)).toEqual([]);

    const response = await write('PUT', `${PRODUCTS}/${products.tee.id}`, {
      tags: ['clearance'],
    });
    expect(response.statusCode, response.body).toBe(200);

    expect(await memberTitles(collection.id)).toEqual(['Stratus Tee']);
    // …and the count on the collection row tracks it, without a job running.
    const reread = await get(`${COLLECTIONS}/${collection.id}`);
    expect(reread.json().productCount).toBe(1);

    await write('PUT', `${PRODUCTS}/${products.tee.id}`, { tags: [] });
  });
});

/* -------------------------------------------------------------------------- */
/* Manual membership                                                            */
/* -------------------------------------------------------------------------- */

describe('manual collections', () => {
  it('persists positions through add, reorder and remove', async () => {
    const collection = await createCollection({
      title: 'Staff picks',
      type: 'manual',
      productIds: [products.jacket.id, products.beanie.id, products.tee.id],
    });
    // Creation order is the initial position order.
    expect(await memberTitles(collection.id)).toEqual([
      'Aurora Rain Jacket',
      'Nimbus Wool Beanie',
      'Stratus Tee',
    ]);

    const reordered = await write('POST', `${COLLECTIONS}/${collection.id}/products`, {
      add: [products.vest.id],
      reorder: [
        { productId: products.tee.id, position: 0 },
        { productId: products.jacket.id, position: 1 },
        { productId: products.beanie.id, position: 2 },
        { productId: products.vest.id, position: 3 },
      ],
    });
    expect(reordered.statusCode, reordered.body).toBe(200);
    expect(await memberTitles(collection.id)).toEqual([
      'Stratus Tee',
      'Aurora Rain Jacket',
      'Nimbus Wool Beanie',
      'Cirrus Down Vest',
    ]);

    // Positions survive a round trip through the database, not just the reply.
    const removed = await write('POST', `${COLLECTIONS}/${collection.id}/products`, {
      remove: [products.jacket.id],
    });
    expect(removed.statusCode, removed.body).toBe(200);
    expect(await memberTitles(collection.id)).toEqual([
      'Stratus Tee',
      'Nimbus Wool Beanie',
      'Cirrus Down Vest',
    ]);
    expect(removed.json().productCount).toBe(3);
  });

  it('refuses membership edits on a smart collection', async () => {
    const collection = await createCollection({
      title: 'Smart no-touch',
      type: 'smart',
      ruleSet: { rules: [{ column: 'tag', relation: 'equals', condition: 'new' }] },
    });
    const response = await write('POST', `${COLLECTIONS}/${collection.id}/products`, {
      add: [products.tee.id],
    });
    expect(response.statusCode, response.body).toBe(400);
  });

  it('refuses to add another shop’s product', async () => {
    const neighbourCookie = await sessionCookie(app, {
      shopId: neighbour.shopId,
      staffUserId: neighbour.ownerId,
    });
    const ghost = await createProduct(
      { title: 'Ghost Widget', variants: [{ price: usd(100) }] },
      neighbourCookie,
    );
    const collection = await createCollection({ title: 'Borrowed goods', type: 'manual' });
    const response = await write('POST', `${COLLECTIONS}/${collection.id}/products`, {
      add: [ghost.id],
    });
    expect(response.statusCode, response.body).toBe(404);
  });
});

/* -------------------------------------------------------------------------- */
/* Sort orders                                                                  */
/* -------------------------------------------------------------------------- */

describe('sort order', () => {
  it('orders a smart collection by price and by title', async () => {
    const collection = await createCollection({
      title: 'Whole shop',
      type: 'smart',
      sortOrder: 'price-asc',
      ruleSet: { rules: [{ column: 'price', relation: 'greater_than', condition: '0' }] },
    });

    expect(await memberTitles(collection.id)).toEqual([
      'Nimbus Wool Beanie',
      'Stratus Tee',
      'Aurora Trail Pack',
      'Aurora Rain Jacket',
      'Cirrus Down Vest',
    ]);
    // The query parameter overrides the stored order — the storefront's
    // "Sort by" dropdown, without saving the collection.
    expect(await memberTitles(collection.id, '?sortOrder=price-desc')).toEqual([
      'Cirrus Down Vest',
      'Aurora Rain Jacket',
      'Aurora Trail Pack',
      'Stratus Tee',
      'Nimbus Wool Beanie',
    ]);
    expect(await memberTitles(collection.id, '?sortOrder=title-desc')).toEqual([
      'Stratus Tee',
      'Nimbus Wool Beanie',
      'Cirrus Down Vest',
      'Aurora Trail Pack',
      'Aurora Rain Jacket',
    ]);
  });

  it('ranks by units sold for best-selling, unsold products last', async () => {
    const orderId = newId('order');
    await dbAdmin.order.create({
      data: {
        id: orderId,
        shopId: shop.shopId,
        orderNumber: 9101,
        email: 'buyer@example.test',
        lineItems: {
          create: [
            {
              id: newId('lineItem'),
              shopId: shop.shopId,
              productId: products.tee.id,
              title: 'Stratus Tee',
              quantity: 7,
              price: 2_500,
            },
            {
              id: newId('lineItem'),
              shopId: shop.shopId,
              productId: products.beanie.id,
              title: 'Nimbus Wool Beanie',
              quantity: 3,
              price: 2_000,
            },
          ],
        },
      },
    });

    const collection = await createCollection({
      title: 'Bestsellers',
      type: 'smart',
      sortOrder: 'best-selling',
      ruleSet: { rules: [{ column: 'price', relation: 'less_than', condition: '9000' }] },
    });

    const titles = await memberTitles(collection.id);
    expect(titles.slice(0, 2)).toEqual(['Stratus Tee', 'Nimbus Wool Beanie']);
    expect(titles).toContain('Aurora Trail Pack');

    await dbAdmin.order.delete({ where: { id: orderId } });
  });

  it('pages a collection with an opaque cursor', async () => {
    const collection = await createCollection({
      title: 'Paged picks',
      type: 'manual',
      productIds: [products.jacket.id, products.pack.id, products.beanie.id, products.vest.id],
    });

    const first = await get(`${COLLECTIONS}/${collection.id}/products?limit=2`);
    const firstPage = first.json();
    expect(firstPage.data.map((p: ProductDto) => p.title)).toEqual([
      'Aurora Rain Jacket',
      'Aurora Trail Pack',
    ]);
    expect(firstPage.nextCursor).toBeTruthy();

    const second = await get(
      `${COLLECTIONS}/${collection.id}/products?limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    );
    const secondPage = second.json();
    expect(secondPage.data.map((p: ProductDto) => p.title)).toEqual([
      'Nimbus Wool Beanie',
      'Cirrus Down Vest',
    ]);
    expect(secondPage.nextCursor).toBeNull();

    const bogus = await get(`${COLLECTIONS}/${collection.id}/products?cursor=not-a-cursor`);
    expect(bogus.statusCode).toBe(400);
  });

  it('applies a sort order to a manual collection without losing its members', async () => {
    // A manual collection resolved by anything other than position goes down
    // the same path a smart one does, but through the JOIN rather than a rule
    // set — the storefront's "Sort by" on a hand-picked collection.
    const collection = await createCollection({
      title: 'Hand picked, alphabetised',
      type: 'manual',
      productIds: [products.vest.id, products.jacket.id, products.beanie.id],
    });

    expect(await memberTitles(collection.id, '?sortOrder=title-asc')).toEqual([
      'Aurora Rain Jacket',
      'Cirrus Down Vest',
      'Nimbus Wool Beanie',
    ]);
    expect(await memberTitles(collection.id, '?sortOrder=price-desc')).toEqual([
      'Cirrus Down Vest',
      'Aurora Rain Jacket',
      'Nimbus Wool Beanie',
    ]);
  });
});

/* -------------------------------------------------------------------------- */
/* Inventory rules (read-only against B4's tables)                              */
/* -------------------------------------------------------------------------- */

describe('inventory rules', () => {
  it('matches on stock held at a location', async () => {
    const locationId = newId('location');
    await dbAdmin.location.create({
      data: { id: locationId, shopId: shop.shopId, name: 'Rule test warehouse' },
    });
    const variants = await dbAdmin.productVariant.findMany({
      where: { productId: { in: [products.beanie.id, products.vest.id] } },
      select: { id: true, productId: true },
    });
    await dbAdmin.inventoryLevel.createMany({
      data: variants.map((variant) => ({
        id: newId('inventory'),
        shopId: shop.shopId,
        variantId: variant.id,
        locationId,
        available: variant.productId === products.beanie.id ? 2 : 40,
      })),
    });

    expect(
      await resolve([{ column: 'inventory_quantity', relation: 'less_than', condition: '5' }]),
    ).toEqual(['Nimbus Wool Beanie']);
    expect(
      await resolve([{ column: 'inventory_quantity', relation: 'greater_than', condition: '5' }]),
    ).toEqual(['Cirrus Down Vest']);

    await dbAdmin.location.delete({ where: { id: locationId } });
  });
});

/* -------------------------------------------------------------------------- */
/* Handles, list, index                                                         */
/* -------------------------------------------------------------------------- */

describe('handles and the index', () => {
  it('derives a unique handle and refuses a duplicate the merchant typed', async () => {
    const first = await createCollection({ title: 'Summer Sale', type: 'manual' });
    expect(first.handle).toBe('summer-sale');

    const second = await createCollection({ title: 'Summer Sale', type: 'manual' });
    expect(second.handle).toBe('summer-sale-2');

    const clash = await write('POST', COLLECTIONS, {
      title: 'Something else',
      type: 'manual',
      handle: 'summer-sale',
    });
    expect(clash.statusCode, clash.body).toBe(409);
  });

  it('searches by title within the shop only', async () => {
    await createCollection({ title: 'Aurora Ghost Collection', type: 'manual' });

    const response = await get(`${COLLECTIONS}?query=aurora ghost`);
    expect(response.statusCode, response.body).toBe(200);
    const titles = response.json().data.map((c: CollectionDto) => c.title);
    // The neighbour has a collection with exactly this title.
    expect(titles).toEqual(['Aurora Ghost Collection']);
  });

  it('filters the index by type and reports a product count for both kinds', async () => {
    const manual = await createCollection({
      title: 'Counted picks',
      type: 'manual',
      productIds: [products.jacket.id, products.vest.id],
    });
    const smart = await createCollection({
      title: 'Counted outerwear',
      type: 'smart',
      ruleSet: { rules: [{ column: 'type', relation: 'equals', condition: 'Outerwear' }] },
    });

    const response = await get(`${COLLECTIONS}?query=Counted&type=smart`);
    const page = response.json();
    expect(page.data.map((c: CollectionDto) => c.id)).toEqual([smart.id]);
    expect(page.data[0].productCount).toBe(2);

    const both = await get(`${COLLECTIONS}?query=Counted`);
    const byId = new Map<string, number>(
      both.json().data.map((c: CollectionDto) => [c.id, c.productCount]),
    );
    expect(byId.get(manual.id)).toBe(2);
    expect(byId.get(smart.id)).toBe(2);
  });

  it('converts a manual collection to smart, dropping its manual members', async () => {
    const collection = await createCollection({
      title: 'Converted',
      type: 'manual',
      productIds: [products.tee.id],
    });

    const response = await write('PUT', `${COLLECTIONS}/${collection.id}`, {
      type: 'smart',
      ruleSet: { rules: [{ column: 'type', relation: 'equals', condition: 'Outerwear' }] },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().type).toBe('smart');
    expect(await memberTitles(collection.id)).toEqual(
      expect.arrayContaining(['Aurora Rain Jacket', 'Cirrus Down Vest']),
    );
    expect(await memberTitles(collection.id)).not.toContain('Stratus Tee');
  });
});

/* -------------------------------------------------------------------------- */
/* Rule preview (B6's condition builder)                                        */
/* -------------------------------------------------------------------------- */

describe('rule preview', () => {
  // The admin's smart-collection form shows what a rule set will match BEFORE
  // it is saved. Without this the form would have to re-implement the rule
  // translator in the browser, and the two would drift.
  const preview = (body: Record<string, unknown>) => write('POST', `${COLLECTIONS}/preview`, body);

  it('resolves an unsaved rule set without creating anything', async () => {
    const before = (await get(`${COLLECTIONS}?limit=250`)).json().data.length;

    const response = await preview({
      ruleSet: { rules: [{ column: 'vendor', relation: 'equals', condition: 'Northwind' }] },
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().data.map((p: ProductDto) => p.title)).toEqual([
      'Cirrus Down Vest',
      'Nimbus Wool Beanie',
    ]);
    // Nothing was persisted — a preview is a read.
    expect((await get(`${COLLECTIONS}?limit=250`)).json().data.length).toBe(before);
  });

  it('applies the same disjunction the saved collection would', async () => {
    const rules = [
      { column: 'vendor', relation: 'equals', condition: 'Northwind' },
      { column: 'tag', relation: 'equals', condition: 'new' },
    ];

    const all = (await preview({ ruleSet: { appliedDisjunctively: false, rules } })).json();
    const any = (await preview({ ruleSet: { appliedDisjunctively: true, rules } })).json();

    expect(any.data.length).toBeGreaterThan(all.data.length);
  });

  it('refuses an impossible column/relation pair, like saving does', async () => {
    const response = await preview({
      ruleSet: { rules: [{ column: 'tag', relation: 'contains', condition: 'new' }] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });

  it('never previews another shop’s products', async () => {
    const response = await preview({
      ruleSet: { rules: [{ column: 'vendor', relation: 'equals', condition: 'Northwind' }] },
    });
    const titles = response.json().data.map((p: ProductDto) => p.title);
    // The neighbour owns a product with the same vendor (fixture below).
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(CATALOG.some((c) => c.title === title)).toBe(true);
    }
  });
});
