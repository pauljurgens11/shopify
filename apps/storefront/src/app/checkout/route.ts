/**
 * `GET /checkout` — the cart's "Check out" button (SPEC §10). Owner: WS-E.
 *
 * A route handler, not a page: it creates the checkout from the session cart
 * and redirects to E4's `/checkouts/{token}`. F1's sections link here rather
 * than building a checkout URL themselves (`shared/urls.ts`), so the two-step
 * handoff lives in exactly one place.
 *
 * A route handler is also the only thing that may relay the cart cookie E1
 * issues to a shopper who did not have one.
 */
import { CART_COOKIE } from '@merchant/config/constants';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { absoluteUrl, storefrontApiUrl } from '../../lib/api.ts';
import { resolveShopSlug } from '../../lib/tenant.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Redirects are built from the request's Host, never from `request.url` —
  // that is the server's own origin, and redirecting to it would drop the shop
  // subdomain that resolves the tenant (SPEC §6).
  const back = async (path: string) => NextResponse.redirect((await absoluteUrl(path)) ?? path);

  const slug = await resolveShopSlug();
  if (!slug) return back('/');

  const token = (await cookies()).get(CART_COOKIE)?.value;
  // No cart at all — nothing to check out. Back to the cart page, which says so.
  if (!token) return back('/cart');

  const response = await fetch(storefrontApiUrl(slug, '/checkouts'), {
    method: 'POST',
    headers: { cookie: `${CART_COOKIE}=${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    // An empty cart answers 409 here; the cart page is the honest destination.
    return back('/cart');
  }

  const checkout = (await response.json()) as { token: string };
  return back(`/checkouts/${checkout.token}`);
}
