# D1 — Vault: crypto, Luhn, tokenize endpoint + tests

| | |
|---|---|
| Workstream | D |
| Size | M |
| Depends on | — (grab immediately) |
| Unblocks | D3, E4, H2 flow (b) |
| Branch | `ws-d/vault` |

## You own
```
packages/pay/src/vault.ts (+ vault.test.ts, crypto.ts)
apps/api/src/routes/vault/**
packages/contracts/src/pay.ts (additive)
```

## Context
`packages/pay/src/vault.ts` is an empty `export {}` — everything here is
greenfield. The contract (`contracts/pay.ts`) fully defines
`tokenizeCardInput`/`tokenizeCardResponse`. `VaultCard` model exists in
`pay.prisma` (encrypted blob, last4, brand, exp). `VAULT_MASTER_KEY` is
zod-validated at boot as 64 hex chars (32 bytes) in `config/env.ts`. The API
logger already redacts `req.body.number`/`cvc`. Part of the mandatory §14.2
suite lives here.

## Build (SPEC §11 Vault)
1. `packages/pay/src/crypto.ts`: AES-256-GCM `encrypt(plaintext, key)` →
   `{iv, ciphertext, authTag}` packed into one base64 string; `decrypt`
   reverses. Single static key from `VAULT_MASTER_KEY` — SPEC explicitly says
   no envelope/rotation machinery.
2. `packages/pay/src/vault.ts`:
   - `luhnValid(number)`, `detectBrand(number)` (visa/mastercard/amex/
     discover — prefix rules), `validateExpiry(month, year)` (not past).
   - `tokenizeCard(db, shopId, card)` → validates, encrypts
     `{number, cvc}` blob, stores `VaultCard` (shopId, blob, brand, last4,
     expMonth/Year), returns `{ cardTokenId: 'card_tok_…', brand, last4,
     expMonth, expYear }` (id via `newId` from `@merchant/config`).
   - `getCard(db, shopId, cardTokenId)` → decrypts — **exported only for use
     inside `packages/pay`** (adapters need PAN); document loudly.
3. Route `apps/api/src/routes/vault/tokenize.ts` → `POST /vault/tokenize`.
   Called cross-origin from the checkout **browser**. Resolve the shop from
   the request `Origin` subdomain (same slug parsing as storefront tenancy) —
   the endpoint is unauthenticated by design; rate-limit
   `RATE_LIMITS.checkoutPayment`. Validation failure → SPEC error shape with
   `field` set (E4 shows inline errors).

## Test plan (write first — §14.2 mandatory)
`packages/pay/src/vault.test.ts` (pure parts, no DB): Luhn accepts
`4242424242424242`, rejects off-by-one; brand detection table; expiry in the
past; **encrypt→decrypt roundtrip** including authTag tamper → throws; blob
never contains the PAN in plaintext (`expect(blob).not.toContain('4242')`).
Remove `--passWithNoTests` from `packages/pay/package.json`.

Acceptance: `pnpm --filter @merchant/pay exec vitest run` green;
`pnpm verify` green.

## Landmines
- The PAN must never appear in a log, an error message, or an API response —
  including validation errors (echo last4 at most). CLAUDE.md §9.
- Only `packages/pay` decrypts. If another package imports `getCard`, that's
  the bug.
- CVC is stored in the encrypted blob for this project (mock/stripe re-use) —
  fine per SPEC's PCI note; still never returned by any read path.
- Don't build key rotation, HSM abstractions, or tokenization webhooks.
