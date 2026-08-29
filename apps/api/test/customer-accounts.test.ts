/**
 * E5 — storefront customer accounts.
 *
 * Customer auth is the optional path (SPEC §8; guest checkout is the default),
 * so what earns a test here is what would fail silently and wreck the demo or
 * the tenancy story, not CRUD coverage:
 *
 *   - the register→login→me round trip the account pages are built on;
 *   - registering with an email that already ordered as a guest must CLAIM that
 *     row (password set on it), not mint a second customer — otherwise the
 *     shopper's order history is orphaned on a row they can never log into;
 *   - registering over an existing account must 409, never overwrite the
 *     password (that would be account takeover by signup form);
 *   - customer sessions are per-shop: the same email on another shop's host is
 *     a different account entirely, and a session minted on shop A presented on
 *     shop B's host is a 401 — the tenancy story extends to shoppers;
 *   - `/me/orders` returns the logged-in customer's orders and nobody else's.
 */
import { CUSTOMER_SESSION_COOKIE } from '@merchant/config/constants';
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { hash } from '@node-rs/argon2';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let neighbour: TestShop;
const shopIds: string[] = [];

const host = (s: TestShop) => `${s.slug}.lvh.me:3002`;

function get(url: string, options: { shop?: TestShop; cookie?: string } = {}) {
  const target = options.shop ?? shop;
  return app.inject({
    method: 'GET',
    url,
    headers: { host: host(target), ...(options.cookie ? { cookie: options.cookie } : {}) },
  });
}

function post(url: string, payload: unknown, options: { shop?: TestShop; cookie?: string } = {}) {
  const target = options.shop ?? shop;
  return app.inject({
    method: 'POST',
    url,
    headers: { host: host(target), ...(options.cookie ? { cookie: options.cookie } : {}) },
    payload,
  });
}

/** The signed customer-session cookie from a login/register response. */
function customerCookie(response: { cookies: Array<{ name: string; value: string }> }): string {
  const cookie = response.cookies.find((c) => c.name === CUSTOMER_SESSION_COOKIE);
  expect(cookie, 'response should set the customer session cookie').toBeDefined();
  return `${CUSTOMER_SESSION_COOKIE}=${cookie?.value}`;
}

let orderNumber = 7000;

async function order(shopId: string, customerId: string | null, total: number) {
  orderNumber += 1;
  return dbAdmin.order.create({
    data: {
      id: newId('order'),
      shopId,
      orderNumber,
      customerId,
      email: 'guest@example.com',
      currencyCode: 'USD',
      subtotal: total,
      total,
      financialStatus: 'paid',
    },
  });
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  neighbour = await createTestShop();
  shopIds.push(shop.shopId, neighbour.shopId);
});

afterAll(async () => {
  await deleteTestShops(shopIds);
  await app.close();
});

describe('register → login → me', () => {
  it('round-trips: register signs you in, login works, me returns the customer', async () => {
    const registered = await post('/storefront/api/customers/register', {
      email: 'Jane@Example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(registered.statusCode).toBe(201);
    // Email comes back case-folded — the row is stored that way (C4).
    expect(registered.json().customer.email).toBe('jane@example.com');

    // Registering signs you in, like the admin's signup.
    const meAfterRegister = await get('/storefront/api/customers/me', {
      cookie: customerCookie(registered),
    });
    expect(meAfterRegister.statusCode).toBe(200);

    const login = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(login.statusCode).toBe(200);

    const me = await get('/storefront/api/customers/me', { cookie: customerCookie(login) });
    expect(me.statusCode).toBe(200);
    const body = me.json();
    expect(body.customer.email).toBe('jane@example.com');
    expect(body.customer.firstName).toBe('Jane');
    // The account surface must never leak the hash.
    expect(JSON.stringify(body)).not.toContain('$argon2');
  });

  it('rejects a wrong password and an unknown email identically', async () => {
    const wrongPassword = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'not-the-password',
    });
    const unknownEmail = await post('/storefront/api/customers/login', {
      email: 'nobody@example.com',
      password: 'password123',
    });
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
  });

  it('claims an existing guest row instead of creating a second customer', async () => {
    const guestId = newId('customer');
    await dbAdmin.customer.create({
      data: { id: guestId, shopId: shop.shopId, email: 'guest@example.com' },
    });
    await order(shop.shopId, guestId, 4200);

    const registered = await post('/storefront/api/customers/register', {
      email: 'guest@example.com',
      password: 'password123',
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json().customer.id).toBe(guestId);

    // Their guest order history is theirs immediately.
    const orders = await get('/storefront/api/customers/me/orders', {
      cookie: customerCookie(registered),
    });
    expect(orders.statusCode).toBe(200);
    expect(orders.json().data).toHaveLength(1);
    expect(orders.json().data[0].total).toEqual({ amount: 4200, currencyCode: 'USD' });
  });

  it('409s when the email already has an account — never overwrites the password', async () => {
    const again = await post('/storefront/api/customers/register', {
      email: 'jane@example.com',
      password: 'different-password',
    });
    expect(again.statusCode).toBe(409);
    expect(again.json().errors[0].code).toBe('conflict');

    // The original password still works — the attempt changed nothing.
    const login = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'password123',
    });
    expect(login.statusCode).toBe(200);
  });

  it('logout ends the session', async () => {
    const login = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'password123',
    });
    const cookie = customerCookie(login);

    const logout = await post('/storefront/api/customers/logout', undefined, { cookie });
    expect(logout.statusCode).toBe(204);

    const me = await get('/storefront/api/customers/me', { cookie });
    expect(me.statusCode).toBe(401);
  });

  it('401s /me without a session', async () => {
    const me = await get('/storefront/api/customers/me');
    expect(me.statusCode).toBe(401);
  });
});

