# H5 — Seed: close the three demo dead-ends (jane's orders, an app, abandoned checkouts)

| | |
|---|---|
| Workstream | H |
| Size | S |
| Depends on | H1 |
| Unblocks | demo beats for E5 accounts, G4 apps/webhooks, C6 segments |
| Branch | `ws-h/demo-seed-gaps` |

## You own
```
packages/db/prisma/seed/**
```

## Context (found in repo review, 2026-08-29)
Three demo surfaces render real, correct **empty** states that read as unbuilt
features during a walkthrough:

1. **`jane@example.com` has zero orders** — the E5 customer-account demo shows
   an empty order history. Flagged twice in AGENT-LOG (E5 DONE note, H3 note
   197); never done.
2. **No seeded App** — the Apps page opens on its empty state, and there is no
   webhook subscription, so the "webhook demo" beat (SPEC §16 G deliverable)
   requires live setup by the presenter.
3. **No open Checkout rows** — the Customers "Abandoned checkouts" segment is
   always empty (C4 DONE note, 2026-08-28 19:15, suggested seeding a couple).

## Build
1. Attach 2–3 of the existing seeded orders to jane (repoint `customerId` +
   email at order creation in `seed/orders.ts` so counters/timeline stay
   consistent — do not mutate rows after the fact).
2. Seed one app ("Warehouse sync") with a hashed token, one `orders/create`
   webhook subscription pointing at the Mailpit-adjacent echo receiver URL
   documented in worker's `echo` script, and 2–3 delivered `WebhookDelivery`
   rows so the delivery log reads real.
3. Seed 2 open `Checkout` rows younger than 72h with emails of seeded
   customers and `completedOrderId: null`.

## Acceptance
- `/account` for jane shows orders; admin abandoned-checkouts segment lists 2;
  Apps index shows the app with a populated delivery log.
- `seed.test.ts` still green; `pnpm db:reset` deterministic (no clock-time
  dependence beyond the existing whole-day anchoring).

## Test plan
Extend `prisma/seed/seed.test.ts` invariants: jane has ≥2 orders; the app's
token is stored hashed only; every seeded delivery references the seeded
subscription; abandoned checkouts have no completed order.
