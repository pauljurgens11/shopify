# B1 — Products & variants API

| | |
|---|---|
| Workstream | B |
| Size | M |
| Depends on | A1 |
| Unblocks | B2, B3, B4, B5, E1, H1 |
| Branch | `ws-b/products-api` |

## You own
```
apps/api/src/routes/admin/products/**
apps/api/src/services/catalog/**
packages/contracts/src/products.ts (additive)
```

## Context
Schema (`packages/db/prisma/schema/catalog.prisma`) and contracts
(`packages/contracts/src/products.ts`) are complete: Product, ProductOption,
ProductVariant (price as integer minor units, `optionValues` JSON,
`inventoryPolicy`), ProductImage. No routes or services exist. Autoload:
a file at `routes/admin/products/index.ts` mounts at `/admin/api/products`.
`request.db` is the tenant-scoped client; nested `create` payloads are
auto-stamped with `shopId` (see `packages/db/src/tenant.ts`), so
`db.product.create({ data: { …, variants: { create: […] } } })` is safe.

## Build (SPEC §7, §9)
Service layer in `services/catalog/products.ts`, thin zod-validated routes:
- `GET /admin/api/products` — cursor pagination (id-cursor, `limit` ≤ 250),
  `?query=` matches title/vendor/sku, `?status=`, tab-friendly filters, sort.
- `POST /admin/api/products` — creates product + options + variants + images
  in one nested write. **Variant generation**: options `[{name, values[]}]` →
  cartesian product of variants (Shopify behavior), variant title like
  `"S / Black"`, positions assigned.
- `GET/PUT/DELETE /admin/api/products/:id` — PUT reconciles variants/options
  (create new, update kept, delete removed — in a transaction).
- `GET/PUT /admin/api/products/:id/variants/:variantId` for inline edits.
- Handle generation: slugified title, unique per shop (`-2` suffix on clash).
- All routes `requirePermission('products')`.
- Emit `products/create|update|delete` webhook events via the G1 enqueue
  helper if it exists — otherwise call a no-op stub defined in
  `packages/contracts/src/webhooks.ts` types and note it (don't block).

## Test plan (write first)
- `apps/api/test/products.test.ts` (real Postgres, `app.inject`, one file):
  option matrix → expected variant set; PUT reconcile keeps ids of surviving
  variants; handle uniqueness; `?query=` matches sku. This is engine logic the
  product form depends on — not a forbidden CRUD sweep; skip trivial
  get/delete assertions.
- Acceptance: `pnpm --filter @merchant/api exec vitest run test/products.test.ts`
  green; create a product via `curl` against `pnpm dev` and see it in the list.

## Landmines
- Prices are integer minor units end-to-end; the API never sees `19.99`
  (CLAUDE.md §5). Zod already enforces ints — don't "helpfully" coerce floats.
- Never touch `InventoryLevel` here — stock is B4's adjustment service.
- Deleting a product with orders: soft-block is over-engineering; Shopify
  deletes and orders keep their snapshot fields (`OrderLineItem.title` etc.) —
  that's why the line-item columns are denormalized. Just delete.
- `not_found` (SPEC error shape) for another shop's id — the tenant client
  already guarantees the row is invisible; map `P2025` to 404, `P2002` to
  `conflict`.
