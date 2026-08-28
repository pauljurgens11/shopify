/**
 * Delivery is exercised against a REAL http server (SPEC §14 / issue G1) — the
 * things that break in production here are timeouts, redirects and signing over
 * the wrong bytes, and a mocked fetch reproduces none of them.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_HMAC_HEADER,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_SHOP_HEADER,
  WEBHOOK_TOPIC_HEADER,
} from '@merchant/config/constants';
import { buildWebhookEventJob } from '@merchant/config/queue';
import { webhookEventJobSchema } from '@merchant/contracts/jobs';
import { webhookEnvelopeSchema } from '@merchant/contracts/webhooks';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './hmac.ts';
import { nextDeliveryState, postWebhook } from './webhook-delivery.ts';

const SECRET = 'whsec_0123456789abcdef0123456789abcdef';

const envelope = {
  id: 'evt_01J8ZC3K4M5N6P7Q8R9S0T1V2W',
  topic: 'orders/create' as const,
  shopId: 'shop_01J8ZC3K4M5N6P7Q8R9S0T1V2X',
  shopSlug: 'demo',
  occurredAt: '2026-08-28T12:00:00.000Z',
  data: {
    id: 'ord_01J8ZC3K4M5N6P7Q8R9S0T1V2Y',
    orderNumber: 1001,
    total: { amount: 1999, currencyCode: 'USD' },
  },
};

type Received = { headers: IncomingMessage['headers']; body: string; path: string };

let server: Server | undefined;

/** Boots a throwaway server on an ephemeral port and returns its base URL. */
async function serve(
  handler: (req: IncomingMessage, res: ServerResponse, received: Received[]) => void,
): Promise<{ url: string; received: Received[] }> {
  const received: Received[] = [];
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      received.push({
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
        path: req.url ?? '/',
      });
      handler(req, res, received);
    });
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, received };
}

afterEach(async () => {
  const s = server;
  server = undefined;
  if (s) await new Promise<void>((resolve) => s.close(() => resolve()));
});

