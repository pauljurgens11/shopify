/**
 * E1 — storefront read API + cart service.
 *
 * These routes are unauthenticated and resolved purely from the Host header, so
 * the things worth testing are the ones that would be invisible in review and
 * fatal in the demo: a draft product leaking onto a live storefront, a cart
 * token working against the wrong shop, a cart total drifting off integer
 * money, and stock rules that let a shopper buy what is not there.
 *
 * Deliberately absent: per-endpoint CRUD round-trips (SPEC §14 forbids them)
 * and general cross-tenant sweeps, which are A2's suite. What is here is the
 * behaviour E2/E3/E4 build on and the seed demonstrates.
 */
import { CART_COOKIE, STOREFRONT_CACHE_CONTROL } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { presetThemeDoc } from '@merchant/theme-engine/presets';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signThemePreview } from '../src/services/storefront/theme.ts';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let neighbour: TestShop;

/** Variant ids the tests reach for, filled by the fixture below. */
const v: Record<string, string> = {};
let locationId: string;
let publishedThemeId: string;
let draftThemeId: string;

const host = (s: TestShop) => `${s.slug}.lvh.me:3002`;

function get(url: string, options: { shop?: TestShop; cookie?: string } = {}) {
  const target = options.shop ?? shop;
  return app.inject({
    method: 'GET',
    url,
    headers: { host: host(target), ...(options.cookie ? { cookie: options.cookie } : {}) },
  });
}

function send(
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  options: { payload?: unknown; shop?: TestShop; cookie?: string } = {},
) {
  const target = options.shop ?? shop;
  return app.inject({
    method,
    url,
    headers: { host: host(target), ...(options.cookie ? { cookie: options.cookie } : {}) },
    ...(options.payload === undefined ? {} : { payload: options.payload }),
  });
}

/** `Set-Cookie` from a cart response → the `Cookie` header for the next call. */
function cartCookie(response: { cookies: Array<{ name: string; value: string }> }): string {
  const cookie = response.cookies.find((c) => c.name === CART_COOKIE);
  if (!cookie) throw new Error('response did not set a cart cookie');
  return `${CART_COOKIE}=${cookie.value}`;
}

/**
 * One product, created straight through Prisma. The storefront only reads, so a
 * fixture is cheaper and clearer here than driving B1's admin API — and it lets
 * a test state exactly the stock and status it depends on.
 */
