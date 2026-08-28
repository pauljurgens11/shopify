# E3 — Checkout API: lifecycle, shipping, taxes, complete

| | |
|---|---|
| Workstream | E |
| Size | L |
| Depends on | E1, C1, C2, D3 |
| Unblocks | E4, H2 flows (b)(c) |
| Branch | `ws-e/checkout-api` |

## You own
```
apps/api/src/routes/storefront/checkouts/**
apps/api/src/services/checkout/**
packages/contracts/src/checkout.ts (additive)
```

## Context
Schema: `Checkout` (cartSnapshot, email, shippingAddress, shippingRateId,
discountCode, totals JSON, status `open|completed|expired`,
completedOrderId). C1 = pure pricing, C2 = `createOrder`, D3 =
`PaymentRouter.charge`, A4 = shipping rates + tax %. Contract complete. The
totals shown at every step MUST be computed by one function — drift between
the summary sidebar and the charged amount is the worst demo bug.

## Build (SPEC §10)
1. `POST /storefront/api/checkouts` — from the session cart: snapshot lines
   (variant, title, image, unitPrice — frozen from here), create Checkout,
   return token. Cart survives (abandonment).
2. `GET /storefront/api/checkouts/:token` — full state + computed totals.
3. `PUT /storefront/api/checkouts/:token` — step updates: email, shipping
   address, shippingRateId, discountCode. Each PUT recomputes totals via one
   `computeCheckoutTotals(checkout, rates, taxRate, discounts)` service:
   C1 engine for discounts → matching shipping rates (A4 data; price
   conditions evaluated on the discounted subtotal) → flat tax % on
   (subtotal − discounts) — document the base in the contract `.describe()`.
   Invalid discount code → totals unchanged + `rejectedCode` in the response
   (E4 renders the inline error; not an HTTP error).
4. `GET …/:token/shipping-rates` — applicable rates with computed prices.
5. **`POST …/:token/complete`** — body `{ cardTokenId, savePaymentMethod? }`:
   - Guards: status open, email+address+rate present; recompute totals
     server-side one final time (never trust the client's numbers).
   - Stock: decrement via B4's adjust (`reason: 'sold'`) for `deny`-policy
     variants inside the transaction; insufficient → `conflict` with a
     line-level error payload.
   - Charge via `PaymentRouter.charge` (idempotencyKey = checkout token —
     double-submit safe). Declined → 402-style SPEC error with the decline
     code (E4 shows it; checkout stays open). Approved →
     C2's `createOrder` + link `completedOrderId`, mark completed, attach
     customer via C4's `findOrCreateByEmail`, save card if asked (D3),
     enqueue confirmation email (G1), clear the cart.
   - Return `{ orderId, orderNumber, confirmationUrl }`.
6. Rate-limit complete: `RATE_LIMITS.checkoutPayment`.

## Test plan (write first)
- Vitest (real Postgres + mock processor): full happy path with `4242…` —
  order exists with totals equal to the checkout's to the cent; declined card
  (`…0002`) → checkout still open, no order, Payment row failed; double
  `complete` (Promise.all) → exactly one order (idempotency); discount code
  WELCOME10 changes totals exactly as C1 predicts; free-shipping discount
  zeroes the selected rate; deny-policy stock race → one success one conflict.
- Acceptance: suite green; `pnpm verify` green.

## Landmines
- The server recomputes at complete — the client's displayed totals are a
  view, never an input.
- Money: integers end-to-end; the tax line rounds via `percentOf` once, not
  per-line-then-summed differently than the display.
- Do not implement address validation, express wallets, or multi-step session
  resumption emails — out of scope.
