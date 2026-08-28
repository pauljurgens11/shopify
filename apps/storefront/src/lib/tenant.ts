/**
 * Storefront tenant resolution (SPEC §6): the shop comes from the Host header.
 *
 * Local:  {shopSlug}.lvh.me:3002  (lvh.me resolves to 127.0.0.1 — no /etc/hosts)
 * Prod:   wildcard subdomain, plus custom domains looked up in CustomDomain.
 *
 * Owner: WS-E.
 */

import { env } from '@merchant/config/env';
import { headers } from 'next/headers';

export async function resolveShopSlug(): Promise<string | null> {
  const host = (await headers()).get('host');
  if (!host) return null;

  // Lowercased like apps/api/src/lib/host.ts — DNS names are case-insensitive,
  // and the two resolvers disagreeing means a shop that loads on the API but
  // 404s on the storefront (test/host.test.ts pins the API side).
  const baseDomain = env().STOREFRONT_BASE_DOMAIN.split(':')[0]?.toLowerCase();
  const hostname = host.split(':')[0]?.toLowerCase();
  if (!baseDomain || !hostname) return null;

  if (hostname.endsWith(`.${baseDomain}`)) {
    const slug = hostname.slice(0, -(baseDomain.length + 1));
    // Guard against `www.` and multi-level hosts resolving to a bogus shop.
    return slug && !slug.includes('.') && slug !== 'www' ? slug : null;
  }

  // TODO(WS-E): fall back to a CustomDomain lookup for production hostnames.
  return null;
}
