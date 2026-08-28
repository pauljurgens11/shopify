# CLAUDE.md — Project Northstar operating manual

Multi-tenant Shopify clone ("**Merchant**"). Greenfield monorepo, 2-day build, many agents in parallel.

**[SPEC.md](SPEC.md) is the single source of truth.** This file is *how to work*; SPEC.md is *what to build*. If they conflict, SPEC.md wins on product decisions, this file wins on process. Read SPEC.md §-by-§ for your workstream before writing code — do not build from this summary alone.

---

## 0. The one thing to remember

**KPI: a Shopify user opens our admin and cannot tell it isn't Shopify.**

Resolve *every* trade-off in this order: **1. appearance parity → 2. functionality → 3. performance → 4. everything else (incl. security beyond the §15 baseline).**

When ambiguous: pick the option that maximizes the KPI, append one line to `DECISIONS.md`, keep moving. Never stop to ask when a defensible choice exists.

---

## 1. Commands

```bash
cp .env.example .env      # must work with ZERO edits
docker compose up -d      # postgres, redis, minio, mailpit
pnpm install
pnpm setup:git            # REQUIRED once per clone: installs hooks + merge drivers
pnpm db:setup             # prisma generate + migrate + seed
pnpm dev                  # turbo: api :3001, admin :3000, storefront :3002, worker
```

| Task | Command |
|---|---|
| Typecheck everything | `pnpm typecheck` |
| Lint + format | `pnpm lint` / `pnpm format` (Biome — one root config) |
| Unit tests | `pnpm test` (Vitest) |
| One test file | `pnpm --filter <package> exec vitest run path/to/file.test.ts` (vitest is per-package, not root) |
| Everything CI checks, locally | `pnpm verify` (lint + typecheck + unit) — run before every push |
| E2E smoke | `pnpm e2e` (Playwright, needs seeded stack) |
| New migration | `pnpm db:migrate --name NNN_ws{x}_description` |
| Reseed from scratch | `pnpm db:reset` |
| Read the database | `pnpm db:query "select …"` (read-only; `tables`, `describe <t>`, `--csv`) |
| Single package script | `pnpm --filter @merchant/api dev` |

**`pnpm` only. Never `npm` or `yarn`** — a stray lockfile breaks every other agent's install.

Local URLs: admin `http://admin.lvh.me:3000`, storefront `http://demo.lvh.me:3002`, api `http://api.lvh.me:3001`, MinIO `:9001`, Mailpit `:8025`. `lvh.me` resolves to 127.0.0.1 — never edit `/etc/hosts`.

**Call the API by the right hostname** — the Host header is load-bearing (§6). Admin calls `api.lvh.me:3001` (same site as the admin, so the SameSite=Lax session cookie is sent; `localhost:3001` silently drops it). Storefront calls `{slug}.lvh.me:3001`, because that Host is what resolves its tenant. Bearer clients may use any host.
Demo login: `owner@demo.dev` / `password123`.

**Agent tooling** (`.claude/`, committed — it applies to every worktree):

- **Skills.** `.claude/skills/` ships two workflows every agent gets automatically: `resolve-issue` (take one issue from `docs/issues/` and land it as a merged PR) and `repo-review` (whole-repo health check — browse the running app, verify what the swarm *claims* is done, find what broke between workstreams). Invoke by name, or just describe the task and let it trigger.
- **See the app.** `.claude/launch.json` defines the preview targets, so Claude Code can boot the stack and drive it in a browser: start `dev` (runs `pnpm dev`, i.e. all four apps), then attach a target. The admin's *first* compile takes ~4 min, so the initial navigate can 404 — reload once it is warm. Pixel-parity work (§7) should be checked this way, not by asking a human to look.
  - **The in-app browser only renders `localhost` origins.** It loads the HTML of an `*.lvh.me` page but blocks every subresource (`ERR_BLOCKED_BY_CLIENT`), so the admin and storefront come up unstyled and never hydrate — which looks like a broken page, not a blocked one. Verified on `admin.lvh.me:3000` and `demo.lvh.me:3002`; `localhost:3000` and `demo.localhost:3002` are fine.
  - So to actually *look* at the admin or storefront, start **`dev-localhost`** instead of `dev` (then attach `storefront-localhost` for the shop). It runs `pnpm dev:localhost`, which is the same stack with three env overrides: admin on `localhost:3000`, API on `localhost:3001`, storefront on `{slug}.localhost:3002`. Those keep §6 intact — admin and API stay same-site so the session cookie survives, and `{slug}.localhost` resolves a tenant exactly like `{slug}.lvh.me`. Nothing else changes: `.env`, `.env.example` and every documented URL stay on `lvh.me`, and `dev` still serves them.
