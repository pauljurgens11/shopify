# H6 — CI and `pnpm start` run the Next apps in a mode Next says does not work

| | |
|---|---|
| Workstream | H (with root) |
| Size | S |
| Depends on | — |
| Unblocks | — (test fidelity; e2e currently cannot see a class of bug) |
| Branch | `ws-h/next-start-standalone` |

## You own
```
apps/admin/next.config.ts
apps/storefront/next.config.ts
apps/admin/package.json          (the `start` script)
apps/storefront/package.json     (the `start` script)
e2e/playwright.config.ts         (webServer commands, if you change how they boot)
apps/admin/Dockerfile
apps/storefront/Dockerfile
```

## Context (found in repo review, 2026-08-29)
Both Next apps set `output: 'standalone'` (needed for the Dockerfiles — pnpm's
symlink farm cannot be copied between build stages). Both `package.json`s also
define `"start": "next start --port …"`, and `e2e/playwright.config.ts` boots
the admin and the storefront with exactly those scripts.

Next prints this on every such boot:

```
⚠ "next start" does not work with "output: standalone" configuration.
  Use "node .next/standalone/server.js" instead.
```

It is not a cosmetic warning. Reproduced on `main`, storefront on a
prod-build stack:

- Add to cart on a PDP. The item **is** added (the cart row is in Postgres),
  but the Server Action's `revalidatePath` never lands on the client: the POST
  to the page is `200` and then `net::ERR_ABORTED`.
- The button stays on **"Adding…"**, disabled, indefinitely — a shopper cannot
  add a second item without a full reload.
- The header cart badge keeps its server-rendered count, which is the exact
  thing `cartRequest`'s `revalidatePath(pathname)` comment says it exists to
  prevent.

The same steps under `pnpm dev` work perfectly: the button returns to
"Add to cart" and the badge goes 2 → 3.

So the mandatory §14 Playwright suite runs the apps in a third configuration
that is neither the dev server the demo uses nor the standalone server the
Dockerfile ships — and one where a visible storefront bug is present and the
suite stays green (the flows navigate to `/cart` rather than watching the
button, so only server state is asserted).

**Not the demo path.** `pnpm dev` is unaffected, and the Docker images run
`server.js` correctly. This is about test fidelity and a booby-trapped `start`
script, not a broken demo.

## Build
Pick one, and log which in DECISIONS.md:

1. **Gate `output`** on an env var the Dockerfiles set
   (`output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined`),
   so `next start` and the e2e suite run a supported server. Cheapest; the
   trade-off is that e2e then exercises a slightly different server from the
   image.
2. **Make `start` run the standalone server** — copy `.next/static` and
   `public` into `.next/standalone/apps/<app>/` and `node server.js`. Highest
   fidelity (e2e then tests exactly what ships), but duplicates the copy dance
   the Dockerfile already does.

Either way the warning must be gone from the e2e output.

## Acceptance
- Booting the admin and the storefront the way `pnpm e2e` does prints no
  `"next start" does not work with "output: standalone"` warning.
- On that stack, adding to cart from a PDP returns the button to
  "Add to cart" and bumps the header badge — verify by hand, once.
- `docker compose -f docker-compose.prod.yml --profile mail up -d --build`
  still serves the admin and a storefront (A5's path must not regress).
- `pnpm e2e` green.

## Test plan
No new unit tests — this is a build-configuration fix. Add one assertion to
smoke flow (b) or (c) that the Add to cart button returns to its idle label
after a successful add: that is the assertion whose absence let this hide.
