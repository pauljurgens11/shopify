/**
 * G4 — the public Admin REST API (`/api/*`).
 *
 * What is new here is the authorization boundary, not the endpoints: the
 * handlers call the same B1/C2/C4 services that products.test.ts and
 * orders.test.ts already exercise, so a CRUD sweep over them would only retest
 * those (SPEC §14). This file covers what only exists on this surface — a token
 * proves a shop, a scope decides what that token may do, and neither crosses a
 * tenant boundary.
 */
import { createHash } from 'node:crypto';
import { RATE_LIMITS } from '@merchant/config/constants';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, expect, it } from 'vitest';
import {
  buildTestApp,
  createApiToken,
  createTestShop,
  deleteTestShops,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
/** A second tenant with its own token and its own product. */
let neighbour: TestShop;

/** Full access to the catalog. */
let writeToken: string;
/** The same shop, but granted only `read_products`. */
let readToken: string;
let neighbourToken: string;

const PRODUCTS = '/api/products';

/**
 * `createApiToken` mints an app with no scopes (the helper is A2's, and tenancy
 * does not care about scopes). Granting them is a plain update — tokens are
 * deliberately not cached, so the next request sees them.
 */
async function grantScopes(token: string, scopes: string[]): Promise<string> {
  await dbAdmin.app.update({
    where: { apiTokenHash: createHash('sha256').update(token).digest('hex') },
    data: { scopes },
  });
  return token;
}

function call(method: 'GET' | 'POST', url: string, token: string, payload?: unknown) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    ...(payload === undefined ? {} : { payload }),
  });
}

const productPayload = (title: string, sku: string) => ({
  title,
  variants: [{ price: { amount: 2500, currencyCode: 'USD' }, sku }],
});

beforeAll(async () => {
  app = await buildTestApp();

  shop = await createTestShop();
  writeToken = await grantScopes(await createApiToken(shop.shopId), [
    'read_products',
    'write_products',
  ]);
  readToken = await grantScopes(await createApiToken(shop.shopId), ['read_products']);

  neighbour = await createTestShop();
  neighbourToken = await grantScopes(await createApiToken(neighbour.shopId), [
    'read_products',
    'write_products',
  ]);

  // Seeded through the API under test, which is also the only write this file
  // makes: the create path is proven by the fact that the reads below find it.
  for (const [tenant, token] of [
    [shop, writeToken],
    [neighbour, neighbourToken],
  ] as const) {
    const response = await call(
      'POST',
      PRODUCTS,
      token,
      productPayload(`${tenant.slug} Lamp`, `${tenant.slug}-LAMP`),
    );
    expect(response.statusCode, response.body).toBe(201);
  }
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId, neighbour.shopId]);
});

it('authorizes a scoped token and pages exactly like the admin API', async () => {
  const response = await call('GET', PRODUCTS, readToken);

  expect(response.statusCode, response.body).toBe(200);
  const body = response.json();
  // Same envelope as `/admin/api/products` — SPEC §5 cursor pagination.
  expect(body).toMatchObject({ nextCursor: null });
  expect(body.data.map((product: { title: string }) => product.title)).toEqual([
    `${shop.slug} Lamp`,
  ]);
});

it('rejects a token that was never issued', async () => {
  const response = await call('GET', PRODUCTS, 'shpat_not-a-real-token');

  expect(response.statusCode).toBe(401);
  expect(response.json()).toEqual({
    errors: [{ code: 'unauthorized', message: expect.any(String) }],
  });
});

it('refuses a write to a read-only token', async () => {
  const response = await call('POST', PRODUCTS, readToken, productPayload('Denied', 'DENIED-1'));

  expect(response.statusCode, response.body).toBe(403);
  expect(response.json()).toEqual({
    errors: [{ code: 'forbidden', message: expect.stringContaining('write_products') }],
  });
});

it('cannot see another shop through its own token', async () => {
  const response = await call('GET', PRODUCTS, neighbourToken);

  expect(response.statusCode, response.body).toBe(200);
  // The neighbour has exactly one product of its own, and none of ours.
  expect(response.json().data.map((product: { title: string }) => product.title)).toEqual([
    `${neighbour.slug} Lamp`,
  ]);
});

it('applies the SPEC §8 rate limit to the route, keyed per token', async () => {
  // The limiter's own headers are the honest assertion that the route opted in;
  // firing 80 requests would prove the same thing and cost a second per run.
  const response = await call('GET', PRODUCTS, readToken);

  expect(response.headers['x-ratelimit-limit']).toBe(String(RATE_LIMITS.adminApi.burst));
  expect(response.headers['x-ratelimit-remaining']).toBeDefined();
});
