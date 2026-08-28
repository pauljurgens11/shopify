/**
 * Shop slug derivation (SPEC §8 signup). Owner: WS-A.
 *
 * "Aurora Supply Co." → `aurora-supply-co`, the store's storefront subdomain
 * and its admin URL segment. It must satisfy the same rule the contract
 * enforces on an explicitly supplied slug: lowercase alphanumerics separated by
 * single hyphens, 3–63 characters.
 */
import { newSecret } from '@merchant/config/ids';

const MIN = 3;
const MAX = 63;

export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    // Strip combining marks so "Café" becomes "cafe" rather than "caf".
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX)
    .replace(/-+$/, '');

  // A name of pure punctuation or non-Latin script leaves nothing usable; a
  // random slug still gives the merchant a working store.
  return base.length >= MIN ? base : `store-${newSecret(4)}`;
}

/**
 * Candidate slugs in preference order: the derived one, then Shopify's
 * `-2`, `-3`… suffixes, then a random tail that will not collide.
 */
export function slugCandidates(base: string, count = 8): string[] {
  const room = (suffix: string) => `${base.slice(0, MAX - suffix.length)}${suffix}`;
  return [
    base,
    ...Array.from({ length: count }, (_, i) => room(`-${i + 2}`)),
    room(`-${newSecret(4)}`),
  ];
}
