# A4 — Settings hub: general, staff, plan, shipping, taxes, checkout

| | |
|---|---|
| Workstream | A |
| Size | L |
| Depends on | A1, A3 |
| Unblocks | E3 (reads shipping rates + tax %), H2 flow (c) indirectly |
| Branch | `ws-a/settings-hub` |

## You own
```
apps/api/src/routes/admin/settings/**
apps/api/src/services/settings/**
apps/admin/src/app/store/[slug]/settings/** (except payments/** — WS-D)
packages/contracts/src/shops.ts (additive)
```
Locations settings UI belongs to B6; Payments to D4. Link to both from the hub.

## Context
`packages/contracts/src/shops.ts` defines `taxSettingsSchema`,
`shippingRateSchema`, `checkoutSettingsSchema` but **no update inputs** — add
`updateShopInput`, `updateTaxSettingsInput`, `upsertShippingRateInput`,
`updateCheckoutSettingsInput` (additive change, no DECISIONS line needed).
Settings storage: prefer existing `Shop` columns / JSON fields — check
`packages/db/prisma/schema/platform.prisma` before adding models; shipping
rates likely need their own small model (additive migration
`NNN_wsa_shipping_rates` — `git pull` first).

## Build (SPEC §9 settings list, §10 shipping/taxes)
1. **API**: `GET/PUT /admin/api/settings/general` (shop name, email, currency,
   timezone — currency is single per shop, SPEC §2), `…/taxes` (flat %,
   default 0), `…/checkout` (minimal toggles per contract), shipping rate CRUD
   (`flat` and price-conditional rates per SPEC §10), staff CRUD
   (`GET/POST/DELETE /admin/api/settings/staff`, invite = create with password,
   role + per-area permissions per SPEC §8 — owner cannot be deleted).
   All behind `requirePermission('settings')`.
2. **Admin UI** under `/store/[slug]/settings`:
   - Hub page: Shopify's settings grid of icon cards (General, Plan, Staff,
     Locations, Payments, Shipping, Taxes, Checkout).
   - General / Taxes / Checkout: two-column Polaris forms, **contextual save
     bar** on dirty state, "Settings saved" toast.
   - Shipping: rate list + add/edit modal (name, price, optional min/max order
     price condition).
   - Staff: index table + add/edit with role select and permission checkboxes.
   - Plan: static page ("Trial" card) — render, don't build billing.

## Test plan (write first)
- Vitest (service level, real Postgres): tax % and shipping-rate conditions
  round-trip; a staff user without `settings` permission gets 403 from the API.
  Keep it to what E3 will consume — no per-endpoint CRUD sweep (SPEC §14).
- Manual acceptance: every card in the hub opens a working page; save bar
  appears on edit and clears on save; `pnpm verify` green.

## Landmines
- Shipping is merchant-defined flat/price-based ONLY — no carrier rates
  (SPEC §2 hard stop). Taxes: one flat % — no providers, no per-region tables.
- Money fields (rate price, min/max conditions) are integer minor units via
  `packages/config/money.ts` — the form layer converts with
  `fromDecimal`/`format`, never `parseFloat`.
- E3 consumes shipping rates + tax % through contracts — coordinate shape
  changes there with a `[contracts]` PR title.
