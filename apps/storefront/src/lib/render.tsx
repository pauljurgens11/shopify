/**
 * The bridge between a page and F1's renderer. Owner: WS-E.
 *
 * Sections are Server Components that never fetch (F1's contract), so the page
 * resolves everything first and hands it over as one `SectionDataContext`.
 * Interactive controls arrive as slots the storefront owns — that is the only
 * way a Server Component section can have a working button.
 */
import type { Cart } from '@merchant/contracts/cart';
import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { SectionDataContext, SectionSlots } from '@merchant/theme-engine/render';
import { CartLineControls } from '../components/cart-line-controls.tsx';
import { ProductForm } from '../components/product-form.tsx';
import type { StorefrontShop } from './shop.ts';

/**
 * The slots every page passes. Sort, filter, dismiss and newsletter keep F1's
 * server-rendered fallbacks: they are plain forms that work without JavaScript,
 * and replacing a working control with an island buys nothing.
 */
export const storefrontSlots: SectionSlots = {
  productForm: (product) => <ProductForm product={product} />,
  cartLine: (line) => <CartLineControls line={line} />,
};

export function sectionData(input: {
  shop: StorefrontShop;
  pageUrl?: string | null;
  product?: StorefrontProduct | null;
  relatedProducts?: StorefrontProduct[];
  collection?: SectionDataContext['collection'];
  cart?: Cart | null;
  collectionsByHandle?: SectionDataContext['collectionsByHandle'];
  productsByHandle?: SectionDataContext['productsByHandle'];
  newestProducts?: StorefrontProduct[];
}): SectionDataContext {
  return {
    shop: { name: input.shop.name, slug: input.shop.slug, currencyCode: input.shop.currencyCode },
    pageUrl: input.pageUrl ?? null,
    product: input.product ?? null,
    relatedProducts: input.relatedProducts ?? [],
    collection: input.collection ?? null,
    cart: input.cart ?? null,
    collectionsByHandle: input.collectionsByHandle ?? {},
    productsByHandle: input.productsByHandle ?? {},
    newestProducts: input.newestProducts ?? [],
    slots: storefrontSlots,
  };
}
