/**
 * B1 — products & variants API.
 *
 * Scope is the engine logic the product form (B5), the storefront (E1) and the
 * seed (H1) all depend on, against a real Postgres: option matrix → variant
 * set, PUT reconciliation, handle uniqueness, and the list query. Trivial
 * get/delete round-trips are deliberately absent (SPEC §14 — no CRUD sweeps).
 * General cross-tenant isolation belongs to A2's suite; the one exception here
 * is `?query=`, whose `OR` clause is the classic place a shop filter escapes.
 */
import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
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
/** A second tenant, holding a product deliberately named to match our searches. */
let neighbour: TestShop;

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

const PRODUCTS = '/admin/api/products';

function get(url: string) {
  return app.inject({ method: 'GET', url, headers: { cookie } });
}

function write(method: 'POST' | 'PUT' | 'DELETE', url: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    headers: { cookie, 'x-requested-with': CSRF_HEADER_VALUE },
    ...(payload === undefined ? {} : { payload }),
  });
}

/** POST a product and fail loudly with the API's error body if it did not create. */
async function createProduct(payload: Record<string, unknown>) {
  const response = await write('POST', PRODUCTS, payload);
  expect(response.statusCode, response.body).toBe(201);
  return response.json();
}

type VariantDto = {
  id: string;
  title: string;
  sku: string | null;
  position: number;
  price: { amount: number; currencyCode: string };
  optionValues: Record<string, string>;
};

const titles = (variants: VariantDto[]) => variants.map((v) => v.title);

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });

  neighbour = await createTestShop();
  const neighbourCookie = await sessionCookie(app, {
    shopId: neighbour.shopId,
    staffUserId: neighbour.ownerId,
  });
  const response = await app.inject({
    method: 'POST',
    url: PRODUCTS,
    headers: { cookie: neighbourCookie, 'x-requested-with': CSRF_HEADER_VALUE },
    payload: {
      title: 'Nimbus Fleece',
      vendor: 'Northwind',
      variants: [{ price: usd(1), sku: 'NIMBUS-QRZ-1' }],
    },
  });
  expect(response.statusCode, response.body).toBe(201);
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId, neighbour.shopId]);
});

