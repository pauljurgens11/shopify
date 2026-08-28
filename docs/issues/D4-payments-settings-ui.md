# D4 — Admin: Settings→Payments + charge saved card

| | |
|---|---|
| Workstream | D |
| Size | M |
| Depends on | A3, D3 |
| Unblocks | demo completeness (connect processors live) |
| Branch | `ws-d/payments-settings-ui` |

## You own
```
apps/admin/src/app/store/[slug]/settings/payments/**
```
Plus (coordinate, additive): a "charge saved card" action block C5 mounts on
the order page — deliver it as a self-contained component exported from your
directory and hand C5 a one-line import (do not edit C5's pages yourself).

## Context
D3 exposes processor-config CRUD, routing rules, and `chargeSavedCard`. A4
owns the settings hub grid; your page hangs off its "Payments" card.

## Build (SPEC §11)
**Layout authority: [PARITY.md](PARITY.md). It overrides your memory of Shopify — read your page's section before writing JSX.**

1. **Payments settings page**:
   - Connected processors list (Polaris resource list): name, status badge
     (Connected / Error), test-mode tag for mock; Connect button per
     available adapter (mock: one click; stripe: secret-key field —
     verified via D3's `verifyCredentials` before saving; maverick: creds
     form marked "simulated without credentials").
   - **Routing rules card**: ordered rule rows (drag or up/down) — processor
     select, weight %, optional conditions (brand multi-select, min/max
     amount); inline validation that weights across matching rules ≤100;
     fallback chain explainer text mirroring the SPEC rule ("declines never
     retry on another processor").
2. **Charge saved card** component: for an order's customer with a
   `PaymentMethod`, a card list (brand + last4 + exp) with "Charge" →
   amount-prefilled modal → calls D3's charge endpoint → toast + refresh.
   This is the demo's repeat-billing beat.

## Test plan
- Manual acceptance: connect mock processor → appears Connected; create a
  70/30 routing split, refresh, order preserved; charge a saved card on a
  seeded order → new Payment row visible on the order page.
- `pnpm verify` green.

## Landmines
- Secret keys: password-type input, never rendered back (show `sk_…last4`),
  posted once — the API stores them encrypted.
- Weight math is integer percentages; keep the ≤100 validation client AND
  server side (server is D3's; don't rely on client only).
- No payout schedules, no fraud settings, no Shopify Payments branding —
  this page is "Merchant Pay".
