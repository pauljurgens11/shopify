# @merchant/pay

Deviation #1 (SPEC §11): our own payment platform — card vault, processor
adapters, merchant-configurable routing. Owner: WS-D.

## The boundary

Nothing outside this package may decrypt a card blob or import a processor SDK.
The rest of the monorepo speaks `@merchant/contracts/pay` and nothing more.

`CardMaterial` (`src/adapter.ts`) is what an adapter needs to reach a processor,
and with `VaultedCard` (`src/vault.ts`, which satisfies it) it is one of the two
PAN-bearing types in the repo. Both live here rather than in `contracts`
precisely so the api, admin and storefront cannot reach them. A PAN travels one
hop — `getCard` → adapter, wired by the router — and belongs in no log line,
error message or `raw` payload.

## PAN isolation

The browser posts card data straight to `/vault/tokenize`; the checkout server
never sees a PAN. The vault returns a `card_tok_` that every other system uses.
Tokens are processor-agnostic, which is what lets a saved card be charged on a
different processor later — the subscription/repeat-billing primitive.

## Vault

`src/crypto.ts` is AES-256-GCM under a single `VAULT_MASTER_KEY` (64 hex chars,
validated at boot). `src/vault.ts` is the only module that calls it:

| Export | Who may call it |
|---|---|
| `tokenizeCard(db, shopId, card)` | `POST /vault/tokenize` — validates (Luhn, brand, expiry), seals `{ number, cvc }`, stores a `VaultCard`, returns a `CardToken`. |
| `validateCard`, `luhnValid`, `detectBrand`, `validateExpiry`, `normalizeCardNumber` | anyone — none of them returns a PAN. |
| `getCard(db, cardTokenId)` | **`packages/pay` only.** It decrypts. An import from anywhere else is a bug. |

`db` must be `dbForShop(shopId)`; the tenant extension is what stamps and scopes
the row. Ciphertext, IV, and auth tag live in three columns rather than one
packed string, because that is the shape `VaultCard` already has.

A real deployment of this would be in PCI-DSS scope (SAQ-D); handling raw PANs
in your own infrastructure is out of scope for this project and deliberately so.

## The one distinction

`AuthResult` is `approved | declined | hard_failure`, and the difference between
the last two is the whole design:

| | meaning | router |
|---|---|---|
| `declined` | the card, the account or the request was rejected | **terminal** — never cascade |
| `hard_failure` | we never got an answer, or the answer was about our credentials | may fail over |

Cascading a decline is how a platform gets flagged for card testing. Every
adapter maps its outcomes onto this union deliberately; see
`classifyStripeError` and `mapMaverickAuthResponse`, which are the two places it
would be easy to get wrong.

## Test cards

`src/adapters/test-cards.ts` — Stripe's own numbers, so a card behaves the same
on `mock` as on Stripe test keys.

| Card | Outcome |
|---|---|
| `4242424242424242` | approved |
| `4000000000000002` | declined |
| `4000000000009995` | declined, insufficient funds |
| `4000000000000119` | hard failure on `mock` — **approves on `maverick`**, so failover is demoable |
| anything else | approved |

## Routing

`routing.ts` decides *which* processors are tried and in what order — pure, no
database and no adapters. `router.ts` executes that chain and persists the
result.

- Rules whose `conditions` match are the candidates; one is picked by `weight`
  (a percentage split), and the rest become the fallback chain.
- Routing rules are a **preference, not a whitelist**. No matching rule falls
  back to every enabled processor — an incomplete routing table must never stop
  a shop taking money. A merchant says "never use this" by disabling it.
- `rng` is injected everywhere, so a split is testable and a production failover
  is reproducible from its `routingTrail`.
- A `Payment` row is written for declines and failures too, so the order page
  can show the attempt.
- Capture, void and refund resolve their adapter from the `Payment` row, never
  from today's routing rules — a refund must reach the processor that took the
  money.

Order-level refunds belong to C3's `POST /admin/api/orders/:id/refunds`, which
calls `refundPayment()` here; the refund cap lives in exactly one place.

## Adding a processor

One new file in `src/adapters/`, one line in `src/index.ts`. If a change needs
more than that, the `ProcessorAdapter` interface is wrong — fix the interface.
Adapters return outcomes, never throw: the router reads results, not exceptions.

`mock` and credential-less `maverick` share `SimulatedProcessor`
(`src/adapters/simulated.ts`), which enforces the transaction state machine —
capture once, never refund past the capture, never void a captured charge.

## Mandatory tests (SPEC §14.2, blocking)

Luhn / tokenize / encrypt-decrypt roundtrip; adapter outcome mapping and the
simulated transaction ledger; router weighted selection; failover on hard
failure; **no cascade on decline**; refund math; idempotency-key dedupe.