describe('variant generation', () => {
  it('expands options into the cartesian product, in option order', async () => {
    const product = await createProduct({
      title: 'Matrix Tee',
      options: [
        { name: 'Size', position: 0, values: ['S', 'M'] },
        { name: 'Color', position: 1, values: ['Black', 'White'] },
      ],
      variants: [{ price: usd(2500) }],
    });

    // First option varies slowest, like Shopify's variants table.
    expect(titles(product.variants)).toEqual(['S / Black', 'S / White', 'M / Black', 'M / White']);
    expect(product.variants.map((v: VariantDto) => v.position)).toEqual([0, 1, 2, 3]);
    expect(product.variants[3].optionValues).toEqual({ Size: 'M', Color: 'White' });
    // A single supplied variant is the template for every generated combination.
    expect(product.variants.every((v: VariantDto) => v.price.amount === 2500)).toBe(true);
  });

  it('keeps the attributes of each supplied combination and templates the rest', async () => {
    const product = await createProduct({
      title: 'Templated Tee',
      options: [
        { name: 'Size', position: 0, values: ['S', 'M'] },
        { name: 'Color', position: 1, values: ['Black', 'White'] },
      ],
      variants: [
        { price: usd(2500), sku: 'TT-S-BLK', optionValues: { Size: 'S', Color: 'Black' } },
        { price: usd(2700), sku: 'TT-M-WHT', optionValues: { Size: 'M', Color: 'White' } },
      ],
    });

    const bySku = Object.fromEntries(product.variants.map((v: VariantDto) => [v.title, v]));
    expect(bySku['S / Black'].sku).toBe('TT-S-BLK');
    expect(bySku['S / Black'].price.amount).toBe(2500);
    expect(bySku['M / White'].price.amount).toBe(2700);
    // Unsupplied combinations inherit price from the first supplied variant and
    // must NOT inherit its sku — skus are unique per variant.
    expect(bySku['S / White'].price.amount).toBe(2500);
    expect(bySku['S / White'].sku).toBeNull();
  });

  it('gives an option-less product the single Default Title variant', async () => {
    const product = await createProduct({
      title: 'Simple Candle',
      variants: [{ price: usd(1999), sku: 'CANDLE-1' }],
    });

    expect(product.options).toEqual([]);
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].title).toBe('Default Title');
    expect(product.variants[0].sku).toBe('CANDLE-1');
  });

  it('rejects an option set that would explode the variant table', async () => {
    const response = await write('POST', PRODUCTS, {
      title: 'Too Many',
      options: [
        { name: 'A', position: 0, values: Array.from({ length: 11 }, (_, i) => `a${i}`) },
        { name: 'B', position: 1, values: Array.from({ length: 11 }, (_, i) => `b${i}`) },
      ],
      variants: [{ price: usd(100) }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });
});

describe('money', () => {
  it('refuses a fractional price rather than silently rounding it', async () => {
    const response = await write('POST', PRODUCTS, {
      title: 'Float Price',
      variants: [{ price: { amount: 19.99, currencyCode: 'USD' } }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].field).toContain('price');
  });
});

describe('handles', () => {
  it('slugifies the title and suffixes a clash the way Shopify does', async () => {
    const first = await createProduct({ title: 'Aurora Rain Jacket', variants: [] });
    const second = await createProduct({ title: 'Aurora Rain Jacket', variants: [] });
    const third = await createProduct({ title: 'Aurora Rain Jacket!', variants: [] });

    expect(first.handle).toBe('aurora-rain-jacket');
    expect(second.handle).toBe('aurora-rain-jacket-2');
    expect(third.handle).toBe('aurora-rain-jacket-3');
  });

  it('conflicts on an explicitly chosen handle instead of renaming it', async () => {
    await createProduct({ title: 'Chosen Handle', handle: 'chosen-handle', variants: [] });
    const response = await write('POST', PRODUCTS, {
      title: 'Another Product',
      handle: 'chosen-handle',
      variants: [],
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().errors[0]).toMatchObject({ code: 'conflict', field: 'handle' });
  });
});

describe('PUT reconciliation', () => {
  it('keeps surviving variant ids, creates new combinations, drops the rest', async () => {
    const created = await createProduct({
      title: 'Reconcile Tee',
      options: [
        { name: 'Size', position: 0, values: ['S', 'M'] },
        { name: 'Color', position: 1, values: ['Black', 'White'] },
      ],
      variants: [{ price: usd(3000) }],
    });
    const idFor = (list: VariantDto[], title: string) =>
      list.find((v) => v.title === title)?.id ?? null;
    const originalBlack = idFor(created.variants, 'S / Black');
    const originalWhite = idFor(created.variants, 'S / White');

    const response = await write('PUT', `${PRODUCTS}/${created.id}`, {
      options: [
        { name: 'Size', position: 0, values: ['S', 'M', 'L'] },
        { name: 'Color', position: 1, values: ['Black'] },
      ],
      variants: [{ price: usd(3000) }],
    });
    expect(response.statusCode, response.body).toBe(200);
    const updated = response.json();

    expect(titles(updated.variants)).toEqual(['S / Black', 'M / Black', 'L / Black']);
    // Same option values → same row. B5's inline edits and B4's inventory levels
    // both hang off these ids, so regenerating them would lose stock.
    expect(idFor(updated.variants, 'S / Black')).toBe(originalBlack);
    expect(idFor(updated.variants, 'L / Black')).not.toBe(originalWhite);
    expect(updated.variants.map((v: VariantDto) => v.id)).not.toContain(originalWhite);
    expect(updated.options.map((o: { values: string[] }) => o.values)).toEqual([
      ['S', 'M', 'L'],
      ['Black'],
    ]);
  });

  it('leaves variants alone when the payload does not mention them', async () => {
    const created = await createProduct({
      title: 'Partial Update Tee',
      options: [{ name: 'Size', position: 0, values: ['S', 'M'] }],
      variants: [{ price: usd(1500) }],
    });

    const response = await write('PUT', `${PRODUCTS}/${created.id}`, { status: 'active' });
    expect(response.statusCode, response.body).toBe(200);
    const updated = response.json();

    expect(updated.status).toBe('active');
    expect(updated.variants.map((v: VariantDto) => v.id)).toEqual(
      created.variants.map((v: VariantDto) => v.id),
    );
  });

  it('updates one variant inline without touching its siblings', async () => {
    const created = await createProduct({
      title: 'Inline Edit Tee',
      options: [{ name: 'Size', position: 0, values: ['S', 'M'] }],
      variants: [{ price: usd(1000) }],
    });
    const [small, medium] = created.variants as VariantDto[];

    const response = await write('PUT', `${PRODUCTS}/${created.id}/variants/${small.id}`, {
      price: usd(1200),
      sku: 'INLINE-S',
    });
    expect(response.statusCode, response.body).toBe(200);

    expect(response.json()).toMatchObject({ id: small.id, price: usd(1200), sku: 'INLINE-S' });
    const after = (await get(`${PRODUCTS}/${created.id}`)).json();
    const siblings = after.variants.find((v: VariantDto) => v.id === medium.id);
    expect(siblings.price.amount).toBe(1000);
  });
});

describe('list', () => {
  it('matches title, vendor and sku on ?query=', async () => {
    await createProduct({
      title: 'Nimbus Fleece',
      vendor: 'Northwind',
      variants: [{ price: usd(4500), sku: 'NIMBUS-QRZ-1' }],
    });

    const bySku = (await get(`${PRODUCTS}?query=nimbus-qrz`)).json();
    expect(bySku.data.map((p: { title: string }) => p.title)).toEqual(['Nimbus Fleece']);

    const byVendor = (await get(`${PRODUCTS}?query=northwind`)).json();
    expect(byVendor.data.map((p: { title: string }) => p.title)).toEqual(['Nimbus Fleece']);

    const byTitle = (await get(`${PRODUCTS}?query=nimbus%20fle`)).json();
    expect(byTitle.data.map((p: { title: string }) => p.title)).toEqual(['Nimbus Fleece']);

    const miss = (await get(`${PRODUCTS}?query=zzz-no-such-product`)).json();
    expect(miss).toEqual({ data: [], nextCursor: null });

    // The neighbouring shop owns an identically named product. `OR` is where a
    // shop filter classically escapes, so every match above must be exactly one.
    for (const body of [bySku, byVendor, byTitle]) {
      expect(body.data).toHaveLength(1);
    }
  });

  // Both the default (createdAt) and the admin index's own sort: with a
  // non-unique sort column the cursor only stays stable because of the id
  // tiebreak, so title is the case that would actually skip or repeat a row.
  it.each([
    ['createdAt', 'desc'],
    ['title', 'asc'],
  ])(
    'walks every product exactly once through the cursor, sorted by %s',
    async (sortKey, sortOrder) => {
      const sort = `sortKey=${sortKey}&sortOrder=${sortOrder}`;
      const all = (await get(`${PRODUCTS}?limit=250&${sort}`)).json();
      expect(all.data.length).toBeGreaterThan(2);

      const seen: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 50; page += 1) {
        const url: string = `${PRODUCTS}?limit=2&${sort}${cursor ? `&cursor=${cursor}` : ''}`;
        const body = (await get(url)).json();
        seen.push(...body.data.map((p: { id: string }) => p.id));
        cursor = body.nextCursor;
        if (!cursor) break;
      }

      expect(cursor).toBeNull();
      expect(seen).toEqual(all.data.map((p: { id: string }) => p.id));
      expect(new Set(seen).size).toBe(seen.length);
    },
  );

  it('filters by status', async () => {
    await createProduct({ title: 'Archived Thing', status: 'archived', variants: [] });

    const archived = (await get(`${PRODUCTS}?status=archived`)).json();
    expect(archived.data.map((p: { title: string }) => p.title)).toEqual(['Archived Thing']);
  });
});
