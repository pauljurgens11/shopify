# C1 — Discounts & totals engine (pure) + §14.3 tests

| | |
|---|---|
| Workstream | C |
| Size | M |
| Depends on | — (pure logic; grab immediately) |
| Unblocks | C6, E3, H2 flow (c) |
| Branch | `ws-c/discounts-engine` |

## You own
```
apps/api/src/services/discounts/** (engine.ts + engine.test.ts)
packages/contracts/src/discounts.ts (additive)
```

## Context
This is one of the three **mandatory blocking** test suites (SPEC §14.3), and
E3's checkout totals depend on it — land it early and pure. Contract
(`packages/contracts/src/discounts.ts`) is complete: three types
(`amount_off_order|amount_off_products|free_shipping`), value types
(`percentage` int 0–100 | `fixed` int minor units), `appliesTo`
(all/collections/products), `minimumRequirement` (none/subtotal/quantity),
usage limits, date window, code vs automatic (code null). Money helpers —
including `allocate` (largest-remainder split) and the digit-safe
`fromDecimal` — live in `packages/config/src/money.ts` and already have tests.

## Build (SPEC §10, §7)
A **pure function**, no I/O — the caller (E3, C6 preview) fetches rows:

```ts
applyDiscounts(input: {
  lines: { variantId; productId; collectionIds: string[]; quantity; unitPrice: Money }[];
  shippingPrice: Money;
  discounts: Discount[];      // candidate automatics + the entered code, pre-filtered by caller
  now: Date;
}): {
  lines: (…line & { totalDiscount: Money })[];
  appliedDiscounts: { discountId; code; title; amount: Money }[];
  rejectedCode?: { code; reason: 'expired'|'not_started'|'minimum_not_met'|'usage_limit'|'invalid' };
  subtotal: Money; discountTotal: Money; shippingTotal: Money;
}
```

Rules to implement exactly:
- Eligibility: status, startsAt/endsAt vs `now`, minimumRequirement (subtotal
  computed pre-discount; quantity across eligible lines), usageLimit vs
  usedCount.
- `amount_off_order`: percentage or fixed off the eligible subtotal;
  distributed to lines with `allocate` (weights = line totals) so line
  `totalDiscount`s sum exactly to the order discount.
- `amount_off_products`: applies only to lines matching `appliesTo`.
- `free_shipping`: zeroes shippingTotal.
- **Stacking (SPEC §14.3)**: all automatic discounts apply; at most ONE code;
  code + automatics stack. Per line, discounts apply sequentially to the
  remaining amount — a line never goes negative.
- Edge cases: 100% off; fixed discount > subtotal (clamp via `clampToZero`);
  empty cart; discount on a line with quantity > 1.

## Test plan (this issue IS the §14.3 suite — write tests first)
`engine.test.ts`: every rule above gets a case; the allocate-sum invariant
(`Σ line.totalDiscount === discountTotal - shippingDiscount`) asserted on a
3-line uneven cart; property-style loop over 50 random integer carts asserting
totals never negative and always integers. Remove `--passWithNoTests` from
`apps/api/package.json` if A2 hasn't already.

Acceptance: `pnpm --filter @merchant/api exec vitest run src/services/discounts`
green; `pnpm verify` green.

## Landmines
- Integers only, everywhere — including test fixtures (CLAUDE.md §9 explicitly
  bans float money in tests/seeds).
- Percentage math via `percentOf` (rounds half-up at the minor unit) — do not
  hand-roll `* 0.15`.
- No coupon-combination UI logic here — pure math; C6 owns forms, E3 owns the
  checkout call site.
