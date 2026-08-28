# B3 — Collections API (manual + smart)

| | |
|---|---|
| Workstream | B |
| Size | M |
| Depends on | A1, B1 |
| Unblocks | B6, E1 (storefront collections), F1 (featured-collection section) |
| Branch | `ws-b/collections-api` |

## You own
```
apps/api/src/routes/admin/collections/**
apps/api/src/services/catalog/collections.ts
packages/contracts/src/collections.ts (additive)
```

## Context
Schema: `Collection` (type `manual|smart`, `ruleSet` JSON, sortOrder, image) +
`CollectionProduct` join with position. Contract
`packages/contracts/src/collections.ts` is complete including the smart-rule
shape. B1's product service exists (or is landing) — read products through
`request.db`, never reimplement product queries.

## Build (SPEC §7)
1. CRUD at `/admin/api/collections` (cursor pagination, `?query=`), behind
   `requirePermission('products')` (collections live under Products in nav).
2. **Manual collections**: add/remove/reorder products
   (`POST /admin/api/collections/:id/products`, positions persisted).
3. **Smart collections**: `ruleSet` = conditions (`title`, `tag`, `vendor`,
   `productType`, `price` with `equals|contains|starts_with|gt|lt`) +
   `appliedDisjunctively` (any/all). Implement `resolveSmartCollection` as a
   **Prisma query translation** (conditions → `where` clauses), not an
   in-memory filter — collections page at 24 products must not load the whole
   catalog.
4. Membership resolution is **on read** (query-time), no materialization job —
   simplest thing that demos correctly.
5. `GET /admin/api/collections/:id/products` — the resolved product list either
   type uses, with pagination; sortOrder applied (manual position, or
   title/price/newest for smart).

## Test plan (write first)
- Vitest (real Postgres): each rule operator translates correctly (seed 5
  products, assert membership); any/all disjunction; manual reorder persists
  positions; smart collection with 2 rules + price `gt` returns the right set.
  This is the engine E1/F1 depend on — the tests are the spec.
- Acceptance: file green; `pnpm verify` green.

## Landmines
- Price rules compare **integer minor units** — the rule value `2000` means
  $20.00; document it in the contract's `.describe()` so the admin form and AI
  builder agree.
- Don't build scheduled republishing, collection SEO editors, or nested
  collections — not in SPEC.
- The `featured-collection` theme section references collections **by handle**
  — handle generation must match B1's product-handle rules (slug, unique
  per shop).
