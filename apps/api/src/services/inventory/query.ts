/**
 * Reads for the admin Inventory index and the Locations settings page.
 * Owner: WS-B. Writes live in `adjust.ts` — nothing here mutates a quantity.
 */
import { newId } from '@merchant/config/ids';
import type { Paginated } from '@merchant/contracts/common';
import type { InventoryRow } from '@merchant/contracts/inventory';
import { inventoryRowSchema } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';
import { locationSchema } from '@merchant/contracts/locations';
import { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { badRequest, conflict, notFound } from '../../lib/errors.ts';

/* -------------------------------------------------------------------------- */
/* Locations                                                                    */
/* -------------------------------------------------------------------------- */

type LocationRow = {
  id: string;
  name: string;
  address: Prisma.JsonValue;
  isActive: boolean;
  fulfillsOnlineOrders: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const toLocationDto = (row: LocationRow, stockedVariantCount = 0): Location =>
  locationSchema.parse({
    id: row.id,
    name: row.name,
    address: row.address ?? null,
    isActive: row.isActive,
    fulfillsOnlineOrders: row.fulfillsOnlineOrders,
    stockedVariantCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });

/**
 * locationId → how many variants hold a non-zero quantity there.
 *
 * One grouped query for every location, rather than a count per row: the
 * settings page renders them all and would otherwise fan out.
 */
async function stockedCounts(db: TenantClient): Promise<Map<string, number>> {
  const grouped = await db.inventoryLevel.groupBy({
    by: ['locationId'],
    where: { NOT: { available: 0 } },
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [row.locationId, row._count._all]));
}

/** Oldest first, so the shop's original location stays at the top of the list. */
const BY_AGE = { createdAt: 'asc' } as const;

export async function listLocations(db: TenantClient): Promise<Location[]> {
  const [rows, stocked] = await Promise.all([
    db.location.findMany({ orderBy: BY_AGE }),
    stockedCounts(db),
  ]);
  return rows.map((row) => toLocationDto(row, stocked.get(row.id) ?? 0));
}

export async function getLocation(db: TenantClient, id: string): Promise<Location> {
  const [row, stocked] = await Promise.all([
    db.location.findFirst({ where: { id } }),
    db.inventoryLevel.count({ where: { locationId: id, NOT: { available: 0 } } }),
  ]);
  if (!row) throw notFound('Location');
  return toLocationDto(row, stocked);
}

export type LocationInput = {
  name: string;
  address?: Record<string, unknown> | null;
  isActive?: boolean;
  fulfillsOnlineOrders?: boolean;
};

export async function createLocation(
  db: TenantClient,
  shopId: string,
  input: LocationInput,
): Promise<Location> {
  const row = await db.location.create({
    data: {
      id: newId('location'),
      shopId,
      name: input.name,
      address: (input.address ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      isActive: input.isActive ?? true,
      fulfillsOnlineOrders: input.fulfillsOnlineOrders ?? true,
    },
  });
  return toLocationDto(row);
}

export async function updateLocation(
  db: TenantClient,
  id: string,
  input: Partial<LocationInput>,
): Promise<Location> {
  await getLocation(db, id);
  const row = await db.location.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined
        ? { address: (input.address ?? Prisma.JsonNull) as Prisma.InputJsonValue }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.fulfillsOnlineOrders !== undefined
        ? { fulfillsOnlineOrders: input.fulfillsOnlineOrders }
        : {}),
    },
  });
  return toLocationDto(row);
}

/**
 * Two rules, both because deleting cascades this location's inventory levels:
 * the last location cannot go (a shop with nowhere to hold stock cannot fulfil
 * anything), and neither can one that still holds units. The adjustment history
 * survives either way — it carries no foreign key.
 */
export async function deleteLocation(db: TenantClient, id: string): Promise<void> {
  const location = await getLocation(db, id);
  if ((await db.location.count()) <= 1) {
    throw conflict('A store needs at least one location.', 'id');
  }
  // Levels cascade with the location, so deleting one that still holds units
  // would erase that stock from the shop's totals with no adjustment behind it.
  // Move or zero the quantities first — the admin greys the action out for the
  // same reason, but the rule lives here.
  if (location.stockedVariantCount > 0) {
    throw conflict(
      `${location.name} still holds stock. Set its quantities to zero before deleting it.`,
      'id',
    );
  }
  await db.location.delete({ where: { id } });
}

/* -------------------------------------------------------------------------- */
/* Inventory index                                                              */
/* -------------------------------------------------------------------------- */

export type ListInventoryOptions = {
  limit: number;
  cursor?: string;
  query?: string;
  locationId?: string;
};

const VARIANT_INCLUDE = {
  product: {
    select: { id: true, title: true, images: { orderBy: { position: 'asc' } } },
  },
  inventoryLevels: { select: { locationId: true, available: true } },
} satisfies Prisma.ProductVariantInclude;

type VariantRow = Prisma.ProductVariantGetPayload<{ include: typeof VARIANT_INCLUDE }>;

/** The variant's own image if one is assigned to it, else the product's first. */
function imageFor(row: VariantRow): string | null {
  const images = row.product.images;
  const own = images.find((image) => image.variantIds.includes(row.id));
  return (own ?? images[0])?.url ?? null;
}

/**
 * One row per variant, with a column per location. A variant that has never
 * been stocked at a location reads 0 rather than being absent — levels are
 * created lazily, and an empty cell in the table would look like a bug.
 */
export async function listInventory(
  db: TenantClient,
  options: ListInventoryOptions,
): Promise<Paginated<InventoryRow>> {
  const locations = options.locationId
    ? [await getLocation(db, options.locationId)]
    : await listLocations(db);

  if (options.cursor) {
    const anchor = await db.productVariant.findFirst({
      where: { id: options.cursor },
      select: { id: true },
    });
    if (!anchor) throw badRequest('Unknown cursor.', 'cursor');
  }

  const search = options.query?.trim();
  const rows = await db.productVariant.findMany({
    where: search
      ? {
          OR: [
            { sku: { contains: search, mode: 'insensitive' } },
            { product: { title: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {},
    include: VARIANT_INCLUDE,
    // Grouped by product the way Shopify's inventory table reads, then by the
    // variant's own order within it. The id tiebreak is what keeps the cursor
    // stable across the non-unique leading keys.
    orderBy: [{ productId: 'asc' }, { position: 'asc' }, { id: 'asc' }],
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = rows.slice(0, options.limit);
  return {
    data: page.map((row) => {
      const available = new Map(row.inventoryLevels.map((l) => [l.locationId, l.available]));
      return inventoryRowSchema.parse({
        variantId: row.id,
        productId: row.product.id,
        productTitle: row.product.title,
        variantTitle: row.title,
        sku: row.sku,
        imageUrl: imageFor(row),
        levels: locations.map((location) => ({
          locationId: location.id,
          available: available.get(location.id) ?? 0,
        })),
      });
    }),
    nextCursor: rows.length > options.limit ? (page.at(-1)?.id ?? null) : null,
  };
}
