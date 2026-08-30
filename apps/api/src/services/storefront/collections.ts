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

import { ALL_PRODUCTS_HANDLE } from '@merchant/config/constants';
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

/**
 * The `all` collection is virtual — Shopify's is too, and ours has to be.
 *
 * A theme links to `/collections/all` before a merchant has curated anything:
 * the AI builder writes that link, and so does every "Shop all" in a preset. A
 * handle lookup answers 404 for it on a shop with no collections, which is a
 * dead nav item on a store that is otherwise working. So it resolves here, off
 * no row at all: an empty membership, which `listWhere` ANDs with the same
 * `status: active` filter every other read uses.
 *
 * The id is a sentinel rather than a generated one: it is echoed to the client,
 * and a fresh ULID per request would make the same page look like a different
 * collection on every render.
 */
const ALL_PRODUCTS_ID = 'col_00000000000000000000000000';

async function allProductsCollection(db: TenantClient): Promise<ResolvedCollection> {
  return {
    id: ALL_PRODUCTS_ID,
    // No clause: every live product is a member.
    membership: {},
    sortOrder: 'created-desc',
    collection: storefrontCollectionSchema.parse({
      id: ALL_PRODUCTS_ID,
      title: 'All products',
      handle: ALL_PRODUCTS_HANDLE,
      descriptionHtml: '',
      imageUrl: null,
      productCount: await db.product.count({ where: { status: 'active' } }),
    }),
  };
}

export async function getStorefrontCollection(
  db: TenantClient,
  handle: string,
): Promise<ResolvedCollection> {
  const row = await db.collection.findFirst({ where: { handle } });
  // A real collection on this handle is the merchant's own and outranks the
  // virtual one — they may well have curated it.
  if (!row) {
    if (handle === ALL_PRODUCTS_HANDLE) return allProductsCollection(db);
    throw notFound('Collection');
  }

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
