# G2 — Analytics ingestion, rollup, query API

| | |
|---|---|
| Workstream | G |
| Size | M |
| Depends on | A1, G1 |
| Unblocks | G3, H1 (seed writes events) |
| Branch | `ws-g/analytics-pipeline` |

## You own
```
apps/api/src/routes/admin/analytics/**
apps/worker/src/jobs/analytics-rollup.ts
packages/contracts/src/analytics.ts (additive)
apps/api/src/routes/storefront/events/** (take over E1's thin glue if landed)
```

## Context
Schema: `AnalyticsEvent` (insert-only, indexed (shopId, occurredAt)),
`AnalyticsRollupDaily` (date, metric, value). Contract complete (event types
`page_view|product_view|add_to_cart|begin_checkout|purchase`). E1 lands the
beacon endpoint as thin glue — coordinate in `docs/AGENT-LOG.md` and absorb
it here. Purchases are recorded **server-side at order creation** (C2/D3
emit; trustworthy revenue — SPEC §13); browser beacons are best-effort.

## Build (SPEC §13)
1. **Ingestion hardening**: batched insert (`createMany`), payload cap
   (≤20 events/beacon), sessionId from the beacon (client-generated ULID),
   silent 204 always (beacons never error to the browser).
2. **Rollup job** (`analytics-rollup.ts`, repeatable every 5 min via BullMQ
   repeatable job registered at worker boot): per shop, aggregate **today +
   yesterday** (late events) into `AnalyticsRollupDaily` metrics:
   `sessions` (distinct sessionIds), `page_views`, `product_views`,
   `add_to_carts`, `begin_checkouts`, `orders`, `revenue` (minor units),
   idempotent upsert per (shopId, date, metric). Historical days are written
   once by the seed (H1) and by the first rollup after backfill.
3. **Query API** (`/admin/api/analytics`, `requirePermission('analytics')`):
   - `GET /overview?from&to` — totals + deltas vs the previous equal period:
     totalSales, orders, conversionRate (purchases/sessions), AOV.
   - `GET /sales-over-time?from&to&interval=day` — series from rollups, with
     today merged from raw events (SPEC: "rollups + today's raw").
   - `GET /top-products?from&to` — by revenue from purchase events joined to
     order lines (or line-item aggregation — pick one, note it).
   - `GET /funnel?from&to` — sessions → product_view → add_to_cart →
     begin_checkout → purchase counts.
   Shapes belong in `contracts/analytics.ts` — G3 builds straight on them.
4. **Live view-lite**: `GET /live` — sessions + orders in the last 30 min
   from raw events (polling endpoint; no websockets).

## Test plan (write first)
- Vitest (real Postgres): rollup is idempotent (run twice, same rows);
  conversion math with zero sessions doesn't divide by zero; series fills
  empty days with zeros; revenue sums the purchase events' `value` ints and
  matches seeded orders.
- Acceptance: suite green; `pnpm verify` green.

## Landmines
- Rollup queries may use Prisma `groupBy` (tenant-scoped) — if you must drop
  to `$queryRaw`, the raw SQL includes `shop_id = ${shopId}` by hand and says
  so in a comment (the extension can't scope raw SQL).
- Revenue is integer minor units end to end — the chart layer formats.
- Don't build UTM attribution, cohort tables, or export — out of scope.
