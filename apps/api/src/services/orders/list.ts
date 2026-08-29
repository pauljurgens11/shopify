/**
 * The orders index query (SPEC §9). Shared, because C4's customer detail page
 * shows the same table for one customer and must not grow a second version of
 * the tab and search rules.
 *
 * Owner: WS-C.
 */

import { isId } from '@merchant/config/ids';
import type { Paginated } from '@merchant/contracts/common';
import type { ListOrdersQuery, OrderSummary } from '@merchant/contracts/orders';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest } from '../../lib/errors.ts';
import { toOrderSummary } from './serialize.ts';

/** Sort keys the index offers. Anything else would be an unindexed table scan. */
const SORT_KEYS = new Set(['createdAt', 'total', 'orderNumber']);

/**
 * Shopify's index tabs. We have no "archived" flag, so `closed` means the order
 * needs nothing further — cancelled, or fully fulfilled (see DECISIONS.md).
 */
function tabFilter(tab: ListOrdersQuery['tab']): Prisma.OrderWhereInput {
  switch (tab) {
    case 'unfulfilled':
      return {
        cancelledAt: null,
        fulfillmentStatus: { in: ['unfulfilled', 'partially_fulfilled'] },
      };
    case 'unpaid':
      return { cancelledAt: null, financialStatus: { in: ['pending', 'authorized'] } };
    case 'open':
      return { cancelledAt: null, NOT: { fulfillmentStatus: 'fulfilled' } };
    case 'closed':
      return { OR: [{ NOT: { cancelledAt: null } }, { fulfillmentStatus: 'fulfilled' }] };
    default:
      return {};
  }
}

/**
 * What staff actually paste into the search box: an order number (with or
 * without the `#`), a customer's email, or their name.
 */
function searchFilter(query: string | undefined): Prisma.OrderWhereInput {
  const term = query?.trim();
  if (!term) return {};

  const or: Prisma.OrderWhereInput[] = [
    { email: { contains: term, mode: 'insensitive' } },
    { customer: { firstName: { contains: term, mode: 'insensitive' } } },
    { customer: { lastName: { contains: term, mode: 'insensitive' } } },
  ];

  // Clamp to int32: a pasted tracking number parses as a huge float that would
  // overflow Prisma's Int and 500 instead of returning an empty match.
  const numeric = Number.parseInt(term.replace(/^#/, ''), 10);
  if (Number.isSafeInteger(numeric) && numeric >= 0 && numeric <= 2_147_483_647) {
    or.push({ orderNumber: numeric });
  }

  return { OR: or };
}

export async function listOrders(
  db: TenantClient,
  query: ListOrdersQuery,
): Promise<Paginated<OrderSummary>> {
  // A cursor is an order id we handed out. Anything else is a bad request, not
  // a 500 from the query engine.
  if (query.cursor && !isId('order', query.cursor)) {
    throw badRequest('Invalid cursor.', 'cursor');
  }

  const sortKey = SORT_KEYS.has(query.sortKey ?? '') ? (query.sortKey as string) : 'createdAt';
  const direction = query.sortOrder;

  // Composed with AND, never object spread: tabFilter and searchFilter both
  // produce `OR`/`financialStatus` keys, and a spread would let the later one
  // silently clobber the earlier (Closed tab + search showed open orders).
  const where: Prisma.OrderWhereInput = {
    AND: [
      tabFilter(query.tab),
      searchFilter(query.query),
      ...(query.financialStatus ? [{ financialStatus: query.financialStatus }] : []),
      ...(query.fulfillmentStatus ? [{ fulfillmentStatus: query.fulfillmentStatus }] : []),
      ...(query.customerId ? [{ customerId: query.customerId }] : []),
      ...(query.createdAtMin || query.createdAtMax
        ? [
            {
              createdAt: {
                ...(query.createdAtMin ? { gte: new Date(query.createdAtMin) } : {}),
                ...(query.createdAtMax ? { lte: new Date(query.createdAtMax) } : {}),
              },
            },
          ]
        : []),
    ],
  };

  // orderNumber breaks ties: it is unique per shop and strictly increasing, so
  // the page boundary is stable even when a batch of orders shares a timestamp.
  // Sorting on `id` instead would not be — ULIDs generated in the same
  // millisecond are not ordered.
  const orderBy =
    sortKey === 'orderNumber'
      ? [{ orderNumber: direction }]
      : [{ [sortKey]: direction }, { orderNumber: direction }];

  const rows = await db.order.findMany({
    where,
    orderBy,
    take: query.limit,
    // The name renders the index's Customer column; the count and spend that
    // `orderDetailSchema` carries would be a per-row join the index never shows.
    include: { lineItems: true, customer: { select: { firstName: true, lastName: true } } },
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  return {
    data: rows.map(toOrderSummary),
    // A short page is the last page; only a full one can have more behind it.
    nextCursor: rows.length === query.limit ? (rows.at(-1)?.id ?? null) : null,
  };
}