describe('customer sessions are per-shop', () => {
  it("login with the OTHER shop's Host and the same email fails", async () => {
    // jane has an account on `shop`; the neighbour shop has no such customer.
    const wrongShop = await post(
      '/storefront/api/customers/login',
      { email: 'jane@example.com', password: 'password123' },
      { shop: neighbour },
    );
    expect(wrongShop.statusCode).toBe(401);
  });

  it("a session minted on shop A is rejected on shop B's host", async () => {
    const login = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'password123',
    });
    const cookie = customerCookie(login);

    const crossShop = await get('/storefront/api/customers/me', {
      shop: neighbour,
      cookie,
    });
    expect(crossShop.statusCode).toBe(401);

    // /me/orders must 401 too, not answer 200-with-empty: an "empty" order
    // history on the wrong shop would read as data loss, and only the session's
    // own shopId check produces the 401 here — the scoped db alone cannot.
    const crossShopOrders = await get('/storefront/api/customers/me/orders', {
      shop: neighbour,
      cookie,
    });
    expect(crossShopOrders.statusCode).toBe(401);
  });

  it('the same email registers independently per shop', async () => {
    const registered = await post(
      '/storefront/api/customers/register',
      { email: 'jane@example.com', password: 'neighbour-password' },
      { shop: neighbour },
    );
    expect(registered.statusCode).toBe(201);

    // Two shops, two customer rows, two passwords — neither leaks into the
    // other. Scoped to this suite's shops: the shared database legitimately
    // holds other janes (the H1 seed ships one).
    const rows = await dbAdmin.customer.findMany({
      where: { email: 'jane@example.com', shopId: { in: [shop.shopId, neighbour.shopId] } },
    });
    expect(rows.map((r) => r.shopId).sort()).toEqual([shop.shopId, neighbour.shopId].sort());
  });
});

describe('PUT /me', () => {
  it('saving the default address twice updates in place — never a second default', async () => {
    const login = await post('/storefront/api/customers/login', {
      email: 'jane@example.com',
      password: 'password123',
    });
    const cookie = customerCookie(login);

    const address = {
      firstName: 'Jane',
      lastName: 'Doe',
      address1: '1 Main St',
      city: 'Springfield',
      country: 'United States',
      countryCode: 'US',
      zip: '01101',
    };

    const first = await app.inject({
      method: 'PUT',
      url: '/storefront/api/customers/me',
      headers: { host: host(shop), cookie },
      payload: { defaultAddress: address },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().customer.defaultAddress.address1).toBe('1 Main St');

    const second = await app.inject({
      method: 'PUT',
      url: '/storefront/api/customers/me',
      headers: { host: host(shop), cookie },
      payload: { firstName: 'Janet', defaultAddress: { ...address, address1: '2 Elm St' } },
    });
    expect(second.statusCode).toBe(200);
    const customer = second.json().customer;
    expect(customer.firstName).toBe('Janet');
    expect(customer.defaultAddress.address1).toBe('2 Elm St');
    // The second save replaced the row — a duplicate default would make every
    // consumer (E4's prefill included) pick one at random per render.
    expect(customer.addresses).toHaveLength(1);
  });
});

describe('/me/orders', () => {
  it("returns the customer's own orders only, newest first", async () => {
    const mineId = newId('customer');
    const otherId = newId('customer');
    await dbAdmin.customer.create({
      data: {
        id: mineId,
        shopId: shop.shopId,
        email: 'mine@example.com',
        passwordHash: await hash('password123'),
      },
    });
    await dbAdmin.customer.create({
      data: { id: otherId, shopId: shop.shopId, email: 'other@example.com' },
    });
    const first = await order(shop.shopId, mineId, 1000);
    const second = await order(shop.shopId, mineId, 2500);
    await order(shop.shopId, otherId, 9900);

    const login = await post('/storefront/api/customers/login', {
      email: 'mine@example.com',
      password: 'password123',
    });
    const orders = await get('/storefront/api/customers/me/orders', {
      cookie: customerCookie(login),
    });
    expect(orders.statusCode).toBe(200);

    const data = orders.json().data as Array<{ id: string; orderNumber: number }>;
    // The neighbour's 9900 order must not appear — that filter is the whole point.
    expect(data.map((o) => o.id).sort()).toEqual([first.id, second.id].sort());
    expect(data[0]?.orderNumber).toBe(second.orderNumber);
  });
});
