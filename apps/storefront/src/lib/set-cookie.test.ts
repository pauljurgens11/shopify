import { CART_COOKIE } from '@merchant/config/constants';
import { describe, expect, it } from 'vitest';
import { cartTokenFromSetCookie } from './set-cookie.ts';

describe('cartTokenFromSetCookie', () => {
  it('finds the cart token among other cookies and attributes', () => {
    expect(
      cartTokenFromSetCookie([
        'other=ignored; Path=/',
        `${CART_COOKIE}=cart_abc123; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      ]),
    ).toBe('cart_abc123');
  });

  it('returns null when the API set no cart cookie', () => {
    expect(cartTokenFromSetCookie([])).toBeNull();
    expect(cartTokenFromSetCookie(['session=x; Path=/'])).toBeNull();
  });

  it('ignores a cleared cookie rather than pinning an empty token', () => {
    // Relaying `''` would send `_merchant_cart=` on the next request and the
    // shopper would be stuck on a cart that no longer exists.
    expect(cartTokenFromSetCookie([`${CART_COOKIE}=; Path=/; Max-Age=0`])).toBeNull();
  });

  it('does not match a cookie whose name merely contains the cart cookie', () => {
    expect(cartTokenFromSetCookie([`not_${CART_COOKIE}=nope; Path=/`])).toBeNull();
  });
});
