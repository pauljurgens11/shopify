'use server';

/**
 * Cart mutations as Server Actions (SPEC §10). Owner: WS-E.
 *
 * Actions rather than client fetches for one concrete reason: the cart cookie
 * is httpOnly, so only the server can read it, and only an action or route
 * handler may set the one E1 returns for a first-time shopper. A `fetch` from
 * the browser to `api.lvh.me` would also be cross-origin, and the cookie would
 * never be sent.
 *
 * Every action revalidates `/cart` so the page and the header badge agree.
 */
import { CART_COOKIE } from '@merchant/config/constants';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { PATHNAME_HEADER } from '../middleware.ts';
import { storefrontApiUrl } from './api.ts';
import { cartTokenFromSetCookie } from './set-cookie.ts';
import { resolveShopSlug } from './tenant.ts';

export interface CartActionResult {
  ok: boolean;
  /** Shopper-facing; E1 sends a real message for "only 3 available". */
  message?: string;
  itemCount?: number;
}

/**
 * One place that talks to E1's cart endpoints: forwards the cart cookie, and
 * relays the `Set-Cookie` E1 issues for a shopper who did not have a cart yet.
 */
async function cartRequest(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<CartActionResult> {
  const slug = await resolveShopSlug();
  if (!slug) return { ok: false, message: 'Store not found.' };

  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;

  const response = await fetch(storefrontApiUrl(slug, path), {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { cookie: `${CART_COOKIE}=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });

  // A first-time shopper gets their cart cookie here; without relaying it the
  // next request starts an empty cart and the item they just added vanishes.
  const issued = cartTokenFromSetCookie(response.headers.getSetCookie?.() ?? []);
  if (issued) jar.set(CART_COOKIE, issued, { httpOnly: true, sameSite: 'lax', path: '/' });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      errors?: Array<{ message?: string }>;
    } | null;
    return {
      ok: false,
      // E1's conflict messages are written for shoppers ("Only 3 are
      // available"), so they are shown rather than replaced with a generic one.
      message: body?.errors?.[0]?.message ?? 'We could not update your cart.',
    };
  }

  const cart = (await response.json()) as { itemCount: number };
  revalidatePath('/cart');
  // …and the page the shopper is actually on, or the header's cart badge keeps
  // the count it was server-rendered with until they navigate — adding from a
  // product page would look like nothing happened. The middleware puts the
  // path on a header, which is also set for the Server Action's own POST.
  const pathname = (await headers()).get(PATHNAME_HEADER);
  if (pathname && pathname !== '/cart') revalidatePath(pathname);
  return { ok: true, itemCount: cart.itemCount };
}

export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  return cartRequest('POST', '/cart/lines', { variantId, quantity });
}

export async function updateCartLine(lineId: string, quantity: number): Promise<CartActionResult> {
  return cartRequest('PUT', `/cart/lines/${lineId}`, { quantity });
}

export async function removeCartLine(lineId: string): Promise<CartActionResult> {
  return cartRequest('DELETE', `/cart/lines/${lineId}`);
}
