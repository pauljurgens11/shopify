# C4 — Customers API

| | |
|---|---|
| Workstream | C |
| Size | M |
| Depends on | A1 |
| Unblocks | C6, E5, H1 |
| Branch | `ws-c/customers-api` |

## You own
```
apps/api/src/routes/admin/customers/**
apps/api/src/services/customers/**
packages/contracts/src/customers.ts (additive)
```

## Context
Schema: `Customer` (nullable passwordHash — storefront accounts are optional),
`CustomerAddress` (default flag). Contract complete, including the
segments-lite enum (`all|returning|new|abandoned-checkout`) and the
`booleanish` fix for `?acceptsMarketing=` filtering. E5 (storefront accounts)
and E3 (checkout attaches customers by email) both build on your service.

## Build (SPEC §7, §9)
1. Routes at `/admin/api/customers`, `requirePermission('customers')`:
   - `GET /` — pagination, `?query=` (name, email, phone), segment filter:
     `returning` = >1 order, `new` = first order ≤30 days, `abandoned-checkout`
     = has an open Checkout newer than 3 days with no completed order.
     Implement segments as SQL-translatable Prisma queries.
   - `POST /`, `GET/PUT/DELETE /:id` — with nested addresses (set-default
     included). Email unique per shop → `conflict` on duplicates.
   - `GET /:id/orders` — the customer's order list (reuse C2's list shape).
2. Aggregates on detail: order count + total spent (single grouped query, not
   N+1) — the admin detail page header shows both.
3. **`findOrCreateByEmail` service export** — E3 calls it at checkout
   completion to attach orders to customers; keep it idempotent per shop.

## Test plan (write first)
- Vitest (real Postgres): each segment's membership on a 5-customer fixture;
  duplicate email → `conflict` error envelope; total-spent aggregate matches
  seeded orders; `findOrCreateByEmail` is idempotent under `Promise.all` x2.
- Acceptance: suite green; `pnpm verify` green.

## Landmines
- `acceptsMarketing` query param — use the `booleanish` schema from
  `contracts/common.ts`, never `z.coerce.boolean()`.
- `totalSpent` is derived — do not persist a counter column that drifts.
- No customer import/export, no marketing consent audit trail — out of scope.
