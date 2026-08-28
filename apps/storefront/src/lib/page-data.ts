/**
 * Resolving the handles a theme references (SPEC §10, §12). Owner: WS-E.
 *
 * A ThemeDoc names collections and products by handle — the AI builder writes
 * them, and a merchant can rename or delete what they point at. So every
 * lookup here is allowed to come back empty: F1's sections render a tasteful
 * placeholder rather than crashing, and that is the contract that keeps a
 * stale handle from taking a storefront down.
 */

import type { StorefrontProduct } from '@merchant/contracts/storefront';
import type { Section, ThemeDoc } from '@merchant/contracts/theme';
import type { CollectionData, ThemePage } from '@merchant/theme-engine/render';
import { apiGet } from './api.ts';

interface CollectionProductsResponse {
  data: StorefrontProduct[];
  nextCursor: string | null;
  collection: CollectionData['collection'];
}

/** Handles the sections on one page reference, so we fetch each exactly once. */
function referencedHandles(sections: Section[]): { collections: string[]; products: string[] } {
  const collections = new Set<string>();
  const products = new Set<string>();

  for (const section of sections) {
    if (section.type === 'featured-collection') collections.add(section.settings.collectionHandle);
    if (section.type === 'collection-list') {
      for (const handle of section.settings.collectionHandles) collections.add(handle);
    }
    if (section.type === 'product-grid') {
      for (const handle of section.settings.productHandles) products.add(handle);
    }
  }
  return { collections: [...collections], products: [...products] };
}

export async function resolveThemeReferences(
  slug: string,
  doc: ThemeDoc,
  page: ThemePage,
): Promise<{
  collectionsByHandle: Record<string, CollectionData | undefined>;
  productsByHandle: Record<string, StorefrontProduct | undefined>;
  newestProducts: StorefrontProduct[];
}> {
  const sections = doc.pages[page];
  const { collections, products } = referencedHandles(sections);

  // `product-grid` falls back to newest when its handle list is empty, so only
  // pay for that query when a section on this page can actually use it.
  const needsNewest = sections.some(
    (section) => section.type === 'product-grid' && section.settings.productHandles.length === 0,
  );

  const [collectionResults, productResults, newest] = await Promise.all([
    Promise.all(
      collections.map(async (handle) => {
        const page = await apiGet<CollectionProductsResponse>(
          slug,
          `/collections/${encodeURIComponent(handle)}/products?limit=12`,
        );
        return [handle, page] as const;
      }),
    ),
    Promise.all(
      products.map(async (handle) => {
        const product = await apiGet<StorefrontProduct>(
          slug,
          `/products/${encodeURIComponent(handle)}`,
        );
        return [handle, product] as const;
      }),
    ),
    needsNewest
      ? apiGet<{ data: StorefrontProduct[] }>(slug, '/products?limit=8&sort=created-desc')
      : Promise.resolve(null),
  ]);

  return {
    collectionsByHandle: Object.fromEntries(
      collectionResults.map(([handle, result]) => [
        handle,
        result ? { collection: result.collection, products: result.data } : undefined,
      ]),
    ),
    productsByHandle: Object.fromEntries(
      productResults.map(([handle, product]) => [handle, product ?? undefined]),
    ),
    newestProducts: newest?.data ?? [],
  };
}
