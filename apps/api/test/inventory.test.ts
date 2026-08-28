/**
 * B4 — locations & inventory.
 *
 * The subject is the adjustment service, which C3 (fulfillment decrements) and
 * E3 (stock checks) import directly: every quantity change is atomic, leaves an
 * `InventoryAdjustment` behind, and respects the variant's oversell policy.
 * The concurrency case is the one that matters most — a read-modify-write here
 * silently loses a decrement under two simultaneous checkouts.
 */
import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop, type TenantClient } from '@merchant/db/tenant';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adjust, adjustMany, setAvailable } from '../src/services/inventory/adjust.ts';
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
let db: TenantClient;
/** Two locations, as SPEC §7 seeds. */
let warehouse: string;
let store: string;

const usd = (amount: number) => ({ amount, currencyCode: 'USD' });

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

async function createLocation(name: string): Promise<string> {
  const response = await write('POST', '/admin/api/locations', { name });
  expect(response.statusCode, response.body).toBe(201);
  return response.json().id;
}

/** A product whose single variant is the thing we move stock on. */
async function createVariant(
  title: string,
  options: { inventoryPolicy?: 'deny' | 'continue'; sku?: string } = {},
): Promise<{ productId: string; variantId: string }> {
  const response = await write('POST', '/admin/api/products', {
    title,
    variants: [
      {
        price: usd(1000),
        sku: options.sku ?? null,
        inventoryPolicy: options.inventoryPolicy ?? 'deny',
      },
    ],
  });
  expect(response.statusCode, response.body).toBe(201);
  const product = response.json();
  return { productId: product.id, variantId: product.variants[0].id };
}

const historyFor = (variantId: string) =>
  dbAdmin.inventoryAdjustment.findMany({ where: { variantId }, orderBy: { createdAt: 'asc' } });

const availableAt = async (variantId: string, locationId: string) =>
  (await dbAdmin.inventoryLevel.findFirst({ where: { variantId, locationId } }))?.available ?? null;

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
  db = dbForShop(shop.shopId);
  warehouse = await createLocation('Aurora Warehouse');
  store = await createLocation('Aurora Retail');
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId]);
});

describe('adjustment service', () => {
  it('creates the level on first use and records the delta', async () => {
    const { variantId } = await createVariant('Adjust Me');

    const level = await adjust(db, {
      variantId,
      locationId: warehouse,
      delta: 12,
      reason: 'received',
    });

    expect(level.available).toBe(12);
    const history = await historyFor(variantId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ delta: 12, reason: 'received', locationId: warehouse });
  });

  it('keeps referenceId, which is how C3 links a decrement to its order', async () => {
    const { variantId } = await createVariant('Referenced');
    const orderId = 'ord_01ARZ3NDEKTSV4RRFFQ69G5FAV';

    await adjust(db, { variantId, locationId: warehouse, delta: 5, reason: 'received' });
    await adjust(db, {
      variantId,
      locationId: warehouse,
      delta: -2,
      reason: 'sold',
      referenceId: orderId,
    });

    const history = await historyFor(variantId);
    expect(history.map((row) => [row.delta, row.reason, row.referenceId])).toEqual([
      [5, 'received', null],
      [-2, 'sold', orderId],
    ]);
    expect(await availableAt(variantId, warehouse)).toBe(3);
  });

  it('records the computed delta when an absolute count is set', async () => {
    const { variantId } = await createVariant('Counted');
    await adjust(db, { variantId, locationId: warehouse, delta: 10, reason: 'received' });

    const level = await setAvailable(db, { variantId, locationId: warehouse, available: 7 });

    expect(level.available).toBe(7);
    const history = await historyFor(variantId);
    expect(history.map((row) => row.delta)).toEqual([10, -3]);
  });

  it('writes no history for a set that changes nothing', async () => {
    const { variantId } = await createVariant('Unchanged');
    await adjust(db, { variantId, locationId: warehouse, delta: 4, reason: 'received' });

    await setAvailable(db, { variantId, locationId: warehouse, available: 4 });

    expect(await historyFor(variantId)).toHaveLength(1);
  });

  it('tracks each location separately', async () => {
    const { variantId } = await createVariant('Two Places');

    await adjust(db, { variantId, locationId: warehouse, delta: 6, reason: 'received' });
    await adjust(db, { variantId, locationId: store, delta: 2, reason: 'received' });

    expect(await availableAt(variantId, warehouse)).toBe(6);
    expect(await availableAt(variantId, store)).toBe(2);
  });
});