async function createProduct(
  shopId: string,
  input: {
    handle: string;
    title: string;
    status?: string;
    price: number;
    tags?: string[];
    variants?: Array<{
      key: string;
      title: string;
      price?: number;
      policy?: string;
      stock: number;
    }>;
  },
): Promise<string> {
  const productId = newId('product');
  await dbAdmin.product.create({
    data: {
      id: productId,
      shopId,
      title: input.title,
      handle: input.handle,
      descriptionHtml: `<p>${input.title}</p>`,
      status: input.status ?? 'active',
      vendor: 'Aurora Supply Co.',
      productType: 'Knitwear',
      tags: input.tags ?? [],
      options: {
        create: [{ id: newId('option'), shopId, name: 'Size', position: 0, values: ['S', 'M'] }],
      },
      images: {
        create: [
          {
            id: newId('image'),
            shopId,
            url: `https://picsum.photos/seed/${input.handle}/1200/1500`,
            altText: input.title,
            position: 0,
          },
        ],
      },
    },
  });

  const variants = input.variants ?? [{ key: input.handle, title: 'S', stock: 5 }];
  for (const [position, variant] of variants.entries()) {
    const variantId = newId('variant');
    v[variant.key] = variantId;
    await dbAdmin.productVariant.create({
      data: {
        id: variantId,
        shopId,
        productId,
        title: variant.title,
        sku: `SKU-${variant.key.toUpperCase()}`,
        price: variant.price ?? input.price,
        position,
        optionValues: { Size: variant.title },
        inventoryPolicy: variant.policy ?? 'deny',
      },
    });
    await dbAdmin.inventoryLevel.create({
      data: { id: newId('inventory'), shopId, variantId, locationId, available: variant.stock },
    });
  }
  return productId;
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  neighbour = await createTestShop();

  locationId = newId('location');
  await dbAdmin.location.create({
    data: { id: locationId, shopId: shop.shopId, name: 'Warehouse' },
  });

  await createProduct(shop.shopId, {
    handle: 'alpine-merino-crewneck',
    title: 'Alpine Merino Crewneck',
    price: 14800,
    tags: ['knitwear'],
    variants: [
      { key: 'alpineS', title: 'S', stock: 3 },
      { key: 'alpineM', title: 'M', price: 15200, stock: 0 },
    ],
  });
  await createProduct(shop.shopId, {
    handle: 'backorder-beanie',
    title: 'Backorder Beanie',
    price: 4400,
    // `continue` lets a shopper oversell on purpose — the pre-order case.
    variants: [{ key: 'beanie', title: 'S', policy: 'continue', stock: 0 }],
  });
  await createProduct(shop.shopId, {
    handle: 'quarry-shearling-coat',
    title: 'Quarry Shearling Coat',
    status: 'draft',
    price: 21500,
  });
  await createProduct(shop.shopId, {
    handle: 'ferry-cotton-cardigan',
    title: 'Ferry Cotton Cardigan',
    status: 'archived',
    price: 12500,
  });
  // Same title in another tenant: the search `OR` clause is where a shop filter
  // classically escapes.
  await createProduct(neighbour.shopId, {
    handle: 'alpine-merino-crewneck',
    title: 'Alpine Merino Crewneck',
    price: 9900,
    variants: [{ key: 'neighbourAlpine', title: 'S', stock: 9 }],
  });

  const collectionId = newId('collection');
  await dbAdmin.collection.create({
    data: {
      id: collectionId,
      shopId: shop.shopId,
      title: 'Featured',
      handle: 'featured',
      type: 'manual',
      descriptionHtml: '<p>The edit</p>',
    },
  });
  await dbAdmin.collectionProduct.createMany({
    data: [
      {
        shopId: shop.shopId,
        collectionId,
        productId: (
          await dbAdmin.product.findFirstOrThrow({
            where: { shopId: shop.shopId, handle: 'alpine-merino-crewneck' },
          })
        ).id,
        position: 0,
      },
      {
        // A draft product placed in a live collection: membership must not
        // override visibility.
        shopId: shop.shopId,
        collectionId,
        productId: (
          await dbAdmin.product.findFirstOrThrow({
            where: { shopId: shop.shopId, handle: 'quarry-shearling-coat' },
          })
        ).id,
        position: 1,
      },
    ],
  });

  publishedThemeId = newId('theme');
  draftThemeId = newId('theme');
  const published = presetThemeDoc('aurora');
  await dbAdmin.themeVersion.createMany({
    data: [
      {
        id: publishedThemeId,
        shopId: shop.shopId,
        themeJson: published,
        tokens: published.tokens,
        status: 'published',
        publishedAt: new Date(),
      },
      {
        id: draftThemeId,
        shopId: shop.shopId,
        themeJson: presetThemeDoc('monochrome'),
        status: 'draft',
      },
    ],
  });
}, 60_000);

afterAll(async () => {
  await deleteTestShops([shop.shopId, neighbour.shopId]);
  await app.close();
});

describe('tenant resolution by Host', () => {
  it('serves the shop the Host names', async () => {
    const response = await get('/storefront/api/shop');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      slug: shop.slug,
      currencyCode: 'USD',
      themeVersionId: publishedThemeId,
    });
  });

  it('404s an unknown host in the SPEC §5 envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/shop',
      headers: { host: 'nosuchshop.lvh.me:3002' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      errors: [{ code: 'not_found', message: expect.any(String), field: undefined }],
    });
  });

  it('never returns another tenant’s product for the same handle', async () => {
    const ours = await get('/storefront/api/products/alpine-merino-crewneck');
    const theirs = await get('/storefront/api/products/alpine-merino-crewneck', {
      shop: neighbour,
    });
    expect(ours.json().variants[0].price.amount).toBe(14800);
    expect(theirs.json().variants[0].price.amount).toBe(9900);
  });
});

