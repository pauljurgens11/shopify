/**
 * Storefront route shapes, in one place so no section hardcodes a path.
 * These mirror Shopify's own URLs, which is the point (SPEC §10).
 * Owner: WS-F.
 */
export const HOME_PATH = '/';
export const CART_PATH = '/cart';
/** POST-free entry to checkout: E2 creates the checkout and redirects to E4. */
export const CHECKOUT_PATH = '/checkout';
export const SEARCH_PATH = '/search';

export function productPath(handle: string): string {
  return `/products/${handle}`;
}

export function collectionPath(handle: string): string {
  return `/collections/${handle}`;
}
