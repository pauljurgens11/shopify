# Development plan for agent swarm

| | |
|---|---|
| **Session** | `e5703611-1c95-41aa-b8e2-ec3920ddfe5b` |
| **Started** | 2026-08-28T08:39:35.005Z |
| **Ended** | 2026-08-28T09:12:57.174Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4` |
| **Branch** | `ws-a/dev-plan-issue-backlog` |
| **Pull request** | #3 (MERGED) |
| **Model** | `claude-fable-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | yes |

---

### 👤 User

your new goal. devise a development plan based on the repo. if you find anything wrong/fixable that could be better then do it. development plan needs to be broken down into highly parallelisable smaller issues as markdown files in the repo. agents can grab them and work on them in parallel. agent swarm. ultra architect mode. test driven development, feedback based. tests are important to confirm stuff works.

make tasks good size. not insanely complex and huge but big enough so agents have work to do. do not go too granular with the tasks.

industry best practices. remember the original KPI and the speed constraint. make it super clear for agents to use these issues. cover everything. create sub agents if needed. go deep into all needed functionality.

### 🤖 Claude

I'll start by surveying the repo — SPEC, workstream docs, decisions, and what's actually built so far — then design the issue breakdown.

🔧 **Bash**
```
find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path '*/node_modules/*' | head -200
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/DECISIONS.md
```

> **↳ result**
> ```
> 1	# DECISIONS
> 2	
> 3	Append-only. One line per decision. Never edit or delete an existing line.
> 4	
> 5	Format: `YYYY-MM-DD | WS{X} | decision — rationale`
> 6	
> 7	Log here when you: resolve a SPEC.md ambiguity, use the Polaris 20-minute escape hatch, make a breaking `packages/contracts` change (log BEFORE the change), stub against another workstream after being blocked >30 min, or build a minimal version of something SPEC.md §2 lists as out of scope.
> 8	
> 9	---
> 10	
> 11	2026-08-28 | WS-A | Internal packages export TypeScript source (`exports: "./*": "./src/*.ts"`) with no build step — removes cross-package build ordering, which is the most common way a parallel-agent monorepo deadlocks.
> 12	2026-08-28 |
> … [truncated, 3,014 more chars]
> ```

> **↳ result**
> ```
> ./pnpm-lock.yaml
> ./tsconfig.base.json
> ./turbo.json
> ./README.md
> ./.dockerignore
> ./.gitignore
> ./package.json
> ./.nvmrc
> ./.gitattributes
> ./docker-compose.yml
> ./SPEC.md
> ./.env.example
> ./.git
> ./biome.json
> ./CLAUDE.md
> ./DECISIONS.md
> ./pnpm-workspace.yaml
> ./.githooks/commit-msg
> ./.githooks/pre-push
> ./.githooks/pre-commit
> ./docs/AGENT-LOG.md
> ./docs/PARALLEL-AGENTS.md
> ./docs/WORKSTREAMS.md
> ./scripts/check-env-parity.mjs
> ./scripts/setup-git.sh
> ./.github/CODEOWNERS
> ./.github/pull_request_template.md
> ./e2e/package.json
> ./e2e/tsconfig.json
> ./e2e/playwright.config.ts
> ./scripts/git/merge-lockfile.sh
> ./packages/config/package.json
> ./packages/config/tsconfig.json
> ./packages/contracts/README.md
> ./packages/cont
> … [truncated, 5,057 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/WORKSTREAMS.md
```

