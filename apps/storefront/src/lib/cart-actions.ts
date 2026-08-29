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
 * No action calls `revalidatePath`, and that is the fix for E8 rather than a
 * tidy-up. A revalidating action makes Next re-render the route and stream the
 * new tree back on the action's own response, and on a production build that
 * update frequently never commits: React reads the whole flight and closes the
 * stream cleanly and still does not apply it. Measured on this page, same
 * build, two buttons side by side — the same mutating action settles 0/8 with
 * the revalidation and 12/12 without. (E8's own notes list revalidatePath as
 * excluded; it does not reproduce that way here. Method in DECISIONS.md.)
 *
 * Nothing here needs it either. The cart is fetched `no-store`, every
 * storefront page is dynamic, and the chrome navigates with plain `<a href>` —
 * so a real navigation always re-reads the cart from the server. What has to
 * move WITHOUT a navigation is returned instead: `itemCount` drives the header
 * badge through `cart-count.ts`.
 *
 * The dependency that buys: this holds only while the storefront chrome stays
 * on plain anchors. Swapping one for `next/link` reintroduces Next's client
 * router cache, and with it a stale cart page and a stale badge.
 */
import { CART_COOKIE } from '@merchant/config/constants';
import { cookies } from 'next/headers';
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
