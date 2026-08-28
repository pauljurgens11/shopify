# D2 — Processor adapters: mock, stripe, maverick + tests

| | |
|---|---|
| Workstream | D |
| Size | M |
| Depends on | — (interface + contract exist; vault only needed at D3 wiring) |
| Unblocks | D3 |
| Branch | `ws-d/adapters` |

## You own
```
packages/pay/src/adapters/** (+ tests)
packages/pay/src/adapter.ts, packages/pay/src/index.ts (additive)
packages/pay/package.json (add `stripe` dependency)
```

## Context
`adapter.ts` defines `ProcessorAdapter` — note it (sensibly) deviates from
SPEC §11 by passing `creds: ProcessorCredentials` into every method; **log
that deviation in `DECISIONS.md`** (it predates you but is unlogged). All
three adapters currently `throw new Error('not implemented')` — a direct
violation of the no-throwing-stubs rule; replace entirely. The
`authResultSchema` in `contracts/pay.ts` is a discriminated union
`approved | declined | hard_failure` — that distinction is what D3's
failover logic keys on, so map every outcome onto it precisely.

## Build (SPEC §11 adapters)
1. **mock** — deterministic, powers demo + e2e:
   - `4242424242424242` → approved (txnId `mock_…` ULID); capture/refund/void
     succeed with recorded amounts.
   - `4000000000000002` → `declined`, errorCode `card_declined`.
   - `4000000000009995` → `declined`, errorCode `insufficient_funds`.
   - Card number ending `0119` → `hard_failure` (simulated 5xx) so the
     router's failover is demonstrable and testable.
   - In-memory txn store so `capture(txnId)` of an unknown txn fails cleanly;
     partial + double refund tracked against the authorized amount.
   - `verifyCredentials` → always true.
2. **stripe** — real calls via the `stripe` SDK: PAN (from vault via D3) →
   PaymentMethod → PaymentIntent (manual capture when `capture: false`),
   capture/refund/void mapped; Stripe card-error → `declined` with Stripe's
   decline code; network/5xx/rate-limit → `hard_failure`.
   `verifyCredentials` = a cheap authenticated GET. Secret key comes from
   `creds`, not env (per-merchant, SPEC §11 routing).
3. **maverick** — interface-complete with typed request/response objects
   mirroring Maverick's documented shapes; returns simulated approvals
   (deterministic from amount parity or similar) unless `MAVERICK_*` creds
   present, in which case it POSTs for real. Clearly marked simulated in
   responses (`processorMeta.simulated: true`).
4. Registry `index.ts`: `adapterFor(key)` already exists — keep it the only
   lookup path.

## Test plan (write first — §14.2)
`adapters/mock.test.ts`: the four test cards produce exactly the four
outcomes; auth-then-capture flow; refund > captured rejected; void after
capture rejected. `adapters/stripe.test.ts`: only the **error-mapping**
function (card_error→declined, APIConnectionError→hard_failure) — unit-pure,
no network, no Stripe mocks beyond error instances (SPEC forbids
mock-heavy glue tests; the mapping is real logic).

Acceptance: `pnpm --filter @merchant/pay exec vitest run` green;
`pnpm verify` green.

## Landmines
- Never blur `declined` into `hard_failure` — a decline that failovers would
  double-charge cards at D3; this is CLAUDE.md §9's "no decline cascade" at
  its root.
- Adapters receive PAN only from vault code inside `packages/pay` — their
  public entry takes `cardTokenId` + creds via D3, never raw PAN from outside.
- No processor SDK imports outside `packages/pay` (WORKSTREAMS.md rule).
