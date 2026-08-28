/**
 * Customers (SPEC §7, §9). Owner: WS-C.
 *
 * Two things here are load-bearing for other workstreams:
 *
 *   - `findOrCreateByEmail` is what E3 calls when a checkout completes, so it
 *     has to survive two checkouts finishing on the same email at once. Losing
 *     that race would fail a checkout AFTER the card was charged.
 *   - `ordersCount` / `totalSpent` are DERIVED, never stored. The columns exist
 *     on the row and are deliberately ignored: a counter that is written from
 *     three places (order placed, refunded, cancelled) drifts, and the number
 *     it drifts into is the one the merchant sees next to a customer's name.
 *     One grouped query per page keeps that honest without going quadratic.
 */

import { newId } from '@merchant/config/ids';
import type { Paginated } from '@merchant/contracts/common';
import type { Customer, listCustomersQuery } from '@merchant/contracts/customers';
import { createCustomerInput, updateCustomerInput } from '@merchant/contracts/customers';
import type { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import type { z } from 'zod';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';
import { emitCustomerEvent } from './events.ts';

type ListQuery = z.infer<typeof listCustomersQuery>;

/** Money already collected. An unpaid order counts as an order, not as spend. */
const SPENT_STATUSES = ['paid', 'partially_refunded', 'refunded'];

/** Shopify's "new customer" window, and its abandoned-checkout window. */
const NEW_CUSTOMER_DAYS = 30;
const ABANDONED_HOURS = 72;

const SORT_KEYS = new Set(['createdAt', 'email', 'lastName']);

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Email is matched case-insensitively everywhere, so it is stored folded.
 * Postgres unique indexes are case-sensitive: without this, `Ada@shop.com` and
 * `ada@shop.com` are two customers, and a checkout would attach an order to
 * whichever one it happened to find.
 */
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const ADDRESS_INCLUDE = { addresses: { orderBy: { createdAt: 'asc' } } } as const;

type CustomerRow = Prisma.CustomerGetPayload<{ include: typeof ADDRESS_INCLUDE }>;

export type Aggregate = { ordersCount: number; totalSpent: number };

/**
 * Order count and amount spent for a whole page of customers, in ONE query.
 *
 * Grouping by status as well as customer is what lets a single pass answer both
 * questions: every live order counts toward the count, but only the ones that
 * were actually paid count toward the money, net of what has been refunded.
 */
export async function aggregatesFor(
  db: TenantClient,
  customerIds: string[],
): Promise<Map<string, Aggregate>> {
  const totals = new Map<string, Aggregate>();
  if (customerIds.length === 0) return totals;

  const grouped = await db.order.groupBy({
    by: ['customerId', 'financialStatus'],
    where: { customerId: { in: customerIds }, cancelledAt: null },
    _count: { _all: true },
    _sum: { total: true, refundedTotal: true },
  });

  for (const row of grouped) {
    if (!row.customerId) continue;
    const current = totals.get(row.customerId) ?? { ordersCount: 0, totalSpent: 0 };
    current.ordersCount += row._count._all;
    if (SPENT_STATUSES.includes(row.financialStatus)) {
      current.totalSpent += (row._sum.total ?? 0) - (row._sum.refundedTotal ?? 0);
    }
    totals.set(row.customerId, current);
  }
  return totals;
}

function toCustomer(row: CustomerRow, aggregate: Aggregate, currencyCode: string): Customer {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    acceptsMarketing: row.acceptsMarketing,
    note: row.note,
    tags: row.tags,
    addresses: row.addresses.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      company: a.company,
      address1: a.address1,
      address2: a.address2,
      city: a.city,
      province: a.province,
      provinceCode: a.provinceCode,
      country: a.country,
      countryCode: a.countryCode,
      zip: a.zip,
      phone: a.phone,
      isDefault: a.isDefault,
    })),
    ordersCount: aggregate.ordersCount,
    totalSpent: { amount: aggregate.totalSpent, currencyCode },
    // A storefront account is optional; guest checkout is the default (SPEC §8).
    hasAccount: row.passwordHash !== null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function shopCurrency(db: TenantClient): Promise<string> {
  const shop = await db.shop.findFirst({ select: { currencyCode: true } });
  if (!shop) throw notFound('Shop');
  return shop.currencyCode;
}

