/**
 * POST /vault/tokenize — the one unauthenticated endpoint that accepts a PAN,
 * and therefore the one whose behaviour must never be assumed (SPEC §11/§14.2).
 *
 * Its own file, and therefore its own app instance: the route's budget is
 * RATE_LIMITS.checkoutPayment (5/min/IP), the limiter counts per process, and
 * every `inject` here shares 127.0.0.1 — so this suite spends its five
 * requests deliberately and asserts the sixth is the SPEC-shaped 429. Adding a
 * test to this file means accounting for its request in that budget.
 */
import { RATE_LIMITS } from '@merchant/config/constants';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;

const PAN = '4242424242424242';
const CVC = '999';

const tokenize = (body: unknown, origin?: string) =>
  app.inject({
    method: 'POST',
    url: '/vault/tokenize',
    headers: origin === undefined ? {} : { origin },
    payload: body as Record<string, unknown>,
  });

const validCard = (over: Record<string, unknown> = {}) => ({
  number: PAN,
  expMonth: 12,
  expYear: new Date().getUTCFullYear() + 3,
  cvc: CVC,
  ...over,
});

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
});

afterAll(async () => {
  await dbAdmin.vaultCard.deleteMany({ where: { shopId: shop.shopId } });
  await deleteTestShops([shop.shopId]);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

/** The storefront origin the checkout page would send for this shop. */
const originFor = (slug: string) => `http://${slug}.lvh.me:3002`;

it('tokenizes a formatted card and never echoes the PAN or cvc', async () => {
  // Formatted the way a card field renders it — normalisation is the route's job.
  const response = await tokenize(
    validCard({ number: '4242 4242 4242 4242' }),
    originFor(shop.slug),
  );
  expect(response.statusCode, response.body).toBe(201);

  const token = response.json();
  expect(token.cardTokenId).toMatch(/^card_tok_/);
  expect(token.brand).toBe('visa');
  expect(token.last4).toBe('4242');

  // The response is the only thing the browser gets back: no PAN, no cvc, and
  // no key beyond the contract's safe shape may ever ride along.
  expect(response.body).not.toContain(PAN);
  expect(response.body).not.toContain('cvc');
  expect(response.body).not.toContain('number');
  expect(Object.keys(token).sort()).toEqual(
    ['brand', 'cardTokenId', 'expMonth', 'expYear', 'last4'].sort(),
  );

  // And the row it minted belongs to the origin's shop.
  const row = await dbAdmin.vaultCard.findUniqueOrThrow({ where: { id: token.cardTokenId } });
  expect(row.shopId).toBe(shop.shopId);
  expect(row.encryptedBlob).not.toContain(PAN);
});

it('rejects a card that fails Luhn, in the SPEC error shape', async () => {
  const response = await tokenize(validCard({ number: '4242424242424241' }), originFor(shop.slug));
  expect(response.statusCode).toBe(400);
  const error = response.json().errors[0];
  expect(error.code).toBe('invalid_request');
  // The message is shopper-facing: it must name the field, never the digits.
  expect(response.body).not.toContain('4242424242424241');
});

it('rejects an expired card', async () => {
  const response = await tokenize(validCard({ expYear: 2020 }), originFor(shop.slug));
  expect(response.statusCode).toBe(400);
  expect(response.json().errors[0].code).toBe('invalid_request');
});

it('fails closed without an Origin header', async () => {
  const response = await tokenize(validCard());
  expect(response.statusCode).toBe(404);
  expect(response.json().errors[0].code).toBe('not_found');
});

it('fails closed for an origin that is no shop', async () => {
  const response = await tokenize(validCard(), originFor('no-such-shop-zzz'));
  expect(response.statusCode).toBe(404);
});

it('rate-limits the sixth request with the SPEC-shaped 429', async () => {
  // The five tests above each spent one request (the limiter counts onRequest,
  // before origin resolution or validation). This one must now bounce.
  const response = await tokenize(validCard(), originFor(shop.slug));
  expect(response.statusCode, `limit is ${RATE_LIMITS.checkoutPayment.max}/min`).toBe(429);
  expect(response.json().errors[0].code).toBe('rate_limited');
});
