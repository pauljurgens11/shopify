# E5 — Storefront customer accounts

| | |
|---|---|
| Workstream | E |
| Size | M |
| Depends on | E1, C4 |
| Unblocks | demo breadth (optional path — guest checkout is the default) |
| Branch | `ws-e/customer-accounts` |

## You own
```
apps/storefront/src/app/account/**
apps/api/src/routes/storefront/customers/** (login/register/me/orders)
```

## Context
SPEC §8: customer accounts are **optional** — guest checkout is the default
path, so this issue is deliberately small. `Customer.passwordHash` is
nullable; `customerLoginInput` exists in contracts. Sessions: reuse A1's
Redis session machinery with a distinct cookie (add
`CUSTOMER_SESSION_COOKIE = '_merchant_customer'` to `config/constants.ts` —
additive) and a `customerId` payload, scoped per storefront host.

## Build (SPEC §10)
1. **API**: `POST /storefront/api/customers/register` (sets passwordHash on
   the existing email row via C4's find-or-create, or creates),
   `POST …/login`, `POST …/logout`, `GET …/me`, `GET …/me/orders`
   (C2 list filtered by customerId, storefront-shaped response).
2. **Pages** (Tailwind, themed via `--theme-*` like E2):
   - `/account/login` + `/account/register` — minimal centered forms.
   - `/account` — order history list (number, date, total, fulfillment
     status) + addresses (default address display; edit = one simple form).
3. Checkout hand-off: if a customer session exists, E4's contact section
   pre-fills email + default address (read via `GET …/me`) — coordinate
   through the contract only; E4 consumes, you provide.

## Test plan (write first)
- Vitest: register→login→me round-trip; login with the OTHER shop's Host and
  the same email fails (customer sessions are per-shop — the tenancy story
  extends here); `me/orders` only returns the customer's own orders.
- Manual: log in on the seeded shop as a seeded customer, see order history.
- `pnpm verify` green.

## Landmines
- Customer auth ≠ staff auth: different cookie, no permissions, no admin
  access ever.
- Don't build password reset emails, social login, or address books beyond
  default+list — out of scope.
- Keep it argon2id via `@node-rs/argon2`, same as staff.
