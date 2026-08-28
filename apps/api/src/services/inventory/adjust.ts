/**
 * THE inventory write path (SPEC §7). Owner: WS-B.
 *
 * Every quantity change in the system goes through this file. A bare
 * `inventoryLevel.update` anywhere else is a bug (CLAUDE.md §9): it destroys the
 * `InventoryAdjustment` history the admin's stock drawer reads, and it loses
 * updates under concurrency.
 *
 * Import it directly — C3 for fulfillment decrements, E3 for checkout stock,
 * H1 for seeding:
 *
 *   import { adjust, adjustMany, setAvailable } from '…/services/inventory/adjust.ts';
 *   await adjust(dbForShop(shopId), {
 *     variantId, locationId, delta: -1, reason: 'sold', referenceId: orderId,
 *   });
 *
 * Two guarantees worth relying on:
 *   - ATOMIC. The quantity moves with `available = available + delta` inside a
 *     transaction, so the row lock serialises simultaneous writers. Two
 *     checkouts selling the last two units cannot both read "2 left".
 *   - ALL OR NOTHING. A batch that cannot apply one change applies none — a
 *     fulfillment that fails on its third line must not have decremented the
 *     first two.
 */
import { newId } from '@merchant/config/ids';
import type { InventoryLevel } from '@merchant/contracts/inventory';
import { inventoryLevelSchema } from '@merchant/contracts/inventory';
import { Prisma } from '@merchant/db/client';
import type { TenantClient } from '@merchant/db/tenant';
import { conflict, notFound } from '../../lib/errors.ts';

export type AdjustmentReason =
  | 'correction'
  | 'received'
  | 'sold'
  | 'restock'
  | 'damaged'
  | 'shrinkage'
  | 'promotion';

type Target = { variantId: string; locationId: string };

export type AdjustInput = Target & {
  /** Signed. Negative decrements. */
  delta: number;
  reason?: AdjustmentReason;
  /** What caused this — an order id, a fulfillment id. Kept, never dropped. */
  referenceId?: string | null;
  /** Staff user id, for the history drawer. */
  actor?: string | null;
};

export type SetInput = Target & {
  /** Absolute count, never negative. The recorded delta is derived. */
  available: number;
  reason?: AdjustmentReason;
  referenceId?: string | null;
  actor?: string | null;
};

type LevelRow = {
  id: string;
  variantId: string;
  locationId: string;
  available: number;
  createdAt: Date;
  updatedAt: Date;
};

const keyOf = (target: Target) => `${target.variantId}|${target.locationId}`;

/**
 * Every input was given a level in `preflight` and a row in the transaction, so
 * a miss here is a bug in this file rather than a caller error.
 */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`inventory: missing ${what}`);
  return value;
}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

function toDto(row: LevelRow): InventoryLevel {
  return inventoryLevelSchema.parse({
    id: row.id,
    variantId: row.variantId,
    locationId: row.locationId,
    available: row.available,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

/* -------------------------------------------------------------------------- */
/* Preflight                                                                    */
/* -------------------------------------------------------------------------- */

type Preflight = {
  shopId: string;
  /** variantId → oversell policy. */
  policies: Map<string, string>;
  /** `variantId|locationId` → inventory level id. */
  levelIds: Map<string, string>;
};

/**
 * Resolve the targets before any write. `db` is tenant-scoped, so a variant or
 * location belonging to another shop simply is not found — which is the 404 we
 * want to return anyway.
 */
async function preflight(db: TenantClient, targets: readonly Target[]): Promise<Preflight> {
  const variantIds = [...new Set(targets.map((t) => t.variantId))];
  const locationIds = [...new Set(targets.map((t) => t.locationId))];

  const [variants, locations] = await Promise.all([
    db.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, shopId: true, inventoryPolicy: true },
    }),
    db.location.findMany({ where: { id: { in: locationIds } }, select: { id: true } }),
  ]);

  const policies = new Map(variants.map((v) => [v.id, v.inventoryPolicy]));
  const missingVariant = variantIds.find((id) => !policies.has(id));
  if (missingVariant) throw notFound('Variant');

  const known = new Set(locations.map((l) => l.id));
  const missingLocation = locationIds.find((id) => !known.has(id));
  if (missingLocation) throw notFound('Location');

  // Every variant came back through the tenant client, so any of their shopIds
  // is this tenant's.
  const shopId = variants[0]?.shopId;
  if (!shopId) throw notFound('Variant');

  return { shopId, policies, levelIds: await ensureLevels(db, shopId, targets) };
}

/**
 * Levels are created lazily — a variant has no row at a location until stock
 * first moves there, so adding a location does not fan out a row per variant.
 *
 * Deliberately OUTSIDE the caller's transaction: two requests stocking the same
 * variant for the first time race, and in Postgres a unique violation aborts the
 * whole transaction, so it cannot be caught and shrugged off from inside one.
 */
