# C3 — Fulfillment & refund API

| | |
|---|---|
| Workstream | C |
| Size | M |
| Depends on | C2, B4 (adjust service), D3 (refund via router) |
| Unblocks | C5, H2 flow (b) |
| Branch | `ws-c/fulfillment-refund` |

## You own
```
apps/api/src/routes/admin/orders/** (fulfillments/refunds subroutes)
apps/api/src/services/orders/{fulfill,refund}.ts
```

## Context
C2 gives orders + timeline; B4 gives inventory adjustment; D3 gives
`refundPayment(paymentId, amount)` in `packages/pay`. If D3 hasn't landed,
stub the pay call behind its contract type
(`packages/contracts/src/pay.ts`) and log a `DECISIONS.md` line — do not wait.

## Build (SPEC §7, §9)
1. **Fulfill** — `POST /admin/api/orders/:id/fulfillments`:
   body `{ locationId, lineItems: [{ lineItemId, quantity }], trackingNumber?,
   trackingUrl? }`. Validates quantity ≤ unfulfilled remainder; writes
   `Fulfillment`; bumps `fulfilledQuantity` per line; decrements stock via
   B4's `adjust` (`reason: 'sold'`, `referenceId: fulfillmentId`); recomputes
   order `fulfillmentStatus` (unfulfilled → partially_fulfilled → fulfilled);
   timeline event ("2 items fulfilled from Downtown"); `orders/fulfilled`
   webhook when the order becomes fully fulfilled.
2. **Refund** — `POST /admin/api/orders/:id/refunds`:
   body `{ lineItems: [{ lineItemId, quantity }], shippingAmount?, reason?,
   restock: boolean }`. Compute the refund amount server-side from line
   prices minus their allocated discounts (use the stored `totalDiscount` —
   proportional per unit) + optional shipping; cap at (paid − already
   refunded). Call D3's refund against the order's captured `Payment`;
   write `Refund` + `PaymentRefund` linkage; restock via B4 when asked;
   update `financialStatus` (partially_refunded/refunded); timeline event;
   `refunds/create` webhook.
3. **Refund calculation endpoint** — `POST /:id/refunds/calculate` returning
   the suggested amounts (C5's refund form shows this before committing —
   Shopify does the same).

## Test plan (write first)
- Vitest (real Postgres, mock processor via D2's mock adapter): partial
  fulfill then complete → status transitions correct; over-fulfil rejected;
  refund math on a discounted multi-quantity line (the §14.2 "refund math"
  case lives in pay, but the per-line proration lives HERE — cover: 2-unit
  line, order-level discount allocated 3/2, refund 1 unit → half the discount
  comes off); refund cap enforced; restock writes adjustment rows.
- Acceptance: suite green; `pnpm verify` green.

## Landmines
- Proration must reuse `allocate`-style integer math — a refund that differs
  from Shopify's by a cent breaks the H2 smoke assertion "refund it".
- Never cascade a refund to a different processor — the refund goes to the
  transaction that captured it (D3 handles this; just don't work around it).
- `restock` is a checkbox, not automatic — cancelled ≠ refunded ≠ restocked.
