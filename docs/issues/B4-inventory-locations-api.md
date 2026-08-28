# B4 — Locations & inventory API (adjustment service)

| | |
|---|---|
| Workstream | B |
| Size | M |
| Depends on | A1, B1 |
| Unblocks | B6, C3 (fulfillment decrements), E3 (stock checks) |
| Branch | `ws-b/inventory-api` |

## You own
```
apps/api/src/routes/admin/inventory/**, apps/api/src/routes/admin/locations/**
apps/api/src/services/inventory/**
packages/contracts/src/{inventory,locations}.ts (additive)
```

## Context
Schema: `Location`, `InventoryLevel` (unique(variantId, locationId), `available`
int), `InventoryAdjustment` (delta, reason, referenceId). Contracts complete.
CLAUDE.md §9 landmine: **raw `inventoryLevel.update` is forbidden** — every
change goes through the adjustment service so history exists. You are building
that service; C3 and E3 will import it.

## Build (SPEC §7)
1. **Locations**: CRUD at `/admin/api/locations` (name, address, isActive,
   fulfillsOnlineOrders). Creating a location backfills `InventoryLevel(0)`
   rows for existing variants lazily (on first read is fine).
2. **Adjustment service** (`services/inventory/adjust.ts`) — THE public
   interface, exported for other workstreams. Two entry points, both atomic
   (transaction) and both writing an `InventoryAdjustment` row:
   - `adjust(db, { variantId, locationId, delta, reason, referenceId })` —
     for sale decrements (`reason: 'sold'`), reject a result below 0 when the
     variant's `inventoryPolicy` is `deny`; allow negative when `continue`.
   - `set(db, { variantId, locationId, available, reason })` — absolute
     value ≥ 0 (manual corrections), computes and records the delta.
   Reasons: `correction|received|sold|restocked`.
3. **Inventory endpoints**:
   - `GET /admin/api/inventory?locationId=` — variant rows joined with product
     title/sku/image, per-location `available`, cursor pagination, `?query=`.
   - `POST /admin/api/inventory/adjust` — single or batch adjustments
     (the admin table's inline editing posts here).
4. `requirePermission('products')`.

## Test plan (write first)
- Vitest (real Postgres): adjust below zero clamps/rejects correctly per
  policy; set computes the right delta; concurrent adjusts on one level don't
  lose updates (run two in `Promise.all`, assert final = sum — transaction
  test); every change has a matching `InventoryAdjustment` row.
- Acceptance: file green; `pnpm verify` green.

## Landmines
- Never expose or perform a bare `inventoryLevel.update` — if another
  workstream needs stock changes they import your service (they know this from
  CLAUDE.md; make the export obvious).
- `referenceId` links an adjustment to its cause (order id, fulfillment id) —
  C3 passes it; keep it required-nullable, not dropped.
- Two seeded locations (SPEC §7) — coordinate with H1 by keeping the service
  seed-friendly (callable with `dbAdmin`-derived tenant client).
- No stock transfers, no bin locations, no incoming-inventory Pos — out of
  scope.
