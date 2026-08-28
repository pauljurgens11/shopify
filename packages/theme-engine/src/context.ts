/**
 * The data contract between the storefront (WS-E) and the theme engine (WS-F).
 *
 * Sections are Server Components: they never fetch. E2 resolves everything a
 * page needs — the product, the collection and its products, the cart, and the
 * collections/products the model referenced by handle — and hands it in here.
 * Marketing sections may ignore it entirely; core sections cannot render
 * without it.
 *
 * Owner: WS-F.
 */
import type { Cart, CartLine } from '@merchant/contracts/cart';
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { Section, SectionType } from '@merchant/contracts/theme';
import type { ReactNode } from 'react';

export type ThemePage = 'home' | 'product' | 'collection';

/** Shape of `storefrontCollectionSchema` — the collection fields a theme renders. */
export type ThemeCollection = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  imageUrl: string | null;
  productCount: number;
};

export type CollectionData = {
  collection: ThemeCollection;
  /**
   * The page of products E1 returned, already sorted/filtered. Fetch exactly
   * `collection-page`'s `productsPerPage` setting — the section renders at most
   * that many, so a larger page would leave products unreachable.
   */
  products: StorefrontProduct[];
  /**
   * Hrefs for the previous/next page. E1 paginates by cursor (CLAUDE.md §5), so
   * the section renders links it is given rather than computing page numbers.
   */
  pagination?: { prevUrl: string | null; nextUrl: string | null };
  /** Active sort key from the URL, so the sort control shows the current option. */
  sort?: string;
};

/**
 * Client islands. Sections are Server Components (no hooks, no state), so every
 * interactive control is passed in as a slot that E2 owns and renders.
 * A missing slot renders nothing — never a dead-looking control.
 */
export type SectionSlots = {
  /** product-detail: option pickers + quantity + add-to-cart, as one island. */
  productForm?: (
    product: StorefrontProduct,
    settings: Extract<Section, { type: 'product-detail' }>['settings'],
  ) => ReactNode;
  /** cart-page: quantity stepper + remove for one line. */
  cartLine?: (line: CartLine) => ReactNode;
  /** collection-page: sort control. Falls back to a plain GET form. */
  collectionSort?: (current: string) => ReactNode;
  /** collection-page: availability filter. Falls back to a plain GET form. */
  collectionFilters?: () => ReactNode;
  /** announcement-bar: dismiss control. */
  announcementDismiss?: () => ReactNode;
  /** footer + newsletter section: email capture. */
  newsletterForm?: (buttonLabel: string) => ReactNode;
};

export type SectionDataContext = {
  shop: { name: string; slug: string; currencyCode: string };
  /** Absolute URL of the page being rendered; enables share links. */
  pageUrl?: string | null;
  /* --- product page --- */
  product?: StorefrontProduct | null;
  relatedProducts?: StorefrontProduct[];
  /* --- collection page --- */
  collection?: CollectionData | null;
  /* --- cart page --- */
  cart?: Cart | null;
  /* --- handles the model referenced, resolved by E2 (may be missing/stale) --- */
  collectionsByHandle?: Record<string, CollectionData | undefined>;
  productsByHandle?: Record<string, StorefrontProduct | undefined>;
  /** Fallback for `product-grid` when its `productHandles` list is empty. */
  newestProducts?: StorefrontProduct[];
  slots?: SectionSlots;
};

/** Props every section component receives. Use in section files: `SectionProps<'hero'>`. */
export type SectionProps<T extends SectionType> = {
  settings: Extract<Section, { type: T }>['settings'];
  data: SectionDataContext;
};
