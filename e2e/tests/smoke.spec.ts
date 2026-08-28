import { expect, test } from '@playwright/test';

/**
 * SPEC §14.4 — the five mandatory flows. Owner: WS-H.
 *
 * These are the whole e2e budget. Do not add a sixth without cutting one.
 */

test.describe('mandatory smoke flows', () => {
  test.fixme('a) staff login → create product with 2 variants → appears in list', async () => {});

  test.fixme('b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund', async () => {});

  test.fixme('c) discount code applies at checkout', async () => {});

  test.fixme('d) AI builder: apply preset → publish → storefront reflects it', async () => {});

  test.fixme('e) second shop signup is isolated from the demo shop', async () => {});
});

test('skeleton: api answers /health', async ({ request }) => {
  const api = process.env.API_URL ?? 'http://localhost:3001';
  const response = await request.get(`${api}/health`);
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).status).toBe('ok');
});
