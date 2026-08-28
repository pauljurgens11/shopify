/**
 * Tenant-scoped Prisma client (SPEC §6 — the load-bearing wall).
 *
 * `dbForShop(shopId)` returns a client that injects `where: { shopId }` into
 * every read and `data: { shopId }` into every write, for every tenant table.
 * Forgetting a filter is then impossible rather than merely discouraged, which
 * matters when 20 agents are writing queries in parallel.
 *
 * This is a FUNCTIONAL requirement, not a security nicety: cross-shop bleed
 * breaks the multi-tenant demo instantly.
 *
 * LIMITATION — nested writes: only the TOP-LEVEL `data` is stamped. A nested
 * create (`data: { …, variants: { create: [...] } }`) is passed through as-is,
 * so its rows would violate the NOT NULL shopId. Either set shopId explicitly
 * inside nested create payloads, or create the related rows in separate calls
 * inside a transaction. Reads are unaffected (the top-level where is scoped).
 */
import { dbAdmin, type PrismaClient } from './client.ts';

/**
 * Models that are NOT tenant-scoped, and must be skipped by the extension.
 * `Shop` is the tenant itself; `OrderSequence` is keyed by shopId directly.
 *
 * Adding a tenant model? It is scoped automatically — you only touch this list
 * for a genuinely platform-level table.
 */
const UNSCOPED_MODELS = new Set(['Shop', 'OrderSequence']);

/** Operations whose args carry a `where` we must constrain. */
const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert', // without this, an upsert given another shop's id would UPDATE that row
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

/** Operations whose args carry `data` we must stamp. */
const DATA_OPS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'upsert',
  'update',
  'updateMany',
  'updateManyAndReturn',
]);

function stampData(data: unknown, shopId: string): unknown {
  if (Array.isArray(data)) return data.map((row) => ({ ...row, shopId }));
  if (data && typeof data === 'object') return { ...(data as object), shopId };
  return data;
}

export type TenantClient = ReturnType<typeof dbForShop>;

export function dbForShop(shopId: string) {
  if (!shopId) throw new Error('dbForShop requires a shopId');

  return dbAdmin.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && UNSCOPED_MODELS.has(model)) return query(args);

          const next = { ...(args as Record<string, unknown>) };

          if (WHERE_OPS.has(operation)) {
            // findUnique's `where` only accepts unique fields, so a plain
            // shopId there is a type error. AND is accepted everywhere and
            // composes with whatever the caller passed.
            const where = (next.where ?? {}) as Record<string, unknown>;
            const existingAnd = Array.isArray(where.AND)
              ? (where.AND as unknown[])
              : where.AND
                ? [where.AND]
                : [];
            next.where = { ...where, AND: [...existingAnd, { shopId }] };
          }

          if (DATA_OPS.has(operation) && next.data !== undefined) {
            next.data = stampData(next.data, shopId);
          }
          if (operation === 'upsert') {
            if (next.create !== undefined) next.create = stampData(next.create, shopId);
            if (next.update !== undefined) next.update = stampData(next.update, shopId);
          }

          return query(next);
        },
      },
    },
  });
}

export type { PrismaClient };
export { dbAdmin };
