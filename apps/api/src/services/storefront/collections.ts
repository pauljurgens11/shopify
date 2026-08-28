/**
 * Storefront collection reads (SPEC §10). Owner: WS-E.
 *
 * Membership is read from the `CollectionProduct` join table for BOTH manual
 * and smart collections — the storefront never evaluates a rule set. Shopify
 * materializes smart-collection membership the same way, and it is what keeps
 * this query one indexed join instead of a rule interpreter on the hot path.
 *
 * That makes it B3's job to keep the join table in step with a smart
 * collection's rules (logged in DECISIONS.md). If B3 moves to evaluating rules
 * at query time instead, `collectionProductIds` below is the single place the
 * storefront has to change.
 */
import type { StorefrontCollection } from '@merchant/contracts/storefront';
import { storefrontCollectionSchema } from '@merchant/contracts/storefront';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';

export async function getStorefrontCollection(
  db: TenantClient,
  handle: string,
): Promise<{ id: string; collection: StorefrontCollection }> {
  const row = await db.collection.findFirst({
    where: { handle },
    include: {
      // Only live products count towards the badge — a collection reading
      // "12 products" that renders four is worse than no count at all.
      _count: { select: { products: { where: { product: { status: 'active' } } } } },
    },
  });
  if (!row) throw notFound('Collection');

  return {
    id: row.id,
    collection: storefrontCollectionSchema.parse({
      id: row.id,
      title: row.title,
      handle: row.handle,
      descriptionHtml: row.descriptionHtml,
      imageUrl: row.imageUrl,
      productCount: row._count.products,
    }),
  };
}

/** The collection's own default sort, used when the request does not override it. */
export async function collectionSortOrder(db: TenantClient, id: string): Promise<string> {
  const row = await db.collection.findFirst({ where: { id }, select: { sortOrder: true } });
  return row?.sortOrder ?? 'manual';
}
