/**
 * Settings API (A4) — the parts other workstreams depend on.
 *
 * Scoped deliberately (SPEC §14 forbids a per-endpoint CRUD sweep): what is
 * here is what E3 reads at checkout, plus the two access rules that are
 * security-shaped and silent when wrong — the `settings` permission gate and
 * the owner guard.
 */
import { fromDecimal, money } from '@merchant/config/money';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildTestApp,
  createStaffUser,
  createTestShop,
  deleteTestShops,
  sessionCookie,
  type TestShop,
} from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;
let ownerCookie: string;

const SETTINGS = '/admin/api/settings';

const asOwner = (method: string, url: string, payload?: unknown) =>
  app.inject({
    method: method as 'GET',
    url,
    headers: { cookie: ownerCookie, 'x-requested-with': 'merchant-admin' },
    ...(payload === undefined ? {} : { payload }),
  });

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  ownerCookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  await deleteTestShops([shop.shopId]);
  await app.close();
});

describe('taxes', () => {
  it('round-trips a rate through the JSON column', async () => {
    const put = await asOwner('PUT', `${SETTINGS}/taxes`, { ratePercentage: 8.875 });
    expect(put.statusCode).toBe(200);

    const get = await asOwner('GET', `${SETTINGS}/taxes`);
    // A float rate is the one place SPEC §5's integer rule does not apply —
    // it is a percentage, not an amount, and the money helpers round the result.
    expect(get.json()).toMatchObject({ ratePercentage: 8.875, pricesIncludeTax: false });
  });

  it('merges partially, so saving one field does not blank the other', async () => {
    await asOwner('PUT', `${SETTINGS}/taxes`, { ratePercentage: 20, pricesIncludeTax: true });
    await asOwner('PUT', `${SETTINGS}/taxes`, { ratePercentage: 5 });

    expect((await asOwner('GET', `${SETTINGS}/taxes`)).json()).toMatchObject({
      ratePercentage: 5,
      pricesIncludeTax: true,
    });
  });

  it('rejects a rate outside 0–100 instead of storing it', async () => {
    expect((await asOwner('PUT', `${SETTINGS}/taxes`, { ratePercentage: 150 })).statusCode).toBe(
      400,
    );
  });
});

describe('shipping rates', () => {
  it('stores conditions as minor units and returns them intact', async () => {
    const created = await asOwner('POST', `${SETTINGS}/shipping-rates`, {
      name: 'Free over $50',
      price: money(0, 'USD'),
      minOrderSubtotal: fromDecimal('50.00', 'USD'),
      maxOrderSubtotal: null,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Free over $50',
      minOrderSubtotal: { amount: 5000, currencyCode: 'USD' },
    });

    const list = await asOwner('GET', `${SETTINGS}/shipping-rates`);
    expect(list.json().data).toHaveLength(1);
    expect(list.json().data[0].id).toBe(created.json().id);
  });

  it('serves checkout only the rates the cart qualifies for', async () => {
    await asOwner('POST', `${SETTINGS}/shipping-rates`, {
      name: 'Standard',
      price: fromDecimal('4.99', 'USD'),
      minOrderSubtotal: null,
      maxOrderSubtotal: null,
    });

    // $20 cart: under the $50 threshold, so only Standard is offered.
    const small = await asOwner('GET', `${SETTINGS}/shipping-and-tax?subtotal=2000`);
    expect(small.json().rates.map((r: { name: string }) => r.name)).toEqual(['Standard']);

    // $60 cart: free shipping unlocks and sorts first, being cheaper.
    const large = await asOwner('GET', `${SETTINGS}/shipping-and-tax?subtotal=6000`);
    expect(large.json().rates.map((r: { name: string }) => r.name)).toEqual([
      'Free over $50',
      'Standard',
    ]);
    expect(large.json().tax).toMatchObject({ ratePercentage: 5 });
  });

  it('refuses a negative price, which would subtract from the order total', async () => {
    const response = await asOwner('POST', `${SETTINGS}/shipping-rates`, {
      name: 'Sabotage',
      price: { amount: -500, currencyCode: 'USD' },
      minOrderSubtotal: null,
      maxOrderSubtotal: null,
    });
    expect(response.statusCode).toBe(400);
  });

  it('refuses bounds that can never both hold', async () => {
    const response = await asOwner('POST', `${SETTINGS}/shipping-rates`, {
      name: 'Impossible',
      price: fromDecimal('5.00', 'USD'),
      minOrderSubtotal: fromDecimal('100.00', 'USD'),
      maxOrderSubtotal: fromDecimal('50.00', 'USD'),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].field).toBe('maxOrderSubtotal');
  });

  it('stores the shop’s currency, not whatever the client sent', async () => {
    // A foreign-currency rate is not merely wrong: comparing it to a cart
    // subtotal throws, so it would break the checkout shipping step entirely.
    const created = await asOwner('POST', `${SETTINGS}/shipping-rates`, {
      name: 'Euro rate',
      price: { amount: 700, currencyCode: 'EUR' },
      minOrderSubtotal: null,
      maxOrderSubtotal: null,
    });
    expect(created.json().price.currencyCode).toBe('USD');

    // And the checkout read still works rather than 500-ing.
    const checkout = await asOwner('GET', `${SETTINGS}/shipping-and-tax?subtotal=1000`);
    expect(checkout.statusCode).toBe(200);
  });

  it('404s on a well-formed id that is not this shop’s', async () => {
    const response = await asOwner(
      'DELETE',
      `${SETTINGS}/shipping-rates/ship_01ARZ3NDEKTSV4RRFFQ69G5FAV`,
    );
    expect(response.statusCode).toBe(404);
  });
});

