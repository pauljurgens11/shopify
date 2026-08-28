/**
 * Search (SPEC §10). Owner: WS-E.
 *
 * Reuses the theme's collection page over `?query=` results, so search looks
 * like the rest of the store rather than a bolted-on list — and a merchant who
 * restyles their collection grid gets search restyled with it.
 */

import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { renderFooter, renderPage } from '@merchant/theme-engine/render';
import type { Metadata } from 'next';
import { AnalyticsBeacon } from '../../components/analytics-beacon.tsx';
import { apiGet, storefrontApiUrl } from '../../lib/api.ts';
import { resolveThemeReferences } from '../../lib/page-data.ts';
import { sectionData } from '../../lib/render.tsx';
import { currentCart, shopContext } from '../../lib/shop.ts';

export const metadata: Metadata = { title: 'Search' };

const single = (value: string | string[] | undefined): string =>
  typeof value === 'string' ? value : '';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  // `q` is the URL a shopper expects; `query` is what E1's API calls it.
  const term = (single(query.q) || single(query.query)).trim();
  const { slug, shop, theme, isPreview } = await shopContext();

  const results = term
    ? await apiGet<{ data: StorefrontProduct[]; nextCursor: string | null }>(
        slug,
        `/products?limit=24&query=${encodeURIComponent(term)}`,
      )
    : null;

  const [references, cart] = await Promise.all([
    resolveThemeReferences(slug, theme, 'collection'),
    currentCart(slug),
  ]);

  const products = results?.data ?? [];
  const data = sectionData({
    shop,
    cart,
    collection: {
      // A synthetic collection, so the theme's own grid renders the results.
      collection: {
        id: 'col_search',
        title: term ? `Search results for “${term}”` : 'Search',
        handle: 'search',
        descriptionHtml: term
          ? `<p>${products.length} result${products.length === 1 ? '' : 's'}.</p>`
          : '<p>Type a search term to find products.</p>',
        imageUrl: null,
        productCount: products.length,
      },
      products,
    },
    ...references,
  });

  return (
    <>
      <main>
        <form action="/search" method="get" className="mx-auto max-w-6xl px-6 pt-10">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              defaultValue={term}
              placeholder="Search products"
              className="w-full rounded-theme border border-text/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-text/60"
            />
            <button
              type="submit"
              className="rounded-theme bg-[var(--theme-button-bg)] px-6 py-3 text-sm font-medium text-[var(--theme-button-fg)] ring-1 ring-[var(--theme-button-border)]"
            >
              Search
            </button>
          </div>
        </form>
        {renderPage(theme, 'collection', data)}
      </main>
      {renderFooter(theme, data)}
      {isPreview ? null : (
        <AnalyticsBeacon
          endpoint={storefrontApiUrl(slug, '/events')}
          events={[{ type: 'page_view', path: '/search' }]}
        />
      )}
    </>
  );
}