describe('oversell policy', () => {
  it('refuses to take a deny variant below zero and leaves the level alone', async () => {
    const { variantId } = await createVariant('Deny Me', { inventoryPolicy: 'deny' });
    await adjust(db, { variantId, locationId: warehouse, delta: 3, reason: 'received' });

    await expect(
      adjust(db, { variantId, locationId: warehouse, delta: -4, reason: 'sold' }),
    ).rejects.toMatchObject({ code: 'conflict' });

    // The whole adjustment rolled back — no partial decrement, no history row.
    expect(await availableAt(variantId, warehouse)).toBe(3);
    expect(await historyFor(variantId)).toHaveLength(1);
  });

  it('lets a continue variant go negative, because that is what overselling is', async () => {
    const { variantId } = await createVariant('Oversell Me', { inventoryPolicy: 'continue' });
    await adjust(db, { variantId, locationId: warehouse, delta: 1, reason: 'received' });

    const level = await adjust(db, {
      variantId,
      locationId: warehouse,
      delta: -3,
      reason: 'sold',
    });

    expect(level.available).toBe(-2);
  });
});

describe('atomicity', () => {
  // The reason this service exists instead of a bare inventoryLevel.update:
  // read-then-write loses one of these two decrements every time.
  it('does not lose concurrent adjustments to the same level', async () => {
    const { variantId } = await createVariant('Contended');
    await adjust(db, { variantId, locationId: warehouse, delta: 100, reason: 'received' });

    await Promise.all(
      Array.from({ length: 8 }, () =>
        adjust(db, { variantId, locationId: warehouse, delta: -5, reason: 'sold' }),
      ),
    );

    expect(await availableAt(variantId, warehouse)).toBe(60);
    expect(await historyFor(variantId)).toHaveLength(9);
  });

  it('applies a batch all-or-nothing', async () => {
    const ok = await createVariant('Batch Fine');
    const blocked = await createVariant('Batch Blocked', { inventoryPolicy: 'deny' });
    await adjust(db, {
      variantId: ok.variantId,
      locationId: warehouse,
      delta: 5,
      reason: 'received',
    });

    await expect(
      adjustMany(db, [
        { variantId: ok.variantId, locationId: warehouse, delta: -1, reason: 'sold' },
        { variantId: blocked.variantId, locationId: warehouse, delta: -1, reason: 'sold' },
      ]),
    ).rejects.toMatchObject({ code: 'conflict' });

    expect(await availableAt(ok.variantId, warehouse)).toBe(5);
    expect(await historyFor(ok.variantId)).toHaveLength(1);
  });
});

describe('locations', () => {
  it('lists what was created and refuses to delete the last one', async () => {
    const list = (await get('/admin/api/locations')).json();
    expect(list.data.map((l: { name: string }) => l.name)).toEqual([
      'Aurora Warehouse',
      'Aurora Retail',
    ]);

    // A location holding units cannot go — its levels would cascade away and
    // the stock would silently vanish from the shop's totals.
    const held = await write('DELETE', `/admin/api/locations/${store}`);
    expect(held.statusCode).toBe(409);
    expect(held.json().errors[0].message).toMatch(/still holds stock/i);

    // Emptied, it deletes.
    for (const level of await dbAdmin.inventoryLevel.findMany({
      where: { locationId: store, NOT: { available: 0 } },
      select: { variantId: true },
    })) {
      await setAvailable(db, { variantId: level.variantId, locationId: store, available: 0 });
    }
    expect((await write('DELETE', `/admin/api/locations/${store}`)).statusCode).toBe(200);
    // One location must survive: a shop with nowhere to hold stock cannot fulfil.
    const last = await write('DELETE', `/admin/api/locations/${warehouse}`);
    expect(last.statusCode).toBe(409);

    // Restore the second location for whatever runs after this file.
    store = await createLocation('Aurora Retail');
  });
});

