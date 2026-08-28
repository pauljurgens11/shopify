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
 * Nested writes: `data: { …, variants: { create: [...] } }` is stamped too —
 * the extension walks relation fields (from Prisma's runtime datamodel) and
 * stamps every nested `create`, `createMany.data`, and `connectOrCreate.create`
 * whose target model is tenant-scoped. JSON columns are never touched, because
 * only fields the datamodel says are relations are walked.
 *
 * REMAINING VECTORS (scoped reviews, not the extension, cover these):
 *   - nested `connect: { id }` can reference another shop's row — Prisma offers
 *     no hook to verify it without an extra query. Look up the id through
 *     `request.db` first when connecting user-supplied ids.
 *   - nested relation `where` filters (include/select, nested update/delete)
 *     are not scoped. The top-level row is, so traversal starts inside the
 *     tenant; treat nested unique ids from user input with the same care.
 *   - `$queryRaw`/`$executeRaw` bypass the extension entirely. Raw SQL must
 *     include `shop_id = ${shopId}` by hand and gets extra review scrutiny.
 */
import { Prisma } from '@prisma/client';
import { dbAdmin, type PrismaClient } from './client.ts';

/**
 * Special cases:
 *  - `Shop` has no shopId column — it IS the tenant. Reads are constrained to
 *    `id = shopId`, writes are not stamped (creating shops is dbAdmin's job).
 *  - Every other model in the datamodel carries `shopId` and is scoped
 *    automatically, including `OrderSequence` (whose shopId is its @id).
 */
const SHOP_MODEL = 'Shop';

/** model name → (relation field name → target model name), from the runtime datamodel. */
const RELATIONS: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name,
    new Map(m.fields.filter((f) => f.kind === 'object').map((f) => [f.name, f.type])),
  ]),
);

/** Models that carry a shopId column (everything except Shop, but derived, not assumed). */
const TENANT_MODELS: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'shopId' && f.kind === 'scalar'))
    .map((m) => m.name),
);

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

function stampRow(row: Record<string, unknown>, model: string, shopId: string) {
  const out: Record<string, unknown> = { ...row, shopId };
  const relations = RELATIONS.get(model);
  if (!relations) return out;

  for (const [field, target] of relations) {
    const value = out[field];
    if (!value || typeof value !== 'object' || !TENANT_MODELS.has(target)) continue;
    // A relation field's value is a nested-write envelope: { create?, createMany?,
    // connectOrCreate?, connect?, ... }. Stamp the payloads that insert rows.
    const envelope = { ...(value as Record<string, unknown>) };
    if (envelope.create !== undefined) {
      envelope.create = stampWriteData(target, envelope.create, shopId);
    }
    if (envelope.createMany && typeof envelope.createMany === 'object') {
      const cm = envelope.createMany as Record<string, unknown>;
      envelope.createMany = { ...cm, data: stampWriteData(target, cm.data, shopId) };
    }
    if (envelope.connectOrCreate !== undefined) {
      const stampCoc = (coc: unknown) =>
        coc && typeof coc === 'object'
          ? {
              ...(coc as Record<string, unknown>),
              create: stampWriteData(target, (coc as Record<string, unknown>).create, shopId),
            }
          : coc;
      envelope.connectOrCreate = Array.isArray(envelope.connectOrCreate)
        ? envelope.connectOrCreate.map(stampCoc)
        : stampCoc(envelope.connectOrCreate);
    }
    out[field] = envelope;
  }
  return out;
}

/**
 * Stamp `shopId` onto a write payload for `model`, recursing into nested
 * creates. Exported for unit tests — pure, no client required.
 */
export function stampWriteData(model: string, data: unknown, shopId: string): unknown {
  if (Array.isArray(data)) return data.map((row) => stampWriteData(model, row, shopId));
  if (data && typeof data === 'object') {
    return stampRow(data as Record<string, unknown>, model, shopId);
  }
  return data;
}

/** Scope a `where` clause. Composes via AND, which every operation accepts. */
export function scopeWhere(model: string, where: unknown, shopId: string): Record<string, unknown> {
  const base = (where ?? {}) as Record<string, unknown>;
  const constraint = model === SHOP_MODEL ? { id: shopId } : { shopId };
  const existingAnd = Array.isArray(base.AND) ? base.AND : base.AND ? [base.AND] : [];
  return { ...base, AND: [...existingAnd, constraint] };
}

function buildClient(shopId: string) {
  return dbAdmin.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const next = { ...(args as Record<string, unknown>) };

          if (WHERE_OPS.has(operation)) {
            // findUnique's `where` only accepts unique fields, so a plain
            // shopId there is a type error. AND is accepted everywhere and
            // composes with whatever the caller passed.
            //
            // Known rough edge: an `upsert` whose unique key belongs to
            // ANOTHER shop sees no row (correct), falls through to create,
            // and dies on the unique constraint (P2002) instead of a clean
            // not_found. Cross-tenant upserts still cannot write; the error
            // is just uglier. Handle P2002 as `conflict` at the API layer.
            next.where = scopeWhere(model, next.where, shopId);
          }

          if (model !== SHOP_MODEL) {
            if (DATA_OPS.has(operation) && next.data !== undefined) {
              next.data = stampWriteData(model, next.data, shopId);
            }
            if (operation === 'upsert') {
              if (next.create !== undefined)
                next.create = stampWriteData(model, next.create, shopId);
              if (next.update !== undefined)
                next.update = stampWriteData(model, next.update, shopId);
            }
          }

          return query(next);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof buildClient>;

/**
 * Extended clients share dbAdmin's connection pool but allocating one per call
 * is measurable at request rate, so they are memoized per shop. The cache is
 * unbounded in theory; in practice it holds one entry per active shop.
 */
const clientCache = new Map<string, TenantClient>();

export function dbForShop(shopId: string): TenantClient {
  if (!shopId) throw new Error('dbForShop requires a shopId');
  let client = clientCache.get(shopId);
  if (!client) {
    client = buildClient(shopId);
    clientCache.set(shopId, client);
  }
  return client;
}

export type { PrismaClient };
export { dbAdmin };
