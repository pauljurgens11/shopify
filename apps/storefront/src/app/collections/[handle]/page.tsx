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

type Params = { handle: string };

interface CollectionProductsResponse {
  data: StorefrontProduct[];
  nextCursor: string | null;
  collection: CollectionData['collection'];
}

const single = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: handle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const { slug, shop, theme, isPreview } = await shopContext();

  const sort = single(query.sort);
  const cursor = single(query.cursor);
  const search = new URLSearchParams({ limit: '24' });
  if (sort) search.set('sort', sort);
  if (cursor) search.set('cursor', cursor);

  const page = await apiGet<CollectionProductsResponse>(
    slug,
    `/collections/${encodeURIComponent(handle)}/products?${search}`,
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
