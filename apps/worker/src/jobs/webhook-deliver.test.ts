/**
 * The job handler's subscription SELECTION, against real Postgres and a real
 * receiver (SPEC §14 / issue G1). `lib/webhook-delivery.test.ts` owns the HTTP
 * attempt itself; what can go wrong HERE is delivering to the wrong rows — a
 * targeted test event fanning out to every same-topic subscription (other apps
 * included), or a soft-deleted subscription still receiving traffic.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { newId } from '@merchant/config/ids';
import { buildWebhookEventJob } from '@merchant/config/queue';
import { dbAdmin } from '@merchant/db/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { webhookDeliverJob } from './webhook-deliver.ts';

let shopId: string;
let appId: string;
let server: Server;
let baseUrl: string;
/** Paths hit on the receiver, reset per test. */
let hits: string[] = [];

const ctx = { attempt: 1, maxAttempts: 5, jobId: 'test' };

async function subscription(topic: string, path: string, deletedAt: Date | null = null) {
  const id = newId('webhook');
  await dbAdmin.webhookSubscription.create({
    data: {
      id,
      shopId,
      appId,
      topic,
      url: `${baseUrl}${path}`,
      secret: `whsec_${newId('event')}`,
      secretSuffix: 'test',
      deletedAt,
    },
  });
  return id;
}

beforeAll(async () => {
  shopId = newId('shop');
  await dbAdmin.shop.create({
    data: { id: shopId, slug: `deliver-${newId('event')}`, name: 'deliver-test' },
  });
  appId = newId('app');
  await dbAdmin.app.create({
    data: {
      id: appId,
      shopId,
      name: 'Deliver test app',
      apiTokenHash: newId('event'),
      tokenSuffix: 'test',
    },
  });

  server = createServer((req: IncomingMessage, res) => {
    hits.push(req.url ?? '/');
    res.writeHead(200).end('ok');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  hits = [];
  await dbAdmin.webhookDelivery.deleteMany({ where: { shopId } });
  await dbAdmin.webhookSubscription.deleteMany({ where: { shopId } });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await dbAdmin.webhookDelivery.deleteMany({ where: { shopId } });
  await dbAdmin.webhookSubscription.deleteMany({ where: { shopId } });
  await dbAdmin.app.delete({ where: { id: appId } });
  await dbAdmin.shop.delete({ where: { id: shopId } });
  await dbAdmin.$disconnect();
});

describe('webhookDeliverJob subscription selection', () => {
  it('delivers a targeted event ONLY to its subscription, not to topic-mates', async () => {
    const target = await subscription('orders/create', '/target');
    await subscription('orders/create', '/bystander');

    const job = buildWebhookEventJob(
      shopId,
      'orders/create',
      { id: target, test: true },
      new Date(),
      { subscriptionId: target },
    );
    await webhookDeliverJob.handler(job, ctx);

    expect(hits).toEqual(['/target']);
    const rows = await dbAdmin.webhookDelivery.findMany({ where: { shopId } });
    expect(rows.map((r) => r.subscriptionId)).toEqual([target]);
    expect(rows[0]?.status).toBe('success');
  });

  it('fans an untargeted event out to live subscriptions but never soft-deleted ones', async () => {
    const live = await subscription('orders/paid', '/live');
    await subscription('orders/paid', '/deleted', new Date());

    const job = buildWebhookEventJob(shopId, 'orders/paid', { id: 'ord_x' });
    await webhookDeliverJob.handler(job, ctx);

    expect(hits).toEqual(['/live']);
    const rows = await dbAdmin.webhookDelivery.findMany({ where: { shopId } });
    expect(rows.map((r) => r.subscriptionId)).toEqual([live]);
  });
});
