/**
 * Product page — the theme's `product` sections (SPEC §10). Owner: WS-E.
 */

import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { renderFooter, renderPage } from '@merchant/theme-engine/render';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnalyticsBeacon } from '../../../components/analytics-beacon.tsx';
import { apiGet, currentPageUrl, storefrontApiUrl } from '../../../lib/api.ts';
import { resolveThemeReferences } from '../../../lib/page-data.ts';
import { sectionData } from '../../../lib/render.tsx';
import { currentCart, shopContext } from '../../../lib/shop.ts';
import { resolveShopSlug } from '../../../lib/tenant.ts';

type Params = { handle: string };

async function loadProduct(handle: string): Promise<StorefrontProduct | null> {
  const slug = await resolveShopSlug();
  if (!slug) return null;
  return apiGet<StorefrontProduct>(slug, `/products/${encodeURIComponent(handle)}`);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  const product = await loadProduct(handle);
  if (!product) return {};
  return {
    // A merchant-authored SEO title is used verbatim — it usually already names
    // the shop, and the layout's `%s · Shop` template would say it twice.
    title: product.seo.title ? { absolute: product.seo.title } : product.title,
    description: product.seo.description ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  const { slug, shop, theme, isPreview } = await shopContext();

  const product = await apiGet<StorefrontProduct>(slug, `/products/${encodeURIComponent(handle)}`);
  // A draft product 404s from E1 exactly like a missing one, so an unreleased
  // handle cannot be probed from the storefront.
  if (!product) notFound();

  const [references, cart, related, pageUrl] = await Promise.all([
    resolveThemeReferences(slug, theme, 'product'),
    currentCart(slug),
    apiGet<{ data: StorefrontProduct[] }>(slug, '/products?limit=5&sort=created-desc'),
    currentPageUrl(`/products/${handle}`),
  ]);

  const data = sectionData({
    shop,
    product,
    pageUrl,
    // Never recommend the product the shopper is already looking at.
    relatedProducts: (related?.data ?? []).filter((item) => item.id !== product.id).slice(0, 4),
    cart,
    ...references,
  });

  return (
    <>
      <main>{renderPage(theme, 'product', data)}</main>
      {renderFooter(theme, data)}
      {isPreview ? null : (
        <AnalyticsBeacon
          endpoint={storefrontApiUrl(slug, '/events')}
          events={[
            { type: 'page_view', path: `/products/${handle}` },
            { type: 'product_view', path: `/products/${handle}`, productId: product.id },
          ]}
        />
      )}
    </>
  );
}
