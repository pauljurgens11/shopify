/**
 * Custom-domain tenant resolution (A5, SPEC §17).
 *
 * A storefront Host that is not `{slug}.{base}` must fall back to the
 * CustomDomain table — that is what makes "point your own domain at the
 * platform" true. The dangerous failure modes are (a) an unknown domain
 * resolving *some* shop, and (b) shop A's domain resolving shop B — both are
 * cross-tenant renders, the unforgivable bug.
 */
import { newId } from '@merchant/config/ids';
import { dbAdmin } from '@merchant/db/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clearTenantCaches } from '../src/plugins/tenancy.ts';
import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';

let app: FastifyInstance;
let shopA: TestShop;
let shopB: TestShop;
let domainA: string;

beforeAll(async () => {
  app = await buildTestApp();
  shopA = await createTestShop();
  shopB = await createTestShop();

  // A registered custom domain for shop A only. Unique per run, so a rerun
  // never collides on the hostname unique index.
  domainA = `${shopA.slug}.example-shop.test`;
  await dbAdmin.customDomain.create({
    data: { id: newId('customDomain'), shopId: shopA.shopId, hostname: domainA },
  });
  clearTenantCaches();
});

afterAll(async () => {
  await deleteTestShops([shopA.shopId, shopB.shopId]);
  await app.close();
});

describe('storefront custom-domain fallback', () => {
  it('resolves a registered custom domain to its shop', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: domainA },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.shopId).toBe(shopA.shopId);
    // The slug still resolves — storefront URLs and API calls are built from it.
    expect(body.shopSlug).toBe(shopA.slug);
  });

  it('never resolves another shop for a domain it does not own', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: domainA },
    });

    expect(response.json().shopId).not.toBe(shopB.shopId);
  });

  it('404s an unregistered hostname instead of guessing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: 'nobody-registered-this.example-shop.test' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().errors[0].code).toBe('not_found');
  });

  it('is case-insensitive and ignores the port, like DNS', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: `${domainA.toUpperCase()}:443` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().shopId).toBe(shopA.shopId);
  });

  it('still resolves platform subdomains by slug, not by the domain table', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/storefront/api/__probe',
      headers: { host: `${shopB.slug}.lvh.me:3002` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().shopId).toBe(shopB.shopId);
  });

  it('admits a registered custom domain through CORS, so the beacon and card fields work', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/vault/tokenize',
      headers: {
        origin: `https://${domainA}`,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBe(`https://${domainA}`);
  });

  it('does not admit an unregistered origin through CORS', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/vault/tokenize',
      headers: {
        origin: 'https://evil.attacker.test',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
