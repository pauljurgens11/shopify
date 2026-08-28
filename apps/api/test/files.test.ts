/**
 * B2 — presigned uploads.
 *
 * What is worth asserting is the boundary, not the signature: the SDK owns the
 * signing math. This file covers what we decide — which files are allowed, and
 * that a key cannot escape its shop's prefix, which is the one way a filename
 * could reach another tenant's objects in a shared bucket.
 */
import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
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
let cookie: string;

const PRESIGN = '/admin/api/files/presign';

const png = (over: Record<string, unknown> = {}) => ({
  filename: 'hero.png',
  contentType: 'image/png',
  sizeBytes: 120_000,
  ...over,
});

function presign(payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: PRESIGN,
    headers: { cookie, 'x-requested-with': CSRF_HEADER_VALUE },
    payload,
  });
}

beforeAll(async () => {
  app = await buildTestApp();
  shop = await createTestShop();
  cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
});

afterAll(async () => {
  await app.close();
  await deleteTestShops([shop.shopId]);
});

describe('presign', () => {
  it('returns an upload target under this shop’s prefix', async () => {
    const response = await presign(png());
    expect(response.statusCode, response.body).toBe(200);
    const body = response.json();

    expect(body.key).toMatch(
      new RegExp(`^shops/${shop.shopId}/img_[0-9A-HJKMNP-TV-Z]{26}-hero\\.png$`),
    );
    // What the storefront and ProductImage.url will actually hold.
    expect(body.publicUrl).toBe(`${env().S3_PUBLIC_URL}/${body.key}`);
    // The browser PUTs here directly — the API never sees the bytes.
    expect(body.uploadUrl).toContain(body.key);
    expect(body.uploadUrl).toMatch(/X-Amz-Signature=/);
    expect(body.expiresInSeconds).toBeGreaterThan(0);
  });

  it('never lets a filename climb out of the shop prefix', async () => {
    const response = await presign(png({ filename: '../../../other-shop/steal.png' }));
    expect(response.statusCode, response.body).toBe(200);

    const { key } = response.json();
    expect(key.startsWith(`shops/${shop.shopId}/`)).toBe(true);
    expect(key).not.toContain('..');
    expect(key).not.toContain('other-shop');
  });

  it('makes a messy filename into a clean, single key segment', async () => {
    const response = await presign(png({ filename: 'Aurora Hero Shot!.PNG' }));
    // Lowercased, punctuation collapsed, and no hyphen left stranded before the
    // extension — these keys are visible in every storefront image URL.
    expect(response.json().key).toMatch(/-aurora-hero-shot\.png$/);
  });

  it('gives each upload its own key, so a repeated filename cannot clobber', async () => {
    const [first, second] = await Promise.all([presign(png()), presign(png())]);
    expect(first.json().key).not.toBe(second.json().key);
  });

  it('refuses a file larger than the cap', async () => {
    const response = await presign(png({ sizeBytes: 50 * 1024 * 1024 }));
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0]).toMatchObject({
      code: 'invalid_request',
      field: 'sizeBytes',
    });
  });

  it('refuses anything that is not an image', async () => {
    const response = await presign(
      png({ filename: 'payload.exe', contentType: 'application/x-msdownload' }),
    );
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].field).toBe('contentType');
  });

  it('requires a signed-in staff user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: PRESIGN,
      headers: { 'x-requested-with': CSRF_HEADER_VALUE },
      payload: png(),
    });
    expect(response.statusCode).toBe(401);
  });
});
