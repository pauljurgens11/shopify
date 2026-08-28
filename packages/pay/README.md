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

## Adding a processor

One new file in `src/adapters/`, one line in `src/index.ts`. If a change needs
more than that, the `ProcessorAdapter` interface is wrong — fix the interface.

## Mandatory tests (SPEC §14.2, blocking)

Luhn / tokenize / encrypt-decrypt roundtrip; router weighted selection;
failover on hard failure; **no cascade on decline**; refund math; idempotency-key
dedupe.
