/**
 * The one piece of the storefront's API client worth unit-testing: which URL a
 * request goes to.
 *
 * The shop is resolved from the Host header (SPEC §6), and Node's fetch DROPS
 * an explicit `host` header — undici treats it as forbidden, exactly as a
 * browser does. A client that sets `headers: { host }` therefore reaches the
 * API as `localhost`, resolves no tenant, and 404s every storefront page. It
 * fails silently and looks like a data problem, so the hostname has to be in
 * the URL and that is what these assert.
 *
 * Everything else here is Server Components rendering the theme engine; SPEC
 * §14 forbids snapshotting those.
 */
import { describe, expect, it } from 'vitest';
import { storefrontApiUrl } from './api.ts';

describe('storefrontApiUrl', () => {
  it('puts the shop slug in the hostname, where the API can see it', () => {
    // `api.lvh.me:3001` + shop `demo` → `demo.lvh.me:3001`: same port and
    // protocol as API_URL, hostname from the storefront's base domain.
    expect(storefrontApiUrl('demo', '/shop')).toBe('http://demo.lvh.me:3001/storefront/api/shop');
  });

  it('keeps the API port rather than the storefront one', () => {
    // STOREFRONT_BASE_DOMAIN carries :3002; borrowing that port would send
    // storefront pages to themselves in an infinite loop.
    const url = new URL(storefrontApiUrl('demo', '/products'));
    expect(url.port).toBe('3001');
    expect(url.hostname).toBe('demo.lvh.me');
  });

  it('preserves query strings and encodes the path', () => {
    expect(storefrontApiUrl('demo', '/products?query=merino&limit=4')).toBe(
      'http://demo.lvh.me:3001/storefront/api/products?query=merino&limit=4',
    );
  });

  it('is not confused by a slug that looks like a host', () => {
    const url = new URL(storefrontApiUrl('aurora-supply', '/shop'));
    expect(url.hostname).toBe('aurora-supply.lvh.me');
  });
});