- **Read the database.** `pnpm db:query` runs SQL against whichever database this checkout's `.env` points at (main's stack uses `merchant_main`, worktrees the shared `merchant`). Postgres enforces read-only on the connection, so writes fail at the server — schema changes still go through a migration.
- **Guards.** `.claude/settings.json` denies `npm`/`yarn` (§9: a stray lockfile breaks every other agent) and force-pushes, and a `PreToolUse` hook blocks `git commit` while HEAD is `main`. The `.githooks` hooks still run at commit/push time; these just fail earlier and louder.
- Ports 3000/3001/3002 are shared across worktrees. If a dev server will not bind, the main stack owns them — `pnpm stack status`.
  - **If the admin logs you out mid-test, suspect the ports before you suspect auth.** Every worktree shares one `SESSION_SECRET` but gets its own Redis slot (`pnpm worktree:env`), and sessions live in Redis. So when another worktree takes :3001, your cookie still passes its signature check against *their* API — and then the session id is not in *their* Redis, so you get `401 unauthorized: "Your session has expired. Sign in again."` and the shell bounces you to /login. Nothing is wrong with your code or your session; you are talking to someone else's stack. `pnpm stack status` names the worktree that holds each port, and `pnpm stack up` takes them back.

---

## 2. Before you touch a file

0. **Pick an issue from `docs/issues/`** — the backlog is the development plan, pre-sliced for parallel work. Claim it in `docs/AGENT-LOG.md`, follow its test plan, land it as one PR (protocol: `docs/issues/README.md`).
1. **Read your workstream row in SPEC.md §16 and the exact paths in `docs/WORKSTREAMS.md`** — they define the directories you own.
2. **Read `DECISIONS.md`** — it records what other agents already settled. Never relitigate a logged decision.
3. **Run `pnpm worktree:env --migrate` once per worktree.** Every worktree shares one
   Postgres and one Redis; this gives yours its own database and keyspace. Without it,
   your `ADD COLUMN … NOT NULL` breaks nine other agents and their `db:reset` drops your
   data mid-test. Ports 3000/3001/3002 stay shared on purpose — one dev stack at a time.
4. **Cut a branch off fresh `main`** (§4) — never work on `main` itself.
5. **`git pull`** before creating a Prisma migration.
6. **Types before code**: whatever crosses a package or service boundary is defined in `packages/contracts` first.

## 3. Ownership & conflict rules

- You may freely edit **inside your workstream's directories**. Never edit another workstream's app code.
- **Need something another workstream owns?** Define the type in `packages/contracts`, stub against it, and keep going. Blocked >30 min → stub + one line in `DECISIONS.md`.
- **`packages/contracts` and `packages/db/prisma/schema.prisma` are shared.** Additive changes (new schema, new optional field, new field with a default) anytime. Breaking changes (rename / retype / remove) require: append `DECISIONS.md` **first**, then `grep -r` every usage and fix them all in the same commit.
- **Migrations** are named `NNN_ws{x}_description` (e.g. `007_wsd_processor_config` — lowercase, matching `001_wsa_initial`). Pull latest before generating.
- **Admin shell (Frame / TopBar / Navigation) is owned by workstream A.** The nav registry is pre-built complete — edit only your leaf file `apps/admin/src/navigation/items/<area>.ts`, never `navigation/index.ts`. Same pattern for theme sections (`packages/theme-engine/src/sections/`) and worker jobs (`apps/worker/src/jobs/`).
- `DECISIONS.md` is **append-only**: one line per decision, never edit or delete existing lines.

---

## 4. Git workflow

**Never commit to `main`.** Every agent works on its own branch and lands through a pull request with auto-merge armed.

```bash
git checkout main && git pull                 # always start from fresh main
git checkout -b ws-{x}/short-description      # e.g. ws-d/vault-tokenize
# ... work, commit in logical chunks ...
git push -u origin ws-{x}/short-description
gh pr create --fill
gh pr merge --auto --squash --delete-branch   # merges itself once checks pass
```

