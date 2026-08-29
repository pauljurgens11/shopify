# E6 — Checkout: make "save this card" real (saveCard is accepted and ignored)

| | |
|---|---|
| Workstream | E |
| Size | M |
| Depends on | E4, D3, C4 |
| Unblocks | repeat-billing demo on non-seeded customers |
| Branch | `ws-e/checkout-save-card` |

## You own
```
apps/storefront/src/app/checkouts/**        (the save-card checkbox)
apps/api/src/services/checkout/complete.ts  (the wiring)
```

## Context (found in repo review, 2026-08-29)
SPEC §11 puts saved cards at checkout squarely in scope: *"customer checkout
'save this card' → `PaymentMethod` links customer→cardToken"*. Today:

- `completeCheckoutInput.saveCard` exists in `packages/contracts/src/checkout.ts`
  (`z.boolean().default(false)`) and is **accepted and never read** —
  `services/checkout/complete.ts` contains no reference to it. An API caller
  sending `saveCard: true` gets a silent no-op, which SPEC §5 calls out as the
  worst failure mode for a contract field.
- `savePaymentMethod` in `packages/pay/src/router.ts` has **no caller anywhere**
  (WS-D flagged this in AGENT-LOG on 2026-08-29T00:20Z and nobody picked it up).
- E4 renders no save-card control, so `PaymentMethod` rows exist only via the
  seed. The admin's "Charge saved card" block (D4) therefore only ever works
  against seeded data — a real shopper can never produce one.

## Build
1. In `complete.ts`, after a successful charge, when `saveCard` is true and the
   checkout resolved/created a customer: call `savePaymentMethod` with the
   vault token the charge used. Never let a save failure fail the order —
   the charge already happened; log and move on.
2. In E4's Payment section, render Shopify's "Save this card for future
   purchases" checkbox. Only meaningful when the shopper has an account
   session or an email that matches a customer — simplest correct rule:
   always send the flag; the server decides (guest with no customer row →
   no-op is then *chosen*, not accidental).
3. If you decide NOT to build the UI, delete `saveCard` from the contract
   instead — an ignored field is worse than an absent one. Log either way in
   DECISIONS.md.

## Acceptance
- Complete a checkout with `saveCard: true` for a logged-in customer →
  `PaymentMethod` row exists; admin order page shows the Charge block for
  that customer's next order.
- Same request for a pure guest → order completes, no row, no error.
- A save-path failure (kill the vault row first) does not fail the order.

## Test plan
Extend `apps/api/test/checkout.test.ts`: one HTTP completion with
`saveCard: true` asserting the PaymentMethod row + card token linkage, one
guest case asserting silent skip. No UI test (forbidden by §14).
