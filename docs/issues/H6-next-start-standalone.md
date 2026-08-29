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

**Correction (2026-08-29, while building this):** the add-to-cart failure this
issue originally blamed on `output: 'standalone'` is NOT caused by it. It
reproduces on a plain `next start` production build with standalone off, and on
the standalone `server.js` the Docker image actually runs. It is a real
storefront bug and it is now **E8**; this issue is only about the unsupported
boot mode and the warning.

What is left here is still worth fixing: `next start` cannot serve a standalone
build, Next says so on every boot, and the mandatory §14 Playwright suite was
therefore exercising a configuration that is neither the dev server the demo
uses nor the standalone server the image ships.

## Build
**Done:** option 1. `output` is now
`process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined` in both
apps, and both Dockerfiles set `NEXT_OUTPUT=standalone` in their build stage.
`next start` and the e2e suite get a supported server; the image still gets its
standalone tree, and if that env var is ever dropped the image build fails loudly
on the missing `.next/standalone` rather than shipping something subtly broken.

Option 2 (make `start` run the standalone server) was rejected: the standalone
server does not evaluate `next.config.ts` at runtime, so it never loads the
monorepo's root `.env` — `pnpm start` would need every variable passed in by
hand, which is a worse local story than the drift it removes.

## Acceptance
- Booting the admin and the storefront the way `pnpm e2e` does prints no
  `"next start" does not work with "output: standalone"` warning. **Verified**
  on both apps.
- Building with `NEXT_OUTPUT=standalone` still emits
  `.next/standalone/apps/<app>/server.js` — the path both Dockerfiles COPY.
  **Verified** on both apps, and the emitted storefront server was booted and
  served a product page.
- (Moved to E8) Add to cart returning to its idle label on a production build.
- `docker compose -f docker-compose.prod.yml --profile mail up -d --build`
  still serves the admin and a storefront (A5's path must not regress).
- `pnpm e2e` green.

## Test plan
No new unit tests — this is a build-configuration fix, and `pnpm verify` covers
it. The Add-to-cart assertion moved to E8, where the bug it would catch lives.
