# E9 — applying a discount must not drop the chosen shipping method

| | |
|---|---|
| Workstream | E |
| Size | S |
| Depends on | E3, E4 (landed) |
| Unblocks | the demo's optional WELCOME10 beat reading as polished |
| Branch | `ws-e/discount-keeps-shipping` |

## You own
```
apps/api/src/services/checkout/checkout.ts   (the PUT/update path)
apps/api/src/services/checkout/totals.ts     (rate re-qualification)
apps/storefront/src/components/checkout/**   (only if the fix is client-side)
```

## Context (found in repo review, 2026-08-29, driving the live checkout)

Fill the address, pick **Standard shipping ($8.95)**, then type `WELCOME10`
and Apply. The discount applies (−$1.80, tax recomputed) — and the shipping
selection silently resets: both radios go empty and the sidebar's Shipping
row reverts to **"Enter shipping address"** even though the address is
complete and the rate list is still on screen. The shopper has to notice and
re-pick a rate before Pay now works.

DECISIONS.md (WS-E, 2026-08-28) says a selected rate is dropped only when it
**stops qualifying** on the discounted subtotal. Standard shipping has no
minimum and still qualifies at $16.20 — so this is the update path clearing
the selection wholesale, not the documented rule. (Most likely the discount
PUT re-prices with `shippingRateId` absent and treats absent as "reset"
rather than "leave alone" — the same undefined-vs-empty distinction
`updateProductInput` already gets right.)

Also cosmetic, same seam: while no rate is selected the sidebar says "Enter
shipping address" even when the address is complete — "Select a shipping
method" is the honest label for that state.

## Build

1. On a checkout PUT that carries only `discountCode`, keep the existing
   `shippingRateId` unless the re-qualified rate list no longer contains it
   (that drop rule stays — a coupon can price you out of free shipping).
2. Sidebar label: distinguish "no address yet" from "address complete, no
   rate chosen".

## Acceptance
- Pick a rate → apply WELCOME10 → the rate stays selected and the sidebar
  shows its price; totals include shipping.
- Apply a discount that disqualifies the selected rate (e.g. drops the
  subtotal below a free-shipping minimum) → the rate IS dropped, as today.
- Remove the discount → selection still intact.

## Test plan
One checkout.test.ts case: create checkout, select rate, PUT a discount
code, assert `shippingRateId` unchanged and totals include the rate. Mutation
check: revert the fix, the test must fail.
