/**
 * Custom-domain → shop lookup (A5, SPEC §17). Owner: WS-A.
 *
 * A storefront can be served on a merchant's own hostname (`CustomDomain`
 * rows) as well as on `{slug}.{base}`. Three callers need the same answer:
 * tenancy's Host resolution, CORS (a registered domain's browser posts the
 * analytics beacon and the checkout PAN cross-origin), and Caddy's on-demand
 * TLS gate (`/health/tls-ask`), which decides whether a hostname is allowed to
 * cost the deployment a certificate at all.
 *
 * `dbAdmin` is sanctioned here for the same reason as in resolveFromHost:
 * this IS the platform-level "which tenant is this?" lookup — there is no
 * shop to scope to yet (SPEC §6).
 *
 * Only hits are cached, mirroring `shopBySlug`: caching a miss would keep a
 * freshly registered domain 404ing for the TTL, and a miss already costs just
 * one indexed SELECT.
 */
import { env } from '@merchant/config/env';
import { dbAdmin } from '@merchant/db/client';
import { shopSlugFromHost } from './host.ts';
import { ttlCache } from './ttl-cache.ts';

const shopByCustomDomain = ttlCache<{ id: string; slug: string }>(30_000);

/** Exported alongside clearTenantCaches so tests and settings writes can invalidate. */
export function clearCustomDomainCache(): void {
  shopByCustomDomain.clear();
}

/**
 * `shop.example.com` → the shop it is registered to, or null. The hostname is
 * normalized like `shopSlugFromHost` (lowercase, no port) — rows store bare
 * lowercase hostnames.
 */
export async function shopForCustomDomain(
  host: string | undefined,
): Promise<{ id: string; slug: string } | null> {
  const hostname = host?.split(':')[0]?.toLowerCase();
  if (!hostname) return null;

  const cached = shopByCustomDomain.get(hostname);
  if (cached) return cached;

  const domain = await dbAdmin.customDomain.findUnique({
    where: { hostname },
    select: { shopId: true },
  });
  if (!domain) return null;

  const shop = await dbAdmin.shop.findUnique({
    where: { id: domain.shopId },
    select: { id: true, slug: true },
  });
  if (!shop) return null;

  shopByCustomDomain.set(hostname, shop);
  return shop;
}

/**
 * "Is this hostname a storefront at all?" — the question Caddy's on-demand TLS
 * gate asks before minting a certificate (A5, SPEC §17).
 *
 * Deliberately a boolean rather than a shop: the caller is a TLS decision, not
 * a request that renders anything, and it must answer for a hostname that has
 * no certificate yet. Same two branches as tenancy's `resolveFromHost`, so a
 * host that would 404 as a storefront never earns a certificate either — under
 * the base domain it is slug-or-nothing, and everything else has to be a
 * registered custom domain.
 */
export async function hostResolvesToShop(host: string | undefined): Promise<boolean> {
  if (!host) return false;

  const slug = shopSlugFromHost(host, env().STOREFRONT_BASE_DOMAIN);
  if (!slug) return (await shopForCustomDomain(host)) !== null;

  const shop = await dbAdmin.shop.findUnique({ where: { slug }, select: { id: true } });
  return shop !== null;
}