- **Branch names**: `ws-{x}/short-description` (lowercase, e.g. `ws-b/product-form`) — the `ws-` prefix is what arms the auto-merge fallback workflow.
- **Commit messages**: Conventional Commits with your workstream as scope — `feat(ws-b): product form`, `fix(ws-d): no decline cascade`, or scope `shared`/`root`. The commit-msg hook rejects anything else.
- **Auto-merge is enabled on this repo.** `gh pr merge --auto` queues the PR; it lands on its own the moment CI is green. Do not sit and watch it, and do not merge manually to skip a red check.
- **Squash merge**, delete the branch after. One PR = one coherent change.
- **Never force-push a branch another agent may have pulled**, and never force-push `main`.
- **Rebase on `main` rather than merging it back into your branch** — keeps the two-day history readable.
- If CI is red on your PR, fix it on your branch. Never disable a test or lower a check to get a merge through — the §14 suites are blocking by design.
- **A PR with *no* checks is not a slow PR — it is an unmergeable one.** GitHub never builds a merge commit for a conflicting PR, so `pr-checks` never starts and the PR sits silent with auto-merge armed. Run `pnpm sync` (rebase onto `main` + push) from that worktree. Usually the only conflict is concurrent appends to `DECISIONS.md` / `docs/AGENT-LOG.md`, which your local `merge=union` driver resolves and GitHub's merge does not. Details: `docs/PARALLEL-AGENTS.md` §5.
- A PR that touches `packages/contracts` or `schema.prisma` names it in the title (`[contracts]`, `[schema]`), so other agents know to pull before their next migration.

---

## 5. Non-negotiable conventions

Getting these wrong creates cross-workstream breakage that costs hours. Full list in SPEC.md §5.

**Money — integers in minor units. Always.**
```ts
type Money = { amount: number; currencyCode: string };  // 1999 = $19.99
```
Never floats, never `parseFloat`, never `toFixed` for math. All arithmetic through `packages/config/money.ts`. Formatting for display happens at the render layer only.

**IDs — ULID with a type prefix**, generated by `packages/config`:
`shop_ usr_ prod_ var_ col_ loc_ inv_ ord_ li_ cus_ addr_ dis_ chk_ pay_ card_tok_ proc_ app_ wh_ thm_ evt_`

**API error shape** — every non-2xx, no exceptions:
```json
{ "errors": [{ "code": "invalid_request", "message": "...", "field": "email" }] }
```
`code` ∈ `invalid_request | unauthorized | forbidden | not_found | conflict | rate_limited | internal`.

**Pagination** — cursor only: `?limit=50&cursor=…` → `{ data: [...], nextCursor: string | null }`. Max limit 250, admin tables page at 50.

**Other**: REST paths kebab + plural (`/admin/api/products/:id/variants`); JSON keys camelCase; `TIMESTAMPTZ` + ISO-8601 UTC everywhere; every list endpoint that has a search box in the UI supports `?query=`; order numbers are per-shop sequential ints starting `#1001` (ULID is still the real id); env vars defined once in `packages/config/env.ts` (zod-parsed) and mirrored exhaustively in root `.env.example`.

**TypeScript strict, no `.js` files except config. No `any` at package boundaries.**

---

## 6. Multi-tenancy — the load-bearing wall

Cross-tenant leakage is **the one unforgivable bug**. It is a *functional* requirement (the demo dies instantly), not a security nicety.

```ts
// ALWAYS in request handlers:
const db = dbForShop(shopId);        // auto-injects where:{shopId} + data:{shopId}
const products = await db.product.findMany();

// dbAdmin (unscoped) is legal in exactly three places:
//   1. signup   2. platform-level auth lookup   3. migrations/seed
```

If you find yourself passing `shopId` into a `where` clause by hand, you're using the wrong client. Every tenant table has `shopId TEXT NOT NULL` + index.

Tenant resolution: **admin** → session-bound `shopId` (`admin.<domain>/store/{slug}/…`); **storefront** → Host header (`{slug}.lvh.me:3002`); **Admin API** → Bearer token → token row → `shopId`.

The tenancy test suite (§14.1) is mandatory and blocking. Do not merge past a red tenancy test.

---

## 7. Admin app — pixel parity (the KPI workstream)

