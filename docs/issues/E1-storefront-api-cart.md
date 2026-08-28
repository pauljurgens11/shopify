# E1 — Storefront API + cart service

| | |
|---|---|
| Workstream | E |
| Size | L |
| Depends on | A1 (Host tenancy), B1 (products; stub against contracts if racing) |
| Unblocks | E2, E3, E5, G2 |
| Branch | `ws-e/storefront-api-cart` |

## You own
```
apps/api/src/routes/storefront/**
apps/api/src/services/cart/**
packages/contracts/src/{storefront,cart}.ts (additive)
```

## Context
A1's tenancy plugin resolves `/storefront/api/*` requests from the Host
header to `request.shopId` — you build on `request.db`, unauthenticated by
design. Contracts for storefront/cart are complete. One gap to fix
(additive): `storefront.ts` returns only `themeVersionId` — add a
`GET /storefront/api/theme` response carrying the full published `ThemeDoc`
(type from `contracts/theme.ts`) so E2 can render without a second hop.

## Build (SPEC §10)
1. **Read endpoints**, all with `Cache-Control: s-maxage=60,
   stale-while-revalidate` (SPEC's perf budget leans on this):
   - `GET /storefront/api/shop` — name, currency, published theme version id.
   - `GET /storefront/api/theme` — the published ThemeDoc (+ `?preview=thm_…`
     support: verify F3's signed preview param and serve that draft instead).
   - `GET /storefront/api/products` (+ `/:handle`) — active products only,
     with variants/options/images; `?query=` for search page.
   - `GET /storefront/api/collections/:handle/products` — via B3's resolver.
2. **Cart service + endpoints** (server cart, cookie-referenced):
   - `POST /storefront/api/cart` → creates Cart (token), sets
     `constants.CART_COOKIE` (httpOnly).
   - `GET /storefront/api/cart`, `POST …/cart/lines`,
     `PUT …/cart/lines/:lineId`, `DELETE …/cart/lines/:lineId` — line =
     variantId + quantity; server snapshots price/title/image at read from
     live variants (cart lines store variantId+qty only; totals computed on
     read — carts must reflect price changes, per Shopify).
   - Quantity respects `inventoryPolicy: deny` against available stock
     (readable check; the hard reservation happens at checkout completion).
   - Cart totals via `@merchant/config/money` — subtotal only (shipping/tax/
     discounts belong to checkout, E3).
3. **Analytics beacon**: `POST /storefront/api/events` accepting the
   `AnalyticsEvent` batch contract; insert-only via `request.db` — G2 owns
   rollups; you own only ingestion glue here (thin — G2 may move it later;
   coordinate via contracts, not shared code).

## Test plan (write first)
- Vitest (real Postgres): Host `demo.lvh.me` resolves; unknown host → 404
  envelope; cart line add/update/remove recomputes integer totals; deny-policy
  variant can't exceed stock; draft products invisible; cache headers present
  on product/collection GETs.
- Acceptance: suite green; `curl -H "Host: demo.lvh.me" localhost:3001/storefront/api/shop`
  returns the seeded shop; `pnpm verify` green.

## Landmines
- No session auth on these routes — but they are still tenant-scoped through
  `request.db`; never accept a shopId from the query string.
- Don't return draft/archived products or unpublished themes (except signed
  preview) — leaking drafts on the storefront is a demo-killer.
- Prices in responses are Money ints; the storefront formats.