describe('postWebhook', () => {
  it('POSTs a contract-shaped envelope the receiver can verify', async () => {
    const { url, received } = await serve((_req, res) => res.writeHead(200).end('ok'));

    const result = await postWebhook({ url: `${url}/hooks`, secret: SECRET, envelope });

    expect(result).toEqual({ ok: true, status: 200 });
    expect(received).toHaveLength(1);
    const hit = received[0];
    if (!hit) throw new Error('no request recorded');

    expect(hit.path).toBe('/hooks');
    expect(hit.headers['content-type']).toBe('application/json');
    expect(hit.headers[WEBHOOK_TOPIC_HEADER]).toBe('orders/create');
    expect(hit.headers[WEBHOOK_SHOP_HEADER]).toBe(envelope.shopId);
    expect(hit.headers[WEBHOOK_EVENT_HEADER]).toBe(envelope.id);

    // The signature must cover exactly the bytes that arrived, not a re-encode.
    const signature = hit.headers[WEBHOOK_HMAC_HEADER];
    expect(typeof signature).toBe('string');
    expect(verifyWebhookSignature(hit.body, SECRET, String(signature))).toBe(true);

    expect(webhookEnvelopeSchema.parse(JSON.parse(hit.body))).toEqual(envelope);
  });

  it('reports a non-2xx response as a failed attempt with the status', async () => {
    const { url } = await serve((_req, res) => res.writeHead(500).end('boom'));

    const result = await postWebhook({ url, secret: SECRET, envelope });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.ok === false && result.error).toContain('500');
  });

  it('does not follow redirects — a 302 is a failure, not a second request', async () => {
    const { url, received } = await serve((req, res) => {
      if (req.url === '/moved') {
        res.writeHead(302, { location: '/final' }).end();
        return;
      }
      res.writeHead(200).end('ok');
    });

    const result = await postWebhook({ url: `${url}/moved`, secret: SECRET, envelope });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(302);
    expect(received.map((r) => r.path)).toEqual(['/moved']);
  });

  it('gives up on a hanging endpoint instead of pinning a worker slot', async () => {
    // Never responds. Without a timeout this test would hang, which is the point.
    const { url } = await serve(() => {});

    const started = Date.now();
    const result = await postWebhook({ url, secret: SECRET, envelope, timeoutMs: 150 });

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('reports a dead host with the underlying reason, not just "fetch failed"', async () => {
    // Take a real port, then close it, so the connection is genuinely refused.
    const { url } = await serve((_req, res) => res.writeHead(200).end());
    const dead = server;
    server = undefined;
    await new Promise<void>((resolve) => dead?.close(() => resolve()));

    const result = await postWebhook({ url, secret: SECRET, envelope, timeoutMs: 1_000 });

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    // undici puts the real cause on `error.cause`; a delivery log that only
    // says "fetch failed" is useless to the merchant reading it.
    expect(result.ok === false && result.error).toMatch(/ECONNREFUSED/);
  });
});

describe('nextDeliveryState', () => {
  const at = new Date('2026-08-28T12:00:05.000Z');

  it('walks 500, 500, 200 to success and counts the attempts', async () => {
    let calls = 0;
    const { url } = await serve((_req, res) => {
      calls += 1;
      res.writeHead(calls <= 2 ? 500 : 200).end();
    });

    const states = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await postWebhook({ url, secret: SECRET, envelope });
      states.push(nextDeliveryState(result, attempt, WEBHOOK_MAX_ATTEMPTS, at));
    }

    expect(states.map((s) => s.status)).toEqual(['failed', 'failed', 'success']);
    expect(states.map((s) => s.attempts)).toEqual([1, 2, 3]);
    expect(states[2]?.deliveredAt).toEqual(at);
    expect(states[2]?.lastError).toBeNull();
    expect(states[0]?.responseStatus).toBe(500);
    expect(calls).toBe(3);
  });

  it('marks the final failed attempt exhausted, so the log stops saying "will retry"', () => {
    const failure = { ok: false as const, status: 503, error: 'HTTP 503' };

    const notYet = nextDeliveryState(failure, WEBHOOK_MAX_ATTEMPTS - 1, WEBHOOK_MAX_ATTEMPTS, at);
    const done = nextDeliveryState(failure, WEBHOOK_MAX_ATTEMPTS, WEBHOOK_MAX_ATTEMPTS, at);

    expect(notYet.status).toBe('failed');
    expect(done.status).toBe('exhausted');
    expect(done.deliveredAt).toBeNull();
    expect(done.lastError).toBe('HTTP 503');
  });

  it('truncates a hostile error body — lastError is capped at 2000 chars by the contract', () => {
    const state = nextDeliveryState(
      { ok: false, status: 500, error: 'x'.repeat(50_000) },
      1,
      WEBHOOK_MAX_ATTEMPTS,
      at,
    );
    expect(state.lastError?.length).toBeLessThanOrEqual(2000);
  });
});

describe('producer payload', () => {
  it('builds what the worker parses — the two sides of the queue agree', () => {
    const job = buildWebhookEventJob(
      envelope.shopId,
      'orders/paid',
      { id: 'ord_01J8ZC3K4M5N6P7Q8R9S0T1V2Y' },
      new Date('2026-08-28T12:00:00.000Z'),
    );

    const parsed = webhookEventJobSchema.parse(job);
    expect(parsed.topic).toBe('orders/paid');
    expect(parsed.occurredAt).toBe('2026-08-28T12:00:00.000Z');
    expect(parsed.eventId).toMatch(/^evt_/);
  });

  it('mints a fresh event id per emit, so job ids never collide across events', () => {
    const a = buildWebhookEventJob(envelope.shopId, 'orders/paid', {});
    const b = buildWebhookEventJob(envelope.shopId, 'orders/paid', {});
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('carries the targeting subscriptionId through the schema, and omits it by default', () => {
    const targeted = webhookEventJobSchema.parse(
      buildWebhookEventJob(envelope.shopId, 'orders/create', {}, new Date(), {
        subscriptionId: 'wh_01J8ZC3K4M5N6P7Q8R9S0T1V2Z',
      }),
    );
    expect(targeted.subscriptionId).toBe('wh_01J8ZC3K4M5N6P7Q8R9S0T1V2Z');

    // Absent, not null: events queued before the field existed parse the same way.
    const broadcast = webhookEventJobSchema.parse(
      buildWebhookEventJob(envelope.shopId, 'orders/create', {}),
    );
    expect(broadcast.subscriptionId).toBeUndefined();
  });
});
