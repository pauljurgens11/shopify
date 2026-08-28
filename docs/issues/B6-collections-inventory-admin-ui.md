# B6 — Admin: collections, inventory & locations pages

| | |
|---|---|
| Workstream | B |
| Size | L |
| Depends on | A3, B3, B4 |
| Unblocks | H2 (browse coverage), H3 |
| Branch | `ws-b/collections-inventory-ui` |

## You own
```
apps/admin/src/app/store/[slug]/products/collections/**
apps/admin/src/app/store/[slug]/products/inventory/**
apps/admin/src/app/store/[slug]/settings/locations/**
```

## Context
Collections and Inventory are nav subitems under Products (already in the
registry). A3 gives the shell + API client; B3/B4 give the endpoints. These
pages are simpler than B5 — match Shopify layout, keep scope tight.

## Build (SPEC §9)
1. **Collections index**: `IndexTable` (image, title, type badge
   manual/smart, product count), search, pagination, empty state.
2. **Collection form**: title/description/handle; type chooser at creation
   (locked after — Shopify behavior); manual → product picker modal
   (search + checkbox list) with drag-reorder; smart → condition rows
   (field/operator/value selects, any/all radio) with live "matching products"
   preview list; image via B2 presign; save bar + toast.
3. **Inventory index**: location switcher (`Select` top-right), `IndexTable`
   of variants (product title, sku, image) with **inline-editable
   "Available"** cells — edit → adjust via B4's endpoint, optimistic update,
   toast on save. Search by product/sku.
4. **Locations settings** (`settings/locations`): list + add/edit form
   (name, address fields, active toggle, fulfills-online-orders checkbox) —
   linked from A4's settings hub grid.

## Test plan
- Manual acceptance against seeded data: smart-collection preview updates as
  conditions change; inline inventory edit survives refresh and shows in B4's
  `InventoryAdjustment` history (check via psql/Studio once); each page has a
  real empty state and skeleton.
- `pnpm verify` green.

## Landmines
- Inline inventory edits go through B4's adjust endpoint — never a generic
  variant PUT (the adjustment history is the point).
- Smart-collection preview uses B3's resolve endpoint — don't re-implement
  rule logic client-side.
- No collection SEO card, no scheduled availability, no location deletion
  when it holds stock (disable with tooltip — Polaris pattern).