> **↳ result**
> ```
> 1	# Workstream ownership map
> 2	
> 3	SPEC §16 defines the eight workstreams. This file maps them to **exact paths**,
> 4	so "who owns this file" is never a judgement call.
> 5	
> 6	Legend: **own** = edit freely · **shared** = additive freely, breaking needs a
> 7	`DECISIONS.md` line first · anything unlisted = read-only for you.
> 8	
> 9	---
> 10	
> 11	## A. Platform core — *lands first, everyone builds on it*
> 12	
> 13	**own**
> 14	```
> 15	package.json, pnpm-workspace.yaml, turbo.json, biome.json, tsconfig.base.json
> 16	docker-compose.yml, .env.example, .github/**, scripts/**, .githooks/**
> 17	packages/config/**
> 18	packages/db/**                     (schema files are shared — see below)
> 19	apps/api/src/{app.ts,server
> … [truncated, 4,468 more chars]
> ```

### 🤖 Claude

The scaffold (workstream A) is largely landed. Now let me read SPEC.md — the source of truth the issues must cover — plus the parallel-agent docs and current state of key code.

🔧 **Bash**
```
wc -l SPEC.md docs/PARALLEL-AGENTS.md docs/AGENT-LOG.md packages/db/prisma/schema/*.prisma packages/contracts/src/*.ts apps/api/src/app.ts 2>/dev/null; echo ---; ls apps/api/src/routes apps/api/src/routes/* 2>/dev/null
```

> **↳ result**
> ```
> 344 SPEC.md
>      171 docs/PARALLEL-AGENTS.md
>       13 docs/AGENT-LOG.md
>       37 packages/db/prisma/schema/analytics.prisma
>       63 packages/db/prisma/schema/apps.prisma
>      136 packages/db/prisma/schema/catalog.prisma
>       46 packages/db/prisma/schema/checkout.prisma
>       61 packages/db/prisma/schema/customers.prisma
>       48 packages/db/prisma/schema/discounts.prisma
>       58 packages/db/prisma/schema/inventory.prisma
>      145 packages/db/prisma/schema/orders.prisma
>      147 packages/db/prisma/schema/pay.prisma
>       67 packages/db/prisma/schema/platform.prisma
>       18 packages/db/prisma/schema/schema.prisma
>       36 packages/db/prisma/schema/theme.prisma
>       87 packages/contracts/s
> … [truncated, 900 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/SPEC.md
```

> **↳ result**
> ```
> 1	# PROJECT NORTHSTAR — Multi-Tenant Shopify Clone
> 2	
> 3	**This document is the single source of truth.** Every agent reads this before writing code. If code and this document disagree, this document wins. If this document is ambiguous, the agent picks the option that maximizes the KPI and records the decision in `DECISIONS.md` (append-only, one line per decision).
> 4	
> 5	---
> 6	
> 7	## 1. Mission & KPI
> 8	
> 9	Build a multi-tenant e-commerce platform that is visually and functionally indistinguishable from Shopify for common e-commerce use.
> 10	
> 11	**Priority order (resolve every trade-off with this):** 1. appearance parity, 2. functionality, 3. performance, 4. everything else (incl. security beyond
> … [truncated, 34,655 more chars]
> ```

🔧 **Agent**
```
Audit packages implementation state
```

> **↳ result**
> ```
> Async agent launched successfully. (This tool result is internal metadata — never quote or paste any part of it, including the agentId below, into a user-facing reply.)
> agentId: ab002fbc91c364caa (internal ID - do not mention to user. Use SendMessage with to: 'ab002fbc91c364caa', summary: '<5-10 word recap>' to continue this agent.)
> The agent is working in the background. You will be notified automatically when it completes. You know nothing about its results until that notification arrives — do not report, assume, or predict them; continue other work or respond to the user in the meantime.
> Do not duplicate this agent's work — avoid working with the same files or topics it is using.
> output_f
> … [truncated, 424 more chars]
> ```

🔧 **Agent**
```
Audit apps implementation state
```

> **↳ result**
> ```
> Async agent launched successfully. (This tool result is internal metadata — never quote or paste any part of it, including the agentId below, into a user-facing reply.)
> agentId: ae2b5c70572f2e750 (internal ID - do not mention to user. Use SendMessage with to: 'ae2b5c70572f2e750', summary: '<5-10 word recap>' to continue this agent.)
> The agent is working in the background. You will be notified automatically when it completes. You know nothing about its results until that notification arrives — do not report, assume, or predict them; continue other work or respond to the user in the meantime.
> Do not duplicate this agent's work — avoid working with the same files or topics it is using.
> output_f
> … [truncated, 424 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Tenant-scoped Prisma client (SPEC §6 — the load-bearing wall).
> 3	 *
> 4	 * `dbForShop(shopId)` returns a client that injects `where: { shopId }` into
> 5	 * every read and `data: { shopId }` into every write, for every tenant table.
> 6	 * Forgetting a filter is then impossible rather than merely discouraged, which
> 7	 * matters when 20 agents are writing queries in parallel.
> 8	 *
> 9	 * This is a FUNCTIONAL requirement, not a security nicety: cross-shop bleed
> 10	 * breaks the multi-tenant demo instantly.
> 11	 *
> 12	 * LIMITATION — nested writes: only the TOP-LEVEL `data` is stamped. A nested
> 13	 * create (`data: { …, variants: { create: [...] } }`) is passed through as-is,
> 14	 * so its rows
> … [truncated, 3,279 more chars]
> ```

🔧 **Bash**
```
pnpm install --prefer-offline 2>&1 | tail -5
```

> **↳ result**
> ```
> Command running in background with ID: bvht5p9zz. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/bvht5p9zz.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

🔧 **Bash**
```
cat package.json turbo.json | head -120; echo ===; cat docs/PARALLEL-AGENTS.md
```

> **↳ result**
> ```
> Exit code 1
> {
>   "name": "merchant",
>   "private": true,
>   "type": "module",
>   "packageManager": "pnpm@9.15.4",
>   "engines": {
>     "node": ">=22.0.0",
>     "pnpm": ">=9.0.0"
>   },
>   "scripts": {
>     "dev": "turbo run dev",
>     "build": "turbo run build",
>     "typecheck": "turbo run typecheck",
>     "test": "turbo run test --filter=!@merchant/e2e",
>     "lint": "biome check .",
>     "lint:fix": "biome check --write .",
>     "format": "biome format --write .",
>     "db:generate": "pnpm --filter @merchant/db run generate",
>     "db:migrate": "pnpm --filter @merchant/db run migrate",
>     "db:setup": "pnpm --filter @merchant/db run setup",
>     "db:reset": "pnpm --filter @merchant/db run reset",
>     "seed":
> … [truncated, 1,273 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/PARALLEL-AGENTS.md
```

> **↳ result**
> ```
> 1	# Running 20 agents on this repo
> 2	
> 3	Two independent problems. Solve both or neither works.
> 4	
> 5	1. **Merge mechanics** — 20 branches must land on `main` without a human
> 6	   babysitting each one. That is automerge + branch rules + CI shape (§1–§4).
> 7	2. **Merge *content*** — two agents must rarely want the same lines. That is the
> 8	   repo layout: file-per-unit and pre-built registries (§5, and CLAUDE.md §3).
> 9	
> 10	Automerge without the second is just a faster way to produce conflicts.
> 11	
> 12	---
> 13	
> 14	## 1. Repo settings (once, by a repo admin)
> 15	
> 16	```bash
> 17	gh repo edit pauljurgens11/shopify \
> 18	  --enable-auto-merge \
> 19	  --enable-squash-merge \
> 20	  --enable-merge-commit=false
> … [truncated, 7,607 more chars]
> ```

### 🤖 Claude

Both audits are running. While they sweep, I'll draft the process document that the issue files hang off — the "how an agent works an issue" protocol, which is independent of the audit results.

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Dependencies installed. Let me run the baseline verification to see what state the checks are in.

🔧 **Bash**
```
pnpm verify 2>&1 | tail -30
```

> **↳ result**
> ```
> Command running in background with ID: bgu9kt9dl. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/bgu9kt9dl.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

### 🤖 Claude

Baseline verify is running and the two audit agents are still sweeping. I'll continue as each finishes.

### 👤 User

<task-notification>
<task-id>bgu9kt9dl</task-id>
<tool-use-id>toolu_01YaCzka7eu7KZHaqPUJpr27</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/bgu9kt9dl.output</output-file>
<status>completed</status>
<summary>Background command "Run lint + typecheck + unit baseline" completed (exit code 0)</summary>
</task-notification>

🔧 **Read**
```
/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/bgu9kt9dl.output
```

> **↳ result**
> ```
> 1	@merchant/admin:test: exclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*
> 2	@merchant/admin:test: 
> 3	@merchant/config:test: 
> 4	@merchant/config:test:  RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config
> 5	@merchant/config:test: 
> 6	@merchant/config:test: No test files found, exiting with code 0
> 7	@merchant/config:test: 
> 8	@merchant/config:test: include: **/*.{test,spec}.?(c|m)[jt]s?(x)
> 9	@merchant/config:test: exclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cac
> … [truncated, 1,559 more chars]
> ```

### 🤖 Claude

Baseline `pnpm verify` is fully green — lint and typecheck pass across all 10 packages, but there are **zero test files** in the entire repo, which confirms all four mandatory SPEC §14 suites are still unwritten. Waiting on the two audit agents to finish before I write the issue files.

### 👤 User

<task-notification>
<task-id>ab002fbc91c364caa</task-id>
<tool-use-id>toolu_01Nbg6cKGPSZopK2SCnF9Q2u</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/ab002fbc91c364caa.output</output-file>
<status>completed</status>
<summary>Agent "Audit packages implementation state" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>## Audit Report — `packages/*` (5 packages)

**Headline:** only workstream A has landed (`git log`: 5 commits, all `ws-a`/root). `config`, `contracts`, and the `db` schema are genuinely complete and high quality. `pay` and `theme-engine` are **pure stubs** — zero executable logic. The `db` seed is ~5% of what SPEC §7 requires. There are **zero test files in the entire monorepo**, and every package's test script is `vitest run --passWithNoTests`, so all three blocking suites in SPEC §14 pass vacuously in CI.

---

## 1. `packages/pay` — **STUB** (~0% implemented)

| File | Status |
|---|---|
| `src/adapter.ts` | Complete. Correct `ProcessorAdapter` interface, but **diverges from SPEC §11**: adds a `creds: ProcessorCredentials` 2nd arg to every method (a good change — log it in DECISIONS.md). |
| `src/index.ts` | Complete. Registry + `adapterFor()` work. |
| `src/vault.ts` | **14 lines, body is `export {}`.** No AES-256-GCM. No Luhn. No brand detection. No `tokenize`/`detokenize`. |
| `src/router.ts` | **16 lines, body is `export {}`.** No weighted selection, no failover, no decline handling, no idempotency, no `Payment` row writing. |
| `adapters/mock.ts` | Stub — all 4 methods `throw new Error('not implemented')`. No 4242/4000…0002/4000…9995 cards. |
| `adapters/stripe.ts` | Stub — same 4 throws. `stripe` npm package is **not a dependency anywhere**. |
| `adapters/maverick.ts` | Stub — same 4 throws. No typed Maverick request/response shapes. |
| Tests | **None.** No `vitest.config.*` anywhere in the repo. |

Direct answers: vault.ts does **not** do AES-256-GCM or Luhn. Adapters do **not** implement the interface for real — they satisfy the *type* only, by throwing. router.ts implements **none** of weighted routing / failover / no-cascade. There are **no tests**.

The contract side is done for you: `contracts/pay.ts` is complete and well-designed — the `authResultSchema` discriminated union already separates `approved` / `declined` / `hard_failure` (`pay.ts:69-91`), which is exactly the primitive the router needs.

**Gaps to plan:** vault crypto + Luhn + brand detect; 3 adapters; `PaymentRouter.charge`; credential encrypt/decrypt for `ProcessorConfig` (schema fields exist at `pay.prisma:37-39`, no code); refund math; idempotency dedupe against `Payment.idempotencyKey`; `routingTrail` population; the whole §14.2 test suite; add `stripe` to `packages/pay/package.json`.

---

## 2. `packages/theme-engine` — **STUB** (~10%)

- **All 17 section components are byte-identical placeholders.** Every one is the same 21-line shape: `&lt;section data-section="x"&gt;&lt;pre className="hidden"&gt;{JSON.stringify(settings)}&lt;/pre&gt;&lt;/section&gt;` with `// TODO(WS-F): implement`. Verified: only `sections/index.tsx` lacks the TODO marker. Not one line of real Tailwind markup, no token consumption, no responsive layout.
- `sections/index.tsx` — **complete and correct.** All 18 types registered, `renderSection()` works.
- `render.ts` — **works but is only ~30% of a renderer.** It is exclusively `themeCssVariables(tokens)` → CSS custom props. There is **no `renderPage(themeDoc, page)` entry point**, no wrapper element that applies the vars, no `&lt;head&gt;` font loading, no navigation/footer rendering.
- **Theme JSON validation is NOT wired to `contracts/theme.ts`.** The package imports only the *types* (`ThemeTokens`, `Section`). It never imports or re-exports `themeDocSchema` / `validateThemeDoc`. Nothing in `theme-engine` validates anything.
- **No presets.** `THEME_PRESETS = ['aurora','monochrome','bloom']` exists as string literals at `contracts/theme.ts:377` and that is the **only** occurrence in the repo — zero ThemeDoc data. SPEC §12's "demo never breaks without an API key" guarantee is currently unbacked, and the seed cannot create a published theme.
- **No sanitizer.** README promises "rich text sanitized"; no DOMPurify/sanitize-html dependency exists. `rich-text` and `image-with-text` settings accept up to 4000 chars of "minimal HTML" (`theme.ts:120`).
- **No Tailwind config / `@theme` mapping** shipped. README says sections read vars "through Tailwind's @theme mapping in the storefront's globals.css" — that file doesn't exist yet, so the contract between the two packages is undefined.

**Bright spot:** `contracts/theme.ts` (380 lines) is the single best file in the repo — every field has a `.describe()`, `sectionSchema` is a fully-typed discriminated union, `validateThemeDoc()` enforces required core sections and duplicate ids.

---

## 3. `packages/db` — **schema COMPLETE, tenant.ts GOOD-with-holes, seed STUB**

### Prisma schema: fully implemented
37 models across 10 domain files, 37 `CREATE TABLE` in the single migration — schema and migration are in sync. Covers every §7 table. **Zero `Float`/`Decimal`/`Double` in the entire schema** — all money is `Int` minor units. Every model except `Shop` has `shopId` with an index. Timestamps are `@db.Timestamptz(6)` throughout.

### `tenant.ts` (`dbForShop`) — better than expected, but with real holes

**Correctly handled:** `findUnique`, `findUniqueOrThrow`, `findFirst(OrThrow)`, `findMany`, `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete`, `deleteMany`, **`count`, `aggregate`, `groupBy`** (all in `WHERE_OPS`, `tenant.ts:30-45`); `create`, `createMany`, `createManyAndReturn` data-stamping including the array case (`stampData`, `tenant.ts:58-62`); `upsert.create`/`upsert.update` stamped separately (`tenant.ts:94-97`). The `AND: [{shopId}]` technique (`tenant.ts:88`) is the right call for `findUnique` — it relies on Prisma 5+ `extendedWhereUnique` being GA, which holds for `^6.3.0`.

**Operations / vectors it misses:**

- **Nested writes are unstamped** — `tenant.ts:12-16` documents it, but this is a live functional break, not a footnote. `Product ▸ options/variants/images` are real relations in the *same* domain file (`catalog.prisma:17-20`), so `db.product.create({ data: { …, variants: { create: [...] } } })` is the natural call and it will fail with a `shop_id` NOT NULL violation. WS-B will hit this on day one.
- **Nested `connect` / `connectOrCreate` are unscoped** — `data: { collection: { connect: { id: &lt;other shop's colId&gt; } } }` links across tenants with no error. This is a genuine cross-tenant write vector.
- **Nested reads (`include` / `select`) are unscoped** — the top-level `where` is filtered, relation loads are not.
- **`$queryRaw` / `$executeRaw` bypass the extension entirely.** WS-G's analytics rollups (`AnalyticsRollupDaily`, 5-min worker aggregate) are the exact workload that reaches for raw SQL. There is no guard, no lint rule, and no `dbForShop.$queryRaw` wrapper.
- **`Shop` is in `UNSCOPED_MODELS` (`tenant.ts:27`)** — so `dbForShop(A).shop.findFirst()` silently returns an arbitrary shop and `dbForShop(A).shop.findMany()` returns *all* shops. Settings→General is the obvious victim. Needs a `db.currentShop()` helper.
- **`OrderSequence` is in `UNSCOPED_MODELS`** — it has a `shopId` (as `@id`). `dbForShop(A).orderSequence.findFirst()` leaks another shop's counter, and `.create({data:{}})` fails for missing `shopId`.
- **`upsert` failure mode is wrong-shaped** — when the `AND: [{shopId}]` makes another shop's row invisible, upsert falls through to *create* and dies on `P2002` (unique violation) instead of a clean `not_found`/`conflict`. Callers will surface a 500.
- **Perf:** `dbAdmin.$extends(...)` is rebuilt on every `dbForShop()` call (`tenant.ts:69`) — i.e. per request. Memoize per `shopId` against SPEC §10's TTFB &lt; 300ms budget.

### Seed — **STUB** (~5% of SPEC §7)
`prisma/seed/index.ts` is 83 lines and creates exactly: 1 `Shop` (Aurora Supply Co.), 1 `OrderSequence`, 1 owner `StaffUser`. `TODO(WS-H)` at line 70-73 covers everything else.

**Missing vs SPEC §7:** 2 locations, ~30 products with images, 4 collections, 25 customers, **40 orders over 60 days** (so the entire analytics dashboard, Home metric cards, and top-products chart have no data), 3 discounts, mock `ProcessorConfig` + `RoutingRule`, and one published `ThemeVersion` (blocked — no preset ThemeDoc exists). Also implies: no `InventoryLevel` rows, no `OrderEvent` timelines, no `AnalyticsEvent` rows, no `AnalyticsRollupDaily`.

---

## 4. `packages/contracts` — **COMPLETE** (the strongest package)

| File | Verdict |
|---|---|
| `theme.ts` (380) | Complete, exemplary — tokens, 18 section schemas, discriminated union, `validateThemeDoc()`, presets enum |
| `pay.ts` (213) | Complete — vault, adapter I/O, `approved`/`declined`/`hard_failure` union, routing rules, saved cards |
| `orders.ts` (194) | Complete — line items, fulfillments, refunds, timeline, index tabs |
| `common.ts` (148) | Complete — ids, money, error shape + `ERROR_STATUS` map, cursor pagination, address |
| `products.ts` (114) / `collections.ts` (81) / `customers.ts` (79) / `discounts.ts` (105) / `checkout.ts` (100) / `analytics.ts` (87) | Complete for their domains |
| `auth.ts` (64) / `webhooks.ts` (68) / `storefront.ts` (72) / `inventory.ts` (62) | Complete |
| `shops.ts` (52) | **Skeletal** — defines `taxSettingsSchema`, `shippingRateSchema`, `checkoutSettingsSchema` but **no `update*Input` for any of them**, so 3 of the 8 Settings pages have no request contract |
| `apps.ts` (36) | Near-complete — no `updateAppInput`, no revoke/rotate-token contract |
| `locations.ts` (22) / `files.ts` (23) | Complete (small by nature) |

**Cross-cutting contract gaps:** no error-response *factory* (every Fastify route will hand-roll `{errors:[{...}]}` — a one-line `err(code, message, field?)` helper in `common.ts` prevents 20 agents inventing 20 shapes); no `storefrontThemeResponse` returning the actual `ThemeDoc` (`storefront.ts:71` only gives `themeVersionId`, so the storefront has no typed way to fetch a theme); no `listPaymentsQuery`; no draft-orders (correctly cut per SPEC §2).

---

## 5. `packages/config` — **COMPLETE**

`money.ts` (integer-only with a runtime guard, largest-remainder `allocate`, zero-decimal currency table), `ids.ts` (prefixed ULIDs matching SPEC §5, `shpat_` token gen), `env.ts` (zod-parsed, `VAULT_MASTER_KEY` validated as 64 hex chars at boot), `constants.ts` (webhook topics, rate limits, permission areas). No stubs. `.env.example` is in parity for all Pay/AI vars.

---

## Bug list (file:line)

**Blocking / functional**

- `packages/pay/src/vault.ts:14` — module body is `export {}`. No tokenize, no AES-256-GCM, no Luhn. Blocks all of checkout.
- `packages/pay/src/router.ts:16` — module body is `export {}`. No `PaymentRouter`.
- `packages/pay/src/adapters/mock.ts:15,18,21,24`; `stripe.ts:12,15,18,21`; `maverick.ts:13,16,19,22` — **12 throwing TODO-stubs.** Direct violation of SPEC §5: *"No dead code, no TODO-stubs that throw."* `mock` is what e2e §14.4(b) and the whole demo run on.
- `packages/theme-engine/src/sections/*.tsx` (17 files, line 15-16 of each) — all render an empty `&lt;section&gt;`. The storefront will be blank on every page.
- `packages/db/prisma/seed/index.ts:70-73` — demo dataset absent; analytics dashboard, Home cards, orders index, and e2e §14.4(b)(c) all have nothing to run against.
- `packages/db/src/tenant.ts:12-16, 58-62` — nested `create`/`connect` unstamped ⇒ `db.product.create` with nested variants throws NOT NULL on `shop_id`; nested `connect` can link cross-tenant.
- `packages/db/src
… [truncated, 3,806 more chars]

### 🤖 Claude

The packages audit is in — pay and theme-engine are pure stubs, contracts/config/db-schema are strong, the seed is 5% done, and there's a concrete bug list (float math in `fromDecimal`, a boolean-coercion filter bug, unscoped `Shop` reads through `dbForShop`, per-request client rebuilds). I'll fix the quick correctness bugs myself and fold the structural ones into issues. Waiting on the apps audit to complete the picture.

### 👤 User

<task-notification>
<task-id>ae2b5c70572f2e750</task-id>
<tool-use-id>toolu_01UsQEja7wZnVuzz8VscQNeT</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-agent-swarm-dev-plan-ee07d4/e5703611-1c95-41aa-b8e2-ec3920ddfe5b/tasks/ae2b5c70572f2e750.output</output-file>
<status>completed</status>
<summary>Agent "Audit apps implementation state" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>Audit complete. Here is the structured report.

---

# Merchant monorepo audit — apps/*, e2e/, root tooling

Repo state: 8 commits, last is `b2cf004 fix(ws-a): …`. Everything is **WS-A skeleton only**. No workstream B–H code has landed. `node_modules` is only partially installed (root devDeps: biome, turbo, typescript), so nothing here was executed except `scripts/check-env-parity.mjs` (passes: 33 vars).

---

## 1. `apps/api` — skeleton, no auth, no tenancy, no routes

**Exists** (6 source files, ~250 LOC total):

| File | State |
|---|---|
| `apps/api/src/app.ts` | Real. Fastify 5 + logger w/ redaction, cors, cookie, rate-limit, error-handler, tenancy, `@fastify/autoload` over `src/routes` |
| `apps/api/src/server.ts` | Real. Listen + SIGINT/SIGTERM drain |
| `apps/api/src/plugins/error-handler.ts` | Real and correct — SPEC §5 error shape, ZodError→field errors, 404 handler |
| `apps/api/src/lib/errors.ts` | Real. `ApiError` + `badRequest/unauthorized/forbidden/notFound/conflict` |
| `apps/api/src/plugins/tenancy.ts` | **Stub.** Decorators + `request.db` getter are real; the `onRequest` resolver is a no-op |
| `apps/api/src/routes/health/index.ts` | Only route in the app |

**Auth: not implemented at all.** `grep -rn -E "requirePermission|createSession|signup|login|argon2|Bearer|shpat_" apps/api/src` returns exactly one hit — a comment in `tenancy.ts:8`. No login, no signup, no Redis session store, no `requirePermission`, no CSRF header check, no API-token hashing. `packages/contracts/src/auth.ts` (loginInput, signupInput, sessionResponse, permissionsSchema) is fully written and has **zero consumers**. `@node-rs/argon2` and `ioredis` are declared deps in `apps/api/package.json:21,25` and unused.

**Tenancy plugin: not real.** `apps/api/src/plugins/tenancy.ts:49-51` is `app.addHook('onRequest', async (request) =&gt; { void request; })`. None of the three resolution paths (session→shopId, Host→shop, Bearer→shopId) exist. Consequence: `request.shopId` is always `undefined`, so the `request.db` getter at `tenancy.ts:36-43` throws for every request. The *underlying* mechanism is real and good — `packages/db/src/tenant.ts` `dbForShop()` is a genuine `$extends` that injects `where.AND=[{shopId}]` on 14 read/write ops and stamps `data` on 7 write ops, including the `upsert` create/update hole.

**Rate limiting: registered but inert.** `app.ts:59-63` registers `@fastify/rate-limit` with `global: false`, so nothing is limited until a route opts in — and no route does. `RATE_LIMITS.login` (10/min) and `RATE_LIMITS.checkoutPayment` (5/min) in `packages/config/src/constants.ts:52-56` are unreferenced; `adminApi.burst: 80` has no expression in the plugin config at all, and there's no per-token `keyGenerator`.

**Routes beyond health: none.** No `src/services/` directory despite `apps/api/README.md:41`.

---

## 2. `apps/admin` — providers only, no shell, no pages, no data layer

**Exists:**
- `src/app/layout.tsx` — real, imports `@shopify/polaris/build/esm/styles.css`, wraps `&lt;Providers&gt;`
- `src/components/shell/providers.tsx` — real: `QueryClientProvider` (staleTime 30s, no refetch-on-focus, retry 1) + Polaris `AppProvider` with default theme and en translations
- `src/navigation/` — registry **complete and correct** vs SPEC §9: 10 items, `home/orders/products/customers/marketing/discounts/analytics/storefront/apps/settings`, orders has `badge: 'openOrders'`, products has Collections+Inventory subitems, settings is `position: 'bottom'`, storefront uses `PaintBrushFlatIcon` per Deviation #2
- `src/app/page.tsx` — placeholder card that literally says "Skeleton is up. WS-A: replace with the Frame shell and auth redirect."

**Polaris Frame/TopBar/Navigation shell: NOT built.** Only the providers exist. `grep -rn -E "Frame|TopBar|NAVIGATION|MAIN_NAV"` across `apps/admin/src` matches only `navigation/index.ts` itself and comments. **`NAVIGATION`, `MAIN_NAV`, `BOTTOM_NAV` have zero consumers** — the registry is currently dead code (SPEC §5 "no dead code").

**Pages beyond root: none.** No `(shop)` route group, no `/store/{shopSlug}/…` segment, no login page. All ~20 SPEC §9 pages are missing.

**React Query: set up as a provider only.** `grep -rn "useQuery"` → zero hits.

**API client lib: does not exist.** `apps/admin/src/lib/**` is assigned to WS-A in `docs/WORKSTREAMS.md:22` and the directory is absent. There is no `fetch(` anywhere in `apps/admin/src`.

Also missing vs SPEC §13: `@shopify/polaris-viz` is not a dependency.

---

## 3. `apps/storefront` — Host resolution works, one placeholder page

- `src/lib/tenant.ts` — **the Host→slug half is real and correct**: strips port, requires `.{baseDomain}` suffix, rejects multi-level hosts and `www`. Lines 27-28 leave the `CustomDomain` production fallback as a TODO (the `CustomDomain` model *does* exist at `packages/db/prisma/schema/platform.prisma:45`).
- It resolves a **slug string only** — no `Shop` lookup, no shopId, no validation that the shop exists.
- `src/app/page.tsx` — placeholder printing `Resolved shop: {slug}`. `src/app/globals.css` has a genuinely nice Tailwind 4 `@theme inline` mapping of `--theme-*` CSS vars, ready for the theme engine.
- **Real pages: none.** Missing `/collections/{handle}`, `/products/{handle}`, `/search`, `/cart`, `/account`, `/checkouts/{token}` (SPEC §10). `@merchant/theme-engine` is a declared dep with zero imports.

---

## 4. `apps/worker` — harness is real, zero jobs

- `src/index.ts` is a genuine BullMQ harness: one `Worker` per queue over `QUEUES` (webhooks/email/analytics/ai), `maxRetriesPerRequest: null`, concurrency 5, dispatch by `job.name` through a per-queue Map, SIGINT/SIGTERM close.
- `src/jobs/types.ts` — real `JobDefinition&lt;T&gt;` type.
- **`src/jobs/index.ts:14-17` — `JOBS` is an empty array.** All four SPEC §13 jobs (webhookDelivery, orderConfirmationEmail, analyticsRollup, aiThemeGeneration) are comments. The worker boots four listeners that throw `No handler registered for job "…"` (`index.ts:27`) on anything enqueued.
- **There is no producer side anywhere** — no shared `Queue` helper in `packages/config` or `apps/api`, so nothing can enqueue.
- `nodemailer` declared and unused.

---

## 5. `e2e` — config is sound, tests are stubs

`e2e/tests/smoke.spec.ts` contains **all five mandatory SPEC §14.4 flows as `test.fixme(…, async () =&gt; {})` empty stubs** (lines 10, 12, 14, 16, 18). The only executing test is line 21: GET `${API_URL}/health` asserting `.status === 'ok'`.

`playwright.config.ts` is structurally correct (testDir, CI retries/workers, trace/screenshot on failure, `reuseExistingServer: !CI`, `cwd: '..'` resolves to repo root, html report path matches the CI artifact upload). **It will not actually work** — see BUG-3 (webServer starts the API without env) and BUG-9 (lvh.me DNS in the readiness probe).

---

## 6. Tooling — mostly correct; three CI/script defects

**Git hooks: correct.** `pre-commit` (biome `--staged --write` + re-stage, `SKIP_HOOKS` escape, bails if no `node_modules`), `commit-msg` (Conventional Commits, `ws-a`…`ws-h`/`shared`/`root` scopes, allows Merge/Revert/fixup), `pre-push` (blocks direct push to main; the `.env` check correctly uses `git merge-base origin/main HEAD` rather than the no-op `--cached`). `scripts/setup-git.sh` installs the `pnpm-lock` merge driver that `.gitattributes:16` references, plus rerere/zdiff3/hooksPath — consistent.

**`scripts/check-env-parity.mjs`: correct and passing** (`env parity ok — 33 vars`). The 2-space-indent regex matches every key in `packages/config/src/env.ts`.

**Missing pnpm scripts referenced by CLAUDE.md: NONE.** All verified present in root `package.json`: `setup:git`, `db:setup`, `db:migrate`, `db:reset`, `db:generate`, `seed`, `verify`, `e2e`, `test`, `lint`, `typecheck`. (One command in CLAUDE.md is still wrong — BUG-11.)

**CI:** `pr-checks.yml` is the single required check (matches `.github/rulesets/main.json` context `pr-checks`), has the `merge_group:` trigger, service containers for PG+Redis, and orders cheap guards first. `main-checks.yml` runs e2e + a 4-app docker build matrix post-merge. `auto-merge.yml` arms auto-merge on `ws-*` branches.

**Tenancy test suite (SPEC §14.1): DOES NOT EXIST ANYWHERE.** `find` for `*.test.ts`/`*.spec.ts`/`vitest.config*` across the repo returns exactly one file: `e2e/tests/smoke.spec.ts`. See BUG-7 — this is the most consequential finding, because CI reports the mandatory blocking gate as green.

---

## 7. Bug list (file:line)

### High

**BUG-1 — Autoloaded routes will land on the wrong URLs.**
`apps/api/src/app.ts:68-73` registers `@fastify/autoload` with no `options.prefix`. With `dirNameRoutePrefix` at its default, `src/routes/admin/products/index.ts` mounts at `/admin/products`, not `/admin/api/products` (SPEC §5, §9). Same for `/storefront/api/*` (SPEC §10). `app.ts:9` even says "`→ /admin/api/products (see prefix below)`" — **there is no prefix below**. `apps/api/README.md:12-14` and `docs/WORKSTREAMS.md:27,55,65,85` all instruct agents to use `routes/admin/**` and `routes/storefront/**`, so five workstreams will build the entire API on the wrong paths. Fix before any route lands.

**BUG-2 — CORS rejects every storefront origin.**
`apps/api/src/app.ts:53`: `new RegExp(\`\\.${config.STOREFRONT_BASE_DOMAIN.split(':')[0]}$\`)` → `/\.lvh.me$/`, tested by `@fastify/cors` against the raw Origin header `http://demo.lvh.me:3002`. The `$` anchor fails because of the `:3002`. Also `.` is unescaped and the pattern is unanchored at the start. This breaks the SPEC §11 hosted-fields flow (browser posts the PAN cross-origin to `/vault/tokenize`). Needs `^https?:\/\/[a-z0-9-]+\.lvh\.me(:\d+)?$`.

**BUG-3 — `start` scripts don't load the root `.env`; Playwright and CI e2e cannot boot the API.**
`apps/api/package.json:7-8` — `dev` has `--env-file=../../.env`, `start` (`tsx src/server.ts`) does not. Same at `apps/worker/package.json:7-8`. `DECISIONS.md:18` explicitly claims "`--env-file` for api/worker". `e2e/playwright.config.ts:31` runs `pnpm --filter @merchant/api start`, and `.github/workflows/main-checks.yml:36` runs `pnpm e2e` — both boot the API with no DATABASE_URL/SESSION_SECRET/VAULT_MASTER_KEY, so `env()` (`packages/config/src/env.ts:79-87`) throws at startup. Docker is unaffected (container env).

**BUG-4 — `request.db` builds a new extended Prisma client on every property read.**
`apps/api/src/plugins/tenancy.ts:35-43` — the getter calls `dbForShop(this.shopId)` unmemoized, and `$extends` allocates a new client each call. A handler doing `request.db.product.findMany()` then `request.db.order.count()` creates two. Memoize per request (or LRU per shopId).

**BUG-5 — Tenancy is unimplemented; every tenant-scoped request will 500.**
`apps/api/src/plugins/tenancy.ts:46-51`. Acknowledged TODO, but it also violates CLAUDE.md §8 ("no TODO-stubs that throw") and blocks all of WS-B/C/E/G.

**BUG-6 — SPEC §8 auth is entirely absent.** No login, signup, Redis session, `requirePermission`, CSRF `x-requested-with` check, or `shpat_` token verification. `packages/config/src/ids.ts:66` `newApiToken()` and all of `packages/contracts/src/auth.ts` are unconsumed.

**BUG-7 — The "blocking" tenancy gate is vacuously green.**
`.github/workflows/pr-checks.yml:78-80` runs `pnpm test` under the comment "SPEC §14: tenancy suite, pay, money/discounts."
… [truncated, 5,555 more chars]

### 🤖 Claude

Both audits are in. The picture: workstream A's scaffold is real and well-built, but pay/theme-engine/worker-jobs/seed are stubs, no auth or tenancy resolution exists, zero admin/storefront pages, zero test files (CI's "blocking" gates pass vacuously), plus ~20 concrete bugs — several of which would break every downstream agent (wrong route prefixes, broken CORS, `.env` not loaded for e2e, per-read Prisma client rebuilds).

Plan: **fix the swarm-breaking and quick correctness bugs now in this branch**, then write the full issue backlog. Starting with the API bugs.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Fastify app assembly (SPEC §3). Owner: WS-A.
> 3	 *
> 4	 * Routes are AUTOLOADED from src/routes/**. Adding an endpoint means adding a
> 5	 * file — there is no central router to edit, and therefore no file that all
> 6	 * eight workstreams fight over (CLAUDE.md §3).
> 7	 *
> 8	 * URL prefix follows the directory path:
> 9	 *   src/routes/admin/products/index.ts  →  /admin/api/products   (see prefix below)
> 10	 */
> 11	import { join } from 'node:path';
> 12	import { fileURLToPath } from 'node:url';
> 13	import autoload from '@fastify/autoload';
> 14	import cookie from '@fastify/cookie';
> 15	import cors from '@fastify/cors';
> 16	import rateLimit from '@fastify/rate-limit';
> 17	import { RATE_LIMITS } from '@
> … [truncated, 2,027 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/plugins/tenancy.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Tenant resolution (SPEC §6). Decorates every request with `shopId` and a
> 3	 * tenant-scoped Prisma client, so route handlers cannot forget to scope.
> 4	 *
> 5	 * Three entry paths resolve a shop:
> 6	 *   /admin/api/*      → staff session cookie
> 7	 *   /storefront/api/* → Host header (shopSlug.lvh.me)
> 8	 *   /api/*            → Bearer Admin API token
> 9	 *
> 10	 * Owner: WS-A. Other workstreams consume `request.db`; they do not edit this.
> 11	 */
> 12	
> 13	import { dbForShop, type TenantClient } from '@merchant/db/tenant';
> 14	import fp from 'fastify-plugin';
> 15	import { unauthorized } from '../lib/errors.ts';
> 16	
> 17	declare module 'fastify' {
> 18	  interface FastifyRequest {
> 19	    /** Resolve
> … [truncated, 1,529 more chars]
> ```

### 🤖 Claude

Now fixing. First let me check what Prisma exposes at runtime (for nested-write stamping) and the `OrderSequence`/`Shop` model shapes.

🔧 **Bash**
```
grep -n "OrderSequence" -A8 packages/db/prisma/schema/orders.prisma | head -20; grep -n "model Shop " -A10 packages/db/prisma/schema/platform.prisma; node -e "
const { Prisma } = require('./node_modules/@prisma/client');
const dm = Prisma.dmmf?.datamodel;
if (!dm) { console.log('NO DMMF'); process.exit(0); }
const prod = dm.models.find(m=>m.name==='Product');
console.log('models:', dm.models.length);
console.log(prod.fields.filter(f=>f.kind==='object').map(f=>({name:f.name,type:f.type})));
"
```

> **↳ result**
> ```
> Exit code 1
> 3:model Shop {
> 4-  id           String   @id
> 5-  slug         String   @unique
> 6-  name         String
> 7-  email        String?
> 8-  currencyCode String   @default("USD")
> 9-  timezone     String   @default("UTC")
> 10-  plan         String   @default("trial")
> 11-
> 12-  // Onboarding checklist state shown on admin Home (SPEC §8).
> 13-  onboarding Json @default("{}")
> node:internal/modules/cjs/loader:1210
>   throw err;
>   ^
> 
> Error: Cannot find module './node_modules/@prisma/client'
> Require stack:
> - /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/[eval]
>     at Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
>     at Module._load (
> … [truncated, 601 more chars]
> ```

🔧 **Bash**
```
grep -rn "OrderSequence" packages/db/prisma/schema/orders.prisma; cd packages/db && node -e "
const { Prisma } = require('@prisma/client');
const dm = Prisma.dmmf?.datamodel;
if (!dm) { console.log('NO DMMF'); process.exit(0); }
const prod = dm.models.find(m=>m.name==='Product');
console.log('models:', dm.models.length);
console.log(JSON.stringify(prod.fields.filter(f=>f.kind==='object').map(f=>({name:f.name,type:f.type,isList:f.isList}))));
const seq = dm.models.find(m=>m.name==='OrderSequence');
console.log('seq fields:', seq ? seq.fields.map(f=>f.name).join(',') : 'none');
"
```

> **↳ result**
> ```
> models: 37
> [{"name":"options","type":"ProductOption","isList":true},{"name":"variants","type":"ProductVariant","isList":true},{"name":"images","type":"ProductImage","isList":true},{"name":"collections","type":"CollectionProduct","isList":true}]
> seq fields: shopId,next
> ```

### 🤖 Claude

DMMF is available with full relation metadata — deep-stamping nested writes is feasible. Let me check the db package's test setup and client.ts before rewriting tenant.ts.

🔧 **Bash**
```
cat packages/db/package.json packages/db/src/client.ts; grep -rn "vitest" packages/*/package.json apps/*/package.json | head
```

> **↳ result**
> ```
> cat: packages/db/package.json: No such file or directory
> cat: packages/db/src/client.ts: No such file or directory
> (eval):1: no matches found: packages/*/package.json
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4 && cat packages/db/package.json packages/db/src/client.ts && grep -rn '"vitest"' packages/*/package.json apps/*/package.json
```

> **↳ result**
> ```
> {
>   "name": "@merchant/db",
>   "version": "0.0.0",
>   "private": true,
>   "type": "module",
>   "exports": {
>     "./*": "./src/*.ts"
>   },
>   "prisma": {
>     "schema": "prisma/schema",
>     "seed": "tsx prisma/seed/index.ts"
>   },
>   "scripts": {
>     "generate": "prisma generate",
>     "migrate": "dotenv -e ../../.env -- prisma migrate dev",
>     "migrate:deploy": "dotenv -e ../../.env -- prisma migrate deploy",
>     "seed": "dotenv -e ../../.env -- prisma db seed",
>     "setup": "prisma generate && dotenv -e ../../.env -- prisma migrate deploy && dotenv -e ../../.env -- prisma db seed",
>     "reset": "dotenv -e ../../.env -- prisma migrate reset --force",
>     "studio": "dotenv -e ../../.env -- prisma stud
> … [truncated, 1,752 more chars]
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the unit tests for the pure stamping/scoping helpers:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.test.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.test.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db && pnpm exec vitest run 2>&1 | tail -15 && pnpm exec tsc --noEmit 2>&1 | tail -5
```

> **↳ result**
> ```
> RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db
> 
>  ✓ src/tenant.test.ts (13 tests) 7ms
> 
>  Test Files  1 passed (1)
>       Tests  13 passed (13)
>    Start at  11:49:27
>    Duration  1.15s (transform 461ms, setup 0ms, collect 924ms, tests 7ms, environment 0ms, prepare 52ms)
> ```

### 🤖 Claude

All 13 tenant tests pass and the package typechecks. Now the money and contracts fixes:

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Money is ALWAYS integer minor units (SPEC §5). No floats anywhere in this file
> 3	 * or anywhere that consumes it — `0.1 + 0.2` is how storefronts charge $19.999999.
> 4	 *
> 5	 * Currency is single-per-shop (SPEC §2 puts multi-currency out of scope), but the
> 6	 * code stays on the row so orders are self-describing and the mixing bugs are
> 7	 * caught here rather than in a report six months later.
> 8	 */
> 9	
> 10	export type Money = { amount: number; currencyCode: string };
> 11	
> 12	export const DEFAULT_CURRENCY = 'USD';
> 13	
> 14	export function money(amount: number, currencyCode: string = DEFAULT_CURRENCY): Money {
> 15	  if (!Number.isInteger(amount)) {
> 16	    throw new Error(`Money must be int
> … [truncated, 4,393 more chars]
> ```

### 🤖 Claude

Fixing `fromDecimal` (float round-trip bug: `"1.005"` → 100 instead of 101) with digit-wise string parsing, and `sum` (hardcoded USD default that throws on any non-USD seed data):

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.test.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.test.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config && pnpm exec vitest run 2>&1 | tail -8
```

> **↳ result**
> ```
> ✓ src/money.test.ts (11 tests) 3ms
> 
>  Test Files  1 passed (1)
>       Tests  11 passed (11)
>    Start at  11:50:15
>    Duration  309ms (transform 96ms, setup 0ms, collect 84ms, tests 3ms, environment 0ms, prepare 58ms)
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts
```

> **↳ result**
> ```
> 50	    hasAccount: true,
> 51	    addresses: true,
> 52	  })
> 53	  .partial({ acceptsMarketing: true, tags: true, note: true, metadata: true })
> 54	  .extend({ addresses: z.array(customerAddressSchema.omit({ id: true })).default([]) });
> 55	
> 56	export const updateCustomerInput = createCustomerInput.partial();
> 57	
> 58	export const listCustomersQuery = paginationQuery
> 59	  .merge(searchQuery)
> 60	  .merge(sortQuery)
> 61	  .extend({
> 62	    acceptsMarketing: z.coerce.boolean().optional(),
> 63	    tag: z.string().optional(),
> 64	    /** "segments-lite" (SPEC §2). */
> 65	    segment: z.enum(['all', 'returning', 'new', 'abandoned-checkout']).optional(),
> 66	  });
> 67	
> 68	export const customerListResponse = pagina
> … [truncated, 232 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/discounts.ts
```

> **↳ result**
> ```
> 38	  z.object({ type: z.literal('quantity'), value: z.number().int().positive() }),
> 39	]);
> 40	
> 41	export const discountSchema = z
> 42	  .object({
> 43	    id: idSchema,
> 44	    title: z.string().min(1).max(255),
> 45	    /** null = automatic discount (no code needed at checkout). */
> 46	    code: z.string().min(1).max(64).nullable().default(null),
> 47	    type: discountTypeSchema,
> 48	    valueType: discountValueTypeSchema,
> 49	    /** percentage: 0–100. fixed: minor units. */
> 50	    value: z.number().nonnegative(),
> 51	    appliesTo: discountAppliesToSchema.default({ scope: 'all' }),
> 52	    minimumRequirement: minimumRequirementSchema.default({ type: 'none' }),
> 53	    usageLimit: z.number().int().posi
> … [truncated, 435 more chars]
> ```

### 🤖 Claude

Money tests pass. Fixing the two contract validation bugs — I'll add a `booleanish` helper to `common.ts` and use it:

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4 && grep -n "searchQuery\|sortQuery\|paginationQuery" packages/contracts/src/common.ts | head; grep -rn "coerce.boolean" packages/contracts/src/
```

> **↳ result**
> ```
> 93:export const paginationQuery = z.object({
> 97:export type PaginationQuery = z.infer<typeof paginationQuery>;
> 100:export const searchQuery = z.object({ query: z.string().trim().max(255).optional() });
> 102:export const sortQuery = z.object({
> packages/contracts/src/customers.ts:62:    acceptsMarketing: z.coerce.boolean().optional(),
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/common.ts
```

> **↳ result**
> ```
> 88	
> 89	/* -------------------------------------------------------------------------- */
> 90	/* Pagination (SPEC §5 — cursor-based, max 250)                                 */
> 91	/* -------------------------------------------------------------------------- */
> 92	
> 93	export const paginationQuery = z.object({
> 94	  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
> 95	  cursor: z.string().optional(),
> 96	});
> 97	export type PaginationQuery = z.infer<typeof paginationQuery>;
> 98	
> 99	/** Free-text search — every list endpoint whose Shopify page has a search box. */
> 100	export const searchQuery = z.object({ query: z.string().trim().max(255).optional() });
> 101	
> 102	expo
> … [truncated, 461 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/common.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/common.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/discounts.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/discounts.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
head -20 packages/contracts/src/customers.ts | grep -n "import"
```

> **↳ result**
> ```
> 2:import { z } from 'zod';
> 3:import {
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts
```

> **↳ result**
> ```
> 2	import { z } from 'zod';
> 3	import {
> 4	  addressSchema,
> 5	  idSchema,
> 6	  metadataSchema,
> 7	  moneySchema,
> 8	  paginated,
> 9	  paginationQuery,
> 10	  searchQuery,
> 11	  sortQuery,
> 12	  tagsSchema,
> 13	  timestampsSchema,
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/customers.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the API app fixes — route prefix, CORS, rate-limit error shape, request-id comment — and the tenancy plugin's per-read client rebuild:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/app.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/plugins/tenancy.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/src/plugins/tenancy.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the remaining batch of quick fixes. Reading the affected files:

🔧 **Bash**
```
sed -n '1,15p' apps/api/package.json && sed -n '1,15p' apps/worker/package.json && echo ====WORKFLOW && cat .github/workflows/main-checks.yml && echo ====COMPOSE && sed -n '40,75p' docker-compose.yml && echo ====CONST && sed -n '1,20p' packages/config/src/constants.ts && grep -n "SESSION_COOKIE" packages/config/src/env.ts && echo ====PW && cat e2e/playwright.config.ts && echo ====RENDER && cat packages/theme-engine/src/render.ts && echo ====DOCKERW && sed -n '1,12p' apps/worker/Dockerfile
```

> **↳ result**
> ```
> Exit code 1
> {
>   "name": "@merchant/api",
>   "version": "0.0.0",
>   "private": true,
>   "type": "module",
>   "scripts": {
>     "dev": "tsx watch --env-file=../../.env src/server.ts",
>     "start": "tsx src/server.ts",
>     "typecheck": "tsc --noEmit",
>     "test": "vitest run --passWithNoTests"
>   },
>   "dependencies": {
>     "@fastify/autoload": "^6.0.3",
>     "@fastify/cookie": "^11.0.2",
>     "@fastify/cors": "^10.0.2",
> {
>   "name": "@merchant/worker",
>   "version": "0.0.0",
>   "private": true,
>   "type": "module",
>   "scripts": {
>     "dev": "tsx watch --env-file=../../.env src/index.ts",
>     "start": "tsx src/index.ts",
>     "typecheck": "tsc --noEmit",
>     "test": "vitest run --passWithNoTests"
>   },
>   "dep
> … [truncated, 161 more chars]
> ```

🔧 **Bash**
```
cat .github/workflows/main-checks.yml; echo "--COMPOSE--"; sed -n '40,75p' docker-compose.yml; echo "--CONST--"; sed -n '1,20p' packages/config/src/constants.ts; grep -n "SESSION_COOKIE" packages/config/src/env.ts; echo "--PW--"; cat e2e/playwright.config.ts
```

> **↳ result**
> ```
> # Post-merge checks. Deliberately NOT required on PRs: a 10-minute gate would
> # serialize 20 agents behind the merge queue (docs/PARALLEL-AGENTS.md §3).
> # A red run here means the owning workstream fixes forward, fast.
> name: main-checks
> 
> on:
>   push:
>     branches: [main]
>   workflow_dispatch:
> 
> concurrency:
>   group: main-checks
>   cancel-in-progress: true
> 
> jobs:
>   e2e:
>     name: e2e smoke
>     runs-on: ubuntu-latest
>     timeout-minutes: 25
>     steps:
>       - uses: actions/checkout@v4
>       - uses: pnpm/action-setup@v4
>       - uses: actions/setup-node@v4
>         with:
>           node-version-file: .nvmrc
>           cache: pnpm
> 
>       - run: pnpm install --frozen-lockfile
>       - name: start infrastr
> … [truncated, 4,305 more chars]
> ```

🔧 **Bash**
```
cat packages/theme-engine/src/render.ts; echo "--DKR--"; sed -n '1,12p' apps/worker/Dockerfile; echo "--ENV--"; grep -n "SESSION_COOKIE_NAME" .env.example packages/config/src/env.ts; echo "--SVC--"; grep -nE '^  [a-z-]+:' docker-compose.yml; echo "--NVM--"; cat .nvmrc; echo "--THEME--"; sed -n '240,260p' packages/contracts/src/theme.ts
```

> **↳ result**
> ```
> /**
>  * Theme token → CSS custom property mapping. Owner: WS-F.
>  *
>  * The renderer sets these on a wrapper element; every section reads them through
>  * Tailwind's @theme mapping in the storefront's globals.css. One Tailwind build,
>  * every shop's branding.
>  */
> import type { ThemeTokens } from '@merchant/contracts/theme';
> 
> const RADIUS: Record<ThemeTokens['radius'], string> = {
>   none: '0',
>   sm: '0.25rem',
>   md: '0.5rem',
>   lg: '1rem',
>   full: '9999px',
> };
> 
> const FONT_STACKS: Record<string, string> = {
>   inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
>   playfair: "'Playfair Display', ui-serif, Georgia, serif",
>   'dm-sans': "'DM Sans', ui-sans-serif, system-ui, sans-serif",
>   'space-gr
> … [truncated, 2,414 more chars]
> ```

🔧 **Bash**
```
sed -n '285,345p' packages/contracts/src/theme.ts
```

> **↳ result**
> ```
> sec('collection-page'),
>   sec('cart-page'),
>   sec('footer'),
> ]);
> export type Section = z.infer<typeof sectionSchema>;
> 
> /** Per-type settings schema, for validating one section in isolation. */
> export function settingsSchemaFor(type: SectionType) {
>   return sectionSettings[type];
> }
> 
> /* -------------------------------------------------------------------------- */
> /* The document                                                                 */
> /* -------------------------------------------------------------------------- */
> 
> export const themeDocSchema = z.object({
>   version: z.literal(1),
>   tokens: themeTokensSchema,
>   navigation: z.object({
>     links: z.array(linkSetting).max(8).describe('He
> … [truncated, 1,530 more chars]
> ```

🔧 **Bash**
```
grep -n "buttonStyle" packages/contracts/src/theme.ts | head -3
```

> **↳ result**
> ```
> 39:  buttonStyle: z.enum(['solid', 'outline', 'soft']).describe('Primary button treatment.'),
> ```

### 🤖 Claude

Applying the remaining batch of fixes:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/theme-engine/src/render.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/theme-engine/src/render.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/theme.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/contracts/src/theme.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/api/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/worker/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/worker/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/.github/workflows/main-checks.yml
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/.github/workflows/main-checks.yml has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/worker/Dockerfile
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/apps/worker/Dockerfile has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
sed -n '28,40p' packages/config/src/env.ts; sed -n '26,33p' .env.example
```

> **↳ result**
> ```
> STOREFRONT_PROTOCOL: z.enum(['http', 'https']).default('http'),
>   API_PORT: z.coerce.number().int().positive().default(3001),
>   ADMIN_PORT: z.coerce.number().int().positive().default(3000),
>   STOREFRONT_PORT: z.coerce.number().int().positive().default(3002),
> 
>   // --- auth (SPEC §8) ---
>   SESSION_SECRET=[REDACTED] 'SESSION_SECRET must be at least 32 characters'),
>   SESSION_COOKIE_NAME: z.string().default('_merchant_session'),
>   SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
> 
>   // --- Pay / vault (SPEC §11) ---
>   // AES-256-GCM key: exactly 32 bytes, hex-encoded. Wrong length must fail at
>   // boot, not at the first card tokenization during a demo.
> 
> # --- Auth -----
> … [truncated, 329 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/env.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/env.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/.env.example
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/.env.example has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/turbo.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/turbo.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now updating CLAUDE.md — the broken single-test command, and wiring the issue backlog into the agent onboarding steps:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now verify all fixes hold together:

🔧 **Bash**
```
pnpm verify 2>&1 | grep -E "error|Error|failed|FAIL|✗|passed|Tasks:" | head -20
```

> **↳ result**
> ```
> 124 126 │     if (!match) throw new Error(`Not a decimal amount: ${String(value)}`);
> Found 4 errors.
>   × Some errors were emitted while running checks.
>  ELIFECYCLE  Command failed with exit code 1.
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | grep -B3 -A10 "×" | head -60
```

> **↳ result**
> ```
> packages/config/src/money.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Formatter would have printed the following content:
>   
>     121 121 │     const factor = minorUnitFactor(currencyCode);
>     122 122 │     const decimals = factor === 1 ? 0 : 2;
>     123     │ - ··const·match·=·/^(-?)(\d+)(?:\.(\d*))?$/.exec(typeof·value·===·'number'·?·String(value)·:·value.trim());
>         123 │ + ··const·match·=·/^(-?)(\d+)(?:\.(\d*))?$/.exec(
>         124 │ + ····typeof·value·===·'number'·?·String(value)·:·value.trim(),
>         125 │ + ··);
>     124 126 │     if (!match) throw new Error(`Not a decimal amount: ${String(value)}`);
>     125 127 │     const [, sign, whole, frac
> … [truncated, 2,181 more chars]
> ```

🔧 **Bash**
```
pnpm lint:fix >/dev/null 2>&1; pnpm verify 2>&1 | grep -E "error|Error|failed|FAIL|Tasks:" | head -10
```

> **↳ result**
> ```
> @merchant/config:typecheck: src/money.ts(132,12): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string | number | bigint | boolean'.
> @merchant/config:typecheck:  ELIFECYCLE  Command failed with exit code 2.
>  Tasks:    4 successful, 11 total
>  ERROR  run failed: command  exited (2)
>  ELIFECYCLE  Command failed with exit code 2.
>  ELIFECYCLE  Command failed with exit code 2.
> [This command modified 4 files you've previously read: packages/contracts/src/theme.ts, packages/db/src/tenant.test.ts, packages/db/src/tenant.ts, packages/config/src/money.ts. Call Read before editing.]
> ```

### 🤖 Claude

One typecheck error left in `money.ts` — destructured regex groups are `string | undefined` under strict indexing. Fixing:

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts
```

> **↳ result**
> ```
> 110	/**
> 111	 * Parse merchant/admin input ("19.99") into minor units. Never use for arithmetic.
> 112	 *
> 113	 * Digit-wise on the string — `Math.round(1.005 * 100)` is 100, not 101, because
> 114	 * 1.005 has no exact binary representation. Extra decimals round half away from
> 115	 * zero.
> 116	 */
> 117	export function fromDecimal(
> 118	  value: string | number,
> 119	  currencyCode: string = DEFAULT_CURRENCY,
> 120	): Money {
> 121	  const factor = minorUnitFactor(currencyCode);
> 122	  const decimals = factor === 1 ? 0 : 2;
> 123	  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(
> 124	    typeof value === 'number' ? String(value) : value.trim(),
> 125	  );
> 126	  if (!match) throw new Error(`Not a decimal amount:
> … [truncated, 699 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/config/src/money.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
pnpm verify 2>&1 | grep -E "error|Error|failed|FAIL|Tests|Tasks:" | head -10
```

> **↳ result**
> ```
> Tasks:    11 successful, 11 total
> @merchant/contracts:test: > vitest run --passWithNoTests
> @merchant/worker:test: > vitest run --passWithNoTests
> @merchant/storefront:test: > vitest run --passWithNoTests
> @merchant/theme-engine:test: > vitest run --passWithNoTests
> @merchant/db:test: > vitest run --passWithNoTests
> @merchant/api:test: > vitest run --passWithNoTests
> @merchant/pay:test: > vitest run --passWithNoTests
> @merchant/config:test: > vitest run --passWithNoTests
> @merchant/admin:test: > vitest run --passWithNoTests
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the issue files themselves. Workstream A first:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A1-auth-sessions-tenancy.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A1-auth-sessions-tenancy.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A2-tenancy-suite.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A2-tenancy-suite.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A4-settings-hub.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A4-settings-hub.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Workstream B:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B1-products-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B1-products-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B2-files-media.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B2-files-media.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B3-collections-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B3-collections-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B4-inventory-locations-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B4-inventory-locations-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B5-products-admin-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B5-products-admin-ui.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B6-collections-inventory-admin-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B6-collections-inventory-admin-ui.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

One cleanup in B4 — I left an awkward sentence in the adjustment-service spec:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B4-inventory-locations-api.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/B4-inventory-locations-api.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Workstream C:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C1-discounts-engine.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C1-discounts-engine.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C2-orders-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C2-orders-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C3-fulfillment-refund-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C3-fulfillment-refund-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C4-customers-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C4-customers-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C5-orders-admin-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C5-orders-admin-ui.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C6-customers-discounts-admin-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/C6-customers-discounts-admin-ui.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Workstream D (Pay):

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D1-vault.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D1-vault.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D2-processor-adapters.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D2-processor-adapters.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D3-payment-router.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D3-payment-router.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D4-payments-settings-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/D4-payments-settings-ui.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Workstream E:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E1-storefront-api-cart.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E1-storefront-api-cart.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E2-storefront-pages.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E2-storefront-pages.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E3-checkout-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E3-checkout-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E4-checkout-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E4-checkout-ui.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E5-customer-accounts.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/E5-customer-accounts.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Workstreams F and G:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F1-theme-engine-core.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F1-theme-engine-core.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F2-marketing-sections.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F2-marketing-sections.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F3-themes-api-ai-job.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F3-themes-api-ai-job.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F4-builder-admin-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/F4-builder-admin-ui.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G1-worker-webhooks-email.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G1-worker-webhooks-email.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G2-analytics-pipeline.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G2-analytics-pipeline.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Final batch — G3, G4, and workstream H:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G3-analytics-home-ui.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G3-analytics-home-ui.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G4-apps-admin-api.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G4-apps-admin-api.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H1-seed-demo-data.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H1-seed-demo-data.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H2-e2e-smoke.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H2-e2e-smoke.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H3-polish-readme-demo.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H3-polish-readme-demo.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
LC_ALL=C sed -i '' 's|app/(store)/store/\[slug\]|app/store/[slug]|g' docs/issues/*.md && LC_ALL=C sed -i '' 's|apps/admin/src/app/(shop)/|apps/admin/src/app/store/[slug]/|g' docs/WORKSTREAMS.md && grep -rn "(store)\|(shop)" docs/issues/ docs/WORKSTREAMS.md | grep -v "route group" | head
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

### 🤖 Claude

All paths standardized. Now logging the decisions, per the repo's append-only protocol:

🔧 **Bash**
```
cat >> DECISIONS.md << 'EOF'
2026-08-28 | ROOT | Development plan lives as parallel-safe issue files in docs/issues/ (README = protocol, INDEX = grab list) — agents claim via docs/AGENT-LOG.md, one issue = one PR, tests named per issue land with the feature.
2026-08-28 | WS-A | Admin page routes live at apps/admin/src/app/store/[slug]/… (no route-group prefix) — WORKSTREAMS.md globs updated to match; URL mirrors admin.shopify.com/store/{slug} per SPEC §6.
2026-08-28 | WS-A | Autoload maps routes/admin→/admin/api and routes/storefront→/storefront/api via dirNameRoutePrefix — on-disk layout in W
… [truncated, 672 more chars]
```

> **↳ result**
> ```
> Cached:    9 cached, 10 total
>   Time:    1.089s
> ```

### 🤖 Claude

Green. Committing on a properly named `ws-a/` branch and landing through the repo's PR + auto-merge flow:

🔧 **Bash**
```
git switch -c ws-a/dev-plan-issue-backlog && git add -A && git status --short | head -50
```

> **↳ result**
> ```
> Switched to a new branch 'ws-a/dev-plan-issue-backlog'
> M  .env.example
> M  .github/workflows/main-checks.yml
> M  CLAUDE.md
> M  DECISIONS.md
> M  apps/api/package.json
> M  apps/api/src/app.ts
> M  apps/api/src/plugins/tenancy.ts
> M  apps/worker/Dockerfile
> M  apps/worker/package.json
> M  docs/WORKSTREAMS.md
> A  docs/issues/A1-auth-sessions-tenancy.md
> A  docs/issues/A2-tenancy-suite.md
> A  docs/issues/A3-admin-shell.md
> A  docs/issues/A4-settings-hub.md
> A  docs/issues/B1-products-api.md
> A  docs/issues/B2-files-media.md
> A  docs/issues/B3-collections-api.md
> A  docs/issues/B4-inventory-locations-api.md
> A  docs/issues/B5-products-admin-ui.md
> A  docs/issues/B6-collections-inventory-admin-ui.md
> A  docs/issues/C1-
> … [truncated, 1,063 more chars]
> ```

🔧 **Bash**
```
git commit -m "feat(root): agent-swarm issue backlog + pre-swarm platform fixes

Development plan as 29 parallel-safe issues in docs/issues/ (protocol in
README, grab-list in INDEX, mermaid dependency graph), sized for one agent /
one PR each, TDD plans per issue mapped to SPEC \$14.

Fixes landed alongside, so the swarm doesn't trip on them:
- api: autoload prefix mapping (routes/admin -> /admin/api), CORS regex that
  actually matches storefront origins, SPEC-shaped 429 body
- db: dbForShop deep-stamps nested writes via DMMF, scopes Shop/OrderSequence,
  memoizes per shop; 13 unit tests
- co
… [truncated, 503 more chars]
```

> **↳ result**
> ```
> packages/db/src/tenant.test.ts:41:25 lint/suspicious/noExplicitAny ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   ! Unexpected any. Specify a different type.
>   
>     39 │       },
>     40 │       SHOP,
>   > 41 │     ) as Record<string, any>;
>        │                         ^^^
>     42 │     expect(out.shopId).toBe(SHOP);
>     43 │     expect(out.variants.create).toEqual([
>   
>   i any disables many type checking rules. Its use should be avoided.
>   
> 
> packages/db/src/tenant.test.ts:63:25 lint/suspicious/noExplicitAny ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   ! Unexpected any. Specify a different type.
>   
>     61 │       },
>     62 │       SHOP,
>   > 63 │     ) as Record<string, any>;
>        │
> … [truncated, 4,515 more chars]
> ```

### 🤖 Claude

Pushed, but those five biome `any` warnings in the test file will nag every agent's lint output — cleaning them up before opening the PR:

🔧 **Bash**
```
LC_ALL=C sed -i '' 's|as Record<string, any>|as Record<string, Record<string, unknown[] \& Record<string, unknown>>>|g' packages/db/src/tenant.test.ts; grep -c "any" packages/db/src/tenant.test.ts
```

> **↳ result**
> ```
> 5
> ```

### 🤖 Claude

That sed produced an ugly type — better to restructure the assertions to avoid casts entirely with `toMatchObject`:

🔧 **Bash**
```
git checkout packages/db/src/tenant.test.ts
```

> **↳ result**
> ```
> Updated 1 path from the index
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.test.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/packages/db/src/tenant.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Good timing — I'll fold this review in before opening the PR. Let me first finish the lint cleanup, then do the gap audit against your goal statement.

🔧 **Bash**
```
cd packages/db && pnpm exec vitest run 2>&1 | tail -4; cd ../.. && pnpm lint 2>&1 | tail -3
```

> **↳ result**
> ```
> Tests  13 passed (13)
>    Start at  12:09:03
>    Duration  900ms (transform 114ms, setup 0ms, collect 647ms, tests 5ms, environment 0ms, prepare 67ms)
> 
> > biome check .
> 
> Checked 117 files in 67ms. No fixes applied.
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/PARITY.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/PARITY.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now wiring it in — a parity banner under every UI issue's Build section, plus the A3/A4/G3/H3 upgrades, the new A5 production-stack issue, and index/graph updates:

🔧 **Bash**
```
for f in A3-admin-shell A4-settings-hub B5-products-admin-ui B6-collections-inventory-admin-ui C5-orders-admin-ui C6-customers-discounts-admin-ui D4-payments-settings-ui E4-checkout-ui F4-builder-admin-ui G3-analytics-home-ui G4-apps-admin-api; do
  LC_ALL=C sed -i '' '/^## Build/a\
**Layout authority: [PARITY.md](PARITY.md). It overrides your memory of Shopify — read your page'"'"'s section before writing JSX.**\
' "docs/issues/$f.md"
done
grep -l "PARITY.md" docs/issues/*.md | wc -l
```

> **↳ result**
> ```
> 12
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md has been updated successfully. (note: the file had been modified on disk since you last read it — the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A3-admin-shell.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A4-settings-hub.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A4-settings-hub.md has been updated successfully. (note: the file had been modified on disk since you last read it — the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G3-analytics-home-ui.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/G3-analytics-home-ui.md has been updated successfully. (note: the file had been modified on disk since you last read it — the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H3-polish-readme-demo.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/H3-polish-readme-demo.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the A5 production-stack issue and the index/graph updates:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A5-production-stack.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/A5-production-stack.md (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/INDEX.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/agent-swarm-dev-plan-ee07d4/docs/issues/README.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Verify and land as a second commit, then open the PR:

🔧 **Bash**
```
pnpm verify 2>&1 | grep -cE "error|failed|FAIL" ; git add -A && git commit -m "feat(root): PARITY.md layout authority, prod-stack issue A5, KPI gap fixes

Review pass against the KPI: added the binding Shopify-parity reference
(PARITY.md) wired into all 11 UI issues, signup page + real global search
to A3, notifications-lite to A4, sales-by-channel to G3, a parity audit
step to H3, and A5 (docker-compose.prod.yml + Caddy wildcard routing +
image push) covering the scalable-infrastructure goal. Tenant tests
rewritten cast-free.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" 2>&1 | tai
… [truncated, 31 more chars]
```

> **↳ result**
> ```
> 0
>  create mode 100644 docs/issues/A5-production-stack.md
>  create mode 100644 docs/issues/PARITY.md
>    1562856..d51f01f  ws-a/dev-plan-issue-backlog -> ws-a/dev-plan-issue-backlog
> ```

🔧 **Bash**
```
gh pr create --title "feat(root): agent-swarm development plan (30 issues) + pre-swarm platform fixes" --body "## What

**The development plan for the swarm**, as parallel-safe issue files in \`docs/issues/\`:
- \`README.md\` — the agent protocol (claim → TDD → verify → auto-merge PR → next issue) + mermaid dependency graph
- \`INDEX.md\` — grab list: 30 issues, sizes, dependencies
- \`PARITY.md\` — binding description of what Shopify actually looks like, per page — the defense against N agents shipping N interpretations of the KPI
- 30 issues (A1–H3) covering every SPEC § end to end, each: ow
… [truncated, 1,672 more chars]
```

> **↳ result**
> ```
> could not add label: 'ws-a' not found
> no pull requests found for branch "ws-a/dev-plan-issue-backlog"
> ```

### 🤖 Claude

The missing `ws-a` label aborted PR creation — retrying without it:

🔧 **Bash**
```
gh pr create --title "feat(root): agent-swarm development plan (30 issues) + pre-swarm platform fixes" --body "## What

**The development plan for the swarm**, as parallel-safe issue files in \`docs/issues/\`:
- \`README.md\` — the agent protocol (claim → TDD → verify → auto-merge PR → next issue) + mermaid dependency graph
- \`INDEX.md\` — grab list: 30 issues, sizes, dependencies
- \`PARITY.md\` — binding description of what Shopify actually looks like, per page — the defense against N agents shipping N interpretations of the KPI
- 30 issues (A1–H3) covering every SPEC § end to end, each: ow
… [truncated, 1,661 more chars]
```

> **↳ result**
> ```
> https://github.com/pauljurgens11/shopify/pull/3
> ```

🔧 **Bash**
```
gh pr merge 3 --auto --squash --delete-branch 2>&1 | tail -2; sleep 20; gh pr checks 3 2>&1 | head -5
```

> **↳ result**
> ```
> pr-checks	pending	0	https://github.com/pauljurgens11/shopify/actions/runs/33158385510/job/98806589681	
> enable	pass	5s	https://github.com/pauljurgens11/shopify/actions/runs/33158385580/job/98806589643
> ```

### 🤖 Claude

Done and landing. [PR #3](https://github.com/pauljurgens11/shopify/pull/3) is open with auto-merge armed; `pr-checks` was running when I last looked, and the identical tree passed `pnpm verify` locally, so it will land on its own.

## What I built

**The plan: 30 issues in `docs/issues/`** ([INDEX.md](docs/issues/INDEX.md) is the grab list, [README.md](docs/issues/README.md) the protocol + dependency graph). Every issue is one agent / one PR: owned paths, current-state context (from a two-agent audit of the whole repo), a build spec with SPEC § references, a tests-first plan, runnable acceptance commands, and landmines. Six issues are grabbable immediately (A1 auth/tenancy, C1 discounts engine, D1 vault, D2 adapters, F1 theme engine, G1 worker/webhooks); A1 unblocks the other ~20. The four mandatory SPEC §14 suites each live inside the issue that builds the thing they test.

**Fixes I made directly** (your "if you find anything fixable, do it"): the audit found ~20 bugs; I fixed the ones that would have broken multiple agents — API routes autoloading onto wrong URLs, a CORS regex that matched *nothing* (would have killed card tokenization), `dbForShop` not stamping nested creates (WS-B's literal first `product.create` would have thrown), a float bug in `fromDecimal`, `?flag=false` parsing as true, e2e/CI unable to boot the API, and more — with 24 new unit tests. Bigger items became issue content instead of drive-by changes.

## Your review questions

**Are the issues enough?** After the review pass, yes — I found and closed five real gaps: no signup *UI* existed anywhere (smoke flow (e) needs it — now in A3), no production/scaling deliverable (new A5: prod compose + Caddy wildcard routing), notifications-lite settings missing (A4), admin global search was allowed to stay a stub (now real in A3), and — the important one — **nothing enforced "exactly the same UI, not your interpretation."** That's now [PARITY.md](docs/issues/PARITY.md): a binding, page-by-page description of Shopify's actual chrome, table anatomy, form layouts, badge wording/tones, and checkout structure, wired into all 11 UI issues plus a line-by-line parity audit in H3. That file is what turns eight agents' memories of Shopify into one memory.

**Will the swarm meet the KPI?** The mechanics are in place: coverage of every SPEC section, a dependency graph with real parallelism, tests that can actually fail (CI was passing vacuously before — A2 makes the tenancy gate honest), and the merge infrastructure your repo already built. The honest risk isn't coverage, it's fidelity — pixel parity lives in execution, which is exactly why PARITY.md is binding and H3 ends with an audit against it rather than a vibe check.

**Is the goal clean in the repo?** Yes — SPEC.md is essentially your goal statement formalized: multi-tenant core, both deviations (Pay with processor-agnostic tokens + routing, AI builder instead of themes), the KPI verbatim, security capped at a sane baseline, scale path documented. One nuance worth having explicit: "exactly the same UI" applies to the **admin and checkout**; the storefront's *design* is intentionally yours (that's your own Deviation #2 — the AI builder replaces themes), while its *behavior* still has to feel Shopify-grade. PARITY.md states that scoping so no agent over- or under-applies it.
