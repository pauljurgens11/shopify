/**
 * Collection page — the theme's `collection` sections (SPEC §10). Owner: WS-E.
 *
 * Sort and availability come straight from the query string, so F1's fallback
 * GET forms work with JavaScript disabled and E1 does the filtering.
 */

import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { CollectionData } from '@merchant/theme-engine/render';
import { renderFooter, renderPage } from '@merchant/theme-engine/render';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnalyticsBeacon } from '../../../components/analytics-beacon.tsx';
import { apiGet, storefrontApiUrl } from '../../../lib/api.ts';
import { resolveThemeReferences } from '../../../lib/page-data.ts';
import { sectionData } from '../../../lib/render.tsx';
import { currentCart, shopContext } from '../../../lib/shop.ts';
import { resolveShopSlug } from '../../../lib/tenant.ts';

type Params = { handle: string };

interface CollectionProductsResponse {
  data: StorefrontProduct[];
  nextCursor: string | null;
  collection: CollectionData['collection'];
}

const single = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * The API's collection query for this URL. Metadata and the page build the same
 * request on purpose: Next memoizes identical fetches inside one render, so the
 * title costs no extra round trip — and it is the merchant's real collection
 * title rather than a title-cased handle ("Sale: 20% Off" ≠ "Sale 20 Off").
 */
function collectionQuery(query: Record<string, string | string[] | undefined>): URLSearchParams {
  const sort = single(query.sort);
  const cursor = single(query.cursor);
  const search = new URLSearchParams({ limit: '24' });
  if (sort) search.set('sort', sort);
  if (cursor) search.set('cursor', cursor);
  return search;
}

type PageProps = {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const slug = await resolveShopSlug();
  const page = slug
    ? await apiGet<CollectionProductsResponse>(
        slug,
        `/collections/${encodeURIComponent(handle)}/products?${collectionQuery(query)}`,
      )
    : null;
  return page ? { title: page.collection.title } : {};
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const { slug, shop, theme, isPreview } = await shopContext();

  const sort = single(query.sort);
  const cursor = single(query.cursor);

  const page = await apiGet<CollectionProductsResponse>(
    slug,
    `/collections/${encodeURIComponent(handle)}/products?${collectionQuery(query)}`,
  );
  if (!page) notFound();

  const [references, cart] = await Promise.all([
    resolveThemeReferences(slug, theme, 'collection'),
    currentCart(slug),
  ]);

  const base = `/collections/${handle}`;
  const withParams = (extra: Record<string, string>) => {
    const next = new URLSearchParams();
    if (sort) next.set('sort', sort);
    for (const [key, value] of Object.entries(extra)) next.set(key, value);
    return `${base}?${next}`;
  };

  const data = sectionData({
    shop,
    cart,
    collection: {
      collection: page.collection,
      products: page.data,
      pagination: {
        // Cursor pagination has no page numbers (CLAUDE.md §5), so the section
        // renders the links it is handed rather than computing them.
        prevUrl: cursor ? base : null,
        nextUrl: page.nextCursor ? withParams({ cursor: page.nextCursor }) : null,
      },
      sort: sort ?? 'manual',
    },
    ...references,
  });

  return (
    <>
      <main>{renderPage(theme, 'collection', data)}</main>
      {renderFooter(theme, data)}
      {isPreview ? null : (
        <AnalyticsBeacon
          endpoint={storefrontApiUrl(slug, '/events')}
          events={[{ type: 'page_view', path: base }]}
        />
      )}
    </>
  );
}