describe('product visibility', () => {
  it('hides draft and archived products from the list, search and detail', async () => {
    // The landmine: a draft leaking onto a live storefront (E1 issue).
    const list = await get('/storefront/api/products?limit=250');
    const handles = list.json().data.map((p: { handle: string }) => p.handle);
    expect(handles).toContain('alpine-merino-crewneck');
    expect(handles).not.toContain('quarry-shearling-coat');
    expect(handles).not.toContain('ferry-cotton-cardigan');

    const search = await get('/storefront/api/products?query=Quarry');
    expect(search.json().data).toEqual([]);

    const detail = await get('/storefront/api/products/quarry-shearling-coat');
    expect(detail.statusCode).toBe(404);
  });

  it('hides a draft product that is a member of a live collection', async () => {
    const response = await get('/storefront/api/collections/featured/products');
    const handles = response.json().data.map((p: { handle: string }) => p.handle);
    expect(handles).toEqual(['alpine-merino-crewneck']);
  });

  it('scopes `?query=` to this tenant', async () => {
    const response = await get('/storefront/api/products?query=Alpine');
    const prices = response
      .json()
      .data.flatMap((p: { variants: Array<{ price: { amount: number } }> }) =>
        p.variants.map((variant) => variant.price.amount),
      );
    expect(prices).toContain(14800);
    expect(prices).not.toContain(9900);
  });

  it('derives availability from stock and inventory policy', async () => {
    const product = (await get('/storefront/api/products/alpine-merino-crewneck')).json();
    const bySize = Object.fromEntries(
      product.variants.map((variant: { title: string; available: boolean }) => [
        variant.title,
        variant.available,
      ]),
    );
    expect(bySize).toEqual({ S: true, M: false });
    expect(product.available).toBe(true);
    expect(product.priceRange).toEqual({
      min: { amount: 14800, currencyCode: 'USD' },
      max: { amount: 15200, currencyCode: 'USD' },
    });

    // `continue` means orderable at zero stock — the pre-order case.
    const beanie = (await get('/storefront/api/products/backorder-beanie')).json();
    expect(beanie.available).toBe(true);
    expect(beanie.variants[0].available).toBe(true);
  });

  it('sends the SPEC §10 cache header on cacheable reads', async () => {
    // The perf budget (TTFB < 300ms) leans on these being edge-cacheable.
    for (const url of [
      '/storefront/api/products',
      '/storefront/api/products/alpine-merino-crewneck',
      '/storefront/api/collections/featured/products',
      '/storefront/api/shop',
      '/storefront/api/theme',
    ]) {
      const response = await get(url);
      expect(response.headers['cache-control'], url).toBe(STOREFRONT_CACHE_CONTROL);
    }
  });

  it('never caches the cart', async () => {
    // A shared cache serving one shopper's cart to another is the worst
    // possible bug on this surface.
    const response = await send('POST', '/storefront/api/cart');
    expect(response.headers['cache-control']).toMatch(/no-store/);
  });
});

describe('theme', () => {
  it('serves the published ThemeDoc, not the draft', async () => {
    const response = await get('/storefront/api/theme');
    expect(response.statusCode).toBe(200);
    expect(response.json().themeVersionId).toBe(publishedThemeId);
    expect(response.json().theme.tokens.colorPrimary).toBe(
      presetThemeDoc('aurora').tokens.colorPrimary,
    );
  });

  it('serves a draft only for a correctly signed preview token', async () => {
    const signed = signThemePreview(draftThemeId);
    const previewed = await get(`/storefront/api/theme?preview=${encodeURIComponent(signed)}`);
    expect(previewed.json().themeVersionId).toBe(draftThemeId);
    // A preview is per-shopper and must never enter a shared cache.
    expect(previewed.headers['cache-control']).toMatch(/no-store/);

    // Unsigned or tampered: fall back to published rather than 500 or leak.
    for (const bad of [draftThemeId, `${draftThemeId}.deadbeef`]) {
      const response = await get(`/storefront/api/theme?preview=${encodeURIComponent(bad)}`);
      expect(response.json().themeVersionId, bad).toBe(publishedThemeId);
    }
  });

  it('404s a shop with no published theme', async () => {
    const response = await get('/storefront/api/theme', { shop: neighbour });
    expect(response.statusCode).toBe(404);
  });
});

