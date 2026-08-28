/**
 * Per-request shop and theme resolution (SPEC §10). Owner: WS-E.
 *
 * Every page needs the same three things — which shop, which theme, and how
 * many items are in the cart — so they are loaded here once and shared. The
 * shop and theme come from E1 in two cacheable requests; the theme carries the
 * whole ThemeDoc, so there is no second hop to render a page.
 *
 * Both are wrapped in React's `cache`: the layout and the page each need them,
 * and the cart is fetched `no-store`, so without deduplication every page view
 * would pay for the same round trip twice.
 */
import type { Cart } from '@merchant/contracts/cart';
import type { StorefrontThemeResponse } from '@merchant/contracts/storefront';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { THEME_PREVIEW_HEADER } from '../middleware.ts';
import { apiGet } from './api.ts';
import { resolveShopSlug } from './tenant.ts';

export interface StorefrontShop {
  id: string;
  name: string;
  slug: string;
  currencyCode: string;
  themeVersionId: string;
}

export interface ShopContext {
  slug: string;
  shop: StorefrontShop;
  theme: StorefrontThemeResponse['theme'];
  themeVersionId: string;
  isPreview: boolean;
}

/**
 * Resolve the shop and its theme, or render the 404 page.
 *
 * A signed `?preview=` token (F3/F4) serves an unpublished draft and must never
 * be cached — E1 already answers it `no-store`, and asking for a fresh fetch
 * here keeps Next's own cache out of the way too.
 */
const loadShopContext = cache(async (): Promise<ShopContext | null> => {
  const slug = await resolveShopSlug();
  if (!slug) return null;

  // From the middleware, so the layout and every page agree on which theme they
  // are rendering — a page previewing a draft inside published-theme colours
  // would show the builder something that does not exist.
  const previewToken = (await headers()).get(THEME_PREVIEW_HEADER) ?? undefined;
  const preview = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  const [shop, theme] = await Promise.all([
    apiGet<StorefrontShop>(slug, '/shop'),
    apiGet<StorefrontThemeResponse>(slug, `/theme${preview}`, {
      freshness: previewToken ? 'no-store' : { revalidate: 60 },
    }),
  ]);

  // A shop with no published theme cannot render at all; 404 beats a blank page.
  if (!shop || !theme) return null;

  return {
    slug,
    shop,
    theme: theme.theme,
    themeVersionId: theme.themeVersionId,
    isPreview: theme.isPreview,
  };
});

/**
 * The shop context, or `null` on a host that resolves no shop.
 *
 * Only the ROOT LAYOUT should use this. `notFound()` thrown from a root layout
 * is a Next error (E192), not a 404 — the not-found page it wants to render
 * lives inside that very layout — so an unknown subdomain would blow up instead
 * of showing `not-found.tsx`. The layout therefore degrades to a bare shell and
 * lets the page below it call `notFound()`, which renders properly.
 */
export const optionalShopContext = loadShopContext;

/** The shop context, or the 404 page. What every page uses. */
export async function shopContext(): Promise<ShopContext> {
  const context = await loadShopContext();
  if (!context) notFound();
  return context;
}

/**
 * The shopper's cart, or null. Never creates one: a bot hitting the home page
 * should not mint a cart row, and the header badge reads zero either way.
 */
export const currentCart = cache(async (slug: string): Promise<Cart | null> => {
  return apiGet<Cart>(slug, '/cart', { withCart: true, freshness: 'no-store' });
});
