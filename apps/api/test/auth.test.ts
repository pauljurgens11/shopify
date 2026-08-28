/**
 * A1 — staff auth and the three tenant-resolution paths (SPEC §6, §8).
 *
 * Needs the compose stack up (`docker compose up -d`) and migrations applied.
 * These are not per-endpoint CRUD tests (SPEC §14 forbids those): every case
 * here covers the auth/tenancy seam that the other seven workstreams build on.
 */
import { CSRF_HEADER, CSRF_HEADER_VALUE, SESSION_COOKIE } from '@merchant/config/constants';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeRedis, redis } from '../src/lib/redis.ts';
import { sessionTtlSeconds } from '../src/lib/sessions.ts';
import {
  buildTestApp,
  cookieHeader,
  createApiToken,
  createStaffUser,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  TEST_PASSWORD,
  type TestShop,
  uniqueSlug,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let otherShop: TestShop;
const createdShopIds: string[] = [];

/**
 * Log in as `email` and return the Cookie header for subsequent requests.
 *
 * BUDGET: SPEC §8 caps login at 10/min/IP and every `inject` shares 127.0.0.1,
 * so this file may call `login` at most nine times. Tests that need a session
 * but are not testing login itself use `sessionCookie` instead.
 */
async function login(email: string, password = TEST_PASSWORD, shopSlug?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password, shopSlug },
  });
  return { res, cookie: cookieHeader(res) };
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  otherShop = await createTestShop();
  createdShopIds.push(shop.shopId, otherShop.shopId);
});

afterAll(async () => {
  await deleteTestShops(createdShopIds);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

describe('POST /auth/signup', () => {
  it('creates the shop, the owner and an order sequence in one transaction', async () => {
    const slug = uniqueSlug('signup');
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        shopName: 'Aurora Signup Co.',
        shopSlug: slug,
        email: `owner@${slug}.test`,
        password: 'correct horse battery',
        firstName: 'Ada',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.shop.slug).toBe(slug);
    expect(body.user.role).toBe('owner');
    expect(body.user).not.toHaveProperty('passwordHash');

    createdShopIds.push(body.shop.id);

    // An order sequence has to exist from minute one, or the first order in a
    // fresh shop has no number to take (SPEC §5).
    const sequence = await dbAdmin.orderSequence.findUnique({ where: { shopId: body.shop.id } });
    expect(sequence?.next).toBe(1001);

    // Signup logs you straight in, like Shopify.
    const session = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite?.toLowerCase()).toBe('lax');
  });

  it('derives a free slug from the shop name when none is given', async () => {
    const name = `Aurora ${uniqueSlug('X').toUpperCase()} Supply Co.`;
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { shopName: name, email: `owner@${uniqueSlug()}.test`, password: 'a-good-password' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    createdShopIds.push(body.shop.id);
    expect(body.shop.slug).toMatch(/^aurora-x[a-z0-9-]*-supply-co$/);
  });

  it('falls through to -2 when the derived slug is taken', async () => {
    const name = `Beacon ${uniqueSlug('Y').toUpperCase()} Goods`;
    const first = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { shopName: name, email: `a@${uniqueSlug()}.test`, password: 'a-good-password' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { shopName: name, email: `b@${uniqueSlug()}.test`, password: 'a-good-password' },
    });

    expect(second.statusCode).toBe(201);
    createdShopIds.push(first.json().shop.id, second.json().shop.id);
    expect(second.json().shop.slug).toBe(`${first.json().shop.slug}-2`);
  });

  // Fastify raises these itself, before any handler runs. They are not
  // ApiErrors, so without the 4xx bridge in the error handler they rendered as
  // 500 `internal` and looked like a server bug.
  it.each([
    ['an unparseable content-type', 'application/xml', '<signup/>', 415],
    ['a malformed JSON body', 'application/json', '{"shopName":', 400],
  ])('answers %s with %i, not a 500', async (_label, contentType, payload, status) => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      headers: { 'content-type': contentType as string },
      payload: payload as string,
    });

    expect(res.statusCode).toBe(status);
    expect(res.json().errors[0].code).toBe('invalid_request');
  });

  it('rejects an explicitly requested slug that is taken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        shopName: 'Collision Co.',
        shopSlug: shop.slug,
        email: `someone@${uniqueSlug()}.test`,
        password: 'a-good-password',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      errors: [{ code: 'conflict', message: expect.any(String), field: 'shopSlug' }],
    });
  });

  it('rejects a short password with the SPEC error shape', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        shopName: 'Weak Co.',
        shopSlug: uniqueSlug(),
        email: `weak@${uniqueSlug()}.test`,
        password: 'short',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().errors[0]).toMatchObject({ code: 'invalid_request', field: 'password' });
  });
});