- **Polaris v13 components only**, pinned exactly. Do not upgrade mid-project. No custom CSS beyond Polaris `--p-*` tokens.
- **If Polaris has a pattern for it, use exactly that pattern.** Don't invent layouts — Polaris idiom ≈ Shopify. When unsure of a Shopify layout detail, choose the simplest Polaris-idiomatic version.
- Every page replicates its Shopify counterpart: card structure, two-column forms (e.g. product: left Title/Description/Media/Variants, right Status/Publishing/Organization), `IndexTable` with tabs + filters + bulk actions + sort, **contextual save bar** on dirty forms, toasts ("Product saved"), skeleton pages while loading, real empty states.
- **20-minute escape hatch**: if a Polaris component fights you for >20 min, hand-build the element in plain JSX styled with `--p-*` tokens so pixels stay identical, and log it in `DECISIONS.md`. Do not burn an hour on one component.
- Charts: try `@shopify/polaris-viz`; sanctioned fallback is Recharts styled with Polaris tokens.
- Data via React Query; optimistic updates on toggles.
- **Polaris is admin-only.** Storefront, checkout, theme sections and the builder preview are **Tailwind** — that design is ours.

Never render the Shopify name or logo. Brand string is "Merchant".

---

## 8. Working style for this project

- **Ship the KPI, cut the rest.** Two days. A cut feature's UI element either works minimally or is not rendered at all.
- **No dead code. No TODO-stubs that throw.** A stub that throws in a demo is worse than an absent button.
- **Seed data is the demo.** It must look like a real store ("Aurora Supply Co."). If you add a model, extend the seed so the demo still looks real.
- **Test only what SPEC.md §14 mandates.** Forbidden: component snapshot tests, per-endpoint CRUD tests, mocking-heavy unit tests of glue code, coverage targets. Mandatory and blocking: tenancy suite, Pay unit tests, money/discount math tests, Playwright smoke (5 flows).
- **Security is capped at the SPEC.md §15 baseline** (shop scoping, zod at the boundary, argon2id, httpOnly cookies, hashed tokens, no PAN in logs, no committed `.env`). If a security nicety costs >15 min, skip it and spend that time on parity. Do not add CSP tuning, helmet audits, SSRF filtering or key rotation.
- **Out of scope is a hard stop** (SPEC.md §2): no POS, multi-currency, gift cards, B2B, automation, marketing email, CMS pages, metafields UI, 3PL, carrier-calculated shipping, tax providers, i18n, GraphQL Admin API. Believe it's needed for the KPI? Argue it in `DECISIONS.md` and build the *minimal* version.
- **Verify before you claim.** "Done" means you ran it: the page rendered, the test passed, the flow completed. Report failures with the actual output.

---

## 9. Landmines

- Committing to `main`, or merging your own PR past a red check.
- Floats for money — anywhere, including tests and seed data.
- Raw `prisma` client in a request handler instead of `dbForShop`.
- Nested `create` inside a `dbForShop` write — only top-level `data` is auto-stamped with `shopId`; set it explicitly on nested create payloads (see `packages/db/src/tenant.ts`).
- Raw `inventoryLevel.update` — inventory changes go through the adjustment service so `InventoryAdjustment` history exists.
- Adding a package with `npm i`.
- Editing another workstream's app code instead of stubbing against `contracts`.
- A breaking `contracts` change without the `DECISIONS.md` line and the grep sweep.
- Logging a PAN, or letting the checkout server see one — card fields post **directly** to `/vault/tokenize`, which returns `card_tok_…`.
- Cascading a **decline** to the next processor in Pay routing. Only *hard* failures (network / 5xx) fail over; a decline means the card was rejected — stop.
- Rebuilding a Shopify component by hand when Polaris already ships it.
- `ANTHROPIC_API_KEY` unset must never break the AI builder demo — fall back to the 3 canned presets (model is `claude-sonnet-5`).

---

## 10. Layout

```
apps/api          Fastify 5 + Zod — ALL business logic, REST (:3001)
apps/admin        Next.js 15 + Polaris v13 (:3000)
apps/storefront   Next.js 15 + Tailwind 4, multi-tenant by Host + checkout (:3002)
apps/worker       BullMQ — webhooks, email, analytics rollup, AI jobs
packages/db       Prisma 6 schema, migrations, seed, dbForShop
packages/contracts Zod schemas + types for EVERY request/response/webhook/theme/Pay iface — THE integration contract
packages/pay      Vault, ProcessorAdapter, adapters (mock/stripe/maverick), router
packages/theme-engine  Section registry (~18 sections), theme JSON validation, React renderers
packages/config   env parsing, constants, ULID generation, money utils
e2e/              Playwright smoke suite
```

Stack is **locked** (SPEC.md §3) — do not substitute a library, not even for a "better" one.
