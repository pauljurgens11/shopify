'use client';

/**
 * The header's cart count, published by the cart actions. Owner: WS-E.
 *
 * The count is server-rendered by the layout on every page load, and this is
 * the one thing that has to move without one: adding from a product page must
 * bump the badge while the shopper stays on the page.
 *
 * It deliberately does NOT go through `revalidatePath`. A Server Action that
 * revalidates makes Next re-render the whole route and stream it back on the
 * action's own response, and on a production build that update frequently
 * never commits — see E8 / DECISIONS.md. The actions already return the new
 * `itemCount`, so the badge is driven from that instead and nothing depends on
 * the re-render landing.
 *
 * Module state, not a context: every storefront navigation is a full page load
 * (the chrome uses plain `<a href>`), so this starts empty on each page and the
 * server-rendered count is authoritative again.
 */
let published: number | null = null;
const listeners = new Set<() => void>();

export function publishCartCount(count: number): void {
  published = count;
  for (const listener of listeners) listener();
}

export function subscribeCartCount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `null` until an action on this page has reported a count. */
export function cartCountSnapshot(): number | null {
  return published;
}

/** The server never has a published count, so SSR always renders the layout's. */
export function cartCountServerSnapshot(): number | null {
  return null;
}
