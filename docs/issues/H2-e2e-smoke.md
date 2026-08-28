# H2 — Playwright smoke: the five mandatory flows

| | |
|---|---|
| Workstream | H |
| Size | M |
| Depends on | B5, C5, E4, F4, H1 (and transitively their APIs) |
| Unblocks | H3, Definition of Done #2 |
| Branch | `ws-h/e2e-smoke` |

## You own
```
e2e/**
```

## Context
`e2e/tests/smoke.spec.ts` has all five flows as `test.fixme` stubs and one
real health check. `playwright.config.ts` boots api/admin/storefront via
`webServer` (env loading was fixed — `start` scripts read the root `.env`).
Known fragility to verify early: the storefront readiness probe hits
`http://demo.lvh.me:3002` (external DNS for lvh.me) — if CI DNS is flaky,
switch the probe to `http://localhost:3002` and assert a 2xx-able path, or
probe the API-side health and let the first test navigate. These are the
**only** e2e tests this repo will ever have (SPEC §14) — resist adding more.

## Build (SPEC §14.4 — replace each fixme, keep them independent)
- **(a) Product create**: staff login (`owner@demo.dev`) → Products → Add
  product → title, price, 2 options generating variants → Save → toast →
  appears in index.
- **(b) Full purchase + refund**: storefront browse seeded product → add to
  cart → checkout → contact/address/shipping → mock card `4242…` → thank-you
  shows order number → admin: order exists, totals match the storefront
  sidebar figure (assert the literal string) → refund it → badge
  "Refunded".
- **(c) Discount**: checkout with `WELCOME10` → sidebar shows the discount
  line and reduced total (assert exact amounts from seeded prices).
- **(d) AI builder preset**: admin → Storefront → apply a preset (no API key
  in CI — the preset path IS the test) → Publish → storefront home reflects
  it (assert a token-driven style or preset-distinctive text).
- **(e) Tenant isolation**: signup a fresh shop through the UI → its admin
  shows empty states (zero products) → its storefront ({newslug}.lvh.me)
  renders and shows none of demo's products → demo storefront unaffected.

Plus plumbing: shared login helper, per-flow unique data (flow (a)'s product
name ULID-suffixed so retries don't collide), `test.step` annotations so the
HTML report reads as the demo script.

## Test plan
This issue is tests. Acceptance:
- `pnpm e2e` green locally against `docker compose up -d` + seeded stack,
  twice in a row (idempotence).
- Green in `main-checks` CI (watch one run; you own fixing config fragility
  it exposes).
- Total runtime target < 5 min — flows (b)+(c) can share a worker.

## Landmines
- Prefer role/label selectors over CSS paths — Polaris markup is deep and
  volatile; `getByRole('button', { name: 'Save' })` survives, nth-div chains
  don't.
- No new test files beyond the five flows + health (SPEC §14 forbidden list).
- If a flow exposes an app bug, file it back to the owning workstream via
  `docs/AGENT-LOG.md` and (if trivial) fix within H's polish licence — do
  not fork their code silently.
