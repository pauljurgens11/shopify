/**
 * Discount persistence (SPEC §7, §9). Owner: WS-C.
 *
 * Thin over the contract on purpose: the interesting behaviour is C1's engine,
 * which is pure and lives next door. Two rules do live here, because both are
 * about the row rather than the arithmetic:
 *
 *   - A code is unique per shop CASE-INSENSITIVELY. The engine matches
 *     `WELCOME10` and `welcome10` as the same coupon, so storing both would
 *     make which one applies depend on row order.
 *   - `status` is DERIVED from the date window at read time. There is no cron
 *     flipping rows to `expired` overnight, so a stored flag would be a lie for
 *     up to a day (SPEC §14.3 already treats the dates as authoritative).
 */
import { newId } from '@merchant/config/ids';
import type { Paginated } from '@merchant/contracts/common';
import type { Discount, listDiscountsQuery } from '@merchant/contracts/discounts';
import {
  createDiscountInput,
  discountSchema,
  updateDiscountInput,
} from '@merchant/contracts/discounts';
import type { Discount as DiscountRow, Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import type { z } from 'zod';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';

type ListQuery = z.infer<typeof listDiscountsQuery>;

/**
 * Shopify shows and matches codes uppercased, and the unique index is
 * byte-exact — folding on write is what makes `(shopId, code)` mean what the
 * merchant thinks it means.
 */
const normalizeCode = (code: string | null | undefined): string | null =>
  code ? code.trim().toUpperCase() : null;

/**
 * `disabled` is a merchant decision and always wins; everything else follows
 * the clock. Mirrors `rejectionReason` in the engine — if these two ever
 * disagree, the index badge says Active while checkout refuses the code.
 */
export function statusOf(
  row: { status: string; startsAt: Date; endsAt: Date | null },
  now = new Date(),
): Discount['status'] {
  if (row.status === 'disabled') return 'disabled';
  if (now < row.startsAt) return 'scheduled';
  if (row.endsAt && now > row.endsAt) return 'expired';
  return 'active';
}

function toDiscount(row: DiscountRow): Discount {
  return discountSchema.parse({
    id: row.id,
    title: row.title,
    code: row.code,
    type: row.type,
    valueType: row.valueType,
    value: row.value,
    appliesTo: row.appliesTo,
    minimumRequirement: row.minimumRequirement,
    usageLimit: row.usageLimit,
    oncePerCustomer: row.oncePerCustomer,
    usedCount: row.usedCount,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    status: statusOf(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

/**
 * The `(shopId, code)` unique index is the check — a read-then-write guard here
 * would be both a wasted query and a race, since two creates can pass it at the
 * same instant and only the index settles it.
 */
const duplicateCode = () => conflict('A discount with this code already exists.', 'code');

export async function listDiscounts(
  db: TenantClient,
  query: ListQuery,
): Promise<Paginated<Discount>> {
  if (query.cursor) {
    const anchor = await db.discount.findFirst({
      where: { id: query.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const where: Prisma.DiscountWhereInput = {};
  const search = query.query?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const rows = await db.discount.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, query.limit);
  const data = page.map(toDiscount);

  // Status is computed, not stored, so it cannot be a SQL filter. Filtering
  // after the page is read means a filtered page can come back short; the
  // alternative is a date-range WHERE per status, which duplicates statusOf()
  // in a second place and is exactly how the badge and checkout drift apart.
  return {
    data: query.status ? data.filter((d) => d.status === query.status) : data,
    nextCursor: rows.length > query.limit ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getDiscount(db: TenantClient, id: string): Promise<Discount> {
  const row = await db.discount.findFirst({ where: { id } });
  if (!row) throw notFound('Discount');
  return toDiscount(row);
}

export async function createDiscount(
  db: TenantClient,
  shopId: string,
  input: unknown,
): Promise<Discount> {
  const data = createDiscountInput.parse(input);
  const code = normalizeCode(data.code);
  const id = newId('discount');
  try {
    await db.discount.create({
      data: {
        id,
        shopId,
        title: data.title,
        code,
        type: data.type,
        valueType: data.valueType,
        value: data.value,
        appliesTo: data.appliesTo as Prisma.InputJsonObject,
        minimumRequirement: data.minimumRequirement as Prisma.InputJsonObject,
        usageLimit: data.usageLimit,
        oncePerCustomer: data.oncePerCustomer,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateCode();
    throw error;
  }

  return getDiscount(db, id);
}

export async function updateDiscount(
  db: TenantClient,
  id: string,
  input: unknown,
): Promise<Discount> {
  const data = updateDiscountInput.parse(input);
  const existing = await db.discount.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Discount');

  const code = data.code !== undefined ? normalizeCode(data.code) : undefined;

  try {
    await db.discount.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.valueType !== undefined ? { valueType: data.valueType } : {}),
        ...(data.value !== undefined ? { value: data.value } : {}),
        ...(data.appliesTo !== undefined
          ? { appliesTo: data.appliesTo as Prisma.InputJsonObject }
          : {}),
        ...(data.minimumRequirement !== undefined
          ? { minimumRequirement: data.minimumRequirement as Prisma.InputJsonObject }
          : {}),
        ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
        ...(data.oncePerCustomer !== undefined ? { oncePerCustomer: data.oncePerCustomer } : {}),
        ...(data.startsAt !== undefined ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt !== undefined
          ? { endsAt: data.endsAt ? new Date(data.endsAt) : null }
          : {}),
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateCode();
    throw error;
  }

  return getDiscount(db, id);
}

export async function deleteDiscount(db: TenantClient, id: string): Promise<void> {
  const { count } = await db.discount.deleteMany({ where: { id } });
  if (count === 0) throw notFound('Discount');
}