/* -------------------------------------------------------------------------- */
/* Segments (SPEC §2 — "segments-lite")                                         */
/* -------------------------------------------------------------------------- */

/**
 * Each segment resolves to a set of ids the index then filters on. Two queries
 * rather than one join, but both are indexed and neither is per-row — and the
 * alternative, a raw SQL correlated subquery, would bypass the tenant client.
 */
async function segmentFilter(
  db: TenantClient,
  segment: ListQuery['segment'],
): Promise<Prisma.CustomerWhereInput> {
  if (!segment || segment === 'all') return {};

  if (segment === 'returning') {
    const grouped = await db.order.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null }, cancelledAt: null },
      _count: { _all: true },
      having: { customerId: { _count: { gt: 1 } } },
    });
    return { id: { in: grouped.map((row) => row.customerId as string) } };
  }

  if (segment === 'new') {
    // First order inside the window — not "signed up recently". A customer with
    // three years of history is not new because they ordered again yesterday.
    const grouped = await db.order.groupBy({
      by: ['customerId'],
      where: { customerId: { not: null }, cancelledAt: null },
      _min: { createdAt: true },
    });
    const cutoff = daysAgo(NEW_CUSTOMER_DAYS);
    const ids = grouped
      .filter((row) => row._min.createdAt && row._min.createdAt >= cutoff)
      .map((row) => row.customerId as string);
    return { id: { in: ids } };
  }

  // Abandoned checkout: a live checkout that never became an order. Checkout
  // rows carry an email rather than a customerId, so the join is by email.
  const cutoff = new Date(Date.now() - ABANDONED_HOURS * 60 * 60 * 1000);
  const checkouts = await db.checkout.findMany({
    where: { status: 'open', completedOrderId: null, createdAt: { gte: cutoff } },
    select: { email: true },
  });
  const emails = checkouts
    .map((c) => c.email)
    .filter((email): email is string => Boolean(email))
    .map(normalizeEmail);
  return { email: { in: emails } };
}

/* -------------------------------------------------------------------------- */
/* Read                                                                         */
/* -------------------------------------------------------------------------- */

