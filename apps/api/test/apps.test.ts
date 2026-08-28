/**
 * G4 — private apps and their credentials.
 *
 * The thing worth testing here is not that CRUD round-trips (SPEC §14 forbids
 * those tests) but the security property the feature exists to hold: a token or
 * signing secret is handed over exactly once, is never readable afterwards, and
 * stops working the moment it is rotated or the app is uninstalled. Each of
 * those is a way the demo leaks a credential or keeps a dead one alive.
 */
import { createHash } from 'node:crypto';
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
let neighbour: TestShop;
let cookie: string;
let neighbourCookie: string;

const HOST = 'api.lvh.me:3001';

function send(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  options: { payload?: unknown; cookie?: string; token?: string } = {},
) {
  const headers: Record<string, string> = { host: HOST };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  else headers.cookie = options.cookie ?? cookie;
  if (method !== 'GET') headers['x-requested-with'] = 'merchant-admin';

  return app.inject({
    method,
    url,
    headers,
    ...(options.payload === undefined ? {} : { payload: options.payload as object }),
  });
}

async function createApp(name = 'Fulfilment bot', scopes = ['read_products', 'read_orders']) {
  const response = await send('POST', '/admin/api/apps', { payload: { name, scopes } });
  expect(response.statusCode).toBe(201);
  return response.json() as { app: { id: string; tokenSuffix: string }; apiToken: string };
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  neighbour = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
  neighbourCookie = await sessionCookie(app, {
    shopId: neighbour.shopId,
    staffUserId: neighbour.ownerId,
  });
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId, neighbour.shopId]);
});

describe('the API token', () => {
  it('is returned exactly once and is never readable again', async () => {
    const { app: created, apiToken } = await createApp();

    expect(apiToken).toMatch(/^shpat_/);
    expect(created.tokenSuffix).toBe(apiToken.slice(-4));

    // Neither the detail read nor the list may carry it back.
    const detail = await send('GET', `/admin/api/apps/${created.id}`);
    const list = await send('GET', '/admin/api/apps');
    expect(JSON.stringify(detail.json())).not.toContain(apiToken);
    expect(JSON.stringify(list.json())).not.toContain(apiToken);
  });

  it('is stored only as a hash — the row never holds the plaintext', async () => {
    const { app: created, apiToken } = await createApp('Hash check');

    const row = await dbAdmin.app.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.apiTokenHash).toBe(createHash('sha256').update(apiToken).digest('hex'));
    expect(row.apiTokenHash).not.toBe(apiToken);
    expect(JSON.stringify(row)).not.toContain(apiToken);
  });

  it('authorizes the Admin API, and rotating it kills the old one immediately', async () => {
    const { app: created, apiToken } = await createApp('Rotating app', ['read_products']);

    // A token nobody has rotated works.
    const before = await send('GET', '/api/products', { token: apiToken });
    expect(before.statusCode).toBe(200);

    const rotated = await send('POST', `/admin/api/apps/${created.id}/rotate-token`);
    expect(rotated.statusCode).toBe(200);
    const next = rotated.json() as { apiToken: string };
    expect(next.apiToken).not.toBe(apiToken);

    // The old one is dead the moment the new one exists — this is the
    // revocation, so a leaked token must not outlive the rotation.
    const after = await send('GET', '/api/products', { token: apiToken });
    expect(after.statusCode).toBe(401);
    expect(after.json().errors[0].code).toBe('unauthorized');

    const withNew = await send('GET', '/api/products', { token: next.apiToken });
    expect(withNew.statusCode).toBe(200);
  });

  it('stops authenticating once the app is uninstalled', async () => {
    const { app: created, apiToken } = await createApp('Doomed app', ['read_products']);
    expect((await send('GET', '/api/products', { token: apiToken })).statusCode).toBe(200);

    const removed = await send('DELETE', `/admin/api/apps/${created.id}`);
    expect(removed.statusCode).toBe(200);

    expect((await send('GET', '/api/products', { token: apiToken })).statusCode).toBe(401);
    // And it disappears from the merchant's list rather than lingering.
    const list = await send('GET', '/admin/api/apps');
    expect((list.json() as { data: { id: string }[] }).data.some((a) => a.id === created.id)).toBe(
      false,
    );
  });
});

