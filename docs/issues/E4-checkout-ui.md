# E4 — Checkout UI + hosted card fields + confirmation

| | |
|---|---|
| Workstream | E |
| Size | L |
| Depends on | E3, D1 |
| Unblocks | H2 flows (b)(c) |
| Branch | `ws-e/checkout-ui` |

## You own
```
apps/storefront/src/app/checkouts/** (and the confirmation route)
```

## Context
**The KPI names this screen explicitly**: "checkout looks and behaves like
Shopify checkout". Single page, Tailwind (not Polaris). E3 drives all state;
D1's `/vault/tokenize` receives the PAN directly from the browser — the
checkout server never sees a card number (SPEC §11, CLAUDE.md §9).

## Build (SPEC §10 Checkout)
**Layout authority: [PARITY.md](PARITY.md). It overrides your memory of Shopify — read your page's section before writing JSX.**

1. **`/checkouts/[token]`** — Shopify's two-column layout:
   - Left: express-checkout placeholder row (grey "Express checkout"
     divider — placeholder only), **Contact** (email), **Delivery** (address
     form: country/name/address/city/ZIP grid exactly like Shopify's field
     order; shipping method radio list with prices appearing once the
     address is valid), **Payment** (card fields, billing-address toggle
     "Same as shipping"), "Pay now" primary button full-width.
   - Right sidebar: line items (thumb + qty badge, title, price), discount
     code input + Apply (inline error from E3's `rejectedCode`),
     subtotal/shipping/taxes rows, bold Total with currency code — live
     updates on every E3 PUT.
   - Section completion behavior like Shopify: sections stack on one page,
     each PUTs on blur/continue; Pay now disabled until required fields set.
2. **Hosted-fields-style card entry**: number (auto-spaced, brand icon),
   expiry MM/YY, CVC — a client component that on Pay now POSTs
   `{number, expMonth, expYear, cvc}` **directly to
   `{API_URL}/vault/tokenize`** (CORS is configured for storefront origins),
   gets `card_tok_…`, then calls E3 complete with only the token. Card data
   lives in component state only — never in checkout PUTs, never in
   analytics beacons, never logged.
3. **Failure states**: decline → red banner with a human message per decline
   code, fields preserved; validation errors inline under fields
   (E3/D1 `field` errors).
4. **Confirmation** `/checkouts/[token]/thank-you` (E3 redirects with order
   context): Shopify's thank-you layout — grey map placeholder card,
   "Order #1001 · Thank you, Jane!", confirmation checkmark, order summary
   sidebar repeated, "Continue shopping" link. Fires the `begin_checkout` →
   `purchase` analytics beacons at the right moments (begin on first load of
   the checkout, purchase on thank-you).

## Test plan
- Manual acceptance = H2 flow (b)+(c) by hand: seeded product → cart →
  checkout → WELCOME10 applies with visible total change → 4242 card →
  thank-you shows the order number → decline card path shows the banner and
  recovers.
- Verify with devtools that NO request other than `/vault/tokenize` ever
  contains the PAN, and that tokenize is a cross-origin call to :3001.
- `pnpm verify` + storefront build green.

## Landmines
- Autofill-friendly: correct `autocomplete` attributes (`cc-number`,
  `postal-code`…) — Shopify has them; their absence is visible.
- Don't render payment icons/wordmarks of processors; generic brand icons for
  card networks are fine.
- The token, not the PAN, goes to complete — if you find yourself passing
  card fields through E3, stop (CLAUDE.md §9 landmine).
