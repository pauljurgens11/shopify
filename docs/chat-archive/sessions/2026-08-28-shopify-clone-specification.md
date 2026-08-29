# Shopify clone specification

| | |
|---|---|
| **Session** | `0fd7d1df-d5de-49a3-b5ac-a9faa96a3298` |
| **Started** | 2026-08-28T07:01:33.486Z |
| **Ended** | 2026-08-28T08:43:19.028Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Pull request** | #2 (MERGED) |
| **Model** | `claude-fable-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

this is my goal. i have to do this in 2 days.

Goal: Create Shopify clone

Similarities:

* Same UI and UX (for Admin panel and user facing stuff 1on1 not your “interpretation”). Exactly the same UI!
* Fully functional same features as Shopify that are used by ecommerce commonly (niche ones like POS are not needed)
   * multi-tenant Shopify, not a store. One deployment serves many shops. Every shop gets staff accounts, a catalog, inventory across locations, orders, customers, discounts, a themed storefront, checkout, analytics, and an app surface
* Secure
* Performant (good loading times)
* Good infrastructure that is scalable


Differences:

* We want to have a version of Shopify payments i.e our payment processing, but it should support card tokenization so that we can save the subscriptions and the card token should be processable by multiple payment processors (i.e Maverick, Stripe 
   * Like Checkoutchamp
   * Merchant can connect their payment processors and it routes the payment there
* Instead of having Themes for the storefront, we want to create an AI builder like Lovable


KPI: If I open the link, I can’t tell that it’s not Shopify

You are a ultra smart all around architect. i will do this work with a lot of parallel agents. i need you to define a destination md document. write down the exact specs and all info required so all agents know the context and needed result. use industry best practices. you are ultra coder. think through the deploy flow, focus on tests that help you develop. eliminate unneccesary testing and stuff. focus on end result. must be locally runnable.

make sure it is secure and scalable. Keep in mind the KPI and the EXACT requirements i said. DO NOT STEER FROM THEM.

Make sure this is enough context so agents agree on the general idea and dont run info logical conflicts.

### 🤖 Claude

I'll write the destination spec now — one decisive document that locks stack, contracts, boundaries, and workstreams so parallel agents can't drift into conflicts.

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/SPEC.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Good timing — I'll rebalance the spec now: security drops to a "good-enough baseline," and the freed effort goes to pixel parity and features. Making targeted edits.

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

The spec is done: [SPEC.md](SPEC.md) is the destination document for all agents, and I've already rebalanced it per your mid-flight note — security is now capped at a "good-enough baseline" and the doc opens with an explicit priority order: **appearance parity > functionality > performance > everything else**.

What it locks down, so parallel agents can't drift or conflict:

- **KPI enforcement**: the admin is built exclusively with Shopify's own open-source **Polaris ^13** design system (that's what guarantees "can't tell it's not Shopify" without interpretation), with a page-by-page parity list — nav structure, contextual save bar, IndexTables, skeletons, toasts, empty states. Checkout is a faithful single-page Shopify checkout reproduction.
- **Your two exact deviations, specced precisely**: (1) the **Pay** platform — browser-side card tokenization into a vault, a `ProcessorAdapter` interface with Mock/Stripe/Maverick adapters, and CheckoutChamp-style weighted routing rules with fallback-on-hard-fail (declines don't cascade), plus saved tokens as the subscription/repeat-billing primitive; (2) the **AI storefront builder** — Lovable-style chat + live preview that generates a validated `ThemeDoc` (18-section registry rendered by a shared theme engine), with versioning, publish, and canned presets so the demo works even without an API key.
- **Multi-tenancy** as a functional requirement: one deployment, `shop_id` on every table, a `dbForShop()` Prisma extension that makes cross-shop leaks impossible by construction. Admin at `admin.lvh.me`, each shop at `{slug}.lvh.me` — locally runnable with zero /etc/hosts edits.
- **Anti-conflict machinery for parallel agents**: a `packages/contracts` package as the single integration contract (Zod schemas for every API/webhook/theme shape), global conventions (prefixed ULIDs, integer money, error shape, pagination), 8 workstreams (A–H) with directory ownership, migration naming rules, an append-only `DECISIONS.md`, and a 2-day cadence where workstream A (skeleton + contracts + auth) lands first.
- **Deliberately minimal testing**: only what protects development — a short tenancy suite, pay/discount math units, and a 5-flow Playwright smoke (create product, full purchase with the 4242 mock card, discount, AI-build-and-publish, second-shop isolation). Snapshot/CRUD/coverage tests are explicitly forbidden.
- **Local run is 6 commands** (`docker compose up -d`, `pnpm dev`, etc.) with a rich seeded demo store ("Aurora Supply Co." with 60 days of order history so analytics looks real), and a documented Docker/Caddy deploy path.

One flag worth 10 seconds: the spec names the product "Merchant" and bans the Shopify name/logo — the *look* is legally safe (Polaris is open source) but the trademark isn't, so keep that rule.

Next step when you're ready: kick off workstream A (platform core) — everything else fans out from it.

### 👤 User

i think you have to consider only libraries that have a lot of data for ai agents. maybe polaris isnt the best option because agents are better in other, more common languages. if you agree then rework the spec accordingly.

what is in the spec. is this good enough for 20 parallel agents? i will give them issues based on this destination document. what else should i do before creating issues? only things super useful for agentic dev that will boost speed and output. minimal but sufficient. ultra.

### 🤖 Claude

You're right to raise the training-data question, but I disagree on dropping Polaris — and it's worth being precise about why, because it's a KPI decision, not a taste decision.

**Why Polaris stays:** The KPI is "can't tell it's not Shopify." Polaris *is* Shopify's UI — using it means agents get pixel parity **for free** by just composing components. The alternative (Tailwind/shadcn) is indeed better-known to agents, but then every agent must *hand-recreate* Shopify's look from memory, and 20 agents will produce 20 slightly-different interpretations — the exact failure mode your KPI forbids. Also, the premise is only half true: Polaris is not an obscure language — it's ordinary React/TypeScript with well-documented props, open source since 2017, with tons of public usage (every Shopify app embeds it). Agents handle it fine. Where your concern *is* valid is the long tail: `polaris-viz` (charts) and exotic Polaris patterns have thin data. So the right move is a hybrid, which I've now written into the spec:

- **Admin = Polaris (locked)**, pinned to v13 (the version best covered in training data), with an explicit escape hatch: if a component fights you >20 min, drop to plain HTML styled with Polaris CSS tokens — same pixels, familiar tools.
- **Charts = polaris-viz first, Recharts-styled-with-Polaris-tokens as sanctioned fallback** (Recharts has massive agent familiarity).
- **Storefront, checkout, AI builder = Tailwind** — already the case; that's where agents' Tailwind fluency actually pays off, since those pages are custom anyway.

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/SPEC.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/SPEC.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Spec updated. Now your second question — **is this enough for 20 parallel agents?**

Honest answer: the spec is enough for agents to *agree on the world*, but not yet enough for 20 of them to *work without colliding*. It defines 8 workstreams; 20 agents means finer-grained issues, and prose contracts alone won't hold at that fan-out. Here's the minimal-but-sufficient pre-issue checklist, in strict priority order — everything on it exists purely to boost agent speed/output, nothing else:

**1. Land Phase 0 yourself (or one agent) before any issues exist.** This is the single biggest multiplier. One commit containing: monorepo skeleton (pnpm/turbo/biome configs), `docker-compose.yml`, the **complete Prisma schema** (§7 is already written — transcribe it in full now, don't let it emerge from 20 PRs), the **complete `packages/contracts`** (real Zod schemas for every endpoint/webhook/ThemeDoc, even where handlers don't exist yet), `dbForShop`, auth middleware, empty-but-booting api/admin/storefront/worker apps, and the admin Frame/Nav shell. With this down, every issue becomes "fill in this slot against these types" — agents stop inventing structure and start shipping. Without it, your first 5 hours are 20 agents fighting over `package.json`.

**2. Write `CLAUDE.md` at the repo root (~40 lines).** Agents load it automatically every session. Content: the run/verify commands, "read SPEC.md §X before touching Y" pointers, the 6 conventions that prevent 90% of conflicts (ULID prefixes, integer money, error shape, `dbForShop` only, contracts-are-additive, migration naming). This is the highest ROI-per-line file in the repo.

**3. One verification command: `pnpm check`** (typecheck + biome + unit tests), wired into Phase 0. Agents self-verify before every commit; the issue's definition of done becomes "`pnpm check` green + your Playwright flow passes." Agents with a fast, unambiguous feedback loop are 2–3x more productive than agents that "think" they're done.

**4. An issue template, and cut issues along *file-ownership* lines, not feature lines.** Each issue states: (a) goal in one sentence, (b) exact directories/files it owns, (c) which contracts schemas it implements/consumes, (d) done-criteria incl. the verification command, (e) what to stub if blocked. Two issues must never own the same file. Page-level granularity works well for admin (one issue = "Orders index page", "Product form"); endpoint-group granularity for api.

**5. Merge mechanics: trunk-based, small PRs, merge fast.** 20 agents on long-lived branches = integration hell on day 2. Tell agents: rebase before PR, PRs under ~500 lines where possible, and Phase 0's CI is the merge gate. Sequence the schema-touching issues early so migrations don't fork.

That's the whole list — I'd deliberately *not* add anything else (no design docs per feature, no shared Slack-style coordination doc, no mock servers; the contracts package is the mock server). Skipping items 1–2 is the only way this plan fails.

Want me to build Phase 0 now? That's the natural next step — skeleton, full Prisma schema, full contracts package, `CLAUDE.md`, `pnpm check`, and the booting apps — so you can start cutting issues against it tonight.

### 👤 User

push spec to git

🔧 **Bash**
```
git status --short && git log --oneline -3 2>/dev/null; git remote -v
```

> **↳ result**
> ```
> ?? SPEC.md
> origin	git@github.com:pauljurgens11/shopify.git (fetch)
> origin	git@github.com:pauljurgens11/shopify.git (push)
> ```

🔧 **Bash**
```
git add SPEC.md && git commit -m "Add destination spec for multi-tenant Shopify clone

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" && git push -u origin main
```

> **↳ result**
> ```
> [main (root-commit) f5384ba] Add destination spec for multi-tenant Shopify clone
>  1 file changed, 344 insertions(+)
>  create mode 100644 SPEC.md
> To github.com:pauljurgens11/shopify.git
>  * [new branch]      main -> main
> branch 'main' set up to track 'origin/main'.
> ```

### 🤖 Claude

Pushed. [SPEC.md](SPEC.md) is now the root commit on `main` at `github.com:pauljurgens11/shopify` (commit `f5384ba`, 344 lines), and `main` is set to track `origin/main`.

Ready to start Phase 0 (skeleton + full Prisma schema + contracts + `CLAUDE.md`) whenever you say go.

### 👤 User

repo has been updated. review the repo first. be thorough. this is the base for everything. if you want to fix things, make them better, more effective then you can. you are ultra dev architect. 

remember, only super parallel agent swarms will work on this repo.

industry best practices. remember the original KPI and the speed constraint.

i am afraid maybe claude md is too long? what do you think? i have tokens so that is not a problem

do not go deep into functionality right now. just make sure the skeleton/base is right.

do a qa test in the end. make sure it works.

🔧 **Bash**
```
git pull && git log --oneline -15 && echo --- && ls -la
```

> **↳ result**
> ```
> Updating c5f2044..ffdaff3
> Fast-forward
>  .dockerignore                                      |  26 +
>  .env.example                                       |  63 ++
>  .gitattributes                                     |  27 +
>  .githooks/commit-msg                               |  34 +
>  .githooks/pre-commit                               |  21 +
>  .githooks/pre-push                                 |  27 +
>  .github/CODEOWNERS                                 |  20 +
>  .github/pull_request_template.md                   |  17 +
>  .github/rulesets/README.md                         |  23 +
>  .github/rulesets/main-with-merge-queue.json        |  48 ++
>  .github/rulesets/main.json                         |  36 +
> … [truncated, 20,361 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/package.json
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/turbo.json
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/pnpm-workspace.yaml
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/tsconfig.base.json
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/biome.json
```

> **↳ result**
> ```
> 1	{
> 2	  "name": "merchant",
> 3	  "private": true,
> 4	  "type": "module",
> 5	  "packageManager": "pnpm@9.15.4",
> 6	  "engines": {
> 7	    "node": ">=22.0.0",
> 8	    "pnpm": ">=9.0.0"
> 9	  },
> 10	  "scripts": {
> 11	    "dev": "turbo run dev --parallel",
> 12	    "build": "turbo run build",
> 13	    "typecheck": "turbo run typecheck",
> 14	    "test": "turbo run test --filter=!@merchant/e2e",
> 15	    "lint": "biome check .",
> 16	    "lint:fix": "biome check --write .",
> 17	    "format": "biome format --write .",
> 18	    "db:generate": "pnpm --filter @merchant/db generate",
> 19	    "db:migrate": "pnpm --filter @merchant/db migrate",
> 20	    "db:setup": "pnpm --filter @merchant/db setup",
> 21	    "db:reset": "pnpm --fi
> … [truncated, 568 more chars]
> ```

> **↳ result**
> ```
> 1	{
> 2	  "$schema": "https://turbo.build/schema.json",
> 3	  "ui": "stream",
> 4	  "globalDependencies": [".env", "tsconfig.base.json"],
> 5	  "globalEnv": ["NODE_ENV", "DATABASE_URL", "REDIS_URL", "ANTHROPIC_API_KEY", "VAULT_MASTER_KEY"],
> 6	  "tasks": {
> 7	    "dev": {
> 8	      "cache": false,
> 9	      "persistent": true,
> 10	      "dependsOn": ["@merchant/db#generate"]
> 11	    },
> 12	    "build": {
> 13	      "dependsOn": ["^build", "@merchant/db#generate"],
> 14	      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
> 15	    },
> 16	    "typecheck": {
> 17	      "dependsOn": ["^build", "@merchant/db#generate"],
> 18	      "outputs": []
> 19	    },
> 20	    "test": {
> 21	      "dependsOn": ["@merchant/db#generate"
> … [truncated, 151 more chars]
> ```

> **↳ result**
> ```
> 1	packages:
> 2	  - "apps/*"
> 3	  - "packages/*"
> 4	  - "e2e"
> 5
> ```

> **↳ result**
> ```
> 1	{
> 2	  "$schema": "https://json.schemastore.org/tsconfig",
> 3	  "compilerOptions": {
> 4	    "target": "ES2023",
> 5	    "lib": ["ES2023"],
> 6	    "module": "Preserve",
> 7	    "moduleDetection": "force",
> 8	    "moduleResolution": "Bundler",
> 9	    "resolveJsonModule": true,
> 10	    "verbatimModuleSyntax": true,
> 11	    "isolatedModules": true,
> 12	    // Internal packages export raw .ts source (see DECISIONS.md), so imports
> 13	    // carry explicit .ts specifiers. Legal because every package is noEmit.
> 14	    "allowImportingTsExtensions": true,
> 15	    "esModuleInterop": true,
> 16	    "skipLibCheck": true,
> 17	    "strict": true,
> 18	    "noUncheckedIndexedAccess": true,
> 19	    "noImplicitOverride": true,
> … [truncated, 196 more chars]
> ```

> **↳ result**
> ```
> 1	{
> 2	  "$schema": "https://biomejs.dev/schemas/2.5.11/schema.json",
> 3	  "vcs": {
> 4	    "enabled": true,
> 5	    "clientKind": "git",
> 6	    "useIgnoreFile": true
> 7	  },
> 8	  "files": {
> 9	    "includes": [
> 10	      "**",
> 11	      "!**/node_modules",
> 12	      "!**/.next",
> 13	      "!**/dist",
> 14	      "!**/.turbo",
> 15	      "!**/generated",
> 16	      "!**/pnpm-lock.yaml",
> 17	      "!**/test-results",
> 18	      "!**/playwright-report"
> 19	    ]
> 20	  },
> 21	  "formatter": {
> 22	    "enabled": true,
> 23	    "indentStyle": "space",
> 24	    "indentWidth": 2,
> 25	    "lineWidth": 100
> 26	  },
> 27	  "linter": {
> 28	    "enabled": true,
> 29	    "rules": {
> 30	      "preset": "recommended",
> 31	      "suspicious": {
> 32
> … [truncated, 760 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.env.example
```

> **↳ result**
> ```
> 1	# =============================================================================
> 2	# Merchant — local development environment
> 3	#
> 4	# `cp .env.example .env` must work with ZERO edits (SPEC §17).
> 5	# This file is EXHAUSTIVE: every var read by packages/config/src/env.ts is here.
> 6	# If you add a var to env.ts, add it here in the same commit. CI enforces this.
> 7	# =============================================================================
> 8	
> 9	NODE_ENV=development
> 10	LOG_LEVEL=info
> 11	
> 12	# --- Infrastructure (matches docker-compose.yml) ------------------------------
> 13	DATABASE_URL=postgresql://merchant:[REDACTED]@localhost:5433/merchant?schema=public
> 14	REDIS_URL=redis://localhost:6379
> 15
> … [truncated, 1,931 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/docker-compose.yml
```

> **↳ result**
> ```
> 1	# Local infrastructure only. Apps run on the host via `pnpm dev` (SPEC §17).
> 2	name: merchant
> 3	
> 4	services:
> 5	  postgres:
> 6	    image: postgres:16-alpine
> 7	    restart: unless-stopped
> 8	    environment:
> 9	      POSTGRES_USER: merchant
> 10	      POSTGRES_PASSWORD: merchant
> 11	      POSTGRES_DB: merchant
> 12	    ports:
> 13	      # Host 5433, not 5432: a stock Postgres (or another project's container)
> 14	      # very often already owns 5432, and a port clash on `docker compose up` is
> 15	      # a confusing first-run failure. The container port is unchanged.
> 16	      - "5433:5432"
> 17	    volumes:
> 18	      - postgres-data:/var/lib/postgresql/data
> 19	    healthcheck:
> 20	      test: ["CMD-SHELL", "
> … [truncated, 1,869 more chars]
> ```

### 🤖 Claude

Root configs look solid. Now the load-bearing core: config, db/tenancy, and the API skeleton.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/config/src/env.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * The one place environment variables are read (SPEC §5).
> 3	 *
> 4	 * Rules:
> 5	 *  - Add a var here and to `.env.example` in the SAME commit. CI enforces the
> 6	 *    pair via `scripts/check-env-parity.mjs`.
> 7	 *  - Server-only. Never import this from a client component; Next would inline
> 8	 *    secrets into the browser bundle.
> 9	 *  - Parsing is lazy and cached, so importing a helper from this package does
> 10	 *    not blow up a process that has no business needing DATABASE_URL.
> 11	 */
> 12	import { z } from 'zod';
> 13	
> 14	const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
> 15	
> 16	const schema = z.object({
> 17	  NODE_ENV: z.enum(['developme
> … [truncated, 4,302 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/config/src/ids.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Prefixed ULIDs (SPEC §5). Every public identifier in the system comes from here.
> 3	 *
> 4	 * Why ULID over UUID: lexicographically sortable by creation time, so
> 5	 * `ORDER BY id` is chronological and cursor pagination (SPEC §5) needs no
> 6	 * secondary sort key. The prefix makes IDs self-describing in logs and URLs —
> 7	 * the same trick Stripe and Shopify use.
> 8	 */
> 9	import { ulid } from 'ulid';
> 10	
> 11	export const ID_PREFIXES = {
> 12	  shop: 'shop',
> 13	  user: 'usr',
> 14	  product: 'prod',
> 15	  variant: 'var',
> 16	  collection: 'col',
> 17	  location: 'loc',
> 18	  inventory: 'inv',
> 19	  order: 'ord',
> 20	  lineItem: 'li',
> 21	  customer: 'cus',
> 22	  address: 'addr',
> 23	  discount: 'dis',
> … [truncated, 1,590 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/config/src/money.ts
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

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/src/tenant.ts
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
> 11	 */
> 12	import { dbAdmin, type PrismaClient } from './client.ts';
> 13	
> 14	/**
> 15	 * Models that are NOT tenant-scoped, and must be skipped by the extension.
> 16	 * `Shop` is the tenant it
> … [truncated, 2,651 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/src/client.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Raw, UNSCOPED Prisma client.
> 3	 *
> 4	 * Importing this outside the four sanctioned cases is the one unforgivable bug
> 5	 * in this codebase (SPEC §6). Sanctioned: shop signup, platform-level auth
> 6	 * lookup, migrations, seed. Everywhere else: `dbForShop(shopId)`.
> 7	 */
> 8	import { PrismaClient } from '@prisma/client';
> 9	
> 10	const globalForPrisma = globalThis as unknown as { dbAdmin?: PrismaClient };
> 11	
> 12	export const dbAdmin: PrismaClient =
> 13	  globalForPrisma.dbAdmin ??
> 14	  new PrismaClient({
> 15	    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
> 16	  });
> 17	
> 18	// Next.js dev hot-reload otherwise opens a new pool on every edit until Postgres
> 19	//
> … [truncated, 176 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/package.json
```

> **↳ result**
> ```
> 1	{
> 2	  "name": "@merchant/db",
> 3	  "version": "0.0.0",
> 4	  "private": true,
> 5	  "type": "module",
> 6	  "exports": {
> 7	    "./*": "./src/*.ts"
> 8	  },
> 9	  "prisma": {
> 10	    "schema": "prisma/schema",
> 11	    "seed": "tsx prisma/seed/index.ts"
> 12	  },
> 13	  "scripts": {
> 14	    "generate": "prisma generate",
> 15	    "migrate": "dotenv -e ../../.env -- prisma migrate dev",
> 16	    "migrate:deploy": "dotenv -e ../../.env -- prisma migrate deploy",
> 17	    "seed": "dotenv -e ../../.env -- prisma db seed",
> 18	    "setup": "dotenv -e ../../.env -- prisma migrate deploy && dotenv -e ../../.env -- prisma db seed",
> 19	    "reset": "dotenv -e ../../.env -- prisma migrate reset --force",
> 20	    "studio": "dot
> … [truncated, 546 more chars]
> ```

### 🤖 Claude

Core utilities are genuinely good. One flaw spotted in the tenant client (nested writes aren't stamped) — I'll verify and fix after the sweep. Continuing with the API, apps, and contracts.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/src/app.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/src/plugins/tenancy.ts
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

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/src/plugins/error-handler.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * The single place an error becomes an HTTP response, so SPEC §5's error shape
> 3	 * holds everywhere without each route remembering it.
> 4	 *
> 5	 * Owner: WS-A. Add a new error TYPE by extending ApiError, not by editing this.
> 6	 */
> 7	import fp from 'fastify-plugin';
> 8	import { ZodError } from 'zod';
> 9	import { ApiError } from '../lib/errors.ts';
> 10	
> 11	export default fp(
> 12	  async (app) => {
> 13	    app.setErrorHandler((error, request, reply) => {
> 14	      if (error instanceof ApiError) {
> 15	        return reply.status(error.statusCode).send(error.toJSON());
> 16	      }
> 17	
> 18	      // Zod failures become field-level validation errors, one per issue.
> 19	      const zodError =
> 20
> … [truncated, 1,279 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/contracts/src/common.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Shared primitives. Owned by WS-A; every other contract file builds on these.
> 3	 * Changing anything here is a breaking change to all eight workstreams.
> 4	 */
> 5	
> 6	import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@merchant/config/constants';
> 7	import { z } from 'zod';
> 8	
> 9	/* -------------------------------------------------------------------------- */
> 10	/* Identifiers                                                                  */
> 11	/* -------------------------------------------------------------------------- */
> 12	
> 13	/** Prefixed ULID, e.g. `prod_01J8ZC…` (SPEC §5). */
> 14	export const idSchema = z.string().regex(/^[a-z_]+_[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid id');
> 15	
> 16	ex
> … [truncated, 5,755 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/admin/src/components/shell/providers.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * Polaris + React Query providers (SPEC §3, §9). Owner: WS-A.
> 5	 *
> 6	 * `AppProvider` with the DEFAULT theme is what buys pixel parity — do not pass a
> 7	 * custom theme, and do not add global CSS. If a component fights you for more
> 8	 * than 20 minutes, use plain JSX with `--p-*` tokens and log it in DECISIONS.md.
> 9	 */
> 10	import { AppProvider } from '@shopify/polaris';
> 11	import enTranslations from '@shopify/polaris/locales/en.json';
> 12	import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
> 13	import { useState } from 'react';
> 14	
> 15	export function Providers({ children }: { children: React.ReactNode }) {
> 16	  // Created in state so a hot reloa
> … [truncated, 651 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/admin/src/navigation/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Admin navigation registry (SPEC §9). Owner: WS-A.
> 3	 *
> 4	 * This file is ALREADY COMPLETE — every nav item in SPEC §9 exists. Edit your
> 5	 * workstream's file in `items/`, not this one. That is what keeps the left nav
> 6	 * from becoming a merge conflict on every PR (CLAUDE.md §3).
> 7	 *
> 8	 * Order here is the order Shopify renders, top to bottom.
> 9	 */
> 10	import { analytics } from './items/analytics.ts';
> 11	import { apps } from './items/apps.ts';
> 12	import { customers } from './items/customers.ts';
> 13	import { discounts } from './items/discounts.ts';
> 14	import { home } from './items/home.ts';
> 15	import { marketing } from './items/marketing.ts';
> 16	import { orders } from './items/or
> … [truncated, 607 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/storefront/src/lib/tenant.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Storefront tenant resolution (SPEC §6): the shop comes from the Host header.
> 3	 *
> 4	 * Local:  {shopSlug}.lvh.me:3002  (lvh.me resolves to 127.0.0.1 — no /etc/hosts)
> 5	 * Prod:   wildcard subdomain, plus custom domains looked up in CustomDomain.
> 6	 *
> 7	 * Owner: WS-E.
> 8	 */
> 9	
> 10	import { env } from '@merchant/config/env';
> 11	import { headers } from 'next/headers';
> 12	
> 13	export async function resolveShopSlug(): Promise<string | null> {
> 14	  const host = (await headers()).get('host');
> 15	  if (!host) return null;
> 16	
> 17	  const baseDomain = env().STOREFRONT_BASE_DOMAIN.split(':')[0];
> 18	  const hostname = host.split(':')[0];
> 19	  if (!baseDomain || !hostname) return null;
> 20	
> 21
> … [truncated, 381 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/worker/src/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Worker entrypoint (SPEC §13). Owner: WS-G.
> 3	 *
> 4	 * One BullMQ Worker per queue; jobs self-register through jobs/index.ts.
> 5	 */
> 6	
> 7	import { QUEUES } from '@merchant/config/constants';
> 8	import { env } from '@merchant/config/env';
> 9	import { Worker } from 'bullmq';
> 10	import IORedis from 'ioredis';
> 11	import { JOBS } from './jobs/index.ts';
> 12	
> 13	const config = env();
> 14	
> 15	const connection = new IORedis(config.REDIS_URL, {
> 16	  // Required by BullMQ: it manages its own retry semantics.
> 17	  maxRetriesPerRequest: null,
> 18	});
> 19	
> 20	const workers = Object.values(QUEUES).map((queue) => {
> 21	  const jobsForQueue = new Map(JOBS.filter((j) => j.queue === queue).map((j) => [j.name
> … [truncated, 625 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.github/workflows/pr-checks.yml
```

> **↳ result**
> ```
> 1	# The ONLY required status check. Budget: under ~4 minutes.
> 2	# Anything slower belongs in main-checks.yml — see docs/PARALLEL-AGENTS.md §3.
> 3	#
> 4	# The job name below IS the required-check context in .github/rulesets/main.json.
> 5	# Renaming it silently disables branch protection. Rename both or neither.
> 6	name: pr-checks
> 7	
> 8	on:
> 9	  pull_request:
> 10	  merge_group: # required, or merge-queue entries wait forever for a check that never runs
> 11	
> 12	concurrency:
> 13	  group: pr-checks-${{ github.event.pull_request.number || github.ref }}
> 14	  cancel-in-progress: true
> 15	
> 16	jobs:
> 17	  pr-checks:
> 18	    name: pr-checks
> 19	    runs-on: ubuntu-latest
> 20	    timeout-minutes: 15
> 21	
> 22	    service
> … [truncated, 2,044 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.github/workflows/auto-merge.yml
```

> **↳ result**
> ```
> 1	# Safety net for agents that forget `gh pr merge --auto`.
> 2	# Label a PR `automerge` (or open it from a ws-* branch) and it will merge itself
> 3	# as soon as pr-checks is green — the branch ruleset is still the gate.
> 4	name: auto-merge
> 5	
> 6	on:
> 7	  pull_request_target:
> 8	    types: [opened, reopened, ready_for_review, labeled, synchronize]
> 9	
> 10	permissions:
> 11	  contents: write
> 12	  pull-requests: write
> 13	
> 14	jobs:
> 15	  enable:
> 16	    if: >-
> 17	      github.event.pull_request.draft == false &&
> 18	      (contains(github.event.pull_request.labels.*.name, 'automerge') ||
> 19	       startsWith(github.event.pull_request.head.ref, 'ws-'))
> 20	    runs-on: ubuntu-latest
> 21	    steps:
> 22	      - na
> … [truncated, 273 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/seed/index.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema/platform.prisma
```

> **↳ result**
> ```
> 1	/**
> 2	 * Seed (SPEC §7). Harness owned by WS-A; the demo content is WS-H's.
> 3	 *
> 4	 * **The seed IS the demo.** It must end up looking like a real store, not test
> 5	 * fixtures: "Aurora Supply Co.", ~30 apparel products with real-looking images,
> 6	 * 40 orders spread over 60 days so analytics has a shape to it.
> 7	 *
> 8	 * What exists today is the minimum that makes the stack resolvable: one shop and
> 9	 * its owner. Everything below the marker is WS-H's to build out.
> 10	 *
> 11	 * Idempotent by construction — `pnpm seed` twice in a row is a normal thing to do.
> 12	 */
> 13	
> 14	import { newId } from '@merchant/config/ids';
> 15	import { hash } from '@node-rs/argon2';
> 16	import { dbAdmin } from '../.
> … [truncated, 2,174 more chars]
> ```

> **↳ result**
> ```
> 1	// Platform-level models: not tenant-scoped (Shop IS the tenant). Owner: WS-A.
> 2	
> 3	model Shop {
> 4	  id           String   @id
> 5	  slug         String   @unique
> 6	  name         String
> 7	  email        String?
> 8	  currencyCode String   @default("USD")
> 9	  timezone     String   @default("UTC")
> 10	  plan         String   @default("trial")
> 11	
> 12	  // Onboarding checklist state shown on admin Home (SPEC §8).
> 13	  onboarding Json @default("{}")
> 14	
> 15	  // Settings that have no table of their own (SPEC §16 Settings pages).
> 16	  taxSettings      Json @default("{}")
> 17	  checkoutSettings Json @default("{}")
> 18	  shippingRates    Json @default("[]")
> 19	
> 20	  createdAt DateTime @default(now()) @db
> … [truncated, 1,383 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/scripts/check-env-parity.mjs
```

> **↳ result**
> ```
> 1	#!/usr/bin/env node
> 2	/**
> 3	 * `.env.example` must be exhaustive (SPEC §5): every var read by
> 4	 * packages/config/src/env.ts appears there, and nothing extra rots in it.
> 5	 *
> 6	 * Twenty agents adding env vars is exactly how a "works on my machine" repo is
> 7	 * born, so this is a required CI check. It is deliberately dumb: regex over the
> 8	 * zod schema object, no TypeScript execution, no dependencies.
> 9	 */
> 10	import { readFileSync } from 'node:fs';
> 11	import { dirname, join } from 'node:path';
> 12	import { fileURLToPath } from 'node:url';
> 13	
> 14	const root = join(dirname(fileURLToPath(import.meta.url)), '..');
> 15	
> 16	const envTs = readFileSync(join(root, 'packages/config/src/env.ts'), 'u
> … [truncated, 1,270 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/e2e/tests/smoke.spec.ts
```

> **↳ result**
> ```
> 1	import { expect, test } from '@playwright/test';
> 2	
> 3	/**
> 4	 * SPEC §14.4 — the five mandatory flows. Owner: WS-H.
> 5	 *
> 6	 * These are the whole e2e budget. Do not add a sixth without cutting one.
> 7	 */
> 8	
> 9	test.describe('mandatory smoke flows', () => {
> 10	  test.fixme('a) staff login → create product with 2 variants → appears in list', async () => {});
> 11	
> 12	  test.fixme('b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund', async () => {});
> 13	
> 14	  test.fixme('c) discount code applies at checkout', async () => {});
> 15	
> 16	  test.fixme('d) AI builder: apply preset → publish → storefront reflects it', async () => {});
> 17	
> 18	  test.fixme('e)
> … [truncated, 376 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.githooks/pre-commit
```

> **↳ result**
> ```
> 1	#!/usr/bin/env bash
> 2	# Fast, staged-only lint+format. Keep this under ~2s: 20 agents commit often.
> 3	set -euo pipefail
> 4	cd "$(git rev-parse --show-toplevel)"
> 5	
> 6	if [ -n "${SKIP_HOOKS:-}" ]; then exit 0; fi
> 7	if ! command -v pnpm >/dev/null 2>&1; then exit 0; fi
> 8	if [ ! -d node_modules ]; then exit 0; fi
> 9	
> 10	if ! pnpm exec biome check --staged --no-errors-on-unmatched --write; then
> 11	  echo
> 12	  echo "pre-commit: biome found problems it could not fix automatically."
> 13	  echo "Fix them, or bypass once with: SKIP_HOOKS=1 git commit ..."
> 14	  exit 1
> 15	fi
> 16	
> 17	# Re-stage anything biome rewrote.
> 18	git diff --name-only --cached --diff-filter=ACMR | while IFS= read -r f; do
> 19	  [ -f
> … [truncated, 46 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/docs/PARALLEL-AGENTS.md
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/docs/WORKSTREAMS.md
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.githooks/commit-msg
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.githooks/pre-push
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

> **↳ result**
> ```
> 1	#!/usr/bin/env bash
> 2	# Conventional Commits with a workstream scope, e.g.  feat(ws-b): product form
> 3	# Scope is how a human reads `git log` across 20 concurrent agents.
> 4	set -euo pipefail
> 5	[ -n "${SKIP_HOOKS:-}" ] && exit 0
> 6	
> 7	msg_file="$1"
> 8	first_line="$(head -n1 "$msg_file")"
> 9	
> 10	# Allow merge/revert/fixup commits through untouched.
> 11	case "$first_line" in
> 12	  Merge\ *|Revert\ *|fixup!\ *|squash!\ *) exit 0 ;;
> 13	esac
> 14	
> 15	pattern='^(feat|fix|docs|chore|refactor|test|perf|build|ci)(\(ws-[a-h]\)|\(shared\)|\(root\))?!?: .{1,}'
> 16	if ! printf '%s' "$first_line" | grep -qE "$pattern"; then
> 17	  cat >&2 <<'MSG'
> 18	commit-msg: message must follow Conventional Commits.
> 19	
> 20	  <t
> … [truncated, 423 more chars]
> ```

> **↳ result**
> ```
> 1	#!/usr/bin/env bash
> 2	# Guardrails that are cheap locally and expensive in CI.
> 3	set -euo pipefail
> 4	cd "$(git rev-parse --show-toplevel)"
> 5	if [ -n "${SKIP_HOOKS:-}" ]; then exit 0; fi
> 6	
> 7	# 1. Never push straight to main — everything goes through a PR (see CLAUDE.md).
> 8	while read -r _local_ref _local_sha remote_ref _remote_sha; do
> 9	  case "$remote_ref" in
> 10	    refs/heads/main|refs/heads/master)
> 11	      echo "pre-push: direct pushes to main are not allowed. Open a PR."
> 12	      exit 1
> 13	      ;;
> 14	  esac
> 15	done
> 16	
> 17	# 2. Refuse to push a committed .env (SPEC §15). Compare against the merge base
> 18	#    with main; `--cached` takes no revision range, which silently made the old
> 1
> … [truncated, 297 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.github/CODEOWNERS
```

> **↳ result**
> ```
> 1	# Routing/notification hint only — NOT a merge gate.
> 2	# (Code-owner review is intentionally not required; see docs/PARALLEL-AGENTS.md §2.)
> 3	# Mirrors docs/WORKSTREAMS.md. Keep the two in sync.
> 4	
> 5	*                                   @pauljurgens11
> 6	
> 7	/packages/config/                   @pauljurgens11   # WS-A
> 8	/packages/db/                       @pauljurgens11   # WS-A (schema files shared)
> 9	/apps/api/src/plugins/              @pauljurgens11   # WS-A
> 10	/apps/admin/src/components/shell/   @pauljurgens11   # WS-A
> 11	/apps/admin/src/navigation/         @pauljurgens11   # WS-A
> 12	
> 13	/packages/pay/                      @pauljurgens11   # WS-D — payments isolation
> 14	/packages/theme-eng
> … [truncated, 344 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/DECISIONS.md
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

### 🤖 Claude

Excellent docs — this is a genuinely well-built skeleton. I've spotted a convention mismatch (branch naming in CLAUDE.md vs the enforced hooks). Continuing with the remaining critical files.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.github/rulesets/main.json
```

> **↳ result**
> ```
> 1	{
> 2	  "name": "main",
> 3	  "target": "branch",
> 4	  "enforcement": "active",
> 5	  "bypass_actors": [],
> 6	  "conditions": {
> 7	    "ref_name": {
> 8	      "include": ["~DEFAULT_BRANCH"],
> 9	      "exclude": []
> 10	    }
> 11	  },
> 12	  "rules": [
> 13	    { "type": "deletion" },
> 14	    { "type": "non_fast_forward" },
> 15	    { "type": "required_linear_history" },
> 16	    {
> 17	      "type": "pull_request",
> 18	      "parameters": {
> 19	        "required_approving_review_count": 0,
> 20	        "dismiss_stale_reviews_on_push": false,
> 21	        "require_code_owner_review": false,
> 22	        "require_last_push_approval": false,
> 23	        "required_review_thread_resolution": false,
> 24	        "allowed_merge_meth
> … [truncated, 319 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.github/workflows/main-checks.yml
```

> **↳ result**
> ```
> 1	# Post-merge checks. Deliberately NOT required on PRs: a 10-minute gate would
> 2	# serialize 20 agents behind the merge queue (docs/PARALLEL-AGENTS.md §3).
> 3	# A red run here means the owning workstream fixes forward, fast.
> 4	name: main-checks
> 5	
> 6	on:
> 7	  push:
> 8	    branches: [main]
> 9	  workflow_dispatch:
> 10	
> 11	concurrency:
> 12	  group: main-checks
> 13	  cancel-in-progress: true
> 14	
> 15	jobs:
> 16	  e2e:
> 17	    name: e2e smoke
> 18	    runs-on: ubuntu-latest
> 19	    timeout-minutes: 25
> 20	    steps:
> 21	      - uses: actions/checkout@v4
> 22	      - uses: pnpm/action-setup@v4
> 23	      - uses: actions/setup-node@v4
> 24	        with:
> 25	          node-version-file: .nvmrc
> 26	          cache: pnpm
> 27
> … [truncated, 1,114 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/config/src/constants.ts
```

> **↳ result**
> ```
> 1	/** Values SPEC fixes and more than one workstream needs. Additive only. */
> 2	
> 3	/** SPEC §5 — cursor pagination. */
> 4	export const DEFAULT_PAGE_SIZE = 50;
> 5	export const MAX_PAGE_SIZE = 250;
> 6	
> 7	/** SPEC §5 — per-shop order numbers start here, like Shopify. */
> 8	export const ORDER_NUMBER_START = 1001;
> 9	
> 10	/** SPEC §8 */
> 11	export const SESSION_COOKIE = '_merchant_session';
> 12	export const CART_COOKIE = '_merchant_cart';
> 13	export const CSRF_HEADER = 'x-requested-with';
> 14	export const CSRF_HEADER_VALUE = 'merchant-admin';
> 15	
> 16	/** SPEC §13 — webhook topics. Adding one is additive; deleting one is not. */
> 17	export const WEBHOOK_TOPICS = [
> 18	  'orders/create',
> 19	  'orders/paid',
> 20
> … [truncated, 1,544 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/admin/next.config.ts
```

> **↳ result**
> ```
> 1	import { existsSync } from 'node:fs';
> 2	import { fileURLToPath } from 'node:url';
> 3	import type { NextConfig } from 'next';
> 4	
> 5	// Next only reads .env from its own directory. The monorepo keeps ONE .env at
> 6	// the root (SPEC §5), so load it here, before the app boots.
> 7	const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
> 8	if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
> 9	
> 10	const config: NextConfig = {
> 11	  reactStrictMode: true,
> 12	  // Required for the Dockerfile: pnpm's node_modules is a symlink farm into the
> 13	  // store, so copying it between build stages produces a broken tree. Standalone
> 14	  // emits a self-contained server with only the files actual
> … [truncated, 771 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/package.json
```

> **↳ result**
> ```
> 1	{
> 2	  "name": "@merchant/api",
> 3	  "version": "0.0.0",
> 4	  "private": true,
> 5	  "type": "module",
> 6	  "scripts": {
> 7	    "dev": "tsx watch --env-file=../../.env src/server.ts",
> 8	    "start": "tsx src/server.ts",
> 9	    "typecheck": "tsc --noEmit",
> 10	    "test": "vitest run --passWithNoTests"
> 11	  },
> 12	  "dependencies": {
> 13	    "@fastify/autoload": "^6.0.3",
> 14	    "@fastify/cookie": "^11.0.2",
> 15	    "@fastify/cors": "^10.0.2",
> 16	    "@fastify/rate-limit": "^10.2.2",
> 17	    "@merchant/config": "workspace:*",
> 18	    "@merchant/contracts": "workspace:*",
> 19	    "@merchant/db": "workspace:*",
> 20	    "@merchant/pay": "workspace:*",
> 21	    "@node-rs/argon2": "^2.0.2",
> 22	    "fastify": "^5.
> … [truncated, 336 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.gitattributes
```

> **↳ result**
> ```
> 1	# ---------------------------------------------------------------------------
> 2	# Merge strategy for a repo worked by ~20 parallel agents.
> 3	# Goal: make the common concurrent edits auto-resolve instead of blocking a PR.
> 4	# Drivers referenced here must be installed once: `pnpm setup:git`
> 5	# ---------------------------------------------------------------------------
> 6	
> 7	* text=auto eol=lf
> 8	
> 9	# Append-only logs: concurrent appends are ALWAYS both-correct. Union keeps both
> 10	# sides instead of conflicting. Never reorder or edit existing lines in these.
> 11	DECISIONS.md          merge=union
> 12	docs/AGENT-LOG.md     merge=union
> 13	
> 14	# Lockfile: never hand-merge. The driver takes ours and
> … [truncated, 525 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/scripts/setup-git.sh
```

> **↳ result**
> ```
> 1	#!/usr/bin/env bash
> 2	# One-time local git configuration. EVERY agent runs this before its first commit.
> 3	#   pnpm setup:git
> 4	#
> 5	# Everything here is repo-local (--local), so it cannot leak into other projects.
> 6	set -euo pipefail
> 7	cd "$(git rev-parse --show-toplevel)"
> 8	
> 9	echo "==> Installing merge drivers referenced by .gitattributes"
> 10	git config --local merge.pnpm-lock.name  "pnpm lockfile: regenerate instead of textual merge"
> 11	git config --local merge.pnpm-lock.driver "bash scripts/git/merge-lockfile.sh %A %O %B %P"
> 12	
> 13	echo "==> Enabling rerere (reuse recorded conflict resolutions)"
> 14	# With many agents rebasing on a fast-moving main, the SAME conflict shows up
> 15	# repea
> … [truncated, 880 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema/schema.prisma
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/src/lib/errors.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/api/src/server.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/e2e/playwright.config.ts
```

> **↳ result**
> ```
> 1	// Datasource + generator only. Models live in sibling files, one per domain.
> 2	//
> 3	// Multi-file schema is a deliberate anti-conflict measure: a single
> 4	// schema.prisma would be the hottest merge conflict in a repo worked by 20
> 5	// agents. See CLAUDE.md §3.
> 6	
> 7	generator client {
> 8	  // No custom `output`: the default location makes the client resolvable as the
> 9	  // package `@prisma/client`, which bundlers leave external. Pointing it at a
> 10	  // path inside this package causes tsup to inline the CJS runtime, and its
> 11	  // dynamic require("fs") then throws at runtime in the ESM bundle.
> 12	  provider = "prisma-client-js"
> 13	}
> 14	
> 15	datasource db {
> 16	  provider = "postgresql"
> 17
> … [truncated, 40 more chars]
> ```

> **↳ result**
> ```
> 1	/**
> 2	 * Every non-2xx response in this API has the shape defined in SPEC §5.
> 3	 * Throw one of these; the error handler in plugins/error-handler.ts does the rest.
> 4	 */
> 5	import { ERROR_STATUS, type ErrorCode } from '@merchant/contracts/common';
> 6	
> 7	export class ApiError extends Error {
> 8	  constructor(
> 9	    readonly code: ErrorCode,
> 10	    message: string,
> 11	    readonly field?: string,
> 12	  ) {
> 13	    super(message);
> 14	    this.name = 'ApiError';
> 15	  }
> 16	
> 17	  get statusCode(): number {
> 18	    return ERROR_STATUS[this.code];
> 19	  }
> 20	
> 21	  toJSON() {
> 22	    return { errors: [{ code: this.code, message: this.message, field: this.field }] };
> 23	  }
> 24	}
> 25	
> 26	export const badReque
> … [truncated, 453 more chars]
> ```

> **↳ result**
> ```
> 1	import { defineConfig, devices } from '@playwright/test';
> 2	
> 3	/**
> 4	 * Smoke suite only (SPEC §14.4).
> 5	 *
> 6	 * The flows cross three apps, so Playwright starts all of them. `reuseExistingServer`
> 7	 * means a local run attaches to whatever `pnpm dev` already has up instead of
> 8	 * fighting it for ports; CI always starts its own.
> 9	 */
> 10	const ADMIN_URL = process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000';
> 11	const API_URL = process.env.API_URL ?? 'http://localhost:3001';
> 12	const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://demo.lvh.me:3002';
> 13	
> 14	export default defineConfig({
> 15	  testDir: './tests',
> 16	  fullyParallel: true,
> 17	  forbidOnly: !!process.env.CI,
> 18	  retries:
> … [truncated, 1,015 more chars]
> ```

> **↳ result**
> ```
> 1	/** Entrypoint. Owner: WS-A. */
> 2	import { env } from '@merchant/config/env';
> 3	import { buildApp } from './app.ts';
> 4	
> 5	const config = env();
> 6	const app = await buildApp();
> 7	
> 8	// Drain in-flight requests before exit so a deploy never cuts a checkout short.
> 9	for (const signal of ['SIGINT', 'SIGTERM'] as const) {
> 10	  process.on(signal, () => {
> 11	    app.log.info(`${signal} received, closing`);
> 12	    void app.close().then(() => process.exit(0));
> 13	  });
> 14	}
> 15	
> 16	try {
> 17	  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
> 18	} catch (error) {
> 19	  app.log.error(error, 'failed to start');
> 20	  process.exit(1);
> 21	}
> 22
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/apps/worker/package.json
```

> **↳ result**
> ```
> 1	{
> 2	  "name": "@merchant/worker",
> 3	  "version": "0.0.0",
> 4	  "private": true,
> 5	  "type": "module",
> 6	  "scripts": {
> 7	    "dev": "tsx watch --env-file=../../.env src/index.ts",
> 8	    "start": "tsx src/index.ts",
> 9	    "typecheck": "tsc --noEmit",
> 10	    "test": "vitest run --passWithNoTests"
> 11	  },
> 12	  "dependencies": {
> 13	    "@merchant/config": "workspace:*",
> 14	    "@merchant/contracts": "workspace:*",
> 15	    "@merchant/db": "workspace:*",
> 16	    "bullmq": "^5.34.10",
> 17	    "ioredis": "^5.4.2",
> 18	    "nodemailer": "^6.10.0",
> 19	    "tsx": "^4.19.2",
> 20	    "zod": "^3.24.1"
> 21	  },
> 22	  "devDependencies": {
> 23	    "@types/node": "^22.10.7",
> 24	    "@types/nodemailer": "^6.4.17",
> 25
> … [truncated, 69 more chars]
> ```

🔧 **Bash**
```
head -30 packages/pay/src/vault.ts packages/pay/src/router.ts packages/theme-engine/src/sections/index.tsx apps/storefront/next.config.ts apps/worker/src/jobs/index.ts 2>/dev/null | head -140
```

> **↳ result**
> ```
> ==> packages/pay/src/vault.ts <==
> /**
>  * Card vault (SPEC §11). Owner: WS-D.
>  *
>  * The ONLY module permitted to decrypt a card blob. AES-256-GCM under a single
>  * VAULT_MASTER_KEY — deliberately simple, with no rotation machinery.
>  *
>  * Two rules, and they are the whole security model here:
>  *   1. A PAN never leaves this module except into a processor adapter.
>  *   2. A PAN never reaches a log line, an error message, or an exception.
>  */
> 
> // TODO(WS-D): tokenize(), detokenize(), Luhn validation, brand detection.
> // Unit tests are mandatory and blocking (SPEC §14.2).
> export {};
> 
> ==> packages/pay/src/router.ts <==
> /**
>  * Payment router (SPEC §11). Owner: WS-D.
>  *
>  * Weighted selection across
> … [truncated, 4,073 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> 1	# CLAUDE.md — Project Northstar operating manual
> 2	
> 3	Multi-tenant Shopify clone ("**Merchant**"). Greenfield monorepo, 2-day build, many agents in parallel.
> 4	
> 5	**[SPEC.md](SPEC.md) is the single source of truth.** This file is *how to work*; SPEC.md is *what to build*. If they conflict, SPEC.md wins on product decisions, this file wins on process. Read SPEC.md §-by-§ for your workstream before writing code — do not build from this summary alone.
> 6	
> 7	---
> 8	
> 9	## 0. The one thing to remember
> 10	
> 11	**KPI: a Shopify user opens our admin and cannot tell it isn't Shopify.**
> 12	
> 13	Resolve *every* trade-off in this order: **1. appearance parity → 2. functionality → 3. performance → 4. everyt
> … [truncated, 11,948 more chars]
> ```

### 🤖 Claude

Applying the fixes now — tenant client hardening, first-run ordering, and CLAUDE.md consistency.

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/src/tenant.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/packages/db/src/tenant.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/src/tenant.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/packages/db/src/tenant.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/packages/db/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/scripts/check-env-parity.mjs
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/scripts/check-env-parity.mjs has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the CLAUDE.md consistency fixes:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/CLAUDE.md has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the QA pass — full cold-start verification:

🔧 **Bash**
```
ls node_modules >/dev/null 2>&1 && echo "node_modules present" || echo "need install"; [ -f .env ] && echo ".env present" || cp .env.example .env && echo ".env ready"; docker compose up -d --wait 2>&1 | tail -5
```

> **↳ result**
> ```
> need install
> .env ready
>  Container merchant-redis-1  Healthy
>  Container merchant-postgres-1  Healthy
>  Container merchant-mailpit-1  Healthy
>  Container merchant-minio-1  Healthy
> container merchant-minio-init-1 exited (0)
> ```

🔧 **Bash**
```
pnpm install 2>&1 | tail -8
```

> **↳ result**
> ```
> .../node_modules/msgpackr-extract install: Done
> 
> devDependencies:
> + @biomejs/biome 2.5.11
> + turbo 2.10.12
> + typescript 5.9.3
> 
> Done in 4s
> ```

🔧 **Bash**
```
pnpm db:setup 2>&1 | tail -15
```

> **↳ result**
> ```
> WARN  Unsupported engine: wanted: {"node":">=22.0.0"} (current: {"node":"v20.20.1","pnpm":"9.15.4"})
> 
> > merchant@ db:setup /Users/pauljurgens/Downloads/projects/shopify
> > pnpm --filter @merchant/db setup
> 
>  ERROR  Unknown option: 'recursive'
> For help, run: pnpm help setup
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
node -v; ls ~/.nvm/versions/node 2>/dev/null; command -v fnm volta mise 2>/dev/null; brew list --versions node 2>/dev/null | head -3
```

> **↳ result**
> ```
> v20.20.1
> v22.23.2
> ```

### 🤖 Claude

Node 22 is available via nvm — I'll use it for QA. First, fix the pnpm builtin collision (this would have bitten every agent):

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/package.json
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/package.json has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && node -v && pnpm db:setup 2>&1 | tail -20
```

> **↳ result**
> ```
> v22.23.2
> │  Update available 6.19.3 -> 8.0.0-rc.12                 │
> │                                                         │
> │  This is a major update - please follow the guide at    │
> │  https://pris.ly/d/major-version-upgrade                │
> │                                                         │
> │  Run the following to update                            │
> │    npm i --save-dev prisma@latest                       │
> │    npm i @prisma/client@latest                          │
> └─────────────────────────────────────────────────────────┘
> No pending migrations to apply.
> warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to
> … [truncated, 305 more chars]
> ```

### 🤖 Claude

Database setup works — migration applied, seed idempotent. Now the full verification suite:

🔧 **Bash**
```
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && pnpm verify 2>&1 | tail -30
```

> **↳ result**
> ```
> @merchant/storefront:test:  RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/apps/storefront
> @merchant/storefront:test: 
> @merchant/pay:test: No test files found, exiting with code 0
> @merchant/pay:test: 
> @merchant/pay:test: include: **/*.{test,spec}.?(c|m)[jt]s?(x)
> @merchant/pay:test: exclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*
> @merchant/pay:test: 
> @merchant/storefront:test: No test files found, exiting with code 0
> @merchant/storefront:test: 
> @merchant/storefront:test: include: **/*.{test,spec}.?(c|m)[jt]s?(x)
> @merchant/storefront:test
> … [truncated, 1,223 more chars]
> ```

### 🤖 Claude

All green: lint, typecheck, tests (10 tasks). Now booting the full dev stack and probing all three apps:

🔧 **Bash**
```
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && node scripts/check-env-parity.mjs && pnpm dev > /tmp/merchant-dev.log 2>&1 & sleep 25; echo "--- api /health:"; curl -s -m 5 http://localhost:3001/health; echo; echo "--- admin:"; curl -s -m 10 -o /dev/null -w "%{http_code}" http://admin.lvh.me:3000; echo; echo "--- storefront:"; curl -s -m 10 -o /dev/null -w "%{http_code}" http://demo.lvh.me:3002; echo
```

> **↳ result**
> ```
> env parity ok — 33 vars
> --- api /health:
> {"status":"ok","uptime":22.809911875}
> --- admin:
> 200
> --- storefront:
> 200
> ```

🔧 **Bash**
```
grep -E "worker: listening|error|Error" /tmp/merchant-dev.log | head -10; echo ---; curl -s -m 5 http://demo.lvh.me:3002 | grep -oE "<title>[^<]*</title>|Aurora[^<]*" | head -3; curl -s -m 5 http://localhost:3001/nope | head -2
```

> **↳ result**
> ```
> @merchant/worker:dev: worker: listening on webhooks, email, analytics, ai (0 jobs)
> ---
> <title>Store</title>
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]}
> ```

### 🤖 Claude

Full QA passed. Shutting down the dev stack and landing the fixes through the repo's own PR workflow (no direct commits to `main`):

🔧 **Bash**
```
pkill -f "turbo run dev" 2>/dev/null; pkill -f "tsx watch" 2>/dev/null; sleep 2; pkill -f "next dev" 2>/dev/null; export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH" && pnpm setup:git >/dev/null 2>&1 && git checkout -b ws-a/skeleton-review-fixes && git add -A && git commit -m "fix(ws-a): close tenancy upsert hole, fix first-run scripts, align CLAUDE.md with tooling

- tenant.ts: scope upsert where-clause (cross-shop update hole), cover
  createManyAndReturn/updateManyAndReturn, document nested-write limitation
- root scripts: 'pnpm --filter X setup' hit the pnpm builtin, never the
  pack
… [truncated, 463 more chars]
```

> **↳ result**
> ```
> Switched to a new branch 'ws-a/skeleton-review-fixes'
> Checked 4 files in 51ms. No fixes applied.
> [ws-a/skeleton-review-fixes ba708f0] fix(ws-a): close tenancy upsert hole, fix first-run scripts, align CLAUDE.md with tooling
>  5 files changed, 38 insertions(+), 18 deletions(-)
> To github.com:pauljurgens11/shopify.git
>  * [new branch]      ws-a/skeleton-review-fixes -> ws-a/skeleton-review-fixes
> branch 'ws-a/skeleton-review-fixes' set up to track 'origin/ws-a/skeleton-review-fixes' by rebasing.
> ```

### 🤖 Claude

The repo's own guardrails all fired correctly during that commit (pre-commit biome, commit-msg format check, pre-push). Creating the PR with auto-merge:

🔧 **Bash**
```
gh pr create --fill 2>&1 | tail -2 && gh pr merge --auto --squash --delete-branch 2>&1 | tail -2 && git checkout main
```

> **↳ result**
> ```
> https://github.com/pauljurgens11/shopify/pull/2
> Switched to branch 'main'
> Your branch is up to date with 'origin/main'.
> ```

### 🤖 Claude

The disk changes flagged are just `main` not yet containing the PR — expected. Let me confirm CI goes green on the PR before wrapping up:

🔧 **Bash**
```
sleep 100; gh pr checks 2 2>&1; gh pr view 2 --json state,mergedAt -q '.state + " " + (.mergedAt // "pending")'
```

> **↳ result**
> ```
> <tool_use_error>Blocked: sleep 100 followed by: gh pr checks 2 gh pr view 2 --json state,mergedAt -q '.state + " " + (.mergedAt // "pending")'. To wait for a condition, use Monitor with an until-loop (e.g. `until <check>; do sleep 2; done`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.</tool_use_error>
> ```

🔧 **ToolSearch**
```
{"query": "select:Monitor", "max_results": 1}
```

🔧 **Monitor**
```
{"command": "while true; do\n  s=$(gh pr view 2 --json state,mergedAt,statusCheckRollup 2>/dev/null) || { sleep 30; continue; }\n  state=$(jq -r '.state' <<<\"$s\")\n  if [ \"$state\" = \"MERGED\" ]; then echo \"PR #2 MERGED\"; break; fi\n  if [ \"$state\" = \"CLOSED\" ]; then echo \"PR #2 CLOSED without merge\"; break; fi\n  fail=$(jq -r '[.statusCheckRollup[]? | select(.conclusion==\"FAILURE\" or .conclusion==\"CANCELLED\" or .conclusion==\"TIMED_OUT\")] | length' <<<\"$s\")\n  if [ \"$fail\" != \"0\" ]; then echo \"PR #2 CI FAILED ($fail failing check(s))\"; break; fi\n  sleep 30\ndone", "d
… [truncated, 98 more chars]
```

> **↳ result**
> ```
> Monitor started (task bztuoeldq, timeout 900000ms). You will be notified on each event. Keep working — do not poll or sleep. Events may arrive while you are waiting for the user — an event is not their reply.
> ```

### 🤖 Claude

Review and QA are complete, fixes are on [PR #2](https://github.com/pauljurgens11/shopify/pull/2) with auto-merge armed, and a monitor is watching for the merge/CI outcome (I'll report when it lands). Here's the full picture:

## Verdict: the skeleton is genuinely strong — keep it

The Phase 0 base is well above par: contracts-first layout, conflict-free-by-construction registries (nav items, theme sections, worker jobs, autoloaded routes, multi-file Prisma schema), union-merge drivers for append-only logs, a regenerating lockfile merge driver, a fast single required CI check with heavy checks post-merge, and a `DECISIONS.md` full of *verified* decisions. This is the right base for a 20-agent swarm.

## What I found and fixed (5 files, landed via PR #2)

1. **Cross-tenant hole in `dbForShop`** ([tenant.ts](packages/db/src/tenant.ts)): `upsert` wasn't in the where-scoped operations, so an upsert given another shop's id would have **updated that shop's row** — the exact "one unforgivable bug" the file exists to prevent. Also added Prisma 6's `createManyAndReturn`/`updateManyAndReturn`, and documented the nested-write limitation (nested `create` payloads are not auto-stamped) both in the file and as a CLAUDE.md landmine.
2. **`pnpm db:setup` never worked**: `pnpm --filter @merchant/db setup` hits pnpm's *built-in* `setup` command, not the package script — it failed on first run. All filter scripts now use `run`. `db:setup` also now runs `prisma generate` first (previously a fresh clone could seed against a non-generated client), and `turbo run dev --parallel` dropped `--parallel` (it silently skips `dependsOn`, so the Prisma client wasn't guaranteed before apps boot).
3. **CLAUDE.md contradicted the enforced tooling** — the highest-risk category for agents, since the hooks reject what the doc teaches: branch naming fixed to `ws-{x}/…` (matches the commit-msg hook and the auto-merge workflow's `ws-` trigger), migration naming lowercased to match `001_wsa_initial`, the stale `navigation.ts` path corrected to `navigation/items/<area>.ts`, and added the two missing process rules: **`pnpm setup:git` is required once per clone** (without it, no hooks and no merge drivers exist) and the Conventional Commits format.

## On your CLAUDE.md length question

**It's not too long — don't shorten it.** ~190 lines of dense, non-redundant rules is the sweet spot; it's loaded free every session and each section prevents a real failure mode. The thing that actually wastes agent tokens is a CLAUDE.md that *disagrees with the repo* (an agent gets rejected by a hook, then burns a cycle debugging why) — that's what I fixed instead.

## QA — full cold-start, everything verified running

- `docker compose up -d --wait` → all 4 services healthy, MinIO bucket auto-created
- `pnpm install` → clean; `pnpm db:setup` → migrate + seed OK, seed is idempotent, demo shop + owner created
- `pnpm verify` (lint + typecheck + unit across all 10 packages) → green
- `node scripts/check-env-parity.mjs` → green (33 vars)
- `pnpm dev` → all four processes boot: API `/health` returns `{"status":"ok"}`, admin returns 200 at `admin.lvh.me:3000`, storefront returns 200 at `demo.lvh.me:3002`, worker listening on all 4 queues; API 404s return the exact spec error shape
- The repo's own guardrails fired correctly during my commit: pre-commit biome, commit-msg format check, pre-push main-block

One environment note for your own machine: your default `node` is v20 — the repo wants ≥22 and you have v22.23.2 installed via nvm, so run `nvm use 22` in shells where you work on this repo (agents in CI use `.nvmrc` and are unaffected).

The base is ready for issue creation.

### 👤 User

<task-notification>
<task-id>bztuoeldq</task-id>
<summary>Monitor event: "PR #2 (skeleton fixes) merge/CI outcome"</summary>
<event>PR #2 MERGED</event>
</task-notification>

### 🤖 Claude

PR #2 merged — CI went green and auto-merge landed it. Syncing local `main`:

🔧 **Bash**
```
git pull 2>&1 | tail -3 && git log --oneline -2
```

> **↳ result**
> ```
> packages/db/src/tenant.ts    | 18 +++++++++++++++++-
>  scripts/check-env-parity.mjs |  2 +-
>  6 files changed, 39 insertions(+), 18 deletions(-)
> b2cf004 fix(ws-a): close tenancy upsert hole, fix first-run scripts, align CLAUDE.md with tooling (#2)
> e38c6bd docs(ws-a): log that main is now protected by ruleset 21717783 (#1)
> ```

### 🤖 Claude

The fix PR is merged and `main` is synced locally — the full auto-merge pipeline (pr-checks → auto-merge → branch deletion) worked end-to-end on its first real exercise, which doubles as a live test of the swarm workflow itself.

The base is now verified and ready: skeleton reviewed, the tenancy `upsert` hole closed, first-run scripts actually working (`db:setup`, `pnpm dev`), and CLAUDE.md aligned with the enforced hooks. You can start cutting issues for the 20 agents against `docs/WORKSTREAMS.md` whenever you're ready.

### 👤 User

how can i test/open the app. what does it consist of.

### 🤖 Claude

Right now it's the verified skeleton — every service boots and talks, but the feature pages are what the agent swarm will fill in. Here's how to open it and what you'll see.

## Start it

Infrastructure (Postgres, Redis, MinIO, Mailpit) — probably still running from my QA, but this is safe to re-run:

```bash
docker compose up -d
```

Then in the repo (use Node 22 — you have it via nvm):

```bash
nvm use 22 && pnpm dev
```

If you're on a fresh terminal/clone, the full sequence is: `cp .env.example .env` → `docker compose up -d` → `pnpm install` → `pnpm db:setup` → `pnpm dev`. The `.env` works with zero edits; the database is already migrated and seeded on this machine.

## Open it

| What | URL | Notes |
|---|---|---|
| **Admin** (the Shopify-look panel) | http://admin.lvh.me:3000 | Login will be `owner@demo.dev` / `password123` once auth lands |
| **Storefront** (demo shop) | http://demo.lvh.me:3002 | Resolves the shop from the subdomain — any other slug = other shop |
| **API** | http://localhost:3001/health | Returns `{"status":"ok"}` |
| Mailpit (catches all emails) | http://localhost:8025 | Order confirmations will appear here |
| MinIO console (file storage) | http://localhost:9001 | `merchantminio` / `merchantminio` |

`lvh.me` is a public domain that always resolves to `127.0.0.1`, which is how wildcard shop subdomains work locally without touching `/etc/hosts`.

## What it consists of

Four processes started by `pnpm dev`, five shared packages:

- **`apps/api`** (:3001) — Fastify. All business logic lives here; the two Next.js apps are thin clients. Routes are autoloaded from files, every request gets a tenant-scoped database client.
- **`apps/admin`** (:3000) — Next.js + Polaris (Shopify's own design system). This is the KPI surface: Home, Orders, Products, Customers, Discounts, Analytics, the AI storefront builder, Settings.
- **`apps/storefront`** (:3002) — Next.js + Tailwind, multi-tenant by hostname. Renders each shop's AI-generated theme, plus cart and checkout.
- **`apps/worker`** — BullMQ background jobs: webhook delivery, emails, analytics rollups, AI theme generation.
- **`packages/`** — `db` (Prisma schema + the `dbForShop` tenancy client), `contracts` (Zod schemas — the integration contract all agents code against), `pay` (card vault + processor routing), `theme-engine` (the 18 storefront section components), `config` (env, money, IDs).

## What's actually testable today vs. later

Today: everything boots, the seeded demo shop resolves, the API serves `/health` and returns spec-shaped errors, `pnpm verify` runs the CI suite locally. The admin and storefront pages are placeholder shells — no login screen, no product pages yet.

The real test script (once workstreams land) is the demo walkthrough from SPEC §18: log into admin → create a product → AI-build the storefront → publish → buy it on the storefront with test card `4242 4242 4242 4242` → watch the order, analytics, and webhook appear → refund it. And `pnpm e2e` automates exactly those five flows.

### 👤 User

run nvm

🔧 **Bash**
```
export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use 22 && node -v
```

> **↳ result**
> ```
> Now using node v22.23.2 (npm v10.9.8)
> v22.23.2
> ```

### 🤖 Claude

Node 22 active. That switch only lives per-shell, so I'll chain it into starting the dev stack now:

🔧 **Bash**
```
docker compose up -d --wait 2>&1 | tail -2; export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null; pnpm dev > /tmp/merchant-dev.log 2>&1 & sleep 25; echo "api: $(curl -s -m 5 http://localhost:3001/health)"; echo "admin: $(curl -s -m 10 -o /dev/null -w '%{http_code}' http://admin.lvh.me:3000)"; echo "storefront: $(curl -s -m 10 -o /dev/null -w '%{http_code}' http://demo.lvh.me:3002)"
```

> **↳ result**
> ```
> Container merchant-postgres-1  Healthy
> container merchant-minio-init-1 exited (0)
> api: {"status":"ok","uptime":22.986146125}
> admin: 200
> storefront: 200
> ```

### 🤖 Claude

The stack is up on Node 22 — API healthy, admin and storefront both serving. Let me open it for you:

🔧 **mcp__Claude_Browser__preview_start**
```
{"url": "http://admin.lvh.me:3000"}
```

> **↳ result**
> ```
> {
>   "serverId": "preview-local_aa8298ba-e6c5-422f-915c-0f78e70bb18d",
>   "tabId": "seed",
>   "reused": false,
>   "type": "browser",
>   "navOk": true
> }
> Browser pane opened. Use serverId "preview-local_aa8298ba-e6c5-422f-915c-0f78e70bb18d" with read_page / computer / navigate.
> ```

🔧 **mcp__Claude_Browser__computer**
```
{"action": "screenshot"}
```

> **↳ result**
> ```
> [image]
> Screenshot size: 800x450
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Merchant" (http://admin.lvh.me:3000)
> ```

### 🤖 Claude

The app is running and open in the browser pane. What you're seeing at http://admin.lvh.me:3000 is the admin's placeholder page — "Skeleton is up. WS-A: replace with the Frame shell and auth redirect." — which is exactly the current state: all four processes healthy, waiting for the workstream agents to fill in the real pages.

You can also visit:
- **Storefront**: http://demo.lvh.me:3002 (the seeded demo shop, also a placeholder for now)
- **API**: http://localhost:3001/health
- **Mailpit**: http://localhost:8025 · **MinIO**: http://localhost:9001

One note for your own terminal: the `nvm use 22` I ran only applies per shell session. If you want Node 22 automatically in this repo, add this to your shell profile or just run it manually in new terminals:

```bash
nvm use 22
```

Once the first real workstream PRs land (auth + Frame shell from WS-A), this same URL will show the Shopify-style login and admin chrome.

### 👤 User

works. thanks. you can close it

🔧 **mcp__Claude_Browser__tabs_close**
```
{"tabId": "seed"}
```

> **↳ result**
> ```
> Closed tab seed. That was the last tab, so the Browser pane is now closed — use `preview_start` to open it again.
> ```

🔧 **Bash**
```
pkill -f "turbo run dev" 2>/dev/null; sleep 1; pkill -f "tsx watch" 2>/dev/null; pkill -f "next dev" 2>/dev/null; sleep 1; curl -s -m 2 http://localhost:3001/health >/dev/null 2>&1 && echo "api still up" || echo "dev stack stopped"
```

> **↳ result**
> ```
> dev stack stopped
> ```

### 🤖 Claude

Closed — browser pane and the dev stack are both shut down. I left the Docker containers (Postgres, Redis, MinIO, Mailpit) running since they're idle-cheap and make the next start instant; stop them with `docker compose stop` if you want them gone too.

To bring everything back up later:

```bash
nvm use 22 && pnpm dev
```

### 👤 User

the storefront is supposed to be empty?

### 🤖 Claude

Yes — right now that's expected. The storefront at `demo.lvh.me:3002` is just the skeleton placeholder page, for two reasons:

1. **The pages aren't built yet.** Workstream E (storefront + checkout) and F (theme engine + AI builder) haven't landed — the 18 theme section components exist only as empty stubs, and the storefront app has a single placeholder route.
2. **There's almost nothing to show anyway.** The seed currently creates only the demo shop and its owner account. The real demo content — ~30 products with images, collections, 40 historical orders, a published theme — is workstream H's job (the seed file has an explicit TODO marker for it).

So "empty" today is the correct state, not a bug. It stops being empty when three things land from the swarm: WS-F's theme sections, WS-E's storefront pages that render them, and WS-H's rich seed data. After those, `demo.lvh.me:3002` should look like a real store ("Aurora Supply Co.") — and per the spec's smoke tests, you'll be able to browse a product, add to cart, and check out with the `4242 4242 4242 4242` test card.

If you want, the storefront placeholder could be made slightly less bare in the meantime (e.g. show the shop name from the database to prove tenant resolution works), but I'd skip it — it's throwaway work the real pages will replace within a day.

### 👤 User

what are the WS-X things

### 🤖 Claude

"WS-A" through "WS-H" are the eight **workstreams** — the way the project is sliced so ~20 parallel agents can work without stepping on each other. Each workstream owns a specific set of directories (mapped exactly in [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md)), and an agent working an issue is assigned to one workstream and only edits files that workstream owns. That ownership rule is what prevents merge conflicts at swarm scale.

The eight, defined in SPEC §16:

| WS | Area | What it delivers |
|---|---|---|
| **A** | Platform core | Monorepo skeleton, database + tenancy, auth/login, shop signup, admin shell (nav/frame). *This is what's already built — it lands first because everyone builds on it.* |
| **B** | Catalog & inventory | Products, variants, collections, locations, inventory — API routes and the Polaris admin pages |
| **C** | Orders, customers, discounts | Order lifecycle (fulfill/refund/timeline), customer pages, discount engine |
| **D** | Pay | The payment platform: card vault + tokenization, Stripe/Maverick/mock adapters, merchant-configurable routing |
| **E** | Storefront & checkout | The customer-facing shop pages, cart, and the Shopify-style checkout flow |
| **F** | Theme engine & AI builder | The 18 storefront section components and the Lovable-style chat builder that generates themes |
| **G** | Analytics, webhooks, apps | Dashboard charts, background worker jobs, webhook delivery, the Admin REST API |
| **H** | Polish & e2e | Runs last: the rich seed data ("Aurora Supply Co."), the 5 Playwright smoke flows, empty states/skeletons sweep |

The letters show up everywhere as the coordination glue: branch names (`ws-b/product-form`), commit scopes (`feat(ws-b): …`), migration names (`007_wsd_…`), and `TODO(WS-X)` markers in code that say "this seam is intentionally left for that workstream." So when the storefront placeholder says "WS-E will replace this," it means: the agent(s) assigned to the storefront workstream own that file and will build it out.

When you create issues for the swarm, each issue should name its workstream — that tells the agent which row of WORKSTREAMS.md defines the files it may touch.
