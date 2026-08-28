# D3 — Payment router, Payment records, refunds + tests

| | |
|---|---|
| Workstream | D |
| Size | M–L |
| Depends on | D1, D2 |
| Unblocks | C3, D4, E3 |
| Branch | `ws-d/payment-router` |

## You own
```
packages/pay/src/router.ts (+ router.test.ts, credentials.ts)
apps/api/src/routes/admin/payments/**
packages/contracts/src/pay.ts (additive)
```

## Context
`router.ts` is an empty `export {}`. Schema (`pay.prisma`) has
`ProcessorConfig` (encrypted creds fields), `RoutingRule` (weight,
conditions), `Payment` (with `idempotencyKey` and `routingTrail`),
`PaymentRefund`, `PaymentMethod`. Contract defines routing rules and the
`approved|declined|hard_failure` union. This is the heart of Deviation #1 and
most of the §14.2 mandatory suite.

## Build (SPEC §11 Routing)
1. **Credentials** (`credentials.ts`): encrypt/decrypt `ProcessorConfig`
   creds with D1's crypto (same master key — fine for this project).
2. **`PaymentRouter.charge(db, shopId, { cardTokenId, amount, capture,
   customer?, billingAddress?, idempotencyKey, orderId?/checkoutId? })`**:
   - **Idempotency first**: an existing `Payment` with this idempotencyKey →
     return it, no processor call.
   - **Selection**: active RoutingRules whose conditions match (cardBrands via
     the vault row's brand; min/maxAmount) → weighted random among matches
     (weights are percentage splits); no rules → the shop's default/first
     active processor.
   - **Execute** via `adapterFor(config.processor)` with decrypted creds and
     the PAN fetched inside `packages/pay`.
   - **Failover**: `hard_failure` → next processor in the fallback chain
     (rule order), recording each hop in `routingTrail`.
     **`declined` NEVER cascades** — record and return the decline.
   - Persist `Payment` (status authorized/captured/failed, processor,
     processorTxnId, last4, brand, errorCode, routingTrail) whatever the
     outcome. Emit `orders/paid` webhook + purchase analytics event on
     success when the order context is present (G1 helper or stub).
3. **`capture` / `refundPayment` / `voidPayment`**: route to the SAME
   processor/txn that authorized (from the Payment row). Refund: cap at
   captured − refunded (sum `PaymentRefund` rows), write `PaymentRefund`,
   set partially_refunded/refunded.
4. **Saved cards**: `savePaymentMethod(db, shopId, customerId, cardTokenId)`
   → `PaymentMethod` row; `chargeSavedCard(...)` = lookup + `charge` (the
   repeat-billing primitive; no subscription engine).
5. **Admin routes** (`/admin/api/payments/…`, `requirePermission('settings')`):
   processor config CRUD (`verifyCredentials` on connect), routing rule CRUD
   (ordered list, weights validated to ≤100 per matching set), payments list
   for an order.

## Test plan (write first — the rest of §14.2)
`router.test.ts` with the mock adapter (+ a stub adapter you register in-test
for failover sequencing): weighted selection distribution (seeded RNG — inject
the RNG, don't patch Math.random); hard-fail on A → succeeds on B with
routingTrail `[A,B]`; **decline on A → NO attempt on B**; idempotency: same
key twice → one processor call, same Payment; refund math incl. two partial
refunds capping at the captured amount.

Acceptance: `pnpm --filter @merchant/pay exec vitest run` green; `pnpm verify`
green.

## Landmines
- The decline/hard-failure boundary is the whole product. When unsure how to
  classify an adapter outcome, classify it `declined` (never retried) — the
  safe wrong answer.
- Inject randomness (pass an `rng` param defaulting to Math.random) — tests
  and the two-day debug story need determinism.
- `Payment` rows are written for failures too — D4's UI and the order page
  show declined attempts, like Shopify.
