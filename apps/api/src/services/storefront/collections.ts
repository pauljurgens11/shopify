/**
 * Storefront collection reads (SPEC §10). Owner: WS-E.
 *
 * Membership is whatever B3 says it is. A manual collection is its join rows; a
 * smart one is its rule set translated to a product `where` by
 * `smartCollectionWhere`, which B3 exports for exactly this. Nothing is
 * materialized, so nothing can go stale — and the storefront cannot disagree
 * with the admin about which products are in a collection.
 *
 * `productCount` is derived from the same clause, filtered to live products: a
 * badge reading "12 products" over a grid of four is worse than no badge.
 */

import { collectionRuleSetSchema } from '@merchant/contracts/collections';
import type { StorefrontCollection } from '@merchant/contracts/storefront';
import { storefrontCollectionSchema } from '@merchant/contracts/storefront';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { notFound } from '../../lib/errors.ts';
import { smartCollectionWhere } from '../catalog/collections.ts';

export interface ResolvedCollection {
  id: string;
  collection: StorefrontCollection;
  /** Membership as a product `where`, ready to AND with the visibility filter. */
  membership: Prisma.ProductWhereInput;
  /** The merchant's chosen order, used when the request does not override it. */
  sortOrder: string;
}

function membershipWhere(row: {
  id: string;
  type: string;
  ruleSet: Prisma.JsonValue;
}): Prisma.ProductWhereInput {
  if (row.type === 'manual') return { collections: { some: { collectionId: row.id } } };

  // A stored rule set is JSON; parsing it here means a bad row fails loudly
  // rather than quietly resolving to the whole catalogue.
  const ruleSet = row.ruleSet === null ? null : collectionRuleSetSchema.parse(row.ruleSet);
  return ruleSet ? smartCollectionWhere(ruleSet) : { id: { in: [] } };
}

export async function getStorefrontCollection(
  db: TenantClient,
  handle: string,
): Promise<ResolvedCollection> {
  const row = await db.collection.findFirst({ where: { handle } });
  if (!row) throw notFound('Collection');

  const membership = membershipWhere(row);
  const productCount = await db.product.count({
    where: { AND: [{ status: 'active' }, membership] },
  });

  return {
    id: row.id,
    membership,
    sortOrder: row.sortOrder,
    collection: storefrontCollectionSchema.parse({
      id: row.id,
      title: row.title,
      handle: row.handle,
      descriptionHtml: row.descriptionHtml,
      imageUrl: row.imageUrl,
      productCount,
    }),
  };
}