export async function listCustomers(
  db: TenantClient,
  query: ListQuery,
): Promise<Paginated<Customer>> {
  if (query.cursor) {
    const anchor = await db.customer.findFirst({
      where: { id: query.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const where: Prisma.CustomerWhereInput = { ...(await segmentFilter(db, query.segment)) };

  const search = query.query?.trim();
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (query.acceptsMarketing !== undefined) where.acceptsMarketing = query.acceptsMarketing;
  if (query.tag) where.tags = { has: query.tag };

  const sortKey = SORT_KEYS.has(query.sortKey ?? '') ? (query.sortKey as string) : 'createdAt';
  const rows = await db.customer.findMany({
    where,
    include: ADDRESS_INCLUDE,
    // id breaks ties so a page boundary cannot land twice on the same customer.
    orderBy: [{ [sortKey]: query.sortOrder }, { id: query.sortOrder }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, query.limit);
  const [aggregates, currency] = await Promise.all([
    aggregatesFor(
      db,
      page.map((row) => row.id),
    ),
    shopCurrency(db),
  ]);

  return {
    data: page.map((row) =>
      toCustomer(row, aggregates.get(row.id) ?? { ordersCount: 0, totalSpent: 0 }, currency),
    ),
    nextCursor: rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getCustomer(db: TenantClient, id: string): Promise<Customer> {
  const row = await db.customer.findFirst({ where: { id }, include: ADDRESS_INCLUDE });
  if (!row) throw notFound('Customer');
  const [aggregates, currency] = await Promise.all([aggregatesFor(db, [id]), shopCurrency(db)]);
  return toCustomer(row, aggregates.get(id) ?? { ordersCount: 0, totalSpent: 0 }, currency);
}

/* -------------------------------------------------------------------------- */
/* Write                                                                        */
/* -------------------------------------------------------------------------- */

/** Exactly the address shape the contract accepts on create/update. */
type AddressInput = z.infer<typeof createCustomerInput>['addresses'][number];

/**
 * Exactly one default, always. Shopify's storefront picks the default address
 * with no tiebreak, so "two defaults" resolves differently on every render.
 */
function withSingleDefault(addresses: AddressInput[], shopId: string) {
  const preferred = addresses.findIndex((a) => a.isDefault === true);
  const defaultIndex = preferred === -1 ? 0 : preferred;
  return addresses.map((address, index) => ({
    ...address,
    id: newId('address'),
    shopId,
    isDefault: index === defaultIndex,
  }));
}

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

export async function createCustomer(
  db: TenantClient,
  shopId: string,
  input: unknown,
): Promise<Customer> {
  const data = createCustomerInput.parse(input);
  const id = newId('customer');

  try {
    await db.customer.create({
      data: {
        id,
        shopId,
        email: normalizeEmail(data.email),
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        phone: data.phone ?? null,
        acceptsMarketing: data.acceptsMarketing ?? false,
        note: data.note ?? null,
        tags: data.tags ?? [],
        metadata: (data.metadata ?? {}) as Prisma.InputJsonObject,
        addresses: { create: withSingleDefault(data.addresses ?? [], shopId) },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A customer with this email already exists.', 'email');
    }
    throw error;
  }

  await emitCustomerEvent(shopId, 'customers/create', {
    id,
    email: normalizeEmail(data.email),
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
  });

  return getCustomer(db, id);
}

export async function updateCustomer(
  db: TenantClient,
  shopId: string,
  id: string,
  input: unknown,
): Promise<Customer> {
  const data = updateCustomerInput.parse(input);
  const existing = await db.customer.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Customer');

  try {
    await db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          ...(data.email !== undefined ? { email: normalizeEmail(data.email) } : {}),
          ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
          ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.acceptsMarketing !== undefined
            ? { acceptsMarketing: data.acceptsMarketing }
            : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
          ...(data.tags !== undefined ? { tags: data.tags } : {}),
          ...(data.metadata !== undefined
            ? { metadata: data.metadata as Prisma.InputJsonObject }
            : {}),
        },
      });

      // Addresses are replaced wholesale when supplied: the admin form posts the
      // whole list, and diffing it by index would silently rewrite the wrong row.
      if (data.addresses !== undefined) {
        await tx.customerAddress.deleteMany({ where: { customerId: id } });
        for (const address of withSingleDefault(data.addresses, shopId)) {
          await tx.customerAddress.create({ data: { ...address, customerId: id } });
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('A customer with this email already exists.', 'email');
    }
    throw error;
  }

  return getCustomer(db, id);
}

export async function deleteCustomer(db: TenantClient, id: string): Promise<void> {
  const { count } = await db.customer.deleteMany({ where: { id } });
  if (count === 0) throw notFound('Customer');
}

/* -------------------------------------------------------------------------- */
/* The E3 seam                                                                  */
/* -------------------------------------------------------------------------- */

export type FindOrCreateInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  acceptsMarketing?: boolean;
};

/**
 * The customer behind an email, creating them if this is their first order.
 *
 * Idempotent per shop, and safe under a race: two checkouts completing on the
 * same email at the same instant both return the same customer instead of one
 * of them failing on the unique index — which would fail a checkout after the
 * card had already been charged.
 */
export async function findOrCreateByEmail(
  db: TenantClient,
  shopId: string,
  input: FindOrCreateInput,
): Promise<{ id: string; email: string; created: boolean }> {
  const email = normalizeEmail(input.email);

  const existing = await db.customer.findFirst({ where: { email }, select: { id: true } });
  if (existing) return { id: existing.id, email, created: false };

  const id = newId('customer');
  try {
    await db.customer.create({
      data: {
        id,
        shopId,
        email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        acceptsMarketing: input.acceptsMarketing ?? false,
      },
    });
    // Only when actually created — a checkout reusing an existing customer is
    // not a customer creation.
    await emitCustomerEvent(shopId, 'customers/create', {
      id,
      email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    });
    return { id, email, created: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Lost the race. The winner's row is the answer, exactly as in signup.
    const winner = await db.customer.findFirst({ where: { email }, select: { id: true } });
    if (!winner) throw error;
    return { id: winner.id, email, created: false };
  }
}
