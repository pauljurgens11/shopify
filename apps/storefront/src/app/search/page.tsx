/**
 * Search (SPEC §10). Owner: WS-E.
 *
 * Reuses the theme's collection page over `?query=` results, so search looks
 * like the rest of the store rather than a bolted-on list — and a merchant who
 * restyles their collection grid gets search restyled with it.
 */

import type { StorefrontProduct } from '@merchant/contracts/storefront';
import { renderFooter, renderPage } from '@merchant/theme-engine/render';
import { HOME_PATH, ThemeButton } from '@merchant/theme-engine/shared';
import type { Metadata } from 'next';
import { AnalyticsBeacon } from '../../components/analytics-beacon.tsx';
import { apiGet, storefrontApiUrl } from '../../lib/api.ts';
import { resolveThemeReferences } from '../../lib/page-data.ts';
import { sectionData } from '../../lib/render.tsx';
import { currentCart, shopContext } from '../../lib/shop.ts';

const single = (value: string | string[] | undefined): string =>
  typeof value === 'string' ? value : '';

const searchTerm = (query: Record<string, string | string[] | undefined>): string =>
  // `q` is the URL a shopper expects; `query` is what E1's API calls it.
  (single(query.q) || single(query.query)).trim();

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const term = searchTerm(await searchParams);
  return { title: term ? `Search results for “${term}”` : 'Search' };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const term = searchTerm(await searchParams);
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
        // The term is NEVER interpolated here: this string is rendered as HTML
        // by the section, and a shopper's query is untrusted input.
        descriptionHtml: `<p>${products.length} result${products.length === 1 ? '' : 's'}.</p>`,
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
        {/* The theme's collection grid renders hits; a miss gets a real empty
            state rather than the grid's "No products here yet", which is the
            wrong sentence for a search that simply found nothing. */}
        {products.length > 0 ? (
          renderPage(theme, 'collection', data)
        ) : (
          <SearchEmptyState term={term} />
        )}
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

/** No query yet, or a query that matched nothing. Both are ordinary outcomes. */
function SearchEmptyState({ term }: { term: string }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-20 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        aria-hidden="true"
        className="h-10 w-10 text-text/30"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.6-3.6" strokeLinecap="round" />
      </svg>
      {term ? (
        <>
          <h1 className="font-heading text-2xl text-text">No results for “{term}”</h1>
          <p className="max-w-md text-sm text-text/60">
            Check the spelling, or try a shorter or more general search term.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-heading text-2xl text-text">Search the store</h1>
          <p className="max-w-md text-sm text-text/60">
            Type what you are looking for and we will find it.
          </p>
        </>
      )}
      <ThemeButton href={HOME_PATH} variant="secondary">
        Browse the store
      </ThemeButton>
    </div>
  );
}
