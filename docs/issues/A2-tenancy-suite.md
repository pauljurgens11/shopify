# A2 — Tenancy isolation suite + un-vacuous CI

| | |
|---|---|
| Workstream | A |
| Size | M |
| Depends on | A1 |
| Unblocks | trust in every PR that follows |
| Branch | `ws-a/tenancy-suite` |

## You own
```
apps/api/test/tenancy.test.ts, apps/api/vitest.config.ts (extend A1's)
apps/api/package.json (test script), .github/workflows/pr-checks.yml (if needed)
```

## Context
SPEC §14.1 calls the tenancy suite **mandatory and blocking**, but today the
required CI check passes vacuously: every package's test script is
`vitest run --passWithNoTests` and (before A1/this issue) `apps/api` had no
tests at all. `pr-checks.yml` already provisions Postgres + Redis service
containers and runs `prisma migrate deploy`, so the infrastructure is in place —
the suite just doesn't exist. `packages/db/src/tenant.test.ts` covers the
stamping/scoping helpers pure-function-style; this suite proves the same thing
end-to-end through the API.

## Build (SPEC §14.1)
A single fast file, `apps/api/test/tenancy.test.ts`:
1. Boot the app via `buildApp()` and use `app.inject()` (no listening socket —
   faster and port-collision-free).
2. Create **two shops** through `POST /auth/signup`; keep both session cookies.
3. Seed via shop A's session: a product, a customer, an order row (direct
   `dbForShop(A)` insert is fine for the order if C2 hasn't landed — the suite
   must not depend on C2).
4. Assert through shop B's session: list endpoints return **empty**, get-by-id
   of shop A's resources → `not_found`. Do the same in reverse.
5. Assert `dbForShop(B).product.findMany()` is empty at the client layer too —
   two layers, same invariant.
6. Assert a cross-tenant **write** fails: `dbForShop(B).product.update` on
   shop A's product id → throws/`P2025`, and the row is unchanged.

Then make CI honest:
- Remove `--passWithNoTests` from `apps/api/package.json`'s test script.
- Confirm `pr-checks.yml` env has `DATABASE_URL`/`REDIS_URL` pointing at the
  service containers for the test step (it sets them for migrate already).

## Test plan
This issue IS a test. Acceptance:
- `pnpm --filter @merchant/api exec vitest run test/tenancy.test.ts` green
  locally against compose.
- Suite runs in **under 30 seconds** — it is on the required PR path for every
  agent; speed is a feature (docs/PARALLEL-AGENTS.md §3).
- Break it on purpose once (comment out the `AND` injection in
  `packages/db/src/tenant.ts`, run, watch it fail, revert) — a tenancy suite
  that can't fail is worse than none.

## Landmines
- If B1/C2 endpoints don't exist yet, test at whatever surface exists (auth
  routes + direct `dbForShop`) — do NOT block on other workstreams (>30 min →
  stub + `DECISIONS.md` line).
- Keep it to the three main resource types (products, orders, customers) —
  this suite exists to catch bleed, not to be a CRUD test in disguise
  (SPEC §14 forbids those).
- Never lower or skip this suite to get a PR through (CLAUDE.md §4).
