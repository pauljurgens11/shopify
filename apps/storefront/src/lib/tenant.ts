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

  return slugForCustomDomain(hostname);
}

/**
 * A host outside the base domain can be a merchant's registered custom domain
 * (A5, SPEC §17). The API's tenancy layer owns that table, so ask it: it
 * resolves `/storefront/api/*` requests on custom-domain Hosts too, and the
 * shop payload carries the slug every storefront URL is built from. Composed
 * like `storefrontApiUrl` — hostname carries the tenant, protocol and port
 * come from API_URL — and cached by Next's data cache (revalidate) so a page
 * view does not pay a resolution round-trip every time.
 */
async function slugForCustomDomain(hostname: string): Promise<string | null> {
  const api = new URL(env().API_URL);
  const port = api.port ? `:${api.port}` : '';
  try {
    const response = await fetch(`${api.protocol}//${hostname}${port}/storefront/api/shop`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    const shop = (await response.json()) as { slug?: string };
    return typeof shop.slug === 'string' && shop.slug.length > 0 ? shop.slug : null;
  } catch {
    // An unresolvable or unreachable host is "no shop here", never a crash —
    // the caller renders its 404.
    return null;
  }
}
