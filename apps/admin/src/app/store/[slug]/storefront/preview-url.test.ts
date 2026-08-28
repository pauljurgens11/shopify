import { describe, expect, it } from 'vitest';
import { previewUrl, storefrontOrigin } from './preview-url.ts';

const ORIGIN = 'http://lvh.me:3002';

describe('previewUrl', () => {
  it('points at the shop’s own storefront subdomain', () => {
    expect(storefrontOrigin('demo', ORIGIN)).toBe('http://demo.lvh.me:3002');
    expect(previewUrl({ shopSlug: 'demo', page: 'home' }, ORIGIN)).toBe('http://demo.lvh.me:3002/');
  });

  it('carries the signed token, and omits it entirely when there is none', () => {
    expect(previewUrl({ shopSlug: 'demo', page: 'home', token: 'abc.def' }, ORIGIN)).toContain(
      'preview=abc.def',
    );
    expect(previewUrl({ shopSlug: 'demo', page: 'home', token: null }, ORIGIN)).not.toContain(
      'preview',
    );
  });

  it('deep-links the product and collection pages', () => {
    expect(
      previewUrl({ shopSlug: 'demo', page: 'product', productHandle: 'trail-cap' }, ORIGIN),
    ).toBe('http://demo.lvh.me:3002/products/trail-cap');
    expect(
      previewUrl({ shopSlug: 'demo', page: 'collection', collectionHandle: 'featured' }, ORIGIN),
    ).toBe('http://demo.lvh.me:3002/collections/featured');
  });

  /** The in-app browser only renders localhost origins (CLAUDE.md §1). */
  it('handles the localhost dev origin the same way', () => {
    expect(storefrontOrigin('demo', 'http://localhost:3002')).toBe('http://demo.localhost:3002');
  });

  /** The catalogue may be empty, or B1's endpoint may not answer yet. */
  it('falls back to home rather than a broken /products/undefined', () => {
    expect(previewUrl({ shopSlug: 'demo', page: 'product', productHandle: null }, ORIGIN)).toBe(
      'http://demo.lvh.me:3002/',
    );
    expect(
      previewUrl({ shopSlug: 'demo', page: 'collection', collectionHandle: null }, ORIGIN),
    ).toBe('http://demo.lvh.me:3002/');
  });

  it('changes the URL when asked to refresh, so the iframe actually reloads', () => {
    const first = previewUrl({ shopSlug: 'demo', page: 'home', nonce: 1 }, ORIGIN);
    const second = previewUrl({ shopSlug: 'demo', page: 'home', nonce: 2 }, ORIGIN);
    expect(first).not.toBe(second);
  });
});
