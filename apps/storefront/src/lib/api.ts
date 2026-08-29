/**
 * Server-side client for the storefront API (SPEC §10). Owner: WS-E.
 *
 * The storefront never touches Prisma — it talks to `apps/api` only, which is
 * what makes E1's cache headers meaningful and keeps the WORKSTREAMS boundary
 * real.
 *
 * **The shop travels in the hostname, not a header.** Tenant resolution reads
 * the Host header (SPEC §6), and Node's fetch drops an explicit `host` header
 * the same way a browser does — a client that sets one reaches the API as
 * `localhost`, resolves no shop, and 404s every page while looking like a data
 * problem. So every request goes to `{slug}.{baseDomain}:{apiPort}`.
 */

import { CART_COOKIE } from '@merchant/config/constants';
import { env } from '@merchant/config/env';
import { cookies, headers } from 'next/headers';

/**
 * `demo` + `/shop` → `http://demo.lvh.me:3001/storefront/api/shop`.
 *
 * Hostname from STOREFRONT_BASE_DOMAIN (the domain shops live on), port and
 * protocol from API_URL. Composed rather than string-replaced on API_URL,
 * because that value is `localhost:3001` in some checkouts and swapping its
 * first label would produce `demo` as a hostname.
 */
export function storefrontApiUrl(shopSlug: string, path: string): string {
  const config = env();
  const api = new URL(config.API_URL);
  const baseDomain = config.STOREFRONT_BASE_DOMAIN.split(':')[0];
  const port = api.port ? `:${api.port}` : '';
  return `${api.protocol}//${shopSlug}.${baseDomain}${port}/storefront/api${path}`;
}

/** Cache policy for a read. Previews must never be served from a shared cache. */
type Freshness = { revalidate: number; tags?: string[] } | 'no-store';

interface RequestOptions {
  /** Forward the shopper's cart cookie — required for anything cart-shaped. */
  withCart?: boolean;
  freshness?: Freshness;
}

async function cartCookieHeader(): Promise<string | undefined> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? `${CART_COOKIE}=${token}` : undefined;
}

/**
 * A GET that returns `null` on 404 instead of throwing.
 *
 * Missing is an ordinary outcome on this surface — an unknown handle, a shop
 * with no published theme — and each caller renders its own not-found page.
 */
export async function apiGet<T>(
  shopSlug: string,
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  const cookie = options.withCart ? await cartCookieHeader() : undefined;
  const freshness = options.freshness ?? { revalidate: 60 };

  const response = await fetch(storefrontApiUrl(shopSlug, path), {
    headers: cookie ? { cookie } : {},
    ...(freshness === 'no-store'
      ? { cache: 'no-store' as const }
      : { next: { revalidate: freshness.revalidate, tags: freshness.tags } }),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`storefront api ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * An absolute URL on the host the shopper is actually on.
 *
 * Never build one from a route handler's `request.url`: that carries the
 * server's own origin (`localhost:3002` in dev, the container name behind a
 * proxy), so a redirect built from it drops the shop subdomain and the next
 * request resolves no tenant at all.
 */
export async function absoluteUrl(path: string): Promise<string | null> {
  const host = (await headers()).get('host');
  if (!host) return null;
  return `${env().STOREFRONT_PROTOCOL}://${host}${path}`;
}

/** The absolute URL of the page being rendered, for share links. */
export const currentPageUrl = absoluteUrl;
