# @merchant/pay

Deviation #1 (SPEC §11): our own payment platform — card vault, processor
adapters, merchant-configurable routing. Owner: WS-D.

## The boundary

Nothing outside this package may decrypt a card blob or import a processor SDK.
The rest of the monorepo speaks `@merchant/contracts/pay` and nothing more.

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

## Adding a processor

One new file in `src/adapters/`, one line in `src/index.ts`. If a change needs
more than that, the `ProcessorAdapter` interface is wrong — fix the interface.

## Mandatory tests (SPEC §14.2, blocking)

Luhn / tokenize / encrypt-decrypt roundtrip; router weighted selection;
failover on hard failure; **no cascade on decline**; refund math; idempotency-key
dedupe.