describe('POST /auth/login', () => {
  it('rejects a wrong password with 401 and the SPEC error shape', async () => {
    const { res } = await login(shop.ownerEmail, 'not-the-password');
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      errors: [{ code: 'unauthorized', message: expect.any(String) }],
    });
  });

  it('gives an unknown email the same answer as a wrong password', async () => {
    const { res } = await login(`ghost@${uniqueSlug()}.test`);
    expect(res.statusCode).toBe(401);
    expect(res.json().errors[0].code).toBe('unauthorized');
  });

  it('binds the session to the shop named by shopSlug when an email is reused', async () => {
    const sharedEmail = `shared@${uniqueSlug()}.test`;
    await createStaffUser(shop.shopId, { email: sharedEmail, role: 'admin' });
    await createStaffUser(otherShop.shopId, { email: sharedEmail, role: 'admin' });

    const ambiguous = await login(sharedEmail);
    expect(ambiguous.res.statusCode).toBe(400);
    expect(ambiguous.res.json().errors[0].field).toBe('shopSlug');

    const { res, cookie } = await login(sharedEmail, TEST_PASSWORD, otherShop.slug);
    expect(res.statusCode).toBe(200);

    const probe = await app.inject({
      method: 'GET',
      url: '/admin/api/__probe',
      headers: { cookie },
    });
    expect(probe.json().shopId).toBe(otherShop.shopId);
  });

  it('records lastLoginAt', async () => {
    const email = `lastlogin@${uniqueSlug()}.test`;
    const id = await createStaffUser(shop.shopId, { email, role: 'admin' });
    expect((await dbAdmin.staffUser.findUnique({ where: { id } }))?.lastLoginAt).toBeNull();

    await login(email, TEST_PASSWORD, shop.slug);

    const after = await dbAdmin.staffUser.findUnique({ where: { id } });
    expect(after?.lastLoginAt).toBeInstanceOf(Date);
  });
});

describe('GET /auth/me', () => {
  it('round-trips the session into user + shop', async () => {
    const { cookie } = await login(shop.ownerEmail);
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.email).toBe(shop.ownerEmail);
    expect(body.user.role).toBe('owner');
    expect(body.shop).toMatchObject({ id: shop.shopId, slug: shop.slug, currencyCode: 'USD' });
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('401s without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('401s on a forged cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: `${SESSION_COOKIE}=deadbeef.forged` },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('destroys the session in Redis, not just the cookie', async () => {
    const { res: loginRes, cookie } = await login(shop.ownerEmail);
    const sessionId = loginRes.json().sessionId as string | undefined;
    expect(sessionId).toBeUndefined(); // the id is never echoed in the body

    const before = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(before.statusCode).toBe(200);

    const out = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } });
    expect(out.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } });
    expect(after.statusCode).toBe(401);
  });
});

describe('tenant resolution — /admin/api/* (session)', () => {
  it('401s without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/api/__probe' });
    expect(res.statusCode).toBe(401);
    expect(res.json().errors[0].code).toBe('unauthorized');
  });

  it('resolves request.db to the session shop', async () => {
    const cookie = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: shop.ownerId,
    });
    const res = await app.inject({ method: 'GET', url: '/admin/api/__probe', headers: { cookie } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      shopId: shop.shopId,
      staffUserId: shop.ownerId,
      role: 'owner',
      // dbForShop scopes Shop reads to id = shopId, so findFirst can only ever
      // return this tenant's row however many shops exist.
      shopName: `Test ${shop.slug}`,
    });
  });

  it('slides the session TTL on every authenticated request', async () => {
    const cookie = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: shop.ownerId,
    });
    // Signed cookie is `<name>=<sessionId>.<signature>`.
    const sessionId = cookie.slice(cookie.indexOf('=') + 1).split('.')[0] as string;

    // Age the session artificially: a 7-day window is too long to observe
    // sliding by waiting.
    await redis().expire(`sess:${sessionId}`, 60);
    expect(await sessionTtlSeconds(sessionId)).toBeLessThanOrEqual(60);

    const res = await app.inject({ method: 'GET', url: '/admin/api/__probe', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(await sessionTtlSeconds(sessionId)).toBeGreaterThan(6 * 24 * 60 * 60);

    // The browser's copy has to slide too, or the cookie expires seven days
    // after login however active the user was.
    const reissued = res.cookies.find((c) => c.name === SESSION_COOKIE);
    expect(reissued?.maxAge).toBeGreaterThan(6 * 24 * 60 * 60);
  });
});