describe('webhook subscriptions', () => {
  it('returns the signing secret exactly once, then only by suffix', async () => {
    const { app: created } = await createApp('Webhook app');

    const response = await send('POST', `/admin/api/apps/${created.id}/webhooks`, {
      payload: { topic: 'orders/create', url: 'https://example.test/hooks' },
    });
    expect(response.statusCode).toBe(201);
    const { subscription, secret } = response.json() as {
      subscription: { id: string; secretSuffix: string };
      secret: string;
    };
    expect(secret).toMatch(/^whsec_/);
    expect(subscription.secretSuffix).toBe(secret.slice(-4));

    const list = await send('GET', `/admin/api/apps/${created.id}/webhooks`);
    expect(JSON.stringify(list.json())).not.toContain(secret);

    // The worker still needs the real thing to sign with.
    const row = await dbAdmin.webhookSubscription.findUniqueOrThrow({
      where: { id: subscription.id },
    });
    expect(row.secret).toBe(secret);
  });

  it('rejects a duplicate topic + url on the same app', async () => {
    const { app: created } = await createApp('Duplicate app');
    const payload = { topic: 'orders/paid', url: 'https://example.test/dupe' };

    expect(
      (await send('POST', `/admin/api/apps/${created.id}/webhooks`, { payload })).statusCode,
    ).toBe(201);
    const second = await send('POST', `/admin/api/apps/${created.id}/webhooks`, { payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().errors[0].code).toBe('conflict');
  });

  it('rejects a topic outside the closed set', async () => {
    const { app: created } = await createApp('Bad topic app');
    const response = await send('POST', `/admin/api/apps/${created.id}/webhooks`, {
      payload: { topic: 'orders/exploded', url: 'https://example.test/x' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].code).toBe('invalid_request');
  });
});

describe('the delivery log', () => {
  it("shows only this app's deliveries, newest first", async () => {
    const { app: mine } = await createApp('Log app');
    const { app: other } = await createApp('Other app');

    const subscriptionFor = async (appId: string, url: string) => {
      const response = await send('POST', `/admin/api/apps/${appId}/webhooks`, {
        payload: { topic: 'orders/create', url },
      });
      return (response.json() as { subscription: { id: string } }).subscription.id;
    };

    const mineSub = await subscriptionFor(mine.id, 'https://example.test/mine');
    const otherSub = await subscriptionFor(other.id, 'https://example.test/other');

    for (const [subscriptionId, status] of [
      [mineSub, 'success'],
      [mineSub, 'exhausted'],
      [otherSub, 'success'],
    ] as const) {
      await dbAdmin.webhookDelivery.create({
        data: {
          id: newId('webhookDelivery'),
          shopId: shop.shopId,
          subscriptionId,
          eventId: newId('event'),
          topic: 'orders/create',
          payload: {},
          status,
          attempts: 1,
        },
      });
    }

    const log = await send('GET', `/admin/api/apps/${mine.id}/deliveries`);
    expect(log.statusCode).toBe(200);
    const { data } = log.json() as { data: { subscriptionId: string; id: string }[] };

    expect(data).toHaveLength(2);
    expect(data.every((row) => row.subscriptionId === mineSub)).toBe(true);
    // ULIDs sort chronologically, so id-descending is newest-first.
    expect(data[0]?.id > (data[1]?.id ?? '')).toBe(true);
  });
});

describe('tenancy', () => {
  it('never lets a neighbouring shop see or touch an app', async () => {
    const { app: created } = await createApp('Private app');

    const read = await send('GET', `/admin/api/apps/${created.id}`, { cookie: neighbourCookie });
    expect(read.statusCode).toBe(404);

    const rotate = await send('POST', `/admin/api/apps/${created.id}/rotate-token`, {
      cookie: neighbourCookie,
    });
    expect(rotate.statusCode).toBe(404);

    const list = await send('GET', '/admin/api/apps', { cookie: neighbourCookie });
    expect((list.json() as { data: unknown[] }).data).toHaveLength(0);
  });
});
