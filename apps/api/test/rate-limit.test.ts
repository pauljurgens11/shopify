/**
 * Login rate limiting (SPEC §8: 10/min/IP).
 *
 * Its own file, and therefore its own app instance: the limiter counts per
 * process, so sharing an app with `auth.test.ts` would make that suite's login
 * calls part of this budget and vice versa.
 */

import { RATE_LIMITS } from '@merchant/config/constants';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { closeRedis } from '../src/lib/redis.ts';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shop: TestShop;

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
});

afterAll(async () => {
  await deleteTestShops([shop.shopId]);
  await app.close();
  await closeRedis();
  await dbAdmin.$disconnect();
});

it('answers a brute-forced login with a 429 in the SPEC error shape', async () => {
  const attempt = () =>
    app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: shop.ownerEmail, password: 'wrong-password' },
    });

  for (let i = 0; i < RATE_LIMITS.login.max; i++) {
    expect((await attempt()).statusCode).toBe(401);
  }

  const limited = await attempt();
  expect(limited.statusCode).toBe(429);
  // The limiter throws its own body; without the ApiError bridge in app.ts this
  // surfaced as a 500 with `{ code: 'internal' }`.
  expect(limited.json()).toEqual({
    errors: [{ code: 'rate_limited', message: expect.stringContaining('Rate limit exceeded') }],
  });
});