async function ensureLevels(
  db: TenantClient,
  shopId: string,
  targets: readonly Target[],
): Promise<Map<string, string>> {
  // Narrowed to the key pair on purpose: callers pass whole AdjustInputs, and
  // spreading one into `create` would send `delta` to a column that has none.
  const wanted = new Map(
    targets.map((target) => [
      keyOf(target),
      { variantId: target.variantId, locationId: target.locationId },
    ]),
  );

  const existing = await db.inventoryLevel.findMany({
    where: {
      OR: [...wanted.values()].map((t) => ({ variantId: t.variantId, locationId: t.locationId })),
    },
    select: { id: true, variantId: true, locationId: true },
  });
  const ids = new Map(existing.map((row) => [keyOf(row), row.id]));

  for (const [key, target] of wanted) {
    if (ids.has(key)) continue;
    try {
      const created = await db.inventoryLevel.create({
        data: { id: newId('inventory'), shopId, ...target, available: 0 },
        select: { id: true },
      });
      ids.set(key, created.id);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Someone else created it between our read and our write — use theirs.
      const row = await db.inventoryLevel.findFirstOrThrow({
        where: { variantId: target.variantId, locationId: target.locationId },
        select: { id: true },
      });
      ids.set(key, row.id);
    }
  }
  return ids;
}

/**
 * A stable order for the rows a transaction will lock. Two batches touching the
 * same two levels in opposite orders would otherwise deadlock.
 */
const inLockOrder = <T extends Target>(inputs: readonly T[]): T[] =>
  [...inputs].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

function historyRow(
  input: Target & { reason?: AdjustmentReason; referenceId?: string | null; actor?: string | null },
  shopId: string,
  delta: number,
) {
  return {
    id: newId('inventoryAdjustment'),
    shopId,
    variantId: input.variantId,
    locationId: input.locationId,
    delta,
    reason: input.reason ?? 'correction',
    referenceId: input.referenceId ?? null,
    actor: input.actor ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Apply                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Apply signed deltas. The whole batch commits or none of it does.
 *
 * Results come back in the caller's original order, not the internal lock order.
 */
export async function adjustMany(
  db: TenantClient,
  inputs: readonly AdjustInput[],
): Promise<InventoryLevel[]> {
  if (inputs.length === 0) return [];
  const { shopId, policies, levelIds } = await preflight(db, inputs);

  const applied = await db.$transaction(async (tx) => {
    const byKey = new Map<string, LevelRow>();

    for (const input of inLockOrder(inputs)) {
      const id = required(levelIds.get(keyOf(input)), 'level');

      // `available + delta` in SQL, not read-then-write: this is the statement
      // that makes concurrent decrements safe, and it holds the row lock until
      // the transaction commits.
      const level = await tx.inventoryLevel.update({
        where: { id },
        data: { available: { increment: input.delta } },
      });

      // `deny` is Shopify's "stop selling when out of stock"; `continue` is the
      // merchant explicitly allowing an oversell, so negative is legitimate.
      if (level.available < 0 && policies.get(input.variantId) === 'deny') {
        throw conflict(
          `Only ${level.available - input.delta} available; that would leave ${level.available}.`,
          'delta',
        );
      }

      if (input.delta !== 0) {
        await tx.inventoryAdjustment.create({ data: historyRow(input, shopId, input.delta) });
      }
      byKey.set(keyOf(input), level);
    }
    return byKey;
  });

  return inputs.map((input) => toDto(required(applied.get(keyOf(input)), 'result')));
}

export async function adjust(db: TenantClient, input: AdjustInput): Promise<InventoryLevel> {
  return required((await adjustMany(db, [input]))[0], 'level');
}

/**
 * Set absolute counts — the admin's inventory table, where the merchant types
 * what they just counted on the shelf. The delta it took to get there is what
 * lands in the history, so `set` and `adjust` produce the same audit trail.
 */
export async function setMany(
  db: TenantClient,
  inputs: readonly SetInput[],
): Promise<InventoryLevel[]> {
  if (inputs.length === 0) return [];
  const { shopId, levelIds } = await preflight(db, inputs);

  const applied = await db.$transaction(async (tx) => {
    const byKey = new Map<string, LevelRow>();

    for (const input of inLockOrder(inputs)) {
      const id = required(levelIds.get(keyOf(input)), 'level');

      // A no-op increment is how we read the current value while holding the
      // row lock — without it, two concurrent sets compute their deltas from
      // the same base and the history stops adding up.
      const before = await tx.inventoryLevel.update({
        where: { id },
        data: { available: { increment: 0 } },
      });
      const delta = input.available - before.available;

      if (delta === 0) {
        // Nothing moved, so nothing to record — an unchanged count is not an
        // event in the stock history.
        byKey.set(keyOf(input), before);
        continue;
      }

      const level = await tx.inventoryLevel.update({
        where: { id },
        data: { available: input.available },
      });
      await tx.inventoryAdjustment.create({ data: historyRow(input, shopId, delta) });
      byKey.set(keyOf(input), level);
    }
    return byKey;
  });

  return inputs.map((input) => toDto(required(applied.get(keyOf(input)), 'result')));
}

export async function setAvailable(db: TenantClient, input: SetInput): Promise<InventoryLevel> {
  return required((await setMany(db, [input]))[0], 'level');
}