describe('tenancy', () => {
  it('keeps one shop’s shipping rates out of another’s', async () => {
    // Rates live in a JSON column written through an interactive transaction.
    // If the tx client were not shop-scoped, `shop.findFirst()` inside it would
    // read some other shop's row — the one unforgivable bug (CLAUDE.md §6).
    const other = await createTestShop();
    try {
      const cookie = await sessionCookie(app, {
        shopId: other.shopId,
        staffUserId: other.ownerId,
      });

      const before = await app.inject({
        method: 'GET',
        url: `${SETTINGS}/shipping-rates`,
        headers: { cookie },
      });
      expect(before.json().data).toEqual([]);

      await app.inject({
        method: 'POST',
        url: `${SETTINGS}/shipping-rates`,
        headers: { cookie, 'x-requested-with': 'merchant-admin' },
        payload: {
          name: 'Other shop only',
          price: fromDecimal('3.00', 'USD'),
          minOrderSubtotal: null,
          maxOrderSubtotal: null,
        },
      });

      const theirs = await app.inject({
        method: 'GET',
        url: `${SETTINGS}/shipping-rates`,
        headers: { cookie },
      });
      expect(theirs.json().data.map((r: { name: string }) => r.name)).toEqual(['Other shop only']);

      // The first shop must not see it, and must still have its own rates.
      const ours = await asOwner('GET', `${SETTINGS}/shipping-rates`);
      const names = ours.json().data.map((r: { name: string }) => r.name);
      expect(names).not.toContain('Other shop only');
      expect(names).toContain('Standard');
    } finally {
      await deleteTestShops([other.shopId]);
    }
  });
});

describe('access control', () => {
  it('refuses a staff user who does not hold `settings`', async () => {
    const id = await createStaffUser(shop.shopId, {
      email: `nosettings-${shop.slug}@test.dev`,
      permissions: { products: true },
    });
    const cookie = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: id,
      role: 'staff',
      permissions: { products: true },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${SETTINGS}/general`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().errors[0].code).toBe('forbidden');
  });

  it('admits a staff user who does', async () => {
    const id = await createStaffUser(shop.shopId, {
      email: `withsettings-${shop.slug}@test.dev`,
      permissions: { settings: true },
    });
    const cookie = await sessionCookie(app, {
      shopId: shop.shopId,
      staffUserId: id,
      role: 'staff',
      permissions: { settings: true },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${SETTINGS}/general`,
      headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
  });
});

describe('staff', () => {
  it('will not delete or demote the owner', async () => {
    const remove = await asOwner('DELETE', `${SETTINGS}/staff/${shop.ownerId}`);
    expect(remove.statusCode).toBe(403);

    const demote = await asOwner('PUT', `${SETTINGS}/staff/${shop.ownerId}`, { role: 'staff' });
    expect(demote.statusCode).toBe(403);

    // Still there, still the owner.
    const list = await asOwner('GET', `${SETTINGS}/staff`);
    const owner = list.json().data.find((u: { id: string }) => u.id === shop.ownerId);
    expect(owner.role).toBe('owner');
  });

  it('refuses to make a second owner', async () => {
    const id = await createStaffUser(shop.shopId, { email: `promote-${shop.slug}@test.dev` });
    const response = await asOwner('PUT', `${SETTINGS}/staff/${id}`, { role: 'owner' });
    expect(response.statusCode).toBe(403);
  });

  it('rejects a second staff member on the same email', async () => {
    const payload = {
      email: `dupe-${shop.slug}@test.dev`,
      password: 'a-good-password',
      role: 'staff' as const,
    };
    expect((await asOwner('POST', `${SETTINGS}/staff`, payload)).statusCode).toBe(201);

    const again = await asOwner('POST', `${SETTINGS}/staff`, payload);
    expect(again.statusCode).toBe(409);
    expect(again.json().errors[0].field).toBe('email');
  });

  it('never returns a password hash', async () => {
    const list = await asOwner('GET', `${SETTINGS}/staff`);
    for (const user of list.json().data) {
      expect(user).not.toHaveProperty('passwordHash');
    }
  });
});
