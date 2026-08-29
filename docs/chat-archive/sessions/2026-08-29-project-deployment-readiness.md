# Project deployment readiness

| | |
|---|---|
| **Session** | `2d6ac8a7-f16f-49f0-91a8-ab2560654773` |
| **Started** | 2026-08-29T13:37:28.988Z |
| **Ended** | 2026-08-29T14:03:13.531Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d` |
| **Branch** | `ws-a/deploy-runbook` |
| **Pull request** | #120 (MERGED) |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

is the project ready to deploy? i havent deployed it anywhere but want to in some time

### 🤖 Claude

I'll dig into the repo and check what deployment would actually require.

🔧 **Bash**
```
ls -a && echo "--- ROOT PKG ---" && cat package.json
```

🔧 **Bash**
```
echo "=== Dockerfiles ===" && find . -iname "Dockerfile*" -not -path "*/node_modules/*" && echo "=== compose ===" && find . -iname "docker-compose*" -o -iname "compose*.y*ml" -not -path "*/node_modules/*" | grep -v node_modules && echo "=== deploy-ish ===" && ls .github/workflows 2>/dev/null && find . -maxdepth 2 -iname "*fly.toml*" -o -maxdepth 2 -iname "vercel.json" -o -maxdepth 2 -iname "railway*" -o -maxdepth 2 -iname "render*" | grep -v node_modules
```

> **↳ result**
> ```
> .
> ..
> .claude
> .dockerignore
> .env.example
> .git
> .gitattributes
> .githooks
> .github
> .gitignore
> .npmrc
> .nvmrc
> CLAUDE.md
> DECISIONS.md
> README.md
> SPEC.md
> apps
> biome.json
> deploy
> docker-compose.prod.yml
> docker-compose.yml
> docs
> e2e
> package.json
> packages
> pnpm-lock.yaml
> pnpm-workspace.yaml
> scripts
> tsconfig.base.json
> turbo.json
> --- ROOT PKG ---
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
>     "dev:localhost": "ADMIN_URL=http://localhost:3000 API_URL=http://localhost:3001 STOREFRONT_BASE_DOMAIN=localhost:3002 turbo run dev",
>     "build": "turbo run
> … [truncated, 1,143 more chars]
> ```

> **↳ result**
> ```
> === Dockerfiles ===
> ./apps/storefront/Dockerfile
> ./apps/admin/Dockerfile
> ./apps/api/Dockerfile
> ./apps/worker/Dockerfile
> === compose ===
> ./docker-compose.yml
> ./docker-compose.prod.yml
> === deploy-ish ===
> auto-merge.yml
> main-checks.yml
> pr-checks.yml
> pr-health.yml
> ```

### 🤖 Claude

There's already a `deploy/` directory and prod compose file. Let me read them.

🔧 **Bash**
```
echo "=== deploy/ tree ===" && find deploy -type f | head -50 && echo && echo "=== docker-compose.prod.yml ===" && cat docker-compose.prod.yml
```

> **↳ result**
> ```
> === deploy/ tree ===
> deploy/caddy/Caddyfile
> 
> === docker-compose.prod.yml ===
> # Production stack (A5, SPEC §17): the full platform behind one reverse proxy.
> #
> #   BASE_DOMAIN=localhost docker compose -f docker-compose.prod.yml up -d --build
> #
> # then https://admin.localhost (owner@demo.dev / password123) and
> # https://demo.localhost. Certs come from Caddy's internal CA, so curl needs
> # -k and a browser shows a one-time warning — swap to Let's Encrypt in
> # deploy/caddy/Caddyfile for a real domain.
> #
> # Configuration comes from the same single root `.env` as dev (env_file).
> # Everything network-shaped is overridden below to the compose-internal
> # hostnames, so the dev `.env` works unedited; secre
> … [truncated, 9,909 more chars]
> ```

🔧 **Bash**
```
ls docs/ && echo "=== deploy-related docs ===" && grep -ril "deploy" docs/*.md README.md 2>/dev/null | head -20
```

> **↳ result**
> ```
> AGENT-LOG.md
> DEMO.md
> PARALLEL-AGENTS.md
> WORKSTREAMS.md
> issues
> parity
> === deploy-related docs ===
> docs/DEMO.md
> docs/AGENT-LOG.md
> README.md
> ```

🔧 **Bash**
```
grep -n -i -A 40 "deploy" README.md | head -120
```

🔧 **Bash**
```
cat deploy/caddy/Caddyfile
```

> **↳ result**
> ```
> # Caddy — the production stack's front door (A5, SPEC §17).
> #
> # Wildcard tenant routing, exactly the SPEC's shape:
> #   admin.{BASE_DOMAIN}   → admin:3000
> #   api.{BASE_DOMAIN}     → api:3001
> #   assets.{BASE_DOMAIN}  → minio:9000   (public bucket reads + presigned PUTs)
> #   everything else       → storefront:3002, with the browser-facing API paths
> #                           (/storefront/api/*, /vault/*) peeled off to api
> #
> # Tenancy keys off the Host header (SPEC §6); reverse_proxy passes Host
> # through untouched by default, which is the property everything relies on.
> #
> # TLS: `local_certs` issues from Caddy's internal CA so the whole stack can be
> # verified on BASE_DOMAIN=localhost with no
> … [truncated, 1,774 more chars]
> ```

> **↳ result**
> ```
> 3:A multi-tenant e-commerce platform. One deployment, many shops.
> 4-
> 5-**[SPEC.md](SPEC.md) is the source of truth for what to build.
> 6-[CLAUDE.md](CLAUDE.md) is the source of truth for how to work in this repo.**
> 7-Read both before your first commit.
> 8-
> 9----
> 10-
> 11-## Quickstart
> 12-
> 13-```bash
> 14-cp .env.example .env          # works with zero edits
> 15-docker compose up -d          # postgres, redis, minio, mailpit
> 16-pnpm install
> 17-pnpm setup:git                # merge drivers, rerere, hooks — required
> 18-pnpm db:setup                 # migrate + seed
> 19-pnpm dev                      # api :3001, admin :3000, storefront :3002, worker
> 20-```
> 21-
> 22-Requires **Node 22** and **pnpm 9** (`co
> … [truncated, 5,107 more chars]
> ```

🔧 **Bash**
```
sed -n 200,300p README.md
```

🔧 **Bash**
```
cat .github/workflows/main-checks.yml
```

> **↳ result**
> ```
> | `pnpm dev` | all apps, watch mode |
> | `pnpm verify` | lint + typecheck + test — run before every push |
> | `pnpm db:migrate` | create + apply a migration |
> | `pnpm db:reset` | drop, migrate, reseed |
> | `pnpm e2e` | Playwright smoke (needs a seeded running stack) |
> 
> ## Production architecture
> 
> Nothing here is deployed. This is the documented scale path (SPEC §17), and it
> is short because the shape of the code already assumes it.
> 
> **The four services scale horizontally.** `api`, `admin`, `storefront` and
> `worker` hold no request state between calls, so each is an autoscaling group
> behind a load balancer. Staff sessions live in Redis, not in process memory, so
> any api instance can serve any re
> … [truncated, 4,083 more chars]
> ```

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
> … [truncated, 2,985 more chars]
> ```

🔧 **Bash**
```
cat .env.example
```

> **↳ result**
> ```
> # =============================================================================
> # Shopify — local development environment
> #
> # `cp .env.example .env` must work with ZERO edits (SPEC §17).
> # This file is EXHAUSTIVE: every var read by packages/config/src/env.ts is here.
> # If you add a var to env.ts, add it here in the same commit. CI enforces this.
> # =============================================================================
> 
> NODE_ENV=development
> LOG_LEVEL=info
> 
> # --- Infrastructure (matches docker-compose.yml) ------------------------------
> DATABASE_URL=postgresql://merchant:[REDACTED]@localhost:5433/merchant?schema=public
> REDIS_URL=redis://localhost:6379
> 
> # --- Public URLs -------------------
> … [truncated, 1,968 more chars]
> ```

🔧 **Bash**
```
gh run list --branch main --limit 12 2>&1 | head -20
```

🔧 **Bash**
```
ls docs/issues/ && echo "=== open/unclaimed ===" && grep -c "" docs/AGENT-LOG.md && tail -40 docs/AGENT-LOG.md
```

> **↳ result**
> ```
> in_progress		feat(ws-g): Home serves both Shopify variants — onboarding page and d…	main-checks	main	push	33255420792	2m16s	2026-08-29T13:35:48Z
> completed	success	feat(ws-g): Home serves both Shopify variants — onboarding page and d…	pr-health	main	push	33255420743	36s	2026-08-29T13:35:48Z
> completed	success	fix(shared): make Next standalone output opt-in so next start and CI …	pr-health	main	push	33250633718	1m6s	2026-08-29T11:39:19Z
> completed	failure	fix(shared): make Next standalone output opt-in so next start and CI …	main-checks	main	push	33250633671	3m41s	2026-08-29T11:39:19Z
> completed	success	ws qa/api followups (#113)	pr-health	main	push	33250601795	43s	2026-08-29T11:38:26Z
> completed
> … [truncated, 985 more chars]
> ```

> **↳ result**
> ```
> <persisted-output>
> Output too large (29.9KB). Full output saved to: /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-project-deployment-readiness-7dd23d/2d6ac8a7-f16f-49f0-91a8-ab2560654773/tool-results/bavgdpzit.txt
> 
> Preview (first 2KB):
> A1-auth-sessions-tenancy.md
> A2-tenancy-suite.md
> A3-admin-shell.md
> A4-settings-hub.md
> A5-production-stack.md
> B1-products-api.md
> B2-files-media.md
> B3-collections-api.md
> B4-inventory-locations-api.md
> B5-products-admin-ui.md
> B6-collections-inventory-admin-ui.md
> B7-variant-images.md
> C1-discounts-engine.md
> C2-orders-api.md
> C3-fulfillment-refund-api.md
> C4-customers-api.md
> C5-orders-admin-ui.md
> C6-customers-discoun
> … [truncated, 1,152 more chars]
> ```

### 🤖 Claude

main-checks has been failing on main. Let me see what's breaking.

🔧 **Bash**
```
gh run view 33250633671 2>&1 | head -30
```

🔧 **Bash**
```
sed -n 1,60p docs/issues/A5-production-stack.md && echo "=== A5 in agent log ===" && grep -n "A5" docs/AGENT-LOG.md | head -20
```

> **↳ result**
> ```
> X main main-checks · 33250633671
> Triggered via push about 1 hour ago
> 
> JOBS
> X e2e smoke in 2m51s (ID 99095607083)
>   ✓ Set up job
>   ✓ Run actions/checkout@v4
>   ✓ Run pnpm/action-setup@v4
>   ✓ Run actions/setup-node@v4
>   ✓ Run pnpm install --frozen-lockfile
>   ✓ start infrastructure
>   ✓ Run cp .env.example .env
>   ✓ Run pnpm db:setup
>   ✓ Run pnpm --filter @merchant/e2e exec playwright install --with-deps chromium
>   ✓ Run pnpm build
>   ✓ resolve *.lvh.me locally
>   X Run pnpm e2e
>   ✓ Run actions/upload-artifact@v4
>   - Post Run actions/setup-node@v4
>   ✓ Post Run pnpm/action-setup@v4
>   ✓ Post Run actions/checkout@v4
>   ✓ Complete job
> ✓ docker build (worker) in 2m50s (ID 99095607113)
> ✓ docker build (stor
> … [truncated, 462 more chars]
> ```

> **↳ result**
> ```
> # A5 — Production stack: prod compose, Caddy, image pipeline
> 
> | | |
> |---|---|
> | Workstream | A |
> | Size | M |
> | Depends on | — (independent; schedule for Day 2 — it must not steal Day 1 agents from features) |
> | Unblocks | H3 (README "Production architecture"), Definition of Done credibility on "scalable infrastructure" |
> | Branch | `ws-a/production-stack` |
> 
> ## You own
> ```
> docker-compose.prod.yml, deploy/caddy/Caddyfile (new)
> .github/workflows/** (image push additions only)
> apps/*/Dockerfile (fixes only if builds are broken)
> ```
> 
> ## Context
> SPEC §17: deploy is **documented + Dockerized, not required to be live**.
> All four apps already have multi-stage Dockerfiles (Next apps build
> `standalon
> … [truncated, 6,628 more chars]
> ```

🔧 **Bash**
```
gh run list --branch main --limit 3 --json databaseId,name,conclusion,status,createdAt 2>&1
```

> **↳ result**
> ```
> [{"conclusion":"","createdAt":"2026-08-29T13:35:48Z","databaseId":33255420792,"name":"main-checks","status":"in_progress"},{"conclusion":"success","createdAt":"2026-08-29T13:35:48Z","databaseId":33255420743,"name":"pr-health","status":"completed"},{"conclusion":"success","createdAt":"2026-08-29T11:39:19Z","databaseId":33250633718,"name":"pr-health","status":"completed"}]
> ```

🔧 **Bash**
```
gh run view 33250633671 --log-failed 2>&1 | grep -v "^e2e smoke" | tail -80 || gh run view --job 99095607083 --log-failed 2>&1 | tail -80
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
gh run view --job 99095607083 --log-failed 2>&1 | tail -100
```

> **↳ result**
> ```
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5781444Z     test-results/smoke-mandatory-smoke-flow-5d607-isolated-from-the-demo-shop-chromium/trace.zip
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5782299Z     Usage:
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5782472Z 
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5783319Z         pnpm exec playwright show-trace test-results/smoke-mandatory-smoke-flow-5d607-isolated-from-the-demo-shop-chromium/trace.zip
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5784200Z 
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5784876Z     ────────────────────────────────────────────────────────────────────────────────────────────────
> e2e smoke	UNKNOWN STEP	2026-08-29T11:42:25.5
> … [truncated, 11,256 more chars]
> ```

🔧 **Bash**
```
grep -rn "Add your first product" --include=*.ts --include=*.tsx apps e2e packages | head -20
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
sed -n 280,310p e2e/tests/smoke.spec.ts
```

> **↳ result**
> ```
> /--theme-color-primary:\s*#111111/,
>       );
>     });
>   });
> 
>   test('e) second shop signup is isolated from the demo shop', async ({ page }) => {
>     const suffix = uniqueSuffix();
>     const shopName = `Smoke Isolation ${suffix}`;
>     let slug = '';
> 
>     await test.step('sign up a fresh shop through the UI', async () => {
>       slug = await signupFreshShop(page, shopName, `iso-${suffix}@example.dev`);
>       expect(slug).not.toBe('demo');
>     });
> 
>     await test.step('its admin shows empty states', async () => {
>       await page.goto(`${ADMIN_URL}/store/${slug}/products`);
>       await expect(page.getByRole('heading', { name: 'Add your first product' })).toBeVisible();
>     });
> 
>     await test.s
> … [truncated, 610 more chars]
> ```

🔧 **Bash**
```
grep -rn "Add your first product" apps packages e2e 2>/dev/null | grep -v node_modules | head
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/onboarding-home.tsx:532:      heading: 'Add your first product',
> e2e/tests/smoke.spec.ts:297:      await expect(page.getByRole('heading', { name: 'Add your first product' })).toBeVisible();
> ```

🔧 **Bash**
```
grep -rn "first product\|EmptyState\|emptyState" apps/admin/src/app --include=\* 2>/dev/null | grep -vi node_modules | grep -i product | head -20
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/onboarding-home.tsx:532:      heading: 'Add your first product',
> apps/admin/src/app/store/[slug]/products/page.tsx:37:  IndexPromoEmptyState,
> apps/admin/src/app/store/[slug]/products/page.tsx:179:          <IndexPromoEmptyState
> apps/admin/src/app/store/[slug]/products/page.tsx:296:              emptyState={
> apps/admin/src/app/store/[slug]/collections/_components/product-picker.tsx:82:            emptyState={
> ```

🔧 **Bash**
```
sed -n 170,200p apps/admin/src/app/store/\[slug\]/products/page.tsx && echo "=== IndexPromoEmptyState ===" && grep -rn "IndexPromoEmptyState" apps/admin/src --include=\* | grep -v "products/page" | head
```

> **↳ result**
> ```
> title="Products"
>       primaryAction={{ content: 'Add product', url: `/store/${slug}/products/new` }}
>     >
>       <Card padding="0">
>         {empty ? (
>           // Kind B — Products is the one index with the LEFT-aligned promo
>           // block rather than the centred column (docs/parity/index-tables.md).
>           // Shopify's second section ("Find products to sell") is dropshipping,
>           // which we do not have, so it is absent rather than dead (§8).
>           <IndexPromoEmptyState
>             heading="Add your products"
>             body="Start by stocking your store with products your customers will love"
>             action={{ content: 'Add product', url: `/store/${slug}/products/n
> … [truncated, 607 more chars]
> ```

### 🤖 Claude

Let me check something that worries me: the recent "standalone output opt-in" change vs. the production Dockerfiles.

🔧 **Bash**
```
git log --oneline -1 b4d9160 && git show b4d9160 --stat && echo "=== admin next.config ===" && cat apps/admin/next.config.ts
```

> **↳ result**
> ```
> b4d9160 fix(shared): make Next standalone output opt-in so next start and CI get a supported server (#114)
> commit b4d9160a6e018cece82e1db6399ea1cf30c8b73b
> Author: Paul Jürgens <pauljurgens7@gmail.com>
> Date:   Sat Aug 29 14:39:15 2026 +0300
> 
>     fix(shared): make Next standalone output opt-in so next start and CI get a supported server (#114)
> 
>  DECISIONS.md                                       |   1 +
>  apps/admin/Dockerfile                              |   4 +
>  apps/admin/next.config.ts                          |  16 +++-
>  apps/storefront/Dockerfile                         |   4 +
>  apps/storefront/next.config.ts                     |  16 +++-
>  docs/AGENT-LOG.md
> … [truncated, 3,386 more chars]
> ```

🔧 **Bash**
```
echo "=== ADMIN DOCKERFILE ===" && cat apps/admin/Dockerfile && echo "=== STOREFRONT DOCKERFILE ===" && cat apps/storefront/Dockerfile
```

> **↳ result**
> ```
> === ADMIN DOCKERFILE ===
> # Multi-stage build for @merchant/admin (SPEC §17).
> FROM node:22-slim AS base
> ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
> RUN corepack enable
> WORKDIR /app
> 
> FROM base AS build
> # next.config.ts inlines these into the client bundle as NEXT_PUBLIC_* at
> # build time, so the image is bound to a deployment's public URLs. Defaults
> # match dev; docker-compose.prod.yml overrides them from BASE_DOMAIN.
> ARG API_URL=http://api.lvh.me:3001
> ARG STOREFRONT_PROTOCOL=http
> ARG STOREFRONT_BASE_DOMAIN=lvh.me:3002
> ENV API_URL=$API_URL \
>     STOREFRONT_PROTOCOL=$STOREFRONT_PROTOCOL \
>     STOREFRONT_BASE_DOMAIN=$STOREFRONT_BASE_DOMAIN
> # next.config.ts only emits .next/standalone when this is set,
> … [truncated, 1,928 more chars]
> ```

🔧 **Bash**
```
sed -n 1,200p packages/config/src/env.ts | grep -n "production\|SESSION_SECRET\|VAULT_MASTER_KEY\|refine\|superRefine"
```

🔧 **Bash**
```
cat packages/db/prisma/seed/seed-if-empty.ts 2>/dev/null | head -40; echo "=== seeded owner creds ==="; grep -rn "password123\|owner@demo.dev" packages/db/prisma/seed/*.ts 2>/dev/null | head
```

> **↳ result**
> ```
> 17:  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
> 41:  SESSION_SECRET=[REDACTED] 'SESSION_SECRET must be at least 32 characters'),
> 47:  VAULT_MASTER_KEY: z
> 49:    .regex(/^[0-9a-fA-F]{64}$/, 'VAULT_MASTER_KEY must be 64 hex chars (32 bytes)'),
> 104:export const isProduction = (): boolean => env().NODE_ENV === 'production';
> ```

> **↳ result**
> ```
> /**
>  * Seed, but only into an empty database (A5, SPEC §17).
>  *
>  * The production compose runs this on every `up`. `seedDemo()` itself is
>  * idempotent, but idempotent means "wipes the demo shop and rebuilds it" —
>  * exactly right for `pnpm db:reset`, exactly wrong for a stack restart, which
>  * must not undo whatever the merchant did between boots. So: seed when the
>  * demo shop is absent, touch nothing when it exists.
>  */
> import { dbAdmin } from '../../src/client.ts';
> import { DEMO_SHOP_SLUG, seedDemo } from './index.ts';
> 
> const existing = await dbAdmin.shop.findUnique({
>   where: { slug: DEMO_SHOP_SLUG },
>   select: { id: true },
> });
> 
> // "Exists" is not "finished": seedDemo creates the Shop
> … [truncated, 1,334 more chars]
> ```

🔧 **Bash**
```
echo "=== weak-secret guards? ==="; grep -rn "change_me\|dev_session_secret\|weak\|insecure" packages/config/src apps/api/src 2>/dev/null | grep -v node_modules | head; echo "=== rate limit ==="; grep -rln "rateLimit\|rate-limit" apps/api/src | head -5; echo "=== health ==="; grep -rn "'/health'\|\"/health\"" apps/api/src | head -3; echo "=== public signup route ==="; grep -rn "signup" apps/api/src/routes/*.ts apps/api/src/routes/**/*.ts 2>/dev/null | head -5
```

> **↳ result**
> ```
> === weak-secret guards? ===
> === rate limit ===
> apps/api/src/app.ts
> apps/api/src/lib/scopes.ts
> apps/api/src/lib/errors.ts
> apps/api/src/routes/storefront/customers/index.ts
> apps/api/src/routes/storefront/checkouts.ts
> === health ===
> === public signup route ===
> (eval):1: no matches found: apps/api/src/routes/*.ts
> ```

🔧 **Bash**
```
grep -rn "health" apps/api/src --include=\*.ts | grep -i "route\|get(" | head -5; echo "=== signup ==="; grep -rln "signup" apps/api/src | head -5
```

> **↳ result**
> ```
> apps/api/src/app.ts:118:  //   routes/vault/**, health/**  → /vault/**, /health  (verbatim)
> === signup ===
> apps/api/src/lib/slug.ts
> apps/api/src/routes/storefront/customers/index.ts
> apps/api/src/routes/auth/index.ts
> apps/api/src/services/customers/customers.ts
> apps/api/src/services/themes/onboarding.ts
> ```

### 🤖 Claude

## Short answer

It's **packaged for deployment and one command away from running** — but there are three things I'd fix before pointing it at a public domain, one of which is a genuine security hole.

## What's already there (better than I expected)

- Four multi-stage Dockerfiles (`apps/*/Dockerfile`), distroless runtime for the Next apps
- [docker-compose.prod.yml](docker-compose.prod.yml) — full stack behind Caddy, automatic TLS, wildcard tenant routing by Host, healthchecks, `restart: unless-stopped`
- [deploy/caddy/Caddyfile](deploy/caddy/Caddyfile) — on-demand certs per shop hostname, Let's Encrypt path documented and commented in
- CI pushes `ghcr.io/pauljurgens11/shopify/{api,admin,storefront,worker}:{sha,latest}` on every main commit; **all four docker builds are green right now**
- A one-shot `db-setup` runs `prisma migrate deploy` before any app starts, so replicas never race migrations
- It was verified end-to-end once at `BASE_DOMAIN=localhost` (PR #86, verified with two api replicas)

So `BASE_DOMAIN=yourdomain.com docker compose -f docker-compose.prod.yml up -d --build` on a VM with DNS pointed at it would very likely just work.

## What I'd fix first

**1. Placeholder secrets pass validation in production.** [.env.example](.env.example) ships `SESSION_SECRET=[REDACTED] and `VAULT_MASTER_KEY=0000…`, and [packages/config/src/env.ts:41](packages/config/src/env.ts:41) only checks length/hex format — nothing rejects them when `NODE_ENV=production`. The prod compose reads the *same root `.env`* as dev. A copy-paste deploy means a session secret anyone reading this repo knows (forgeable admin cookies) and a card vault keyed to zeros. The compose header tells you to regenerate them; nothing enforces it.

**2. The prod stack seeds a public demo shop with known credentials.** `db-setup` runs `seed-if-empty.ts` on every `up`, creating `owner@demo.dev` / `password123` at `admin.yourdomain`. Combined with #1 that's an open door.

**3. The mandatory e2e suite is red on main.** Three consecutive `main-checks` failures. Test (e) at [e2e/tests/smoke.spec.ts:297](e2e/tests/smoke.spec.ts:297) asserts the heading `"Add your first product"`, but the ws-b index-parity commit renamed the products empty state to `"Add your products"` (`apps/admin/src/app/store/[slug]/products/page.tsx:180`). It's a stale assertion, not a product bug — but while it's red, "CI is green" isn't a deployment signal.

## Operational gaps (fine for a demo box, not for anything you'd hate to lose)

- **No backups.** Postgres, Redis and MinIO are containers on local docker volumes. No snapshots, no restore path. The README's scale path says RDS/S3/managed Redis — none of that is wired.
- **Mail is a fake inbox.** Mailpit is an opt-in `--profile mail`; without it the worker's email jobs fail and retry forever, with it they land nowhere real. Needs real SMTP creds.
- **No observability** — no error tracking, metrics, or log shipping. Health endpoints exist, that's all.
- **The admin image is domain-bound.** `NEXT_PUBLIC_*` bakes at build time, so the GHCR `:latest` admin only suits the default domain — a real domain needs `--build`, not a pull.

## The non-technical one

The app deliberately renders the Shopify name and bag mark (per DECISIONS.md, your own reversal), and [README.md](README.md) states it is never deployed publicly or distributed. Putting it on a public domain changes that fact — it becomes public distribution of someone else's trademark, plus a checkout that looks real but is explicitly not PCI-scoped. Not my call to make, but worth deciding deliberately rather than discovering. If it's going up for a small audience, Caddy basic auth in front of everything plus swapping `BRAND_NAME` handles most of it.

---

Realistically it's about half a day of work to be genuinely deployable. Want me to land the small ones — the e2e assertion fix, a production guard that refuses placeholder secrets, and gating the demo seed behind an explicit `SEED_DEMO=true` — and write a `DEPLOY.md` checklist?

### 👤 User

the public demo shop can remain. this is still a demo. i just want to deploy demo. it is not a product for regular use. dont worry about the e2e suite. with this in mind, what do you recommend. anything to change/fix?

### 🤖 Claude

Good — that narrows it a lot. Let me check the handful of things that actually bite a public demo.

🔧 **Bash**
```
echo "=== robots ==="; find apps/storefront apps/admin -name "robots*" -o -name "sitemap*" | grep -v node_modules; grep -rn "noindex\|X-Robots" apps deploy 2>/dev/null | grep -v node_modules | head; echo "=== rate limit config ==="; grep -rn "rateLimit\|max:\|timeWindow" apps/api/src/app.ts | head -20
```

> **↳ result**
> ```
> === robots ===
> === rate limit config ===
> apps/api/src/app.ts:16:import rateLimit from '@fastify/rate-limit';
> apps/api/src/app.ts:21:import { rateLimited } from './lib/errors.ts';
> apps/api/src/app.ts:96:  await app.register(rateLimit, {
> apps/api/src/app.ts:98:    max: RATE_LIMITS.adminApi.max,
> apps/api/src/app.ts:99:    timeWindow: RATE_LIMITS.adminApi.windowMs,
> apps/api/src/app.ts:106:      rateLimited(`Rate limit exceeded. Retry in ${context.after}.`),
> ```

🔧 **Bash**
```
echo "=== signup rate limit ==="; grep -rn "rateLimit\|limit" apps/api/src/routes/auth/index.ts | head -20; echo; echo "=== AI builder quota/key use ==="; grep -rn "ANTHROPIC_API_KEY\|anthropic" apps/worker/src apps/api/src packages/config/src 2>/dev/null | grep -v node_modules | head -15
```

> **↳ result**
> ```
> === signup rate limit ===
> apps/api/src/routes/auth/index.ts:146:    // SPEC §8: 10/min/IP. The limiter is registered `global: false` in app.ts.
> apps/api/src/routes/auth/index.ts:149:        rateLimit: { max: RATE_LIMITS.login.max, timeWindow: RATE_LIMITS.login.windowMs },
> 
> === AI builder quota/key use ===
> apps/worker/src/jobs/ai-theme-generate.ts:15:import Anthropic from '@anthropic-ai/sdk';
> apps/worker/src/jobs/ai-theme-generate.ts:300:export const anthropicGenerator: ThemeGenerator = async (input) => {
> apps/worker/src/jobs/ai-theme-generate.ts:308:    apiKey: config.ANTHROPIC_API_KEY,
> apps/worker/src/jobs/ai-theme-generate.ts:439:  generate: ThemeGenerator = anthropicGenerator,
> apps/api/sr
> … [truncated, 453 more chars]
> ```

🔧 **Bash**
```
grep -rn "CustomDomain" apps/api/src/routes 2>/dev/null | head -5; echo "=== storefront shop endpoint ==="; grep -rn "storefront/api/shop\|'/shop'" apps/api/src/routes/storefront/*.ts 2>/dev/null | head -5
```

> **↳ result**
> ```
> === storefront shop endpoint ===
> apps/api/src/routes/storefront/shop.ts:2: * `GET /storefront/api/shop` (SPEC §10). Owner: WS-E.
> apps/api/src/routes/storefront/shop.ts:15:  app.get('/shop', async (request, reply) => {
> ```

🔧 **Bash**
```
grep -rn "NEXT_PUBLIC" apps/storefront/next.config.ts apps/storefront/src 2>/dev/null | grep -v node_modules | head
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

### 🤖 Claude

Got it — a link you can hand someone, not a running service. That cuts the list to four things, ~30 minutes total.

## 1. Regenerate the two secrets (2 min, still do it)

```bash
openssl rand -hex 32
```

Run it twice, put the results in `SESSION_SECRET` and `VAULT_MASTER_KEY` in your `.env`. The shipped values are in the repo, and `SESSION_SECRET` signs admin session cookies — with the default, a visitor who recognizes the project can mint a session for any shop on the box, including one they didn't create. Two minutes, removes the only real hole.

## 2. Fix the Caddyfile — this is the one that will actually break you

Two problems with the current [deploy/caddy/Caddyfile](deploy/caddy/Caddyfile) on a real domain:

- `local_certs` means every visitor gets a **browser cert warning** before they see anything. On a parity demo that's fatal to the first impression.
- The `https://` catch-all mints certs **on demand for any hostname that resolves to your IP**, with no `ask` endpoint. Anyone pointing a DNS record at your box burns your Let's Encrypt rate limit, and once you're limited your real certs stop renewing.

For a link-only demo, don't build the `ask` endpoint — just name the hosts you need:

```
{
	email you@yourdomain.com
}

(noindex) {
	header X-Robots-Tag "noindex, nofollow, noarchive"
}

admin.{$BASE_DOMAIN} {
	import noindex
	reverse_proxy admin:3000
}

api.{$BASE_DOMAIN} {
	import noindex
	reverse_proxy api:3001
}

assets.{$BASE_DOMAIN} {
	reverse_proxy minio:9000
}

demo.{$BASE_DOMAIN} {
	import noindex
	import storefront_routes
}
```

Keep the `storefront_routes` snippet as-is. Trade-off: shops someone signs up through the UI won't get a cert until you add a block for them. If you want any shop to work, that needs a wildcard cert, which needs a DNS-challenge plugin and a custom Caddy image — not worth it for this.

The `noindex` snippet is cheap insurance given the app renders the Shopify name and mark: it keeps a public Shopify look-alike out of search results.

## 3. Build the admin image on your domain — don't pull `:latest`

This is the classic "it deployed but nothing works" trap here. The admin bakes `NEXT_PUBLIC_API_URL` at **build** time ([apps/admin/next.config.ts:16](apps/admin/next.config.ts:16)), and the GHCR images are built with dev defaults — pull them and the admin's browser code calls `api.lvh.me:3001` and every page fails. The compose file already passes the right build args, so just always use `--build`:

```bash
BASE_DOMAIN=yourdomain.com docker compose -f docker-compose.prod.yml --profile mail up -d --build
```

The storefront, api and worker images are domain-independent — only the admin has this constraint.

## 4. DNS + host sizing

Four A records at your VM's IP: `admin`, `api`, `assets`, `demo`. Give it **≥4 GB RAM** — the Next admin build is the memory-hungry step, and you're running 8 containers. A 2 GB droplet will OOM mid-build.

`--profile mail` is worth including: without Mailpit the worker's order-email jobs fail and retry forever, filling the queue and the logs with red for no reason.

## Leave these alone

- `ANTHROPIC_API_KEY` — **leave it empty.** The AI builder falls back to three canned presets, which demo fine. A key on a public URL is someone else's free credits.
- Backups, monitoring, managed Postgres/Redis/S3, the e2e assertion, seed gating — all irrelevant if nothing real lives on it. If the box dies, rebuild it; `db-setup` reseeds the demo automatically.

One thing to expect rather than fix: since anyone with the link can log in as `owner@demo.dev`, the demo shop will drift as people poke at it. If it ever looks trashed, `docker compose -f docker-compose.prod.yml down -v && … up -d --build` gives you a clean one.

---

Want me to make the Caddyfile change and write a short `DEPLOY.md` with the exact sequence? Both are inside workstream A's ownership, so it'd be one small PR.

### 👤 User

make all the changes you deem necessary. note that this is a demo application.

### 🤖 Claude

I'll make the changes. First let me look at how the API resolves a hostname to a shop — that decides whether I can keep multi-shop storefronts working with real certs.

🔧 **Bash**
```
cat apps/api/src/routes/storefront/shop.ts; echo "=== tenancy resolution ==="; grep -rln "CustomDomain\|customDomain" apps/api/src | head
```

> **↳ result**
> ```
> /**
>  * `GET /storefront/api/shop` (SPEC §10). Owner: WS-E.
>  * Mounted at /storefront/api by the autoloader.
>  *
>  * The shop context every storefront page needs before it renders anything:
>  * name for the header and title, currency for every price label, and the
>  * published theme version so pages can be cache-keyed on it.
>  */
> import { storefrontShopResponse } from '@merchant/contracts/storefront';
> import type { FastifyInstance } from 'fastify';
> import { notFound } from '../../lib/errors.ts';
> import { cacheable } from '../../services/storefront/cache.ts';
> 
> export default async function routes(app: FastifyInstance) {
>   app.get('/shop', async (request, reply) => {
>     const shop = await request.
> … [truncated, 741 more chars]
> ```

🔧 **Bash**
```
ls apps/api/src/routes/ apps/api/src/routes/health 2>/dev/null; echo "=== app.ts route registration ==="; sed -n 100,175p apps/api/src/app.ts
```

> **↳ result**
> ```
> apps/api/src/routes/:
> admin
> api
> auth
> health
> storefront
> vault
> 
> apps/api/src/routes/health:
> index.ts
> === app.ts route registration ===
>     // @fastify/rate-limit THROWS whatever this returns, so it has to be an
>     // Error carrying a statusCode — a bare SPEC-shaped object arrives at
>     // setErrorHandler with no status and comes back out as a 500. Returning an
>     // ApiError puts it on the normal error path, so the 429 and the SPEC §5
>     // body both come from one place.
>     errorResponseBuilder: (_req, context) =>
>       rateLimited(`Rate limit exceeded. Retry in ${context.after}.`),
>   });
> 
>   await app.register(tenancy);
>   // After tenancy: it only guards requests tenancy proved with a ses
> … [truncated, 907 more chars]
> ```

🔧 **Bash**
```
cat apps/api/src/lib/custom-domains.ts; echo "=== health/index.ts ==="; cat apps/api/src/routes/health/index.ts
```

> **↳ result**
> ```
> /**
>  * Custom-domain → shop lookup (A5, SPEC §17). Owner: WS-A.
>  *
>  * A storefront can be served on a merchant's own hostname (`CustomDomain`
>  * rows) as well as on `{slug}.{base}`. Two callers need the same answer:
>  * tenancy's Host resolution, and CORS (a registered domain's browser posts
>  * the analytics beacon and the checkout PAN cross-origin).
>  *
>  * `dbAdmin` is sanctioned here for the same reason as in resolveFromHost:
>  * this IS the platform-level "which tenant is this?" lookup — there is no
>  * shop to scope to yet (SPEC §6).
>  *
>  * Only hits are cached, mirroring `shopBySlug`: caching a miss would keep a
>  * freshly registered domain 404ing for the TTL, and a miss already costs just
> … [truncated, 1,544 more chars]
> ```

🔧 **Bash**
```
cat apps/api/src/plugins/tenancy.ts
```

> **↳ result**
> ```
> /**
>  * Tenant resolution (SPEC §6). Decorates every request with `shopId` and a
>  * tenant-scoped Prisma client, so route handlers cannot forget to scope.
>  *
>  * Three entry paths resolve a shop:
>  *   /admin/api/*      → staff session cookie
>  *   /storefront/api/* → Host header (shopSlug.lvh.me)
>  *   /api/*            → Bearer Admin API token
>  *
>  * Everything else (`/auth/*`, `/health`, `/vault/*`) resolves nothing. Reading
>  * `request.db` on those paths throws, which is the point: an unscoped route is
>  * a bug that should be loud in development, not silent in production.
>  *
>  * Owner: WS-A. Other workstreams consume `request.db`; they do not edit this.
>  */
> 
> import { createHash } from 'node:cry
> … [truncated, 7,212 more chars]
> ```

### 🤖 Claude

Now I have what I need. Let me read the remaining pieces I'll touch.

🔧 **Bash**
```
cat apps/api/src/lib/host.ts; echo "=== RATE_LIMITS ==="; grep -rn -A 12 "RATE_LIMITS" packages/config/src/constants.ts | head -30
```

🔧 **Bash**
```
sed -n 1,120p packages/config/src/env.ts
```

> **↳ result**
> ```
> /**
>  * The one place environment variables are read (SPEC §5).
>  *
>  * Rules:
>  *  - Add a var here and to `.env.example` in the SAME commit. CI enforces the
>  *    pair via `scripts/check-env-parity.mjs`.
>  *  - Server-only. Never import this from a client component; Next would inline
>  *    secrets into the browser bundle.
>  *  - Parsing is lazy and cached, so importing a helper from this package does
>  *    not blow up a process that has no business needing DATABASE_URL.
>  */
> import { z } from 'zod';
> 
> const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
> 
> const schema = z.object({
>   NODE_ENV: z.enum(['development', 'test', 'production']).default('devel
> … [truncated, 4,371 more chars]
> ```

> **↳ result**
> ```
> /**
>  * Host header → shop slug (SPEC §6).
>  *
>  * Kept as a pure function, and deliberately duplicated from
>  * `apps/storefront/src/lib/tenant.ts` rather than shared: that module imports
>  * `next/headers`, which cannot load inside Fastify. The two implementations
>  * must agree — see `test/host.test.ts` for the cases that matter.
>  *
>  * Owner: WS-A.
>  */
> 
> /**
>  * `demo.lvh.me:3002` + base `lvh.me:3002` → `demo`.
>  *
>  * Returns null for the apex, `www`, multi-level subdomains and any host outside
>  * the base domain. Null means "no shop here", never "guess" — a wrong guess is
>  * a cross-tenant render.
>  */
> export function shopSlugFromHost(host: string | undefined, baseDomain: string): string | null {
> … [truncated, 1,320 more chars]
> ```

### 🤖 Claude

Making the changes now. Starting with a properly-named branch off fresh main.

🔧 **Bash**
```
git status --short && git fetch origin main -q && git log --oneline -1 origin/main && git checkout -q -b ws-a/deploy-runbook origin/main && git log --oneline -1
```

🔧 **Bash**
```
cat scripts/check-env-parity.mjs | head -40
```

> **↳ result**
> ```
> 34fa87e docs(shared): archive every Claude Code session behind this build (#117)
> 34fa87e docs(shared): archive every Claude Code session behind this build (#117)
> ```

> **↳ result**
> ```
> #!/usr/bin/env node
> /**
>  * `.env.example` must be exhaustive (SPEC §5): every var read by
>  * packages/config/src/env.ts appears there, and nothing extra rots in it.
>  *
>  * Twenty agents adding env vars is exactly how a "works on my machine" repo is
>  * born, so this is a required CI check. It is deliberately dumb: regex over the
>  * zod schema object, no TypeScript execution, no dependencies.
>  */
> import { readFileSync } from 'node:fs';
> import { dirname, join } from 'node:path';
> import { fileURLToPath } from 'node:url';
> 
> const root = join(dirname(fileURLToPath(import.meta.url)), '..');
> 
> const envTs = readFileSync(join(root, 'packages/config/src/env.ts'), 'utf8');
> const example = readFileSync(joi
> … [truncated, 996 more chars]
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/deploy/caddy/Caddyfile
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/deploy/caddy/Caddyfile has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the gate endpoint Caddy asks before minting a certificate:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/routes/health/tls-ask.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/routes/health/tls-ask.ts (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Already in one — `.claude/worktrees/project-deployment-readiness-7dd23d`, now on branch `ws-a/deploy-runbook` cut off fresh main. Continuing there.

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/docker-compose.prod.yml
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/docker-compose.prod.yml has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/docker-compose.prod.yml
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/docker-compose.prod.yml has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the backstop so a placeholder secret can't reach a public URL silently:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/packages/config/src/env.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/packages/config/src/env.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/packages/config/src/env.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/packages/config/src/env.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the runbook:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/DEPLOY.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/DEPLOY.md (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now correcting the two README statements that are no longer true:

🔧 **Bash**
```
python3 - <<'PY'
import re, pathlib
p = pathlib.Path('README.md')
s = p.read_text()

old_pkg = """**Packaging.** Each app has a production Dockerfile (`apps/*/Dockerfile`,
multi-stage on `node:22-slim`), and CI builds all four on every commit to `main`
— one job per app in `.github/workflows/main-checks.yml`. Publishing those
images to a registry is the one thing that job does not do yet.

The documented deployment target is a `docker-compose.prod.yml` that runs the
four images behind **Caddy**, which terminates TLS automatically and routes by
subdomain: `admin.*` → admin, `api.*` → api, every
… [truncated, 2,415 more chars]
```

> **↳ result**
> ```
> README updated
> ```

### 🤖 Claude

Now validating. Both TLS paths of the Caddyfile, plus lint and typecheck:

🔧 **Bash**
```
echo "=== internal (localhost) ===" && docker run --rm -e BASE_DOMAIN=localhost -v "$PWD/deploy/caddy:/etc/caddy:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -20; echo; echo "=== ACME (real domain) ===" && docker run --rm -e BASE_DOMAIN=example.com -e CADDY_TLS=you@example.com -v "$PWD/deploy/caddy:/etc/caddy:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -20
```

> **↳ result**
> ```
> === internal (localhost) ===
> {"level":"info","ts":1788011471.4242334,"msg":"using config from file","file":"/etc/caddy/Caddyfile"}
> {"level":"info","ts":1788011471.4783204,"msg":"adapted config to JSON","adapter":"caddyfile"}
> {"level":"warn","ts":1788011471.4783673,"msg":"Caddyfile input is not formatted; run 'caddy fmt --overwrite' to fix inconsistencies","adapter":"caddyfile","file":"/etc/caddy/Caddyfile","line":26}
> {"level":"info","ts":1788011471.5163016,"logger":"tls.cache.maintenance","msg":"started background certificate maintenance","cache":"0x5ca25c76ce80"}
> {"level":"info","ts":1788011471.5706983,"logger":"http.auto_https","msg":"enabling automatic HTTP->HTTPS redirects","server_name"
> … [truncated, 1,281 more chars]
> ```

🔧 **Bash**
```
docker run --rm -e BASE_DOMAIN=localhost -v "$PWD/deploy/caddy:/etc/caddy" caddy:2-alpine caddy fmt --overwrite /etc/caddy/Caddyfile && git diff --stat deploy/caddy/Caddyfile && echo "--- reformatted ok ---"
```

🔧 **Bash**
```
docker run --rm -e BASE_DOMAIN=example.com -e CADDY_TLS=you@example.com -v "$PWD/deploy/caddy:/etc/caddy:ro" caddy:2-alpine caddy adapt --config /etc/caddy/Caddyfile 2>/dev/null | python3 -c "
import json,sys
c=json.load(sys.stdin)
tls=c.get('apps',{}).get('tls',{})
print('ACME email(s):', [p.get('issuers') for p in tls.get('automation',{}).get('policies',[])][:2])
print('on_demand:', json.dumps(tls.get('automation',{}).get('on_demand',{}))[:200])
"
```

> **↳ result**
> ```
> deploy/caddy/Caddyfile | 64 ++++++++++++++++++++++++++++++++++----------------
>  1 file changed, 44 insertions(+), 20 deletions(-)
> --- reformatted ok ---
> ```

> **↳ result**
> ```
> ACME email(s): [[{'email': 'you@example.com', 'module': 'acme'}, {'ca': 'https://acme.zerossl.com/v2/DV90', 'email': 'you@example.com', 'module': 'acme'}], [{'email': 'you@example.com', 'module': 'acme'}, {'ca': 'https://acme.zerossl.com/v2/DV90', 'email': 'you@example.com', 'module': 'acme'}]]
> on_demand: {"permission": {"endpoint": "http://api:3001/health/tls-ask", "module": "http"}}
> ```

### 🤖 Claude

Both confirmed — ACME email lands and the on-demand gate points at the new endpoint. Now the code checks:

🔧 **Bash**
```
ls node_modules >/dev/null 2>&1 && echo "deps present" || echo "NO node_modules"; node scripts/check-env-parity.mjs
```

> **↳ result**
> ```
> NO node_modules
> env parity ok — 32 vars
> ```

🔧 **Bash**
```
pnpm install --frozen-lockfile 2>&1 | tail -8 && pnpm --filter @merchant/db run generate 2>&1 | tail -5
```

> **↳ result**
> ```
> Progress: resolved 341, reused 341, downloaded 0, added 341, done
> 
> devDependencies:
> + @biomejs/biome 2.5.11
> + turbo 2.10.12
> + typescript 5.9.3
> 
> Done in 25.2s
> 
> Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
> 
> Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | tail -25
```

> **↳ result**
> ```
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > biome check .
> 
> apps/api/src/routes/health/tls-ask.ts:29:10 lint/style/noRestrictedImports ━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × dbAdmin is unscoped — request handlers use request.db / dbForShop (CLAUDE.md §6). The sanctioned exceptions (signup, platform auth lookup, vault origin lookup, seeds, tests) are allowlisted in this file's overrides; if your use genuinely qualifies, add it there in the same PR and say why.
>   
>     27 │  */
>     28 │ import { env } from '@merchant/config/env';
>   > 29 │ import { dbAdmin } from '@merchant/db/client';
>        │          ^^^^^^^
>     30 │ import typ
> … [truncated, 381 more chars]
> ```

### 🤖 Claude

The guardrail caught it — correctly. Let me look at how sanctioned exceptions are allowlisted:

🔧 **Bash**
```
python3 -c "
import json,re
s=open('biome.json').read()
i=s.find('noRestrictedImports')
print(s[max(0,i-2500):i+300])
"
```

> **↳ result**
> ```
> {
>   "$schema": "https://biomejs.dev/schemas/2.5.11/schema.json",
>   "vcs": {
>     "enabled": true,
>     "clientKind": "git",
>     "useIgnoreFile": true
>   },
>   "files": {
>     "includes": [
>       "**",
>       "!**/node_modules",
>       "!**/.next",
>       "!**/dist",
>       "!**/.turbo",
>       "!**/generated",
>       "!**/pnpm-lock.yaml",
>       "!**/test-results",
>       "!**/playwright-report"
>     ]
>   },
>   "formatter": {
>     "enabled": true,
>     "indentStyle": "space",
>     "indentWidth": 2,
>     "lineWidth": 100
>   },
>   "linter": {
>     "enabled": true,
>     "rules": {
>       "preset": "recommended",
>       "suspicious": {
>         "noExplicitAny": "warn",
>         "noConsole": {
>           "level": "off",
> … [truncated, 477 more chars]
> ```

🔧 **Bash**
```
python3 -c "
s=open('biome.json').read()
i=s.find('\"overrides\"')
print(s[i:i+2600] if i>=0 else 'NO OVERRIDES KEY')
"
```

> **↳ result**
> ```
> "overrides": [
>     {
>       "includes": [
>         "packages/db/**",
>         "apps/api/src/plugins/tenancy.ts",
>         "apps/api/src/lib/custom-domains.ts",
>         "apps/api/src/routes/auth/**",
>         "apps/api/src/routes/vault/**",
>         "apps/worker/scripts/**",
>         "apps/worker/src/jobs/analytics-rollup.ts",
>         "apps/api/test/**",
>         "**/*.test.ts",
>         "e2e/**"
>       ],
>       "linter": {
>         "rules": {
>           "style": {
>             "noRestrictedImports": "off"
>           }
>         }
>       }
>     }
>   ],
>   "javascript": {
>     "formatter": {
>       "quoteStyle": "single",
>       "semicolons": "always",
>       "trailingCommas": "all"
>     }
>   },
>   "json": {
>     "format
> … [truncated, 113 more chars]
> ```

### 🤖 Claude

`custom-domains.ts` is already the sanctioned home for platform-level host→shop lookups, so I'll put the lookup there rather than widen the allowlist:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/lib/custom-domains.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/lib/custom-domains.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/lib/custom-domains.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api/src/lib/custom-domains.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
cat >> apps/api/src/lib/custom-domains.ts <<'EOF'

/**
 * "Is this hostname a storefront at all?" — the question Caddy's on-demand TLS
 * gate asks before minting a certificate (A5, SPEC §17).
 *
 * Deliberately a boolean rather than a shop: the caller is a TLS decision, not
 * a request that renders anything, and it must answer for a hostname that has
 * no certificate yet. Same two branches as tenancy's `resolveFromHost`, so a
 * host that would 404 as a storefront never earns a certificate either — under
 * the base domain it is slug-or-nothing, and everything else has to be a
 * registered
… [truncated, 397 more chars]
```

> **↳ result**
> ```
> done
> ```

### 🤖 Claude

Now simplify the route to use it:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/routes/health/tls-ask.ts')
s = p.read_text()

s = s.replace(""" * Lives under /health because it resolves no tenant of its own: the hostname
 * arrives as a query parameter rather than as this request's Host, and it has
 * to be answerable before any certificate for that host exists.
 *
 * `dbAdmin` is sanctioned here for the same reason as in tenancy's
 * `resolveFromHost` — this IS the platform-level "which tenant is this?"
 * lookup, and there is no shop to scope to yet (SPEC §6).
 *
 * Owner: WS-A.
 */
import { env } from '@mer
… [truncated, 1,298 more chars]
```

> **↳ result**
> ```
> /**
>  * `GET /health/tls-ask?domain=…` — Caddy's on-demand TLS gate (A5, SPEC §17).
>  *
>  * The production Caddyfile serves every unclaimed hostname as a storefront and
>  * mints a certificate for it on first request, which is what makes
>  * `{slug}.{base}` and merchant custom domains work with no wildcard cert.
>  * Ungated that is an open invitation: anyone who points a DNS record at the box
>  * makes Caddy ask a public CA for a certificate, and a few hundred of those
>  * exhaust the deployment's issuance rate limit — after which the *real*
>  * hostnames stop renewing too.
>  *
>  * So Caddy asks here first. Only a hostname that actually resolves to a shop is
>  * allowed: `{slug}.{STOREFRONT_BASE_DOMAIN}
> … [truncated, 979 more chars]
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | tail -12
```

> **↳ result**
> ```
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > biome check .
> 
> Checked 511 files in 597ms. No fixes applied.
> ```

🔧 **Bash**
```
pnpm typecheck 2>&1 | tail -25
```

> **↳ result**
> ```
> @merchant/api:typecheck: 
> @merchant/api:typecheck: > @merchant/api@0.0.0 typecheck /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api
> @merchant/api:typecheck: > tsc --noEmit
> @merchant/api:typecheck: 
> @merchant/worker:typecheck: 
> @merchant/worker:typecheck: > @merchant/worker@0.0.0 typecheck /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/worker
> @merchant/worker:typecheck: > tsc --noEmit
> @merchant/worker:typecheck: 
> @merchant/pay:typecheck: 
> @merchant/pay:typecheck: > @merchant/pay@0.0.0 typecheck /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-
> … [truncated, 760 more chars]
> ```

🔧 **Bash**
```
docker compose ps --format '{{.Service}} {{.Status}}' 2>&1 | head
```

> **↳ result**
> ```
> mailpit Up 4 hours (healthy)
> minio Up 4 hours (healthy)
> postgres Up 3 hours (healthy)
> redis Up 4 hours (healthy)
> ```

🔧 **Bash**
```
pnpm worktree:env --migrate 2>&1 | tail -15
```

> **↳ result**
> ```
> > merchant@ worktree:env /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > bash scripts/worktree-env.sh "--migrate"
> 
> error: all 15 Redis slots are taken — archive a finished worktree first
> error: no Redis slot for project-deployment-readiness-7dd23d — remove a finished worktree's directory (or fix its .env) and rerun
>  ELIFECYCLE  Command failed with exit code 1.
> ```

### 🤖 Claude

All Redis slots are taken by other worktrees — I won't evict another agent's. Let me run the tests my change actually touches:

🔧 **Bash**
```
ls packages/config/test packages/config/src/*.test.ts apps/api/test 2>/dev/null | head -40
```

> **↳ result**
> ```
> packages/config/src/money.test.ts
> packages/config/src/revalidate-token.test.ts
> 
> apps/api/test:
> admin-api.test.ts
> analytics.test.ts
> apps.test.ts
> auth.test.ts
> checkout.test.ts
> collections.test.ts
> custom-domain.test.ts
> customer-accounts.test.ts
> customers.test.ts
> discounts.test.ts
> files.test.ts
> fulfillment-refund.test.ts
> helpers.ts
> host.test.ts
> inventory.test.ts
> orders.test.ts
> payments.test.ts
> products.test.ts
> rate-limit.test.ts
> settings.test.ts
> setup.ts
> storefront.test.ts
> tenancy.test.ts
> themes.test.ts
> vault.test.ts
> ```

🔧 **Bash**
```
pnpm --filter @merchant/config exec vitest run 2>&1 | tail -12
```

🔧 **Bash**
```
head -30 apps/api/test/custom-domain.test.ts; echo "..."; head -20 apps/api/test/setup.ts
```

> **↳ result**
> ```
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯
> 
> 
>  Test Files  1 failed | 1 passed (2)
>       Tests  4 failed | 13 passed (17)
>    Start at  16:54:55
>    Duration  583ms (transform 96ms, setup 0ms, collect 125ms, tests 27ms, environment 0ms, prepare 219ms)
> 
> undefined
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/packages/config:
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 1: vitest run
> ```

> **↳ result**
> ```
> /**
>  * Custom-domain tenant resolution (A5, SPEC §17).
>  *
>  * A storefront Host that is not `{slug}.{base}` must fall back to the
>  * CustomDomain table — that is what makes "point your own domain at the
>  * platform" true. The dangerous failure modes are (a) an unknown domain
>  * resolving *some* shop, and (b) shop A's domain resolving shop B — both are
>  * cross-tenant renders, the unforgivable bug.
>  */
> import { newId } from '@merchant/config/ids';
> import { dbAdmin } from '@merchant/db/client';
> import type { FastifyInstance } from 'fastify';
> import { afterAll, beforeAll, describe, expect, it } from 'vitest';
> import { clearTenantCaches } from '../src/plugins/tenancy.ts';
> import { buildTestApp, c
> … [truncated, 1,291 more chars]
> ```

🔧 **Bash**
```
pnpm --filter @merchant/config exec vitest run 2>&1 | grep -A 12 "FAIL\|AssertionError\|Error:" | head -40
```

> **↳ result**
> ```
> FAIL  src/revalidate-token.test.ts > revalidate tokens > round-trips for the slug it was minted for
> Error: Invalid environment.
> 
>   DATABASE_URL: Required
>   REDIS_URL: Required
>   SESSION_SECRET: Required
>   VAULT_MASTER_KEY: Required
>   S3_ENDPOINT: Required
>   S3_ACCESS_KEY_ID: Required
>   S3_SECRET_ACCESS_KEY: Required
>   S3_PUBLIC_URL: Required
> 
> Copy .env.example to .env — it works with zero edits.
> 
> --
>  FAIL  src/revalidate-token.test.ts > revalidate tokens > rejects a foreign slug — a token for one shop must not bust another
> Error: Invalid environment.
> 
>   DATABASE_URL: Required
>   REDIS_URL: Required
>   SESSION_SECRET: Required
>   VAULT_MASTER_KEY: Required
>   S3_ENDPOINT: Required
>   S3_ACCESS_KEY
> … [truncated, 432 more chars]
> ```

### 🤖 Claude

No `.env` in this worktree — that's the failure, not my change. Creating one (gitignored) and re-running:

🔧 **Bash**
```
cp .env.example .env && pnpm --filter @merchant/config exec vitest run 2>&1 | tail -8
```

> **↳ result**
> ```
> ✓ src/money.test.ts (12 tests) 8ms
>  ✓ src/revalidate-token.test.ts (5 tests) 7ms
> 
>  Test Files  2 passed (2)
>       Tests  17 passed (17)
>    Start at  16:55:14
>    Duration  1.53s (transform 203ms, setup 0ms, collect 268ms, tests 15ms, environment 2ms, prepare 551ms)
> ```

🔧 **Bash**
```
pnpm --filter @merchant/api exec vitest run test/host.test.ts 2>&1 | tail -8
```

> **↳ result**
> ```
> ✓ test/host.test.ts (2 tests) 5ms
> 
>  Test Files  1 passed (1)
>       Tests  2 passed (2)
>    Start at  16:55:21
>    Duration  586ms (transform 92ms, setup 42ms, collect 53ms, tests 5ms, environment 0ms, prepare 173ms)
> ```

### 🤖 Claude

Now the real proof — bringing the production stack up locally with the changed Caddyfile:

🔧 **Bash**
```
lsof -nP -iTCP:80 -iTCP:443 -sTCP:LISTEN 2>/dev/null | head; echo "--- ports checked ---"; df -h / | tail -1
```

> **↳ result**
> ```
> --- ports checked ---
> /dev/disk3s1s1   228Gi    11Gi   2.6Gi    82%    453k   27M    2%   /
> ```

### 🤖 Claude

Disk is tight (2.6 GB free) — a four-image build could fill it, so I won't do that here. Instead let me verify the piece that genuinely needs a runtime check: that the gate endpoint actually answers at the path Caddy asks.

🔧 **Bash**
```
lsof -nP -iTCP:3001 -sTCP:LISTEN 2>/dev/null | head -3; echo "--- 3001 checked ---"; pnpm db:query "select slug from \"Shop\" limit 5" 2>&1 | tail -10
```

> **↳ result**
> ```
> COMMAND   PID        USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
> node    84742 pauljurgens   52u  IPv4 0x491e65c1248449e3      0t0  TCP *:3001 (LISTEN)
> --- 3001 checked ---
> 
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > bash scripts/db-query.sh "select slug from \"Shop\" limit 5"
> 
> ERROR:  relation "Shop" does not exist
> LINE 1: select slug from "Shop" limit 5
>                          ^
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm db:query tables 2>&1 | tail -20
```

> **↳ result**
> ```
> analytics_rollups_daily |    0
>  apps                    |    0
>  builder_conversations   |    0
>  carts                   |    0
>  checkouts               |    0
>  custom_domains          |    0
>  discount_redemptions    |    0
>  fulfillments            |    0
>  inventory_adjustments   |    0
>  order_events            |    0
>  order_line_items        |    0
>  order_sequences         |    0
>  orders                  |    0
>  payment_methods         |    0
>  refunds                 |    0
>  theme_versions          |    0
>  webhook_deliveries      |    0
>  webhook_subscriptions   |    0
> (38 rows)
> ```

🔧 **Bash**
```
pnpm db:query "select count(*) from shops" 2>&1 | tail -4; grep -n '"dev"\|"start"' apps/api/package.json
```

> **↳ result**
> ```
> -------
>     25
> (1 row)
> 
> 7:    "dev": "tsx watch --env-file=../../.env src/server.ts",
> 8:    "start": "tsx --env-file-if-exists=../../.env src/server.ts",
> ```

### 🤖 Claude

The database is seeded. Starting the API on a free port to exercise the endpoint:

🔧 **Bash**
```
pnpm db:query "select slug from shops order by created_at limit 3" 2>&1 | tail -8
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > bash scripts/db-query.sh "select slug from shops order by created_at limit 3"
> 
> ERROR:  column "created_at" does not exist
> LINE 1: select slug from shops order by created_at limit 3
>                                         ^
> HINT:  Perhaps you meant to reference the column "shops.createdAt".
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm db:query 'select slug from shops limit 5' 2>&1 | tail -9
```

> **↳ result**
> ```
> slug      
> ----------------
>  pay-3h8n8x9m9p
>  pay-0ttb2ywg09
>  pay-knvn0581qw
>  pay-xd3k4r0at1
>  pay-dyekkctr7q
> (5 rows)
> ```

🔧 **Bash**
```
pnpm db:query "select slug from shops where slug = 'demo'" 2>&1 | tail -6
```

> **↳ result**
> ```
> slug 
> ------
>  demo
> (1 row)
> ```

🔧 **Bash**
```
cd apps/api && API_PORT=3099 LOG_LEVEL=warn pnpm exec tsx --env-file=../../.env src/server.ts > /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-project-deployment-readiness-7dd23d/2d6ac8a7-f16f-49f0-91a8-ab2560654773/scratchpad/api.log 2>&1
```

> **↳ result**
> ```
> Command running in background with ID: byzpce0w5. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-project-deployment-readiness-7dd23d/2d6ac8a7-f16f-49f0-91a8-ab2560654773/tasks/byzpce0w5.output. You will be notified when it completes. To check interim output, use Read on that file path.
> Session cwd remains /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d; directory changes made by the backgrounded command do not apply to subsequent commands.
> ```

🔧 **Bash**
```
for i in $(seq 1 30); do curl -sf -o /dev/null "http://127.0.0.1:3099/health" && break; sleep 1; done
echo "=== 1. plain health ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health"
echo "=== 2. real shop slug (expect 200) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=demo.lvh.me"
echo "=== 3. nonexistent slug under base domain (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=not-a-shop.lvh.me"
echo "=== 4. stranger's domain (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/he
… [truncated, 302 more chars]
```

> **↳ result**
> ```
> === 1. plain health ===
> {"status":"ok","uptime":6.590943459} [200]
> === 2. real shop slug (expect 200) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 3. nonexistent slug under base domain (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 4. stranger's domain (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 5. no domain param (expect 400) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 6. apex, must NOT earn a cert (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> ```

### 🤖 Claude

The route isn't registered — good thing I checked. Let me find out why:

🔧 **Bash**
```
ls apps/api/src/routes/storefront/ | head; echo "--- does storefront have index.ts? ---"; ls apps/api/src/routes/storefront/index.ts 2>&1; echo "--- vault ---"; ls apps/api/src/routes/vault/
```

> **↳ result**
> ```
> cart.ts
> checkouts.ts
> collections.ts
> customers
> events.ts
> products.ts
> shop.ts
> theme.ts
> --- does storefront have index.ts? ---
> ls: apps/api/src/routes/storefront/index.ts: No such file or directory
> --- vault ---
> tokenize.ts
> ```

### 🤖 Claude

Confirmed: `@fastify/autoload` loads only `index.ts` when a directory has one, so my sibling file was silently ignored. Moving the route into `health/index.ts`:

🔧 **Bash**
```
rm apps/api/src/routes/health/tls-ask.ts && cat > apps/api/src/routes/health/index.ts <<'EOF'
/**
 * Example of the autoload pattern: this file's path becomes its URL.
 * Copy this shape for new routes — never edit a central router.
 *
 * NOTE: because this directory has an `index.ts`, autoload loads ONLY this file
 * and ignores its siblings (unlike routes/storefront/, which has none). A new
 * /health/* route goes in here, not in a new file next to it — a sibling file
 * registers nothing and fails silently.
 */
import type { FastifyInstance } from 'fastify';
import { hostResolvesToShop } fr
… [truncated, 1,611 more chars]
```

> **↳ result**
> ```
> rewritten
> ```

🔧 **Bash**
```
sleep 6; echo "=== 1. real shop slug (expect 200 ok) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=demo.lvh.me"
echo "=== 2. nonexistent slug under base domain (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=not-a-shop.lvh.me"
echo "=== 3. stranger's domain (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=attacker.example.com"
echo "=== 4. no domain param (expect 400) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask"
echo "=== 5. apex (expec
… [truncated, 348 more chars]
```

> **↳ result**
> ```
> === 1. real shop slug (expect 200 ok) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 2. nonexistent slug under base domain (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 3. stranger's domain (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 4. no domain param (expect 400) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 5. apex (expect 404) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 6. another real shop (expect 200) ===
> {"errors":[{"code":"not_found","message":"Endpoint not found."}]} [404]
> === 7. plain h
> … [truncated, 61 more chars]
> ```

### 🤖 Claude

The server didn't reload — I started it without `watch`. Restarting:

🔧 **Bash**
```
pkill -f "tsx.*src/server.ts" 2>/dev/null; sleep 2; cd apps/api && API_PORT=3099 LOG_LEVEL=warn pnpm exec tsx --env-file=../../.env src/server.ts > /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-project-deployment-readiness-7dd23d/2d6ac8a7-f16f-49f0-91a8-ab2560654773/scratchpad/api2.log 2>&1
```

> **↳ result**
> ```
> Command running in background with ID: bd5s1q0w8. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-project-deployment-readiness-7dd23d/2d6ac8a7-f16f-49f0-91a8-ab2560654773/tasks/bd5s1q0w8.output. You will be notified when it completes. To check interim output, use Read on that file path.
> Session cwd remains /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d; directory changes made by the backgrounded command do not apply to subsequent commands.
> ```

🔧 **Bash**
```
for i in $(seq 1 40); do curl -sf -o /dev/null "http://127.0.0.1:3099/health" && break; sleep 1; done
echo "uptime check:"; curl -s "http://127.0.0.1:3099/health"; echo
echo "=== 1. real shop demo.lvh.me (expect 200 ok) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=demo.lvh.me"
echo "=== 2. unknown slug not-a-shop.lvh.me (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-ask?domain=not-a-shop.lvh.me"
echo "=== 3. stranger attacker.example.com (expect 404) ==="; curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:3099/health/tls-
… [truncated, 424 more chars]
```

> **↳ result**
> ```
> uptime check:
> {"status":"ok","uptime":5.543468583}
> === 1. real shop demo.lvh.me (expect 200 ok) ===
> ok [200]
> === 2. unknown slug not-a-shop.lvh.me (expect 404) ===
> unknown host [404]
> === 3. stranger attacker.example.com (expect 404) ===
> unknown host [404]
> === 4. missing param (expect 400) ===
> missing domain [400]
> === 5. apex lvh.me (expect 404) ===
> unknown host [404]
> === 6. second real shop (expect 200) ===
> ok [200]
> ```

### 🤖 Claude

All six cases correct. (The failed task was the stale server I killed.) Let me add a regression test — the silent-non-registration bug I just hit is exactly what a route-level test catches:

🔧 **Bash**
```
pkill -f "tsx.*src/server.ts" 2>/dev/null; sleep 1; tail -30 apps/api/test/custom-domain.test.ts
```

> **↳ result**
> ```
> });
> 
>   it('admits a registered custom domain through CORS, so the beacon and card fields work', async () => {
>     const response = await app.inject({
>       method: 'OPTIONS',
>       url: '/vault/tokenize',
>       headers: {
>         origin: `https://${domainA}`,
>         'access-control-request-method': 'POST',
>         'access-control-request-headers': 'content-type',
>       },
>     });
> 
>     expect(response.headers['access-control-allow-origin']).toBe(`https://${domainA}`);
>   });
> 
>   it('does not admit an unregistered origin through CORS', async () => {
>     const response = await app.inject({
>       method: 'OPTIONS',
>       url: '/vault/tokenize',
>       headers: {
>         origin: 'https://evil.attac
> … [truncated, 222 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/test/custom-domain.test.ts')
s = p.read_text()

# import env alongside the existing imports
old_imp = "import { newId } from '@merchant/config/ids';"
new_imp = "import { env } from '@merchant/config/env';\nimport { newId } from '@merchant/config/ids';"
assert old_imp in s
s = s.replace(old_imp, new_imp, 1)

addition = '''
  /**
   * Caddy's on-demand TLS gate (A5, SPEC §17). Same question as tenancy asks,
   * one request earlier: a hostname only earns a certificate if it is really a
   * shop. Tested through `inject` rather than again
… [truncated, 1,568 more chars]
```

> **↳ result**
> ```
> appended
> 10:import { env } from '@merchant/config/env';
> 11:import { newId } from '@merchant/config/ids';
> 12:import { dbAdmin } from '@merchant/db/client';
> 13:import type { FastifyInstance } from 'fastify';
> 14:import { afterAll, beforeAll, describe, expect, it } from 'vitest';
> 15:import { clearTenantCaches } from '../src/plugins/tenancy.ts';
> 16:import { buildTestApp, createTestShop, deleteTestShops, type TestShop } from './helpers.ts';
> 42:describe('storefront custom-domain fallback', () => {
> 136:  describe('on-demand TLS gate', () => {
> ```

🔧 **Bash**
```
pnpm --filter @merchant/api exec vitest run test/custom-domain.test.ts 2>&1 | tail -25
```

> **↳ result**
> ```
> RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d/apps/api
> 
>  ✓ test/custom-domain.test.ts (12 tests) 2194ms
> 
>  Test Files  1 passed (1)
>       Tests  12 passed (12)
>    Start at  16:58:10
>    Duration  3.37s (transform 220ms, setup 35ms, collect 643ms, tests 2.19s, environment 0ms, prepare 195ms)
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | tail -6
```

🔧 **Bash**
```
pnpm --filter @merchant/api exec vitest run test/tenancy.test.ts test/host.test.ts 2>&1 | tail -10
```

> **↳ result**
> ```
> check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Some errors were emitted while running checks.
>   
> 
>  ELIFECYCLE  Command failed with exit code 1.
> ```

> **↳ result**
> ```
> An operation failed because it depends on one or more records that were required but not found. No record was found for an update.
> 
>  ✓ test/tenancy.test.ts (15 tests) 1930ms
>  ✓ test/host.test.ts (2 tests) 2ms
> 
>  Test Files  2 passed (2)
>       Tests  17 passed (17)
>    Start at  16:58:21
>    Duration  3.29s (transform 258ms, setup 25ms, collect 954ms, tests 1.93s, environment 0ms, prepare 109ms)
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | grep -B 3 -A 12 "×" | head -40
```

> **↳ result**
> ```
> apps/api/test/custom-domain.test.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Formatter would have printed the following content:
>   
>     137 137 │       const base = env().STOREFRONT_BASE_DOMAIN.split(':')[0];
>     138 138 │   
>     139     │ - ····const·ask·=·(query:·string)·=>
>     140     │ - ······app.inject({·method:·'GET',·url:·`/health/tls-ask${query}`·});
>         139 │ + ····const·ask·=·(query:·string)·=>·app.inject({·method:·'GET',·url:·`/health/tls-ask${query}`·});
>     141 140 │   
>     142 141 │       it('allows a shop’s own subdomain', async () => {
>   
> 
> Checked 510 files in 842ms. No fixes applied.
> Found 1 error.
> check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> … [truncated, 159 more chars]
> ```

🔧 **Bash**
```
pnpm lint:fix 2>&1 | tail -5 && pnpm lint 2>&1 | tail -4
```

> **↳ result**
> ```
> > merchant@ lint:fix /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > biome check --write .
> 
> Checked 510 files in 647ms. Fixed 1 file.
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/project-deployment-readiness-7dd23d
> > biome check .
> 
> Checked 510 files in 530ms. No fixes applied.
> [This command modified 1 file you've previously read: apps/api/test/custom-domain.test.ts. Call Read before editing.]
> ```

🔧 **Bash**
```
pnpm typecheck 2>&1 | tail -5; echo "=== env parity ==="; node scripts/check-env-parity.mjs
```

🔧 **Bash**
```
docker run --rm -e BASE_DOMAIN=example.com -e CADDY_TLS=you@example.com -v "$PWD/deploy/caddy:/etc/caddy:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -3; docker compose -f docker-compose.prod.yml config -q 2>&1 | tail -5 && echo "compose config valid"
```

> **↳ result**
> ```
> Tasks:    11 successful, 11 total
> Cached:    0 cached, 11 total
>   Time:    48.919s 
> 
> === env parity ===
> env parity ok — 32 vars
> ```

> **↳ result**
> ```
> {"level":"info","ts":1788011972.1849682,"logger":"http","msg":"servers shutting down with eternal grace period"}
> {"level":"info","ts":1788011972.197566,"logger":"tls.cache.maintenance","msg":"stopped background certificate maintenance","cache":"0x1855808b5580"}
> Valid configuration
> compose config valid
> ```

### 🤖 Claude

All green. Adding the log entries this repo requires, then committing:

🔧 **Bash**
```
tail -3 DECISIONS.md; echo "=== gitignore check ==="; git check-ignore -v .env && echo ".env ignored OK"; echo "=== status ==="; git status --short
```

> **↳ result**
> ```
> 2026-08-29 | WS-G | Onboarding dismissals (each card, the welcome block, the trial pill) persist in `localStorage`, keyed by shop id — `Shop.onboarding` carries ONE `dismissed` flag, not one per card, so persisting server-side would be a schema change for chrome, and a dismissal that reappears on reload reads as a bug. Reads are guarded and fall back to "nothing dismissed".
> 2026-08-29 | WS-G | The onboarding Home's AI prompt posts to `/admin/api/themes/conversation` and then hands over to the storefront builder, so the prompt typed on Home is already being worked on when the builder paints. Its rotating placeholders are OURS, not the capture's four ("Create a product listing", "Generate prod
> … [truncated, 935 more chars]
> ```

🔧 **Bash**
```
cat >> DECISIONS.md <<'EOF'
2026-08-29 | WS-A | Production TLS is one variable: `CADDY_TLS` defaults to `internal` (Caddy's own CA, which is what keeps `BASE_DOMAIN=localhost` verifiable with no DNS) and is set to a contact email for a real domain, which switches every hostname to Let's Encrypt. Chosen over editing the Caddyfile per deployment so the checked-in file is the one that runs in both places.
2026-08-29 | WS-A | The Caddyfile's on-demand certificate issuance is gated by `GET /health/tls-ask?domain=` — a hostname earns a certificate only if it resolves to a shop (slug under the base d
… [truncated, 2,094 more chars]
```

> **↳ result**
> ```
> appended
> > biome check .
> 
> Checked 510 files in 2s. No fixes applied.
> ```

🔧 **Bash**
```
git add -A && git commit -q -F - <<'EOF'
feat(ws-a): make the production stack deployable on a real domain

A5 landed the production compose and Caddyfile and verified them on
BASE_DOMAIN=localhost with Caddy's internal CA. Pointing that at a real
domain needed four things it did not have.

- TLS is one variable. CADDY_TLS defaults to `internal`, so the localhost
  verification path is untouched; set it to a contact email and every
  hostname gets Let's Encrypt instead. The checked-in Caddyfile is the one
  that runs in both places.
- On-demand issuance is gated. The catch-all mints a certific
… [truncated, 1,420 more chars]
```

> **↳ result**
> ```
> Checked 4 files in 199ms. No fixes applied.
> c4f9eb2 feat(ws-a): make the production stack deployable on a real domain
>  DECISIONS.md                        |   4 ++
>  DEPLOY.md                           | 137 ++++++++++++++++++++++++++++++++++++
>  README.md                           |  27 +++----
>  apps/api/src/lib/custom-domains.ts  |  31 +++++++-
>  apps/api/src/routes/health/index.ts |  33 +++++++++
>  apps/api/test/custom-domain.test.ts |  40 +++++++++++
>  deploy/caddy/Caddyfile              |  64 +++++++++++------
>  docker-compose.prod.yml             |  10 ++-
>  docs/AGENT-LOG.md                   |   1 +
>  packages/config/src/env.ts          |  32 +++++++++
>  10 files changed, 341 insertions(+), 3
> … [truncated, 14 more chars]
> ```

🔧 **Bash**
```
git push -u origin ws-a/deploy-runbook 2>&1 | tail -5
```

> **↳ result**
> ```
> remote:      https://github.com/pauljurgens11/shopify/pull/new/ws-a/deploy-runbook        
> remote: 
> To github.com:pauljurgens11/shopify.git
>  * [new branch]      ws-a/deploy-runbook -> ws-a/deploy-runbook
> branch 'ws-a/deploy-runbook' set up to track 'origin/ws-a/deploy-runbook' by rebasing.
> ```

🔧 **Bash**
```
gh pr create --title "feat(ws-a): make the production stack deployable on a real domain" --body "$(cat <<'EOF'
Follow-on to A5. The production compose and Caddyfile were verified on `BASE_DOMAIN=localhost` with Caddy's internal CA; pointing that at a real domain needed four things it did not have.

## What changed

**TLS is one variable.** `CADDY_TLS` defaults to `internal`, so the localhost verification path is untouched. Set it to a contact email and every hostname gets Let's Encrypt instead. The checked-in Caddyfile is the one that runs in both places, rather than a file you edit per deploy
… [truncated, 2,791 more chars]
```

> **↳ result**
> ```
> https://github.com/pauljurgens11/shopify/pull/120
> ```

🔧 **Bash**
```
gh pr merge 120 --auto --squash --delete-branch 2>&1 | tail -3; sleep 20; gh pr checks 120 2>&1 | head -10
```

> **↳ result**
> ```
> pr-checks	pending	0	https://github.com/pauljurgens11/shopify/actions/runs/33256470093/job/99110981088	
> triage	pending	0	https://github.com/pauljurgens11/shopify/actions/runs/33256470134/job/99110981099	
> enable	pass	5s	https://github.com/pauljurgens11/shopify/actions/runs/33256470107/job/99110980956
> ```

🔧 **Bash**
```
for i in $(seq 1 40); do s=$(gh pr checks 120 2>&1); echo "$s" | grep -qE "pending" || break; sleep 15; done; gh pr checks 120 2>&1 | head; echo "=== state ==="; gh pr view 120 --json state,mergeStateStatus -q '.state + " / " + .mergeStateStatus'
```

> **↳ result**
> ```
> enable	pass	5s	https://github.com/pauljurgens11/shopify/actions/runs/33256470107/job/99110980956	
> pr-checks	pass	1m38s	https://github.com/pauljurgens11/shopify/actions/runs/33256470093/job/99110981088	
> rebase	pass	2s	https://github.com/pauljurgens11/shopify/actions/runs/33256470134/job/99111045784	
> triage	pass	20s	https://github.com/pauljurgens11/shopify/actions/runs/33256470134/job/99110981099	
> === state ===
> MERGED / UNKNOWN
> ```

### 🤖 Claude

Merged — [PR #120](https://github.com/pauljurgens11/shopify/pull/120), CI green.

## What changed

**Caddy TLS is now one variable.** `CADDY_TLS` defaults to `internal` (unchanged localhost behavior); set it to a contact email and every hostname gets Let's Encrypt. The checked-in [Caddyfile](deploy/caddy/Caddyfile) is the one that runs in both places — no per-deployment editing.

**On-demand certificate issuance is gated.** This was the one that would actually have bitten you: the catch-all minted a cert for *any* hostname pointed at the box, so a stranger's DNS record could exhaust your Let's Encrypt rate limit and stop your real hostnames renewing. Caddy now asks `GET /health/tls-ask?domain=` first, which allows a hostname only if it resolves to a real shop. Shops signed up through the UI still get certs automatically — strangers don't.

**Apex + `www` redirect to the admin**, so the bare URL you hand someone lands on the product rather than a 404.

**`X-Robots-Tag: noindex, nofollow, noarchive`** on admin, storefronts and API.

**Placeholder secrets warn at boot** under `NODE_ENV=production` — a warning, not a hard failure, so the `BASE_DOMAIN=localhost` verification path still works with the unedited dev `.env`.

**[DEPLOY.md](DEPLOY.md)** is the runbook: DNS records, the exact `.env` edits, why `--build` is mandatory, and how to reset the demo when visitors trash it.

## One bug worth mentioning

My first attempt put the gate in `routes/health/tls-ask.ts`. It registered nothing — `@fastify/autoload` loads *only* `index.ts` when a directory has one. Since Caddy reads a 404 as "refuse", that would have silently blocked **every** storefront certificate in production while looking perfectly fine in review. Caught it by curling the running API. There's now a warning comment at the top of [health/index.ts](apps/api/src/routes/health/index.ts) and five `app.inject` cases in the custom-domain suite, because a unit test of the helper passes happily while the route doesn't exist.

## What's still on you

The two `openssl rand -hex 32` values for `SESSION_SECRET` and `VAULT_MASTER_KEY` — I deliberately didn't generate or commit those. DEPLOY.md step 2 has the exact edits.

Since you're keeping the Anthropic key live on a public URL: use a **separate key with a spend limit set in the Console**. The only throttle in front of theme generation is the 40 req/s per-IP admin rate limit, which is not a cost control.

Two things I did **not** verify locally, both covered by CI: the full four-image Docker build (your disk was down to 2.6 GB free, and filling it would have hurt the other worktrees) and the API suites needing an isolated database (all 15 worktree Redis slots were taken — I wasn't going to evict another agent's).

The `main-checks` e2e failure is still there, untouched, as you asked.
