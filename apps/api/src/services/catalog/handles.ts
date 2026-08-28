/**
 * Product handles — the `/products/{handle}` segment on the storefront.
 *
 * `lib/slug.ts` is WS-A's SHOP slug helper: it enforces a three-character
 * minimum and falls back to `store-xxxx`, which is right for a store URL and
 * wrong for a product called "Ax". Handles only have to satisfy
 * `handleSchema` (non-empty, lowercase, hyphen-separated), so the rules differ.
 */
import { newSecret } from '@merchant/config/ids';

/** `handleSchema` allows 255; the headroom is for the `-2`, `-3` … suffixes. */
const MAX_BASE = 200;

/** "Aurora Rain Jacket!" → `aurora-rain-jacket`. */
export function handleFromTitle(title: string): string {
  const base = title
    .normalize('NFKD')
    // Strip combining marks so "Café Blend" becomes "cafe-blend", not "caf-blend".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE)
    .replace(/-+$/, '');

  // A title of pure punctuation or non-Latin script leaves nothing usable.
  return base || 'product';
}

/**
 * Candidates in preference order — the plain handle, then Shopify's numeric
 * suffixes, then a random tail that cannot realistically collide, so a product
 * always gets a handle instead of a 409 the merchant did not ask for.
 */
export function handleCandidates(base: string, count = 20): string[] {
  return [
    base,
    ...Array.from({ length: count }, (_, i) => `${base}-${i + 2}`),
    `${base}-${newSecret(4)}`,
  ];
}
