# Parity reference — captured from the real Shopify admin

Ground truth for CLAUDE.md §7 / SPEC.md §7. Everything in this folder was read off a
live Shopify admin, not recalled from memory. When one of these files disagrees with
your recollection of "what Shopify looks like", **this folder wins**.

## Capture conditions — read this before trusting a page

| | |
|---|---|
| Captured | 2026-08-29 |
| Admin | `admin.shopify.com/store/…`, current (2026) admin shell |
| Viewport | 1054×719 and 1316×898 CSS px, light theme, desktop |
| Store state | **Brand new and empty** — 0 products, 0 orders, 0 customers, 1 collection |
| Method | Claude in Chrome — screenshots + accessibility tree |

The empty store is the big caveat. It shapes what is and isn't reliable here:

**Reliable**: every form page (they render fully without data), every empty state,
the nav/shell, the contextual save bar, the one populated `IndexTable` we had
(Collections), and the bulk-action bar.

**Not captured — do not guess from this folder**:

- Populated Products / Orders / Customers index tables (columns, sort options, filter
  chips, pagination, row rendering)
- Order detail — the single most complex page in the admin
- The real Home dashboard *with data*. What we captured is the *new-store onboarding*
  Home ("Welcome to Shopify! Where do you want to start?"), a different page from the
  dashboard an established store sees. We build **both**, switched on whether the shop
  has ever taken an order: `home.md` for a shop created at signup, and `dashboard.md`
  — the real dashboard chrome (date range, metric tiles, charts, per-card empty states),
  captured from Analytics — for the seeded demo.
- Anything below the fold on Settings, Analytics, Content, Markets, Finance

Filling those gaps needs a store with data. See "Extending this folder" below.

## Files

| File | Covers | Confidence |
|---|---|---|
| [admin-shell.md](admin-shell.md) | Nav, top bar, save bar, page header | High |
| [product-form.md](product-form.md) | Add/edit product — full card order, both columns | High |
| [customer-form.md](customer-form.md) | New customer | High |
| [collection-detail.md](collection-detail.md) | Collection editor, skeleton state | High |
| [dashboard.md](dashboard.md) | Date-range popover, metric tiles, charts — **the seeded Home** | High for structure |
| [index-tables.md](index-tables.md) | Index page chrome, bulk actions, empty states | Medium — one populated table only |
| [home.md](home.md) | Onboarding Home — the variant an empty shop gets | High; built |
| [capture.md](capture.md) | How to capture more, and the priority queue | — |

## How to use this

1. Before building or reviewing an admin page, read its file here.
2. Each file ends with **Delta vs our build** — concrete, already-diffed against our
   code at capture time. Those are the parity bugs worth fixing, ranked.
3. A delta is a finding, not a mandate. SPEC.md §2 (out of scope) still wins: real
   Shopify has plenty we deliberately do not build. Where a delta touches something
   SPEC.md cut, the file says so.
4. Exact copy strings are quoted with `"` — they are transcribed verbatim, so use them
   verbatim. Empty-state and helper-text wording is most of what makes a page feel real.

## Extending this folder

The gaps above all need a **populated** store. Two ways:

- A Shopify development store with the sample-data app installed (products, orders,
  customers) — then recapture the index tables and order detail.
- The capture method itself is in [capture.md](capture.md): a DevTools snippet that
  dumps structure + copy + computed styles for any admin page, for when driving the
  browser is not available.

Add new pages as `docs/parity/<page>.md`, follow the existing shape (Source → Layout →
Copy → Delta vs our build), and add a row to the table above.

## Do not

- Copy Shopify's SVG illustrations, logo, or the "Shopify" name into our UI.
  CLAUDE.md §7: the brand string is **Merchant**. Empty states need *our* illustration
  or none — the structure and copy pattern is what we are cloning, not the artwork.
- Treat pixel measurements here as authoritative. We use Polaris v13 components, which
  ship Shopify's own CSS; if a component is used correctly the pixels already match.
  Structure, card order, and copy are where we actually drift.
