/**
 * Host → shop slug (SPEC §6). Pure, no database.
 *
 * These rules must stay identical to `apps/storefront/src/lib/tenant.ts`: the
 * storefront page and the API call it serves have to agree on which shop a
 * request belongs to, or a page renders shop A's theme over shop B's products.
 */
import { describe, expect, it } from 'vitest';
import { shopSlugFromHost } from '../src/lib/host.ts';

const BASE = 'lvh.me:3002';

describe('shopSlugFromHost', () => {
  it('reads the slug from a subdomain, port and case notwithstanding', () => {
    expect(shopSlugFromHost('demo.lvh.me:3002', BASE)).toBe('demo');
    expect(shopSlugFromHost('demo.lvh.me', BASE)).toBe('demo');
    expect(shopSlugFromHost('Demo.LVH.me:3002', BASE)).toBe('demo');
    expect(shopSlugFromHost('aurora-supply.lvh.me:3002', BASE)).toBe('aurora-supply');
  });

  it('refuses hosts that carry no shop', () => {
    expect(shopSlugFromHost('lvh.me:3002', BASE)).toBeNull(); // apex
    expect(shopSlugFromHost('www.lvh.me:3002', BASE)).toBeNull();
    expect(shopSlugFromHost('a.b.lvh.me:3002', BASE)).toBeNull(); // multi-level
    expect(shopSlugFromHost('.lvh.me:3002', BASE)).toBeNull();
    expect(shopSlugFromHost('evil.com', BASE)).toBeNull();
    expect(shopSlugFromHost('demo.lvh.me.evil.com', BASE)).toBeNull();
    expect(shopSlugFromHost(undefined, BASE)).toBeNull();
    expect(shopSlugFromHost('', BASE)).toBeNull();
  });
});