describe('cart', () => {
  it('adds, updates and removes lines, recomputing integer totals each time', async () => {
    const created = await send('POST', '/storefront/api/cart');
    expect(created.statusCode).toBe(201);
    const cookie = cartCookie(created);
    expect(created.json()).toMatchObject({ lines: [], itemCount: 0, subtotal: { amount: 0 } });

    const added = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 2 },
    });
    expect(added.statusCode).toBe(200);
    expect(added.json()).toMatchObject({
      itemCount: 2,
      subtotal: { amount: 29600, currencyCode: 'USD' },
    });
    const line = added.json().lines[0];
    expect(line).toMatchObject({
      variantId: v.alpineS,
      quantity: 2,
      title: 'Alpine Merino Crewneck',
      variantTitle: 'S',
      handle: 'alpine-merino-crewneck',
      unitPrice: { amount: 14800 },
      lineTotal: { amount: 29600 },
      available: 3,
    });
    expect(line.imageUrl).toContain('picsum.photos');

    // Adding the same variant again merges into the existing line, as Shopify does.
    const merged = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 1 },
    });
    expect(merged.json().lines).toHaveLength(1);
    expect(merged.json().lines[0].quantity).toBe(3);

    const updated = await send('PUT', `/storefront/api/cart/lines/${line.id}`, {
      cookie,
      payload: { lineId: line.id, quantity: 1 },
    });
    expect(updated.json()).toMatchObject({ itemCount: 1, subtotal: { amount: 14800 } });

    const removed = await send('DELETE', `/storefront/api/cart/lines/${line.id}`, { cookie });
    expect(removed.json()).toMatchObject({ lines: [], itemCount: 0, subtotal: { amount: 0 } });
  });

  it('treats quantity 0 as a removal', async () => {
    const created = await send('POST', '/storefront/api/cart');
    const cookie = cartCookie(created);
    const added = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 1 },
    });
    const lineId = added.json().lines[0].id;

    const zeroed = await send('PUT', `/storefront/api/cart/lines/${lineId}`, {
      cookie,
      payload: { lineId, quantity: 0 },
    });
    expect(zeroed.json().lines).toEqual([]);
  });

  it('reprices an open cart from the live variant', async () => {
    // Shopify semantics, and the reason cart lines store variantId+quantity
    // only: a cart open in another tab must not hold a stale price.
    const created = await send('POST', '/storefront/api/cart');
    const cookie = cartCookie(created);
    await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 2 },
    });

    await dbAdmin.productVariant.update({ where: { id: v.alpineS }, data: { price: 16000 } });
    try {
      const reread = await get('/storefront/api/cart', { cookie });
      expect(reread.json().subtotal).toEqual({ amount: 32000, currencyCode: 'USD' });
    } finally {
      await dbAdmin.productVariant.update({ where: { id: v.alpineS }, data: { price: 14800 } });
    }
  });

  it('refuses to exceed stock on a deny-policy variant, and allows it on continue', async () => {
    const created = await send('POST', '/storefront/api/cart');
    const cookie = cartCookie(created);

    const tooMany = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 4 }, // stock is 3
    });
    // SPEC §5 fixes the error-code set; "not enough stock" is a state conflict.
    expect(tooMany.statusCode).toBe(409);
    expect(tooMany.json().errors[0]).toMatchObject({ code: 'conflict', field: 'quantity' });

    const soldOut = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineM, quantity: 1 }, // stock is 0, policy deny
    });
    expect(soldOut.statusCode).toBe(409);

    // Merging must re-check the total, not just the increment.
    await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 2 },
    });
    const overMerge = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.alpineS, quantity: 2 },
    });
    expect(overMerge.statusCode).toBe(409);

    const backorder = await send('POST', '/storefront/api/cart/lines', {
      cookie,
      payload: { variantId: v.beanie, quantity: 10 },
    });
    expect(backorder.statusCode).toBe(200);
  });

  it('will not accept a variant belonging to another shop', async () => {
    const created = await send('POST', '/storefront/api/cart');
    const response = await send('POST', '/storefront/api/cart/lines', {
      cookie: cartCookie(created),
      payload: { variantId: v.neighbourAlpine, quantity: 1 },
    });
    expect(response.statusCode).toBe(404);
  });

  it('does not honour a cart token issued by another shop', async () => {
    // The cookie is scoped to the storefront domain, which is shared across
    // tenants in dev (`*.lvh.me`) — so the token itself has to be tenant-checked.
    const created = await send('POST', '/storefront/api/cart');
    const cookie = cartCookie(created);

    const foreign = await get('/storefront/api/cart', { shop: neighbour, cookie });
    // A fresh, empty cart — never the other shop's contents.
    expect(foreign.statusCode).toBe(200);
    expect(foreign.json().lines).toEqual([]);
    expect(foreign.json().token).not.toBe(created.json().token);
  });

  it('returns an empty cart rather than 404 when the cookie is stale', async () => {
    // A shopper whose cart was pruned should get a working store, not an error.
    const response = await get('/storefront/api/cart', {
      cookie: `${CART_COOKIE}=cart_01NOTAREALTOKEN`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().lines).toEqual([]);
  });
});

describe('analytics beacon', () => {
  it('ingests a batch scoped to the tenant', async () => {
    const sessionId = `ses_${newId('event')}`;
    const response = await send('POST', '/storefront/api/events', {
      payload: {
        events: [
          { type: 'page_view', sessionId, path: '/' },
          { type: 'product_view', sessionId, path: '/products/alpine-merino-crewneck' },
        ],
      },
    });
    expect(response.statusCode).toBe(202);

    const stored = await dbAdmin.analyticsEvent.findMany({ where: { sessionId } });
    expect(stored).toHaveLength(2);
    expect(stored.every((event) => event.shopId === shop.shopId)).toBe(true);
  });

  it('rejects a batch that violates the contract', async () => {
    const response = await send('POST', '/storefront/api/events', {
      payload: { events: [{ type: 'not_a_type', sessionId: 'ses_1', path: '/' }] },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });
});
