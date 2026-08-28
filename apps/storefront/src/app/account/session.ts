/**
 * Server-side reads for the account pages (SPEC §8 — optional path). Owner:
 * WS-E (E5).
 *
 * The customer session cookie is httpOnly and belongs to the storefront
 * origin; only the server can read it and forward it to E5's API routes. Both
 * reads are `no-store` — one shopper's account must never be cached.
 */
import { CUSTOMER_SESSION_COOKIE } from '@merchant/config/constants';
import type { StorefrontCustomer, StorefrontOrderSummary } from '@merchant/contracts/customers';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { storefrontApiUrl } from '../../lib/api.ts';

export async function customerCookieHeader(): Promise<string | undefined> {
  const value = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  return value ? `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(value)}` : undefined;
}

async function accountGet<T>(slug: string, path: string): Promise<T | null> {
  const cookie = await customerCookieHeader();
  // No cookie, no session — skip the round trip the API would 401 anyway.
  if (!cookie) return null;

  const response = await fetch(storefrontApiUrl(slug, path), {
    headers: { cookie },
    cache: 'no-store',
  });
  // 401 covers expired, cross-shop and revoked sessions alike: all of them
  // just mean "not signed in here", which renders as the login page.
  if (!response.ok) return null;
  return (await response.json()) as T;
}

/** The signed-in customer, or null. `cache()` dedupes repeat reads in one request. */
export const currentCustomer = cache(async (slug: string): Promise<StorefrontCustomer | null> => {
  const body = await accountGet<{ customer: StorefrontCustomer }>(slug, '/customers/me');
  return body?.customer ?? null;
});

export async function customerOrders(slug: string): Promise<StorefrontOrderSummary[]> {
  const body = await accountGet<{ data: StorefrontOrderSummary[] }>(slug, '/customers/me/orders');
  return body?.data ?? [];
}
