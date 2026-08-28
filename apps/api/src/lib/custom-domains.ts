/**
 * Custom-domain → shop lookup (A5, SPEC §17). Owner: WS-A.
 *
 * A storefront can be served on a merchant's own hostname (`CustomDomain`
 * rows) as well as on `{slug}.{base}`. Two callers need the same answer:
 * tenancy's Host resolution, and CORS (a registered domain's browser posts
 * the analytics beacon and the checkout PAN cross-origin).
 *
 * `dbAdmin` is sanctioned here for the same reason as in resolveFromHost:
 * this IS the platform-level "which tenant is this?" lookup — there is no
 * shop to scope to yet (SPEC §6).
 *
 * Only hits are cached, mirroring `shopBySlug`: caching a miss would keep a
 * freshly registered domain 404ing for the TTL, and a miss already costs just
 * one indexed SELECT.
 */
import { dbAdmin } from '@merchant/db/client';
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
