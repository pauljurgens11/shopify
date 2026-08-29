# E8 — Storefront Server Actions never settle in a production build

| | |
|---|---|
| Workstream | E |
| Size | M |
| Depends on | E1, E2 |
| Unblocks | — (the production stack; e2e fidelity) |
| Branch | `ws-e/action-hang-production` |

## You own
```
apps/storefront/src/components/product-form.tsx
apps/storefront/src/components/cart-line-controls.tsx
apps/storefront/src/lib/cart-actions.ts
apps/storefront/src/middleware.ts
apps/storefront/next.config.ts
e2e/tests/smoke.spec.ts
```

## The bug

In a **production build** of the storefront, a Server Action's response never
finishes arriving at the client. The write lands, the server replies correctly —
but the `useTransition` that fired the action stays pending forever, so the
control that started it stays disabled until the shopper reloads the page.

- **Add to cart** sits on **"Adding…"**, greyed out, indefinitely. The line IS
  in the cart, and *"Added to your cart."* even renders — the button just never
  comes back, so a shopper cannot add a second item without a reload.
- **The cart quantity stepper** freezes the same way, having already written the
  new quantity. Reloading shows the change that appeared not to happen.
- The header cart badge keeps its server-rendered count.

`pnpm dev` does **not** reproduce it, which is why this reached main and why the
demo (which runs `pnpm dev`) looks fine.

## What was measured

Storefront on `demo.localhost:4202` against a seeded stack, five runs each,
driving the real Add to cart button with Playwright:

| Server | Result |
|---|---|
| `next dev` | **5/5 settled** |
| `next start` (production build) | **0/5 settled** |
| `node .next/standalone/apps/storefront/server.js` — what the Docker image runs | **1/5 settled** |

So this is a genuine production bug, not an artifact of the `next start`
mismatch that H6 fixed. The occasional pass means a fix must be judged over
several runs; a single green run proves nothing.

## What it is NOT — already excluded, do not re-test

Each of these was disabled on its own, rebuilt, and re-run five times. All
stayed stuck, so none of them is the cause:

- **`revalidatePath`.** Removing every `revalidatePath` from the action: 0/5.
- **The middleware's request-header rewrite.** `NextResponse.next({ request: {
  headers } })` skipped for non-GET: 1/5.
- **`cookies().set()` inside the action** (the cart-cookie relay): 0/5.
- **A second React copy.** `node_modules/.pnpm` has exactly one `react@19.2.8`
  and one `react-dom@19.2.8`.
- **A missing/stale JS chunk.** Every chunk named in the action's payload
  returns 200. (An earlier 400 was a self-inflicted artifact: `next dev` and
  `next start` share `apps/storefront/.next`, so running both against one app
  directory clobbers the build. Do not do that while testing this.)
- **The server.** Replaying the exact action POST with `curl` returns a
  complete, correct `text/x-component` stream — all rows resolved, the new
  `{"ok":true,"itemCount":N}`, the re-rendered header with the new badge — in
  **0.05s**. The browser then reports the same request as
  `200 OK … net::ERR_ABORTED` and reads no body. The abort is client-side, with
  no console error and no page error.

## Where to look next

The client aborts a response the server has already finished sending. Worth
trying, roughly in order of cheapness:

1. Reproduce with a **trivial** Server Action (returns a constant, touches
   nothing) on the same page. That separates "every action on this page hangs"
   from "something in `cartRequest` hangs", which none of the exclusions above
   has settled.
2. Next 15.5.24 / React 19.2.8 specifically — check the Next issue tracker for
   production Server Action responses aborting, and try pinning a nearby patch.
3. The tenant host. Everything here was measured on a subdomain
   (`demo.localhost`). Try a production build on a bare host to see whether the
   subdomain is load-bearing.

## Acceptance

- Add to cart returns to its idle label and the header badge increments, on a
  production build, **5 runs out of 5**.
- The cart quantity stepper settles and the line quantity updates, same bar.
- The checkout still renders the plain shell (no storefront nav) — the layout
  reads the middleware's `x-pathname`, so anything touching the middleware must
  keep that working.
- `pnpm e2e` green.

## Test plan

Add the assertion whose absence hid this: in smoke flow (b), after
*"Added to your cart."*, assert the Add to cart button is back to its idle label
and enabled. The flows currently navigate straight to `/cart`, which only ever
checked server state — the suite stayed green through the whole bug.