describe('tenant resolution — /storefront/api/* (Host header)', () => {
  it('resolves the shop from {slug}.lvh.me', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: `${shop.slug}.lvh.me:3002` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ shopId: shop.shopId, shopSlug: shop.slug });
  });

  it('404s for an unknown slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: `${uniqueSlug('nobody')}.lvh.me:3002` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().errors[0].code).toBe('not_found');
  });

  it('404s for a host that carries no shop slug', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: 'www.lvh.me:3002' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('tenant resolution — /api/* (Bearer token)', () => {
  it('resolves the shop that owns the token', async () => {
    const token = await createApiToken(shop.shopId);
    const res = await app.inject({
      method: 'GET',
      url: '/api/__probe',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().shopId).toBe(shop.shopId);
  });

  it('401s on a missing or wrong token', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/__probe' })).statusCode).toBe(401);

    const bad = await app.inject({
      method: 'GET',
      url: '/api/__probe',
      headers: { authorization: 'Bearer shpat_not-a-real-token' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('401s once the app is uninstalled', async () => {
    const token = await createApiToken(otherShop.shopId);
    const ok = await app.inject({
      method: 'GET',
      url: '/api/__probe',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(ok.statusCode).toBe(200);

    await dbAdmin.app.updateMany({
      where: { shopId: otherShop.shopId },
      data: { uninstalledAt: new Date() },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/__probe',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('CSRF', () => {
  it('rejects a cookie-authenticated mutation without the header', async () => {
    const cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
    const res = await app.inject({
      method: 'POST',
      url: '/admin/api/__probe',
      headers: { cookie },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().errors[0].code).toBe('forbidden');
  });

  it('allows it with the header', async () => {
    const cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
    const res = await app.inject({
      method: 'POST',
      url: '/admin/api/__probe',
      headers: { cookie, [CSRF_HEADER]: CSRF_HEADER_VALUE },
    });

    expect(res.statusCode).toBe(200);
  });

  it('exempts Bearer requests', async () => {
    const token = await createApiToken(shop.shopId);
    const res = await app.inject({
      method: 'GET',
      url: '/api/__probe',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe('requirePermission', () => {
  const probeOrders = (cookie: string) =>
    app.inject({ method: 'GET', url: '/admin/api/__probe-orders', headers: { cookie } });

  it('lets owner and admin through with an empty permission map', async () => {
    for (const role of ['owner', 'admin'] as const) {
      const cookie = await sessionCookie(app, {
        shopId: shop.shopId,
        staffUserId: shop.ownerId,
        role,
        permissions: {},
      });
      expect((await probeOrders(cookie)).statusCode).toBe(200);
    }
  });

  it('403s a staff user without the area, and admits one with it', async () => {
    const denied = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: shop.ownerId,
      role: 'staff',
      permissions: { products: true },
    });
    const deniedRes = await probeOrders(denied);
    expect(deniedRes.statusCode).toBe(403);
    expect(deniedRes.json().errors[0].code).toBe('forbidden');

    const allowed = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: shop.ownerId,
      role: 'staff',
      permissions: { orders: true },
    });
    expect((await probeOrders(allowed)).statusCode).toBe(200);
  });

  it('carries a staff user’s permissions from login into the session', async () => {
    const email = `buyer@${uniqueSlug()}.test`;
    await createStaffUser(shop.shopId, { email, permissions: { orders: true } });

    const { res, cookie } = await login(email, TEST_PASSWORD, shop.slug);
    expect(res.statusCode).toBe(200);
    expect((await probeOrders(cookie)).statusCode).toBe(200);
  });
});
