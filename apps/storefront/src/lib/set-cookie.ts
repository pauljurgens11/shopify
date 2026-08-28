/**
 * Reading the cart token out of the API's `Set-Cookie`. Owner: WS-E.
 *
 * Split out and pure so it can be tested: a first-time shopper has no cart, E1
 * mints one on their first "add to cart" and returns it here, and if this fails
 * to pick it up the very next request starts an empty cart — the item they just
 * added silently vanishes. It is the most-used interaction on the storefront
 * and the failure looks like nothing happening at all.
 */
import { CART_COOKIE } from '@merchant/config/constants';

/**
 * A named cookie's value from a `Set-Cookie` list, or null if none set it.
 *
 * Only the name/value pair matters — the storefront re-issues the cookie for
 * its OWN origin with its own attributes, since the API sets it for a different
 * port and the browser would otherwise not send it back.
 *
 * The value is returned DECODED (the API percent-encodes signed values), so
 * callers hand Next's cookie jar a plain value and let it re-encode — passing
 * the wire form through `cookies().set` would double-encode the `%`s and the
 * signature would never verify again.
 */
export function cookieValueFromSetCookie(
  headers: readonly string[],
  cookieName: string,
): string | null {
  for (const header of headers) {
    const [pair] = header.split(';');
    const separator = (pair ?? '').indexOf('=');
    if (separator <= 0) continue;

    const name = pair?.slice(0, separator).trim();
    // A cleared cookie comes back with an empty value; treating that as a
    // token would pin the shopper to a session or cart that no longer exists.
    const value = pair?.slice(separator + 1).trim();
    if (name === cookieName && value) return decodeURIComponent(value);
  }
  return null;
}

/** The cart token from a `Set-Cookie` list, or null if none of them set one. */
export function cartTokenFromSetCookie(headers: readonly string[]): string | null {
  return cookieValueFromSetCookie(headers, CART_COOKIE);
}
