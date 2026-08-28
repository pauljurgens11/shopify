/**
 * Settings → Payments routes (SPEC §11). Owner: WS-D.
 *
 * Deliberately narrow. The routing and refund logic is proved in
 * `packages/pay` against the same database; what is only observable here is the
 * HTTP surface, and of that only the parts that would be a real incident:
 *
 *   - a credential blob must never appear in a response
 *   - one shop must never see or edit another's processors (CLAUDE.md §6)
 *   - a routing table must not be half-applied, and must not point at a
 *     processor the shop has not connected
 *
 * Per-endpoint CRUD coverage is explicitly forbidden by SPEC §14, so there is
 * none.
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import { dbForShop } from '@merchant/db/tenant';
import { savePaymentMethod } from '@merchant/pay/router';
import { tokenizeCard } from '@merchant/pay/vault';
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
let other: TestShop;
let cookie: string;

const auth = () => ({ cookie, 'x-requested-with': 'fetch' });

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  other = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  const where = { shopId: { in: [shop.shopId, other.shopId] } };
  await dbAdmin.routingRule.deleteMany({ where });
  await dbAdmin.processorConfig.deleteMany({ where });
  await deleteTestShops([shop.shopId, other.shopId]);
  await app.close();
});

async function connect(processor: 'mock' | 'stripe' = 'mock') {
  return app.inject({
    method: 'POST',
    url: '/admin/api/payments/processors',
    headers: auth(),
    payload: { processor, credentials: {} },
  });
}

describe('processor configuration', () => {
  it('connects mock without credentials and never echoes a credential field', async () => {
    const response = await connect('mock');
    expect(response.statusCode).toBe(201);

    const body = response.json();
    expect(body).toMatchObject({ processor: 'mock', connected: true, enabled: true });
    // The contract has no credential field; this asserts nothing rides along.
    expect(Object.keys(body)).not.toContain('credentials');
    expect(response.body).not.toContain('encryptedCredentials');
  });

  it('re-connecting updates the existing row instead of colliding on the unique key', async () => {
    // (shopId, processor) is unique, so this exercises the tenant-scoped upsert
    // UPDATE path — the one the tenancy plugin warns turns into a P2002 500 if
    // the scoped `where` fails to find the shop's own row.
    const again = await connect('mock');
    expect(again.statusCode).toBe(201);
    expect(
      await dbAdmin.processorConfig.count({ where: { shopId: shop.shopId, processor: 'mock' } }),
    ).toBe(1);
  });

  it('reports maverick connected without credentials — simulated mode is a real state', async () => {
    // Found in the browser: `connected` derived purely from the credential
    // blob showed a freshly connected simulated maverick as "Error".
    const response = await app.inject({
      method: 'POST',
      url: '/admin/api/payments/processors',
      headers: auth(),
      payload: { processor: 'maverick', displayName: 'Maverick', credentials: {} },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ processor: 'maverick', connected: true });

    await dbAdmin.processorConfig.deleteMany({
      where: { shopId: shop.shopId, processor: 'maverick' },
    });
  });

  it('rejects credentials the processor itself refuses', async () => {
    // stripe.verifyCredentials with no secret key cannot authenticate, so the
    // config must not be stored — a connected badge over a dead key declines
    // every customer at checkout.
    const response = await connect('stripe');
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0]).toMatchObject({ code: 'invalid_request' });

    const stored = await dbAdmin.processorConfig.count({
      where: { shopId: shop.shopId, processor: 'stripe' },
    });
    expect(stored).toBe(0);
  });

  it('never leaks the credential blob through the list endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/admin/api/payments/processors',
      headers: auth(),
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('credentialsIv');
    expect(response.body).not.toContain('encryptedCredentials');
  });

  it("does not show or touch another shop's processors", async () => {
    const foreignId = newId('processor');
    await dbAdmin.processorConfig.create({
      data: {
        id: foreignId,
        shopId: other.shopId,
        processor: 'maverick',
        displayName: 'Theirs',
      },
    });

    const list = await app.inject({
      method: 'GET',
      url: '/admin/api/payments/processors',
      headers: auth(),
    });
    expect(list.json().data.map((c: { id: string }) => c.id)).not.toContain(foreignId);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/admin/api/payments/processors/${foreignId}`,
      headers: auth(),
      payload: { enabled: false },
    });
    expect(patch.statusCode).toBe(404);

    const untouched = await dbAdmin.processorConfig.findUnique({ where: { id: foreignId } });
    expect(untouched?.enabled).toBe(true);
  });
});

describe('routing rules', () => {
  it('refuses a rule pointing at a processor the shop has not connected', async () => {
    const foreign = await dbAdmin.processorConfig.findFirst({ where: { shopId: other.shopId } });
    const response = await app.inject({
      method: 'PUT',
      url: '/admin/api/payments/routing-rules',
      headers: auth(),
      payload: {
        rules: [{ processorConfigId: foreign?.id, weight: 100, conditions: {} }],
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await dbAdmin.routingRule.count({ where: { shopId: shop.shopId } })).toBe(0);
  });

  it('refuses a competing set whose weights exceed 100, and writes nothing', async () => {
    const configs = await app.inject({
      method: 'GET',
      url: '/admin/api/payments/processors',
      headers: auth(),
    });
    const mockId = configs.json().data[0].id;

    const response = await app.inject({
      method: 'PUT',
      url: '/admin/api/payments/routing-rules',
      headers: auth(),
      payload: {
        rules: [
          { processorConfigId: mockId, weight: 60, conditions: {} },
          { processorConfigId: mockId, weight: 60, conditions: {} },
        ],
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await dbAdmin.routingRule.count({ where: { shopId: shop.shopId } })).toBe(0);
  });

  it("replacing this shop's rules leaves another shop's rules alone", async () => {
    const foreign = await dbAdmin.processorConfig.findFirst({ where: { shopId: other.shopId } });
    await dbAdmin.routingRule.create({
      data: {
        id: newId('routingRule'),
        shopId: other.shopId,
        processorConfigId: foreign?.id as string,
        position: 0,
        weight: 100,
      },
    });

    const configs = await app.inject({
      method: 'GET',
      url: '/admin/api/payments/processors',
      headers: auth(),
    });
    await app.inject({
      method: 'PUT',
      url: '/admin/api/payments/routing-rules',
      headers: auth(),
      payload: {
        rules: [{ processorConfigId: configs.json().data[0].id, weight: 100, conditions: {} }],
      },
    });

    // The PUT deletes the whole list before rewriting it. If that deleteMany
    // were not tenant-scoped it would wipe every shop on the platform.
    expect(await dbAdmin.routingRule.count({ where: { shopId: other.shopId } })).toBe(1);
  });

  it('replaces the whole ordered list on PUT', async () => {
    const configs = await app.inject({
      method: 'GET',
      url: '/admin/api/payments/processors',
      headers: auth(),
    });
    const mockId = configs.json().data[0].id;

    const first = await app.inject({
      method: 'PUT',
      url: '/admin/api/payments/routing-rules',
      headers: auth(),
      payload: {
        rules: [
          { processorConfigId: mockId, weight: 70, conditions: {} },
          { processorConfigId: mockId, weight: 30, conditions: { cardBrands: ['amex'] } },
        ],
      },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().data).toHaveLength(2);

    const second = await app.inject({
      method: 'PUT',
      url: '/admin/api/payments/routing-rules',
      headers: auth(),
      payload: { rules: [{ processorConfigId: mockId, weight: 100, conditions: {} }] },
    });
    expect(second.json().data).toHaveLength(1);
    expect(await dbAdmin.routingRule.count({ where: { shopId: shop.shopId } })).toBe(1);
  });
});

describe('saved cards (D4: the repeat-billing beat)', () => {
  let customerId: string;
  let methodId: string;

  beforeAll(async () => {
    customerId = newId('customer');
    await dbAdmin.customer.create({
      data: {
        id: customerId,
        shopId: shop.shopId,
        email: `repeat-${shop.shopId}@example.com`,
        firstName: 'Repeat',
        lastName: 'Buyer',
      },
    });

    const db = dbForShop(shop.shopId);
    const token = await tokenizeCard(db, shop.shopId, {
      number: '4242424242424242',
      expMonth: 12,
      expYear: 2030,
      cvc: '123',
    });
    const method = await savePaymentMethod(db, shop.shopId, customerId, token.cardTokenId);
    methodId = method.id;
  });

  it("lists a customer's saved cards for the order page, default first", async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/admin/api/payments/payment-methods?customerId=${customerId}`,
      headers: auth(),
    });
    expect(response.statusCode).toBe(200);

    const { data } = response.json();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: methodId,
      customerId,
      brand: 'visa',
      last4: '4242',
      isDefault: true,
    });
    // The vault token is pay-internal plumbing; the card list the admin renders
    // has no use for it and no other endpoint accepts it.
    expect(response.body).not.toContain('4242424242424242');
  });

  it("another shop's session sees no cards for the same customer id", async () => {
    const otherCookie = await sessionCookie(app, {
      shopId: other.shopId,
      staffUserId: other.ownerId,
    });
    const response = await app.inject({
      method: 'GET',
      url: `/admin/api/payments/payment-methods?customerId=${customerId}`,
      headers: { cookie: otherCookie, 'x-requested-with': 'fetch' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(0);
  });

  it('charges a saved card over HTTP and dedupes on the idempotency key', async () => {
    const idempotencyKey = `d4-charge-${newId('payment')}`;
    const payload = {
      paymentMethodId: methodId,
      amount: { amount: 2500, currencyCode: 'USD' },
      idempotencyKey,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/admin/api/payments/charge-saved-card',
      headers: auth(),
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'captured',
      amount: { amount: 2500, currencyCode: 'USD' },
      last4: '4242',
    });

    // The double-clicked Charge button: same key, same payment row, one charge.
    const replay = await app.inject({
      method: 'POST',
      url: '/admin/api/payments/charge-saved-card',
      headers: auth(),
      payload,
    });
    expect(replay.json().id).toBe(response.json().id);
    expect(await dbAdmin.payment.count({ where: { shopId: shop.shopId, idempotencyKey } })).toBe(1);
  });
});