describe('locations report their stock', () => {
  // B6's Locations settings page disables Delete for a location that still
  // holds units, so the count has to come back with the location — the
  // alternative is the page paging the whole inventory to find out.
  it('counts the variants stocked at each location', async () => {
    const { variantId } = await createVariant('Stock Counter');
    await adjust(db, { variantId, locationId: warehouse, delta: 4, reason: 'received' });

    const byId = Object.fromEntries(
      (await get('/admin/api/locations')).json().data.map((l: { id: string }) => [l.id, l]),
    );

    expect(byId[warehouse].stockedVariantCount).toBeGreaterThan(0);
    expect(byId[store].stockedVariantCount).toBe(0);
  });

  it('stops counting a variant once its stock is gone', async () => {
    const { variantId } = await createVariant('Drains To Zero');
    await adjust(db, { variantId, locationId: store, delta: 3, reason: 'received' });
    const before = (await get('/admin/api/locations'))
      .json()
      .data.find((l: { id: string }) => l.id === store).stockedVariantCount;

    await setAvailable(db, { variantId, locationId: store, available: 0 });

    const after = (await get('/admin/api/locations'))
      .json()
      .data.find((l: { id: string }) => l.id === store).stockedVariantCount;
    expect(after).toBe(before - 1);
  });
});

describe('inventory index', () => {
  it('joins product title, sku and per-location quantities', async () => {
    const { variantId } = await createVariant('Indexed Product', { sku: 'IDX-QQ-1' });
    await adjust(db, { variantId, locationId: warehouse, delta: 9, reason: 'received' });

    const body = (await get('/admin/api/inventory?query=IDX-QQ')).json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      variantId,
      productTitle: 'Indexed Product',
      variantTitle: 'Default Title',
      sku: 'IDX-QQ-1',
    });
    // A location the variant has never been stocked at reads as 0, not missing —
    // levels are created lazily, so the index must not depend on them existing.
    const levels = Object.fromEntries(
      body.data[0].levels.map((l: { locationId: string; available: number }) => [
        l.locationId,
        l.available,
      ]),
    );
    expect(levels[warehouse]).toBe(9);
    expect(levels[store]).toBe(0);
  });

  it('narrows to one location when asked', async () => {
    const body = (await get(`/admin/api/inventory?query=IDX-QQ&locationId=${store}`)).json();
    expect(body.data[0].levels).toEqual([{ locationId: store, available: 0 }]);
  });

  it('walks every variant exactly once through the cursor', async () => {
    const all = (await get('/admin/api/inventory?limit=250')).json();
    expect(all.data.length).toBeGreaterThan(2);

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 50; page += 1) {
      const url: string = `/admin/api/inventory?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const body = (await get(url)).json();
      seen.push(...body.data.map((row: { variantId: string }) => row.variantId));
      cursor = body.nextCursor;
      if (!cursor) break;
    }

    expect(cursor).toBeNull();
    expect(seen).toEqual(all.data.map((row: { variantId: string }) => row.variantId));
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('write endpoints', () => {
  it('adjusts through POST /inventory/adjust', async () => {
    const { variantId } = await createVariant('Posted Adjust');

    const response = await write('POST', '/admin/api/inventory/adjust', {
      variantId,
      locationId: warehouse,
      delta: 3,
      reason: 'received',
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().levels).toEqual([expect.objectContaining({ available: 3 })]);
    // Stamped from the session, which is what lets B6's stock drawer say who
    // moved it. Only the HTTP path knows the staff user, so assert it here.
    expect(await historyFor(variantId)).toEqual([
      expect.objectContaining({ actor: shop.ownerId, delta: 3 }),
    ]);
  });

  it('sets through POST /inventory/set, batched', async () => {
    const a = await createVariant('Posted Set A');
    const b = await createVariant('Posted Set B');

    const response = await write('POST', '/admin/api/inventory/set', {
      levels: [
        { variantId: a.variantId, locationId: warehouse, available: 14 },
        { variantId: b.variantId, locationId: store, available: 6 },
      ],
    });

    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().levels.map((l: { available: number }) => l.available)).toEqual([14, 6]);
  });

  it('rejects a variant that is not this shop’s', async () => {
    const response = await write('POST', '/admin/api/inventory/adjust', {
      variantId: 'var_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      locationId: warehouse,
      delta: 1,
      reason: 'received',
    });

    expect(response.statusCode).toBe(404);
  });
});
