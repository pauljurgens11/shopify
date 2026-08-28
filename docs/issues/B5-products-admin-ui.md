# B5 — Admin: products index + product form

| | |
|---|---|
| Workstream | B |
| Size | L |
| Depends on | A3, B1, B2 |
| Unblocks | H2 flow (a) |
| Branch | `ws-b/products-admin-ui` |

## You own
```
apps/admin/src/app/store/[slug]/products/** (except collections/, inventory/ — B6)
apps/admin/src/navigation/items/products.ts (badge/config only — structure is fixed)
```

## Context
A3 provides the Frame shell, `src/lib/api.ts` (typed fetch + React Query
hooks), skeleton/toast plumbing. B1/B2 provide the API. **This page pair is
the KPI centerpiece — a Shopify merchant lives in the product form.** Polaris
v13 has every component you need; the SPEC §9 rule is: if Polaris has the
pattern, use exactly that pattern.

## Build (SPEC §9)
1. **Products index** (`…/products`):
   - Polaris `IndexTable`: checkbox column, product image thumb, title,
     status badge, inventory summary ("12 in stock for 3 variants"), vendor.
   - Tabs: All / Active / Draft / Archived. Filters (status, vendor) +
     `?query=` search box. Sort by title/created. Pagination at 50.
   - Bulk actions: set status, delete (with confirmation modal).
   - Real empty state (Polaris `EmptyState`, "Add your first product") and
     `SkeletonPage` while loading.
2. **Product form** (`…/products/new`, `…/products/[id]`):
   - Two columns exactly as Shopify: left — Title, Description (Polaris text
     field; rich-text editor is out of scope, a multiline field is the
     Polaris-idiomatic cut), Media card (B2 presigned upload, drag-drop,
     reorder), Variants card; right — Status, Publishing, Organization
     (vendor, type, tags with `Combobox`).
   - **Variants editor**: option builder (add option → name + values chips),
     generated variant rows in an editable table (price, sku, available) —
     mirror Shopify's flow: options first, table appears after.
   - **Contextual save bar** on dirty state (Polaris `ContextualSaveBar` via
     Frame), "Product saved" toast, delete with confirm.
   - Prices displayed via `format()`/`fromDecimal()` from
     `@merchant/config/money` — the input shows "19.99", the wire carries 1999.
3. React Query: optimistic status toggles; invalidate list on save.

## Test plan
- No component tests (forbidden). Acceptance is the H2 flow (a) done by hand:
  create a product with 2 options ("Size" S/M, generating variants), upload an
  image, save → toast → appears in index with correct badge and price.
- Give stable selectors for e2e: the save button and title input keep
  predictable roles/labels.
- `pnpm verify` green; page renders with **zero** custom CSS files.

## Landmines
- Polaris-only; 20-min escape hatch → `--p-*` tokens + `DECISIONS.md`.
- Don't build: metafields UI, SEO preview card (cut — SPEC §2 allows schema
  only), duplicate/export actions. A cut feature's button is NOT rendered.
- Money floats in form state are the classic bug here — keep amounts as
  strings in inputs, convert at the API boundary only.
