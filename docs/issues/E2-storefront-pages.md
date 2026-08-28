# E2 — Storefront pages rendered from the published theme

| | |
|---|---|
| Workstream | E |
| Size | L |
| Depends on | E1, F1 |
| Unblocks | E4, H2 flows (b)(d) |
| Branch | `ws-e/storefront-pages` |

## You own
```
apps/storefront/** (except checkout routes — E4)
```

## Context
`apps/storefront` has Host→slug resolution (`src/lib/tenant.ts`) and a
Tailwind 4 `globals.css` that maps `--theme-*` CSS vars into Tailwind theme
tokens — F1's sections consume exactly those. F1 provides `renderPage`,
section components, and `themeCssVariables`. E1 provides all data endpoints.
Everything is Server Components + Tailwind (no Polaris here — the design is
ours, SPEC §3).

## Build (SPEC §10)
1. **Layout**: per-request shop resolution (slug → E1 `/shop` + `/theme`
   fetch, `cache: 'no-store'` only for preview; otherwise Next fetch cache
   keyed by shop+themeVersion); apply `themeCssVariables` on `<body>`; load
   the two Google Fonts the theme names; render theme navigation header
   (logo=shop name, nav links, cart badge with line count) and doc-level
   footer section. Unknown shop → clean 404 page.
2. **Pages**, all rendered through `renderPage(themeDoc, page, data)`:
   - `/` — home sections.
   - `/products/[handle]` — product page (theme's product sections; the
     `product-detail` core section gets the product + variant selection +
     add-to-cart posting to E1's cart).
   - `/collections/[handle]` — collection page with the `collection-page`
     core section (grid, sort select, simple availability filter).
   - `/search?q=` — reuses the collection grid over `?query=` results.
   - `/cart` — `cart-page` core section: line rows (image, title, qty
     stepper, remove), subtotal, "Check out" → E4's `/checkouts/{token}`.
   - `?preview=thm_…` passthrough on every page (F4's iframe preview).
3. **Client islands**: variant picker, qty stepper, add-to-cart button
   (optimistic badge bump) — small `'use client'` leaves; everything else
   stays server.
4. **Events**: fire `page_view` / `product_view` / `add_to_cart` beacons to
   E1's events endpoint (a tiny client hook using `navigator.sendBeacon`).
5. **Performance budget** (SPEC §10): images via `next/image`; product and
   collection fetches cacheable; TTFB < 300ms locally on the seeded shop —
   measure once with `curl -w` and note the number in the PR.

## Test plan
- Manual acceptance on seeded data: all five pages render the "Aurora" preset
  with real products; add-to-cart from a product page updates the cart page;
  switching a variant updates price/image; search returns matches; a second
  shop's host shows its own catalog (tenancy visible end-to-end).
- `pnpm verify` green; `pnpm --filter @merchant/storefront build` succeeds
  (build breaks are post-merge-only in CI — catch them now).

## Landmines
- Zero hardcoded colors/fonts — everything through `--theme-*` vars, or
  theme switching (H2 flow d) visibly fails.
- Don't fetch from Prisma directly — storefront talks to the API only
  (WORKSTREAMS boundary; also what makes the cache headers matter).
- `/account` routes belong to E5; `/checkouts` to E4 — leave stubs out
  entirely rather than half-rendering them.
