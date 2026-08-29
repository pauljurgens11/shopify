# Workstream B critical review

| | |
|---|---|
| **Session** | `50678d78-3745-46c7-8a32-649efa5dc878` |
| **Started** | 2026-08-28T14:25:54.614Z |
| **Ended** | 2026-08-28T14:59:45.090Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e` |
| **Branch** | `ws-b/critical-review-fixes` |
| **Pull request** | #66 (MERGED) |
| **Model** | `claude-fable-5` |
| **Claude Code** | 2.1.246 |
| **Archived** | no |

---

### 👤 User

using the critical review skill in the repo, do a review of workstream B. it should be all completed and production ready.

### 🤖 Claude

I'll start by loading the critical-review skill.

🔧 **Skill**
```
{"skill": "critical-review", "args": "workstream B"}
```

> **↳ result**
> ```
> Launching skill: critical-review
> ```

### 👤 User

Base directory for this skill: /Users/pauljurgens/.claude/skills/critical-review

# Critical code review

Perform an independent, adversarial audit of the scope the user named, and deliver the full report in chat. You are acting as a principal engineer who was not involved in writing this code and has no stake in it looking good. The job is to find what is wrong, risky, or unfinished — not to summarize or describe what exists.

Calibrate expectations before starting: a review that surfaces no significant findings in any real codebase is almost certainly a shallow review. If you come up empty, dig deeper before concluding the code is clean. Assume the authors were competent but under time pressure — the likely defects are boundary violations, unhandled edge cases, copy-paste drift between similar code paths, and invariants that hold only on the happy path.

## Resolve the scope — don't assume it

1. Identify the exact files/directories in scope from the user's request. If the project has ownership or architecture docs (e.g. a workstreams map, CODEOWNERS, module docs), use them to resolve a named scope like "workstream D" into concrete paths. If the scope is a PR or branch, the diff plus every file the diff touches is the surface.
2. Identify the source of truth for intended behavior: a spec, requirements doc, ticket, or API contract. Review the code against that, not against what the code appears to be trying to do. If no spec exists, state the behavior you inferred and flag that inference as a review limitation in the final report.
3. Read the project's stated conventions (CLAUDE.md, CONTRIBUTING, lint config) and any decision log. A documented decision is settled — don't relitigate it, but DO flag code that contradicts it.
4. Include the scope's edits *outside* its own directories: shared types, schema/migration changes, config, and anything other components consume. Cross-boundary edits are where multi-author codebases rot.

## Method — evidence over impression

- Read the actual code. Never infer behavior from file names, comments, types, or docstrings alone.
- For every candidate finding, attempt to REFUTE it before reporting: re-read the code path, check the callers, check whether a wrapper/middleware/framework already handles it. Only findings that survive your own refutation attempt go in the report. This trades a little recall for a lot of precision — a report full of plausible-but-wrong findings destroys trust in the real ones.
- Trace the 3–5 most important end-to-end flows in scope, from entry point (request, event, job, CLI invocation) to persistence/side effect and back — including the failure branches, not just the happy path. Name the flows you traced in the report.
- Run what you can: build, typecheck, linter, the test suite for the scope. Inspect real data/fixtures where the code makes assumptions about data shape.
- Every finding must cite `file:line` and include either a concrete failure scenario ("input X in state Y → Z happens") or the exact spec/convention clause violated. No finding without evidence. No "consider…" advice without a stated consequence.

## Review dimensions — check every one

1. **Correctness vs intent.** Required behavior that is missing, wrong, or silently degraded. State machines that can reach invalid states. Off-by-one, null/undefined, and empty-collection handling. Idempotency of anything that can be retried.
2. **Boundary and contract integrity.** Input validation at every trust boundary (params, query, body, headers, messages — not just the obvious one). Consistency between declared types/schemas and actual runtime shapes. Error handling that swallows, mislabels, or leaks. Responses conforming to the project's API contract.
3. **Data integrity.** Arithmetic on money/quantities/time done safely (precision, rounding, units, timezones). Multi-step writes that must be atomic but aren't. Reconciliation: do derived totals provably match their parts?
4. **Concurrency and partial failure.** Read-modify-write races. External-call-then-write sequences that leave inconsistent state when step two fails. Retries that double-apply. Missing timeouts, unbounded queues, resources not released on the error path.
5. **Security (proportionate to the project's stated bar).** Authn/authz on every entry point; authorization checked against the *resource owner*, not just "logged in" (IDOR). Secrets or sensitive data in logs, errors, or URLs. Injection at every place user input meets an interpreter (SQL, shell, HTML, paths).
6. **Isolation boundaries** (if multi-tenant, multi-user, or multi-account): can any code path read or write data across the boundary — including via guessed IDs, nested writes, background jobs, or caches keyed without the tenant?
7. **UI/UX wiring** (if UI is in scope): dead controls, stubs that throw, loading/empty/error states missing, client state that desyncs from the server after mutation.
8. **Blast radius.** Changes to shared code, schemas, or contracts made without updating all consumers. Anything another team or component will trip over.

## What NOT to report

Style and formatting the linter owns; test-coverage ambitions beyond what the project mandates; hardening beyond the project's stated security bar; performance micro-optimizations without a measured or obvious cost; anything the project explicitly declares out of scope. Do not praise the code. Do not pad the report — three verified criticals beat thirty maybes. This section matters as much as the checklist above: without it, reviews fill with noise the project has explicitly deprioritized, and the signal drowns.

## Output — in chat, nowhere else

Deliver the full report **directly in the chat response**. Do not write it to a file, do not create a report document, do not save findings anywhere on disk — the chat message IS the deliverable. Findings mentioned only in intermediate notes or tool output don't count; everything must appear in the final response.

Order findings by severity. For each finding:

**[SEV] Title** — `file:line`
- **What**: one-sentence defect statement.
- **Evidence**: the failing scenario or violated clause, concrete enough to reproduce.
- **Fix**: the minimal correct change (direction, not a full patch).

Severity scale:
- **CRITICAL** — data loss/corruption, isolation breach, security hole, crash on a primary flow.
- **HIGH** — user-visible spec violation, broken invariant, corruption possible on a plausible path.
- **MEDIUM** — convention violation with cross-team cost, or an edge-case bug unlikely to surface soon.
- **LOW** — real but tolerable given the project's stated priorities.

End the report with three lists: (a) the flows you traced, (b) the checks you ran with their actual output, (c) what you could NOT verify and why — unverified is not the same as passing, and saying so is part of an honest review.


ARGUMENTS: workstream B

### 🤖 Claude

I'll run a critical review of workstream B. First, let me resolve the scope from the project docs.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/docs/WORKSTREAMS.md
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
> … [truncated, 4,498 more chars]
> ```

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/docs/issues/
```

> **↳ result**
> ```
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
> C1-discounts-engine.md
> C2-orders-api.md
> C3-fulfillment-refund-api.md
> C4-customers-api.md
> C5-orders-admin-ui.md
> C6-customers-discounts-admin-ui.md
> D1-vault.md
> D2-processor-adapters.md
> D3-payment-router.md
> D4-payments-settings-ui.md
> E1-storefront-api-cart.md
> E2-storefront-pages.md
> E3-checkout-api.md
> E4-checkout-ui.md
> E5-customer-accounts.md
> F1-theme-engine-core.md
> F2-marketing-sections.md
> F3-themes-api-ai-job.md
> F4-builder-admin-ui.md
> G1-wo
> … [truncated, 183 more chars]
> ```

🔧 **Bash**
```
git log --oneline -5 && find apps/api/src/routes/admin/products apps/api/src/routes/admin/collections apps/api/src/routes/admin/inventory apps/api/src/routes/admin/locations apps/api/src/routes/admin/files apps/api/src/services/catalog apps/api/src/services/inventory "apps/admin/src/app/store/[slug]/products" "apps/admin/src/app/store/[slug]/collections" "apps/admin/src/app/store/[slug]/inventory" packages/db/prisma/schema packages/contracts/src -type f 2>/dev/null | xargs wc -l | sort -rn | head -60
```

🔧 **Bash**
```
cat DECISIONS.md | head -100
```

> **↳ result**
> ```
> # DECISIONS
> 
> Append-only. One line per decision. Never edit or delete an existing line.
> 
> Format: `YYYY-MM-DD | WS{X} | decision — rationale`
> 
> Log here when you: resolve a SPEC.md ambiguity, use the Polaris 20-minute escape hatch, make a breaking `packages/contracts` change (log BEFORE the change), stub against another workstream after being blocked >30 min, or build a minimal version of something SPEC.md §2 lists as out of scope.
> 
> ---
> 
> 2026-08-28 | WS-A | Internal packages export TypeScript source (`exports: "./*": "./src/*.ts"`) with no build step — removes cross-package build ordering, which is the most common way a parallel-agent monorepo deadlocks.
> 2026-08-28 | WS-A | Prisma multi-file s
> … [truncated, 27,308 more chars]
> ```

> **↳ result**
> ```
> 2b9c3f0 ws c/orders admin ui (#56)
> 8c07e8b feat(ws-b): collections, inventory and locations admin pages [contracts] (#57)
> 17d577e feat(ws-g): admin Analytics dashboard and Home (#54)
> 58b212b feat(ws-a): settings hub — general, taxes, checkout, shipping, staff [contracts] (#55)
> 3236629 feat(ws-e): storefront pages rendered from the published theme (#53)
>     9549 total
>      923 packages/db/prisma/schema/migrations/20260828074611_001_wsa_initial/migration.sql
>      753 apps/api/src/services/catalog/collections.ts
>      736 apps/api/src/services/catalog/products.ts
>      433 packages/contracts/src/theme.ts
>      372 apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx
>      341
> … [truncated, 2,853 more chars]
> ```

🔧 **Bash**
```
wc -l docs/issues/B*.md SPEC.md docs/issues/PARITY.md
```

🔧 **Bash**
```
cat docs/issues/B1-products-api.md docs/issues/B2-files-media.md docs/issues/B3-collections-api.md
```

> **↳ result**
> ```
> 63 docs/issues/B1-products-api.md
>       54 docs/issues/B2-files-media.md
>       57 docs/issues/B3-collections-api.md
>       61 docs/issues/B4-inventory-locations-api.md
>       63 docs/issues/B5-products-admin-ui.md
>       54 docs/issues/B6-collections-inventory-admin-ui.md
>      344 SPEC.md
>      126 docs/issues/PARITY.md
>      822 total
> ```

> **↳ result**
> ```
> # B1 — Products & variants API
> 
> | | |
> |---|---|
> | Workstream | B |
> | Size | M |
> | Depends on | A1 |
> | Unblocks | B2, B3, B4, B5, E1, H1 |
> | Branch | `ws-b/products-api` |
> 
> ## You own
> ```
> apps/api/src/routes/admin/products/**
> apps/api/src/services/catalog/**
> packages/contracts/src/products.ts (additive)
> ```
> 
> ## Context
> Schema (`packages/db/prisma/schema/catalog.prisma`) and contracts
> (`packages/contracts/src/products.ts`) are complete: Product, ProductOption,
> ProductVariant (price as integer minor units, `optionValues` JSON,
> `inventoryPolicy`), ProductImage. No routes or services exist. Autoload:
> a file at `routes/admin/products/index.ts` mounts at `/admin/api/products`.
> `request.db` is the t
> … [truncated, 7,445 more chars]
> ```

🔧 **Bash**
```
cat docs/issues/B4-inventory-locations-api.md docs/issues/B5-products-admin-ui.md docs/issues/B6-collections-inventory-admin-ui.md
```

> **↳ result**
> ```
> # B4 — Locations & inventory API (adjustment service)
> 
> | | |
> |---|---|
> | Workstream | B |
> | Size | M |
> | Depends on | A1, B1 |
> | Unblocks | B6, C3 (fulfillment decrements), E3 (stock checks) |
> | Branch | `ws-b/inventory-api` |
> 
> ## You own
> ```
> apps/api/src/routes/admin/inventory/**, apps/api/src/routes/admin/locations/**
> apps/api/src/services/inventory/**
> packages/contracts/src/{inventory,locations}.ts (additive)
> ```
> 
> ## Context
> Schema: `Location`, `InventoryLevel` (unique(variantId, locationId), `available`
> int), `InventoryAdjustment` (delta, reason, referenceId). Contracts complete.
> CLAUDE.md §9 landmine: **raw `inventoryLevel.update` is forbidden** — every
> change goes through the adjustmen
> … [truncated, 7,706 more chars]
> ```

🔧 **Bash**
```
find "apps/admin/src/app/store/[slug]" -type d | sort; echo ---; ls apps/api/src/services/catalog apps/api/src/services/inventory apps/api/src/routes/admin/products apps/api/src/routes/admin/collections apps/api/src/routes/admin/inventory apps/api/src/routes/admin/locations apps/api/src/routes/admin/files; echo ---; ls apps/api/test/ | head -30
```

🔧 **Bash**
```
sed -n '1,120p' SPEC.md
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]
> apps/admin/src/app/store/[slug]/analytics
> apps/admin/src/app/store/[slug]/apps
> apps/admin/src/app/store/[slug]/collections
> apps/admin/src/app/store/[slug]/collections/[id]
> apps/admin/src/app/store/[slug]/collections/_components
> apps/admin/src/app/store/[slug]/collections/new
> apps/admin/src/app/store/[slug]/customers
> apps/admin/src/app/store/[slug]/customers/[id]
> apps/admin/src/app/store/[slug]/discounts
> apps/admin/src/app/store/[slug]/inventory
> apps/admin/src/app/store/[slug]/locations
> apps/admin/src/app/store/[slug]/marketing
> apps/admin/src/app/store/[slug]/orders
> apps/admin/src/app/store/[slug]/orders/[id]
> apps/admin/src/app/store/[slug]/orders/[id]/fulfill
> … [truncated, 1,578 more chars]
> ```

> **↳ result**
> ```
> # PROJECT NORTHSTAR — Multi-Tenant Shopify Clone
> 
> **This document is the single source of truth.** Every agent reads this before writing code. If code and this document disagree, this document wins. If this document is ambiguous, the agent picks the option that maximizes the KPI and records the decision in `DECISIONS.md` (append-only, one line per decision).
> 
> ---
> 
> ## 1. Mission & KPI
> 
> Build a multi-tenant e-commerce platform that is visually and functionally indistinguishable from Shopify for common e-commerce use.
> 
> **Priority order (resolve every trade-off with this):** 1. appearance parity, 2. functionality, 3. performance, 4. everything else (incl. security beyond the §15 baseline).
> 
> **KP
> … [truncated, 9,631 more chars]
> ```

🔧 **Bash**
```
sed -n '120,240p' SPEC.md
```

> **↳ result**
> ```
> - **All list endpoints** support `?query=` free-text search where the Shopify UI has a search box.
> - **Env vars**: defined once in `packages/config/env.ts` (zod-parsed). `.env.example` at root is exhaustive and always up to date.
> - **No dead code, no TODO-stubs that throw.** If a feature is cut, the UI element either works minimally or is not rendered.
> 
> ---
> 
> ## 6. Multi-Tenancy (the load-bearing wall)
> 
> One Postgres database, shared schema. **Every tenant-owned table has `shop_id TEXT NOT NULL` with an index.** One enforcement layer, kept simple:
> 
> - **App layer**: `packages/db` exports `dbForShop(shopId)` — a Prisma client extension that automatically injects `where: { shopId }` into every qu
> … [truncated, 12,955 more chars]
> ```

🔧 **Bash**
```
sed -n '240,344p' SPEC.md
```

> **↳ result**
> ```
> ## 12. AI Storefront Builder (Deviation #2)
> 
> Lovable-like experience inside admin at Storefront nav item. Split screen: **left chat panel, right live preview iframe** (device toggle desktop/mobile, page switcher Home/Product/Collection).
> 
> ### Theme model (the contract — in `packages/contracts/theme.ts`)
> A `ThemeDoc`:
> ```ts
> { tokens: { colorPrimary, colorBackground, colorText, colorAccent, fontHeading, fontBody, radius, buttonStyle },
>   navigation: { links: {label, url}[] },
>   pages: { home: Section[], product: Section[], collection: Section[] },  // product/collection have required core sections
>   footer: { ... } }
> ```
> `Section = { id, type, settings }` where `type` ∈ registry of ~18 section
> … [truncated, 9,538 more chars]
> ```

### 🤖 Claude

Spec absorbed. Now reading the WS-B contracts and schema.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/products.ts
```

> **↳ result**
> ```
> 1	/** Catalog (SPEC §7). Owner: WS-B. */
> 2	import { z } from 'zod';
> 3	import {
> 4	  handleSchema,
> 5	  idSchema,
> 6	  metadataSchema,
> 7	  moneySchema,
> 8	  paginated,
> 9	  paginationQuery,
> 10	  searchQuery,
> 11	  seoSchema,
> 12	  sortQuery,
> 13	  tagsSchema,
> 14	  timestampsSchema,
> 15	} from './common.ts';
> 16	
> 17	export const productStatusSchema = z.enum(['active', 'draft', 'archived']);
> 18	export const inventoryPolicySchema = z.enum(['deny', 'continue']);
> 19	
> 20	export const productImageSchema = z.object({
> 21	  id: idSchema,
> 22	  url: z.string().url(),
> 23	  altText: z.string().max(512).nullable().default(null),
> 24	  position: z.number().int().nonnegative(),
> 25	  /** Empty = applies to the whole prod
> … [truncated, 5,088 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/collections.ts
```

> **↳ result**
> ```
> 1	/** Collections, manual + smart (SPEC §7). Owner: WS-B. */
> 2	import { z } from 'zod';
> 3	import {
> 4	  handleSchema,
> 5	  idSchema,
> 6	  paginated,
> 7	  paginationQuery,
> 8	  searchQuery,
> 9	  seoSchema,
> 10	  timestampsSchema,
> 11	} from './common.ts';
> 12	
> 13	export const collectionTypeSchema = z.enum(['manual', 'smart']);
> 14	
> 15	export const collectionSortOrderSchema = z.enum([
> 16	  'manual',
> 17	  'best-selling',
> 18	  'title-asc',
> 19	  'title-desc',
> 20	  'price-asc',
> 21	  'price-desc',
> 22	  'created-desc',
> 23	]);
> 24	
> 25	/**
> 26	 * Smart-collection rule, matching Shopify's condition builder.
> 27	 *
> 28	 * Not every (column, relation) pair is meaningful, and the API rejects the ones
> 29	 * that are not
> … [truncated, 5,008 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/inventory.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Inventory (SPEC §7).
> 3	 *
> 4	 * Adjustments go through a service that writes an InventoryAdjustment — never a
> 5	 * raw update — so the history exists. The contract reflects that: you post a
> 6	 * DELTA with a reason, not a new absolute value.
> 7	 *
> 8	 * Owner: WS-B.
> 9	 */
> 10	import { z } from 'zod';
> 11	import { idSchema, paginated, paginationQuery, searchQuery, timestampsSchema } from './common.ts';
> 12	
> 13	export const inventoryLevelSchema = z
> 14	  .object({
> 15	    id: idSchema,
> 16	    variantId: idSchema,
> 17	    locationId: idSchema,
> 18	    available: z.number().int(),
> 19	  })
> 20	  .merge(timestampsSchema);
> 21	export type InventoryLevel = z.infer<typeof inventoryLevelSchema>;
> 22	
> 23
> … [truncated, 2,997 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/locations.ts
```

> **↳ result**
> ```
> 1	/** Locations (SPEC §7 Inventory). Owner: WS-B. */
> 2	import { z } from 'zod';
> 3	import { addressSchema, idSchema, timestampsSchema } from './common.ts';
> 4	
> 5	export const locationSchema = z
> 6	  .object({
> 7	    id: idSchema,
> 8	    name: z.string().min(1).max(255),
> 9	    address: addressSchema.partial().nullable().default(null),
> 10	    isActive: z.boolean().default(true),
> 11	    fulfillsOnlineOrders: z.boolean().default(true),
> 12	    /**
> 13	     * How many variants still hold units here. Read-only, and the reason the
> 14	     * admin can grey out Delete without paging the whole inventory.
> 15	     */
> 16	    stockedVariantCount: z.number().int().nonnegative().default(0),
> 17	  })
> 18	  .merge(tim
> … [truncated, 391 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/files.ts
```

> **↳ result**
> ```
> 1	/** Image/asset upload via MinIO presigned PUT (SPEC §16 WS-B). Owner: WS-B. */
> 2	import { z } from 'zod';
> 3	
> 4	export const presignUploadInput = z.object({
> 5	  filename: z.string().min(1).max(255),
> 6	  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
> 7	  sizeBytes: z
> 8	    .number()
> 9	    .int()
> 10	    .positive()
> 11	    .max(20 * 1024 * 1024),
> 12	});
> 13	
> 14	/**
> 15	 * The browser PUTs the file straight to S3/MinIO, then hands `publicUrl` back to
> 16	 * the API. Keeps large uploads off the Fastify process entirely.
> 17	 */
> 18	export const presignUploadResponse = z.object({
> 19	  uploadUrl: z.string().url(),
> 20	  publicUrl: z.string().url(),
> 21	  ke
> … [truncated, 226 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/db/prisma/schema/catalog.prisma
```

> **↳ result**
> ```
> 1	// Products & collections (SPEC §7). Owner: WS-B.
> 2	
> 3	model Product {
> 4	  id              String   @id
> 5	  shopId          String
> 6	  title           String
> 7	  descriptionHtml String   @default("")
> 8	  handle          String
> 9	  status          String   @default("draft") // active | draft | archived
> 10	  vendor          String?
> 11	  productType     String?
> 12	  tags            String[] @default([])
> 13	  seoTitle        String?
> 14	  seoDescription  String?
> 15	  metadata        Json     @default("{}")
> 16	
> 17	  options  ProductOption[]
> 18	  variants ProductVariant[]
> 19	  images   ProductImage[]
> 20	  collections CollectionProduct[]
> 21	
> 22	  createdAt DateTime @default(now()) @db.Timestamptz(
> … [truncated, 3,444 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/db/prisma/schema/inventory.prisma
```

> **↳ result**
> ```
> 1	// Locations & inventory (SPEC §7). Owner: WS-B.
> 2	//
> 3	// Quantities change ONLY through the inventory service, which writes an
> 4	// InventoryAdjustment alongside every InventoryLevel update. Raw updates are a
> 5	// bug: they destroy the history the admin's inventory drawer reads.
> 6	
> 7	model Location {
> 8	  id                   String  @id
> 9	  shopId               String
> 10	  name                 String
> 11	  address              Json?
> 12	  isActive             Boolean @default(true)
> 13	  fulfillsOnlineOrders Boolean @default(true)
> 14	
> 15	  inventoryLevels InventoryLevel[]
> 16	
> 17	  createdAt DateTime @default(now()) @db.Timestamptz(6)
> 18	  updatedAt DateTime @updatedAt @db.Timestamptz(6)
> 19
> … [truncated, 1,084 more chars]
> ```

### 🤖 Claude

Contracts and schema read. Now the API services — the core engine logic.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Products & variants (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * All catalog business logic lives here; `routes/admin/products/index.ts` is a
> 5	 * thin zod-validated shell over it, so B5's product form, E1's storefront and
> 6	 * H1's seed all hit the same rules.
> 7	 *
> 8	 * Two things this module is deliberately strict about:
> 9	 *   - Money is integer minor units end to end. The DTO carries the shop's
> 10	 *     currency; the column carries the amount. A price in another currency is
> 11	 *     refused rather than silently reinterpreted (multi-currency is out of
> 12	 *     scope, SPEC §2).
> 13	 *   - The variant table is DERIVED from the option matrix, never taken
> 14	 *     verbatim from the caller.
> … [truncated, 29,521 more chars]
> ```

### 🤖 Claude

Now the variant engine, handles, events, and the collections service.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/variants.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/handles.ts
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/events.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * The option matrix (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * Pure and database-free on purpose: this is the rule the product form (B5)
> 5	 * previews client-side and the API applies server-side, and the two must not
> 6	 * drift. Everything here is derived from the option list — the variant table is
> 7	 * never something the caller gets to define independently of it, which is what
> 8	 * makes editing options non-destructive.
> 9	 */
> 10	import { badRequest } from '../../lib/errors.ts';
> 11	
> 12	/** Shopify's title for the implicit variant of a product with no options. */
> 13	export const DEFAULT_VARIANT_TITLE = 'Default Title';
> 14	
> 15	/** Shopify's own ceilings. Without them a typo in the option buil
> … [truncated, 5,632 more chars]
> ```

> **↳ result**
> ```
> 1	/**
> 2	 * Product handles — the `/products/{handle}` segment on the storefront.
> 3	 *
> 4	 * `lib/slug.ts` is WS-A's SHOP slug helper: it enforces a three-character
> 5	 * minimum and falls back to `store-xxxx`, which is right for a store URL and
> 6	 * wrong for a product called "Ax". Handles only have to satisfy
> 7	 * `handleSchema` (non-empty, lowercase, hyphen-separated), so the rules differ.
> 8	 */
> 9	import { newSecret } from '@merchant/config/ids';
> 10	
> 11	/** `handleSchema` allows 255; the headroom is for the `-2`, `-3` … suffixes. */
> 12	const MAX_BASE = 200;
> 13	
> 14	/** "Aurora Rain Jacket!" → `aurora-rain-jacket`. */
> 15	export function handleFromTitle(title: string): string {
> 16	  const base
> … [truncated, 901 more chars]
> ```

> **↳ result**
> ```
> 1	/**
> 2	 * Catalog webhook emission (SPEC §13).
> 3	 *
> 4	 * A thin typed wrapper over G1's producer, kept only so a catalog route cannot
> 5	 * accidentally emit a non-`products/*` topic. B1's runtime-import indirection —
> 6	 * which existed to no-op while G1 was unmerged — is gone.
> 7	 *
> 8	 * Fire and forget: `emitWebhookEvent` never throws (it returns whether the job
> 9	 * queued), because a webhook must never be the reason a product failed to save.
> 10	 */
> 11	import type { WebhookTopic } from '@merchant/config/constants';
> 12	import { emitWebhookEvent } from '@merchant/config/queue';
> 13	
> 14	export async function emitCatalogEvent(
> 15	  shopId: string,
> 16	  topic: Extract<WebhookTopic, `products/${s
> … [truncated, 125 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/collections.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Collections, manual and smart (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * The load-bearing idea: **a smart collection is a `where` clause, not a
> 5	 * materialized list.** Rules translate to Prisma filters and membership is
> 6	 * resolved on read, so a page of 24 products costs one indexed query instead of
> 7	 * loading the catalog to filter it in memory — and there is no republishing job
> 8	 * to be stale.
> 9	 *
> 10	 * Two consequences worth knowing before you edit this file:
> 11	 *
> 12	 *   - A (column, relation) pair we cannot express as a filter is a 400, never a
> 13	 *     dropped clause. "Tag contains 'sal'" has no array-substring operator in
> 14	 *     Postgres; silently ignoring it would publ
> … [truncated, 31,026 more chars]
> ```

### 🤖 Claude

Services read. Now the inventory service and all the routes.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/inventory/adjust.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * THE inventory write path (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * Every quantity change in the system goes through this file. A bare
> 5	 * `inventoryLevel.update` anywhere else is a bug (CLAUDE.md §9): it destroys the
> 6	 * `InventoryAdjustment` history the admin's stock drawer reads, and it loses
> 7	 * updates under concurrency.
> 8	 *
> 9	 * Import it directly — C3 for fulfillment decrements, E3 for checkout stock,
> 10	 * H1 for seeding:
> 11	 *
> 12	 *   import { adjust, adjustMany, setAvailable } from '…/services/inventory/adjust.ts';
> 13	 *   await adjust(dbForShop(shopId), {
> 14	 *     variantId, locationId, delta: -1, reason: 'sold', referenceId: orderId,
> 15	 *   });
> 16	 *
> 17	 * Two guarantees
> … [truncated, 11,779 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/inventory/query.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Reads for the admin Inventory index and the Locations settings page.
> 3	 * Owner: WS-B. Writes live in `adjust.ts` — nothing here mutates a quantity.
> 4	 */
> 5	import { newId } from '@merchant/config/ids';
> 6	import type { Paginated } from '@merchant/contracts/common';
> 7	import type { InventoryRow } from '@merchant/contracts/inventory';
> 8	import { inventoryRowSchema } from '@merchant/contracts/inventory';
> 9	import type { Location } from '@merchant/contracts/locations';
> 10	import { locationSchema } from '@merchant/contracts/locations';
> 11	import { Prisma } from '@merchant/db/client';
> 12	import type { TenantClient } from '@merchant/db/tenant';
> 13	import { badRequest, conflict, notFound
> … [truncated, 8,330 more chars]
> ```

### 🤖 Claude

Now the route files.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/routes/admin/products/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * `/admin/api/products` (SPEC §7, §9). Owner: WS-B.
> 3	 *
> 4	 * Thin by design: every rule lives in `services/catalog/products.ts` so the
> 5	 * storefront (E1) and the seed (H1) get the same behaviour without going
> 6	 * through HTTP. These handlers validate, resolve the tenant's currency, call
> 7	 * the service, and emit the catalog webhook.
> 8	 */
> 9	import { deletedResponse, idParam } from '@merchant/contracts/common';
> 10	import {
> 11	  createProductInput,
> 12	  listProductsQuery,
> 13	  updateProductInput,
> 14	  updateVariantInput,
> 15	  variantParams,
> 16	} from '@merchant/contracts/products';
> 17	import type { FastifyInstance, FastifyRequest } from 'fastify';
> 18	import { notFound } from '../
> … [truncated, 4,060 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/routes/admin/collections/collections.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * `/admin/api/collections` (SPEC §7, §9). Owner: WS-B.
> 3	 *
> 4	 * Mounted at /admin/api/collections by the autoloader. The directory is kept
> 5	 * index-free on purpose: `@fastify/autoload` treats an `index.ts` as the whole
> 6	 * directory and silently skips its siblings, so a second file added here later
> 7	 * would 404 with no error (AGENT-LOG, WS-D).
> 8	 *
> 9	 * Thin by design — every rule lives in `services/catalog/collections.ts`, so
> 10	 * E1's storefront collection page and H1's seed get the same membership
> 11	 * resolution without going through HTTP.
> 12	 *
> 13	 * Collections live under Products in the admin nav and share its permission
> 14	 * area; there is no `collections` permissio
> … [truncated, 4,292 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/routes/admin/inventory/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * `/admin/api/inventory` (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * The write routes are a thin shell over `services/inventory/adjust.ts`, which
> 5	 * is the only thing in the codebase allowed to move a quantity — other
> 6	 * workstreams import that service rather than posting here.
> 7	 */
> 8	import {
> 9	  adjustInventoryBody,
> 10	  inventoryLevelsResponse,
> 11	  listInventoryQuery,
> 12	  setInventoryBody,
> 13	} from '@merchant/contracts/inventory';
> 14	import type { FastifyInstance, FastifyRequest } from 'fastify';
> 15	import { requirePermission } from '../../../lib/permissions.ts';
> 16	import { adjustMany, setMany } from '../../../services/inventory/adjust.ts';
> 17	import { listInventory } from '../../
> … [truncated, 1,478 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/routes/admin/locations/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * `/admin/api/locations` (SPEC §7). Owner: WS-B.
> 3	 *
> 4	 * Locations are where stock lives; quantities themselves move only through
> 5	 * `services/inventory/adjust.ts`.
> 6	 */
> 7	import { idParam } from '@merchant/contracts/common';
> 8	import {
> 9	  createLocationInput,
> 10	  locationListResponse,
> 11	  updateLocationInput,
> 12	} from '@merchant/contracts/locations';
> 13	import type { FastifyInstance, FastifyRequest } from 'fastify';
> 14	import { requirePermission } from '../../../lib/permissions.ts';
> 15	import {
> 16	  createLocation,
> 17	  deleteLocation,
> 18	  getLocation,
> 19	  listLocations,
> 20	  updateLocation,
> 21	} from '../../../services/inventory/query.ts';
> 22	
> 23	const shopIdOf = (reque
> … [truncated, 1,267 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/routes/admin/files/index.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * `/admin/api/files` (SPEC §16 row B). Owner: WS-B.
> 3	 *
> 4	 * Deliberately product-agnostic: B5 attaches the result to a ProductImage, F3
> 5	 * uses it for theme assets, A4 for a shop logo. One endpoint, one key layout.
> 6	 */
> 7	import { presignUploadInput, presignUploadResponse } from '@merchant/contracts/files';
> 8	import type { FastifyInstance, FastifyRequest } from 'fastify';
> 9	import { requirePermission } from '../../../lib/permissions.ts';
> 10	import { presignUpload } from '../../../services/files/presign.ts';
> 11	
> 12	const shopIdOf = (request: FastifyRequest): string => request.shopId as string;
> 13	
> 14	export default async function routes(app: FastifyInstance) {
> 15	  // Uploads ar
> … [truncated, 468 more chars]
> ```

🔧 **Bash**
```
ls apps/api/src/services/files/ && cat apps/api/src/services/files/presign.ts
```

> **↳ result**
> ```
> presign.ts
> /**
>  * Presigned uploads to MinIO/S3 (SPEC §16 row B). Owner: WS-B.
>  *
>  * The API never touches the bytes. It signs a PUT, the browser uploads straight
>  * to the bucket, and the caller then stores the returned `publicUrl` — on
>  * `ProductImage.url` (B1), a theme asset (F3), or wherever else. Proxying
>  * uploads through Fastify would put a 20 MB body on the request path for
>  * nothing (CLAUDE.md §9).
>  *
>  * The bucket is a single shared one with anonymous read enabled — deliberate,
>  * so the storefront renders images without a signing round trip. Tenants are
>  * separated by the key prefix, which is why `objectKey` is the security-
>  * relevant part of this file and the filename never
> … [truncated, 3,651 more chars]
> ```

🔧 **Bash**
```
grep -rn "inventoryAdjustmentSchema\|inventoryAdjustment\b" --include="*.ts" --include="*.tsx" apps packages | grep -v node_modules | grep -v "adjust.ts\|inventory.prisma" | head -20
```

> **↳ result**
> ```
> apps/api/test/inventory.test.ts:74:  dbAdmin.inventoryAdjustment.findMany({ where: { variantId }, orderBy: { createdAt: 'asc' } });
> apps/api/test/helpers.ts:129:  await dbAdmin.inventoryAdjustment.deleteMany({ where });
> apps/api/test/orders.test.ts:109:  await dbAdmin.inventoryAdjustment.deleteMany({ where });
> apps/api/test/orders.test.ts:368:    const adjustment = await dbAdmin.inventoryAdjustment.findFirstOrThrow({
> apps/api/test/fulfillment-refund.test.ts:161:  await dbAdmin.inventoryAdjustment.deleteMany({ where });
> apps/api/test/fulfillment-refund.test.ts:194:    const sold = await dbAdmin.inventoryAdjustment.findFirstOrThrow({
> apps/api/test/fulfillment-refund.test.ts:324:    const adjus
> … [truncated, 981 more chars]
> ```

🔧 **Bash**
```
grep -rn "inventoryLevel\.\(update\|updateMany\|create\|createMany\|delete\|upsert\)" --include="*.ts" apps packages | grep -v node_modules | grep -v test | grep -v seed
```

> **↳ result**
> ```
> apps/api/src/services/inventory/adjust.ts:5: * `inventoryLevel.update` anywhere else is a bug (CLAUDE.md §9): it destroys the
> apps/api/src/services/inventory/adjust.ts:173:      const created = await db.inventoryLevel.create({
> apps/api/src/services/inventory/adjust.ts:240:      const level = await tx.inventoryLevel.update({
> apps/api/src/services/inventory/adjust.ts:290:      const before = await tx.inventoryLevel.update({
> apps/api/src/services/inventory/adjust.ts:303:      const level = await tx.inventoryLevel.update({
> ```

🔧 **Bash**
```
grep -rln "services/inventory/adjust" --include="*.ts" apps | grep -v test; echo ---; grep -rn "svg" packages/contracts/src/files.ts docs/issues/B2-files-media.md DECISIONS.md | head
```

> **↳ result**
> ```
> apps/api/src/routes/admin/inventory/index.ts
> apps/api/src/routes/admin/locations/index.ts
> apps/api/src/services/inventory/adjust.ts
> ---
> packages/contracts/src/files.ts:6:  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
> DECISIONS.md:117:2026-08-28 | WS-B | B2 follows `packages/contracts/src/files.ts`, not the prose in `docs/issues/B2`: the field is `contentType` (not `mimeType`), the cap is 20 MB (not 10), and `image/svg+xml` is allowed. The contract is the integration surface other workstreams code against, and narrowing it would have been a breaking change for no gain. SVG is served from the MinIO origin (:9000), which holds no session — a scri
> … [truncated, 564 more chars]
> ```

🔧 **Bash**
```
grep -rn "inventoryLevel\|inventoryAdjustment\|adjustMany\|setAvailable\|from.*inventory" --include="*.ts" apps/api/src/services/orders apps/api/src/services/checkout apps/api/src/services/cart 2>/dev/null | grep -v "^.*://" | head -30
```

> **↳ result**
> ```
> apps/api/src/services/orders/fulfill.ts:20:import { adjustMany } from '../inventory/adjust.ts';
> apps/api/src/services/orders/fulfill.ts:81:  if (stockMoves.length > 0) await adjustMany(db, stockMoves);
> apps/api/src/services/orders/refund.ts:32:import { adjustMany } from '../inventory/adjust.ts';
> apps/api/src/services/orders/refund.ts:222:    const levels = await db.inventoryLevel.findMany({
> apps/api/src/services/orders/refund.ts:242:    if (adjustments.length > 0) await adjustMany(db, adjustments);
> apps/api/src/services/orders/cancel.ts:19:import { adjustMany } from '../inventory/adjust.ts';
> apps/api/src/services/orders/cancel.ts:46:  const levels = await db.inventoryLevel.findMany({
> apps/ap
> … [truncated, 765 more chars]
> ```

### 🤖 Claude

All stock movement goes through the adjustment service — invariant holds. Now the admin UI.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * Products index (PARITY.md → Index pages). Owner: WS-B (B5).
> 5	 *
> 6	 * Anatomy, top to bottom: title + "Add product" → card with tabs, then the
> 7	 * filter row, then the IndexTable, then pagination. Selecting rows swaps the
> 8	 * header for bulk actions.
> 9	 *
> 10	 * Pagination is cursor-based (SPEC §5), so "previous" is a stack of the cursors
> 11	 * already visited rather than an offset we can decrement.
> 12	 */
> 13	import { format } from '@merchant/config/money';
> 14	import type { Paginated } from '@merchant/contracts/common';
> 15	import type { Product } from '@merchant/contracts/products';
> 16	import {
> 17	  Badge,
> 18	  BlockStack,
> 19	  Box,
> 20	  Button,
> 21	  Card,
> 22
> … [truncated, 11,328 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/navigation/items/products.ts
```

> **↳ result**
> ```
> 1	import type { NavItem } from '../types.ts';
> 2	export const products: NavItem = {
> 3	  key: 'products',
> 4	  label: 'Products',
> 5	  url: '/products',
> 6	  icon: 'ProductIcon',
> 7	  permission: 'products',
> 8	  subItems: [
> 9	    { label: 'Collections', url: '/collections', permission: 'products' },
> 10	    { label: 'Inventory', url: '/inventory', permission: 'products' },
> 11	  ],
> 12	};
> 13
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * The product form (PARITY.md → Detail/form pages → Product form). Owner: WS-B.
> 5	 *
> 6	 * Two columns, exactly as Shopify: left is what the product IS (title,
> 7	 * description, media, variants), right is how it is published (status,
> 8	 * channels, organization). Both create and edit render this — the only
> 9	 * difference is whether there is an id to PUT to.
> 10	 *
> 11	 * Saving is two steps on purpose. The product write carries everything except
> 12	 * stock; quantities then go through the inventory service, because that is the
> 13	 * only path that leaves an adjustment record behind (CLAUDE.md §9).
> 14	 */
> 15	import type { Location } from '@merchant/contracts/location
> … [truncated, 11,915 more chars]
> ```

🔧 **Bash**
```
find apps/admin/src/lib -name "*.ts" | xargs wc -l
```

> **↳ result**
> ```
> 91 apps/admin/src/lib/inventory-edits.test.ts
>       94 apps/admin/src/lib/search.ts
>      114 apps/admin/src/lib/collection-rules.test.ts
>       72 apps/admin/src/lib/nav.ts
>      292 apps/admin/src/lib/product-draft.ts
>      185 apps/admin/src/lib/api.ts
>       54 apps/admin/src/lib/inventory-edits.ts
>       61 apps/admin/src/lib/session.ts
>      273 apps/admin/src/lib/product-draft.test.ts
>      121 apps/admin/src/lib/collection-rules.ts
>       43 apps/admin/src/lib/description-html.ts
>      104 apps/admin/src/lib/nav.test.ts
>       79 apps/admin/src/lib/api.test.ts
>     1583 total
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * The product form's state, and the two conversions around it. Owner: WS-B (B5).
> 3	 *
> 4	 * Pure and React-free so the parts that are easy to get wrong can be tested
> 5	 * without rendering anything (SPEC §14 forbids component tests, not this):
> 6	 *
> 7	 *   - MONEY. A price is a STRING for as long as it is in an input — "19.99",
> 8	 *     mid-edit "19.", empty. It becomes integer minor units exactly once, at
> 9	 *     the API boundary, via `fromDecimal`. A float never exists (CLAUDE.md §5).
> 10	 *   - THE VARIANT MATRIX. The form previews the rows the API is going to
> 11	 *     generate. Both sides expand options first-varies-slowest, so a drift here
> 12	 *     shows up as the table reorder
> … [truncated, 11,671 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/media-card.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * The Variants card (PARITY.md: option builder → variant table with
> 5	 * price/available per row). Owner: WS-B (B5).
> 6	 *
> 7	 * Shopify's flow, mirrored: a product has one implicit variant until you add an
> 8	 * option, and the moment an option has values the table appears with a row per
> 9	 * combination. Editing an option regenerates the table without losing the
> 10	 * prices already typed — `reconcileVariants` is the client half of the same
> 11	 * promise the API keeps server-side.
> 12	 */
> 13	import {
> 14	  Badge,
> 15	  BlockStack,
> 16	  Box,
> 17	  Button,
> 18	  Card,
> 19	  InlineError,
> 20	  InlineStack,
> 21	  Tag,
> 22	  Text,
> 23	  TextField,
> 24	} from '@shopify/polaris';
> 25
> … [truncated, 9,396 more chars]
> ```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * The Media card (PARITY.md: left column, drag-drop grid). Owner: WS-B (B5).
> 5	 *
> 6	 * Uploads go straight to the bucket: the API signs a PUT (B2), the browser
> 7	 * sends the bytes, and only the resulting public URL comes back through the
> 8	 * product save. Nothing here posts a file to the API.
> 9	 */
> 10	import type { PresignUploadResponse } from '@merchant/contracts/files';
> 11	import {
> 12	  BlockStack,
> 13	  Box,
> 14	  Button,
> 15	  Card,
> 16	  DropZone,
> 17	  InlineError,
> 18	  InlineStack,
> 19	  Text,
> 20	} from '@shopify/polaris';
> 21	import { useCallback, useState } from 'react';
> 22	import { apiFetch } from '../../../../../lib/api.ts';
> 23	import type { ImageDraft } fro
> … [truncated, 5,472 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/description-html.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * Turning stored HTML into something editable in a plain textarea, and back.
> 3	 * Owner: WS-B — used by the product form (B5) and the collection form (B6).
> 4	 *
> 5	 * A rich-text editor is out of scope, so descriptions are edited as text.
> 6	 * Showing `<p>Four pockets…</p>` in the field is a parity tell, so simple
> 7	 * markup is unwrapped and re-wrapped; anything richer is left as raw HTML
> 8	 * rather than silently flattened, because losing a merchant's list or bold
> 9	 * text on an unrelated edit is worse than showing them the tags.
> 10	 */
> 11	/** Paragraphs and line breaks and nothing else — the markup we can round-trip. */
> 12	export function isSimpleHtml(html: string): boolean {
> 13
> … [truncated, 1,009 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/inventory-edits.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * What the inventory table's editable cells actually intend to write.
> 3	 * Owner: WS-B (B6).
> 4	 *
> 5	 * Pure, because getting it wrong writes stock: every entry this returns becomes
> 6	 * an `InventoryAdjustment` row, so a cell the merchant typed into and then
> 7	 * restored must NOT produce a zero-delta adjustment, and a half-typed or
> 8	 * negative value must not be sent at all.
> 9	 */
> 10	import type { InventoryRow } from '@merchant/contracts/inventory';
> 11	
> 12	export type LevelWrite = { variantId: string; locationId: string; available: number };
> 13	
> 14	/**
> 15	 * A whole, non-negative count, or null if it is not one yet.
> 16	 *
> 17	 * An empty cell is `null`, not 0: clearing a field whil
> … [truncated, 1,296 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/collection-rules.ts
```

> **↳ result**
> ```
> 1	/**
> 2	 * The smart-collection condition builder's rules about its own rules.
> 3	 * Owner: WS-B (B6).
> 4	 *
> 5	 * Pure, so the two things that silently produce a broken collection can be
> 6	 * tested without rendering anything:
> 7	 *
> 8	 *   - NOT EVERY (column, relation) PAIR IS LEGAL. The API refuses the rest
> 9	 *     rather than matching nothing, so the builder must only ever offer the
> 10	 *     pairs it will accept — otherwise the merchant picks "tag contains" and
> 11	 *     gets a 400 on save with no idea why.
> 12	 *   - PRICE IS INTEGER MINOR UNITS on the wire (SPEC §5). The field shows
> 13	 *     "20.00" and the rule carries "2000". Converting in the wrong direction
> 14	 *     silently builds
> … [truncated, 4,902 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/inventory/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	import type { Paginated } from '@merchant/contracts/common';
> 4	/**
> 5	 * Inventory index (PARITY.md → Index pages). Owner: WS-B (B6).
> 6	 *
> 7	 * A row per variant, a location switcher, and an editable "Available" cell.
> 8	 *
> 9	 * Edits go to B4's `/admin/api/inventory/set`, never to a variant PUT: that
> 10	 * endpoint is the only one that writes an `InventoryAdjustment` alongside the
> 11	 * quantity, and the history is the whole point of having a service
> 12	 * (CLAUDE.md §9). Typing an absolute count is what the cell means, so `set` is
> 13	 * the right half of that API — it records the delta it had to apply.
> 14	 */
> 15	import type { InventoryRow } from '@merchant/contracts/inve
> … [truncated, 10,573 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	import type { Collection } from '@merchant/contracts/collections';
> 4	/**
> 5	 * Collections index (PARITY.md → Index pages). Owner: WS-B (B6).
> 6	 *
> 7	 * Same anatomy as Products, one card: tabs, filter row, IndexTable,
> 8	 * pagination. Collections live under Products in the nav and share its
> 9	 * permission area.
> 10	 */
> 11	import type { Paginated } from '@merchant/contracts/common';
> 12	import {
> 13	  Badge,
> 14	  BlockStack,
> 15	  Box,
> 16	  Button,
> 17	  Card,
> 18	  IndexFilters,
> 19	  IndexTable,
> 20	  InlineStack,
> 21	  Modal,
> 22	  Page,
> 23	  Text,
> 24	  Thumbnail,
> 25	  useIndexResourceState,
> 26	  useSetIndexFiltersMode,
> 27	} from '@shopify/polaris';
> 28	import { ImageIcon } from
> … [truncated, 8,536 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/[id]/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/** `/store/{slug}/collections/{id}`. Owner: WS-B (B6). */
> 4	import type { Collection } from '@merchant/contracts/collections';
> 5	import { Banner, Page } from '@shopify/polaris';
> 6	import { useParams } from 'next/navigation';
> 7	import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
> 8	import { useApiQuery } from '../../../../../lib/api.ts';
> 9	import { useSession } from '../../../../../lib/session.ts';
> 10	import { CollectionForm } from '../_components/collection-form.tsx';
> 11	
> 12	export default function EditCollectionPage() {
> 13	  const { slug, id } = useParams<{ slug: string; id: string }>();
> 14	  const session = useSession();
> 15	  const collect
> … [truncated, 927 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/new/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/** `/store/{slug}/collections/new`. Owner: WS-B (B6). */
> 4	import { useParams } from 'next/navigation';
> 5	import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
> 6	import { useSession } from '../../../../../lib/session.ts';
> 7	import { CollectionForm } from '../_components/collection-form.tsx';
> 8	
> 9	export default function NewCollectionPage() {
> 10	  const { slug } = useParams<{ slug: string }>();
> 11	  // A price condition is typed in the shop's currency, so the builder waits
> 12	  // for it rather than labelling every field with a guessed "$".
> 13	  const session = useSession();
> 14	
> 15	  if (session.isPending || !session.data) return <PageSkeleton
> … [truncated, 106 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * The collection form, both kinds (PARITY.md → Collection form).
> 5	 * Owner: WS-B (B6).
> 6	 *
> 7	 * The type is chosen at creation and locked afterwards, as Shopify does: a
> 8	 * manual collection's positions and a smart one's rules are not convertible,
> 9	 * and the API refuses the swap anyway.
> 10	 *
> 11	 * Membership is saved in a second request for a manual collection, because
> 12	 * `POST /:id/products` is the endpoint that understands add / remove / reorder
> 13	 * as one edit — the same shape one save of the picker produces.
> 14	 */
> 15	import type { Collection, CollectionRuleSet } from '@merchant/contracts/collections';
> 16	import type { Paginated } from '@merchant/co
> … [truncated, 13,502 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * The smart-collection condition builder (PARITY.md → Collection form).
> 5	 * Owner: WS-B (B6).
> 6	 *
> 7	 * Shopify's shape: an any/all radio pair, then a row per condition — column,
> 8	 * relation, value — and a live list of what currently matches.
> 9	 *
> 10	 * The preview comes from the API (`POST /admin/api/collections/preview`), never
> 11	 * from re-running the rules in the browser: the translator is subtle (a negated
> 12	 * text rule has to include NULLs, a tag is a whole-array match) and two
> 13	 * implementations would drift the first time a relation was added.
> 14	 */
> 15	import type { CollectionRule, CollectionRuleSet } from '@merchant/contracts/collections';
> 16	imp
> … [truncated, 7,563 more chars]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/product-picker.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * Manual collection membership: the chosen products, and the modal that picks
> 5	 * them (PARITY.md → Collection form). Owner: WS-B (B6).
> 6	 *
> 7	 * Order is the collection's `manual` sort order, so the ↑/↓ controls are the
> 8	 * merchant's merchandising, not decoration.
> 9	 */
> 10	import type { Paginated } from '@merchant/contracts/common';
> 11	import type { Product } from '@merchant/contracts/products';
> 12	import {
> 13	  BlockStack,
> 14	  Box,
> 15	  Button,
> 16	  Card,
> 17	  Checkbox,
> 18	  InlineStack,
> 19	  Modal,
> 20	  ResourceItem,
> 21	  ResourceList,
> 22	  Text,
> 23	  TextField,
> 24	  Thumbnail,
> 25	} from '@shopify/polaris';
> 26	import { ImageIcon } from '@shopify/polaris-ico
> … [truncated, 7,266 more chars]
> ```

🔧 **Bash**
```
cat packages/config/src/money.ts 2>/dev/null || find packages/config -name "money*"
```

> **↳ result**
> ```
> /**
>  * Money is ALWAYS integer minor units (SPEC §5). No floats anywhere in this file
>  * or anywhere that consumes it — `0.1 + 0.2` is how storefronts charge $19.999999.
>  *
>  * Currency is single-per-shop (SPEC §2 puts multi-currency out of scope), but the
>  * code stays on the row so orders are self-describing and the mixing bugs are
>  * caught here rather than in a report six months later.
>  */
> 
> export type Money = { amount: number; currencyCode: string };
> 
> export const DEFAULT_CURRENCY = 'USD';
> 
> export function money(amount: number, currencyCode: string = DEFAULT_CURRENCY): Money {
>   if (!Number.isInteger(amount)) {
>     throw new Error(`Money must be integer minor units, got ${amount}. Use fr
> … [truncated, 4,840 more chars]
> ```

### 🤖 Claude

fromDecimal accepts trailing decimals — but I've spotted a controlled-input round-trip issue in the rules builder. Let me confirm the remaining UI files and the seed data.

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/[id]/page.tsx
```

🔧 **Bash**
```
ls "apps/admin/src/app/store/[slug]/settings/locations/" "apps/admin/src/app/store/[slug]/locations/" 2>&1; echo ---; grep -rn "compareAtPrice\|barcode\|weightGrams\|inventoryPolicy" packages/db/prisma/seed/*.ts | grep -v test | head -15
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	import type { Product } from '@merchant/contracts/products';
> 4	/**
> 5	 * `/store/{slug}/products/{id}`. Owner: WS-B (B5).
> 6	 *
> 7	 * A product the tenant does not own is a 404 from the API, and it renders as
> 8	 * one here rather than as an empty form the merchant could type into.
> 9	 */
> 10	import { Banner, Page } from '@shopify/polaris';
> 11	import { useParams } from 'next/navigation';
> 12	import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
> 13	import { useApiQuery } from '../../../../../lib/api.ts';
> 14	import { useSession } from '../../../../../lib/session.ts';
> 15	import { ProductForm } from '../_components/product-form.tsx';
> 16	
> 17	export defaul
> … [truncated, 1,016 more chars]
> ```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/locations/:
> page.tsx
> 
> apps/admin/src/app/store/[slug]/settings/locations/:
> page.tsx
> ---
> packages/db/prisma/seed/catalog.ts:145:        compareAtPrice: source.compareAtPrice ?? null,
> packages/db/prisma/seed/catalog.ts:150:        weightGrams: source.weightGrams ?? null,
> packages/db/prisma/seed/catalog.ts:151:        inventoryPolicy: 'deny',
> ```

🔧 **Bash**
```
grep -n "compareAtPrice\|weightGrams" packages/db/prisma/seed/catalog.ts | head; grep -rn "compareAtPrice" packages/db/prisma/seed/products-data.ts 2>/dev/null | head -3; ls packages/db/prisma/seed/
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/settings/locations/page.tsx
```

> **↳ result**
> ```
> 1	'use client';
> 2	
> 3	/**
> 4	 * Settings → Locations (PARITY.md → Settings: narrow single column, section
> 5	 * cards, save bar). Owner: WS-B (B6).
> 6	 *
> 7	 * Where stock lives. Quantities themselves are never edited here — that is the
> 8	 * Inventory page, which goes through the adjustment service.
> 9	 */
> 10	import type { Location } from '@merchant/contracts/locations';
> 11	import {
> 12	  Badge,
> 13	  BlockStack,
> 14	  Box,
> 15	  Button,
> 16	  Card,
> 17	  Checkbox,
> 18	  FormLayout,
> 19	  InlineStack,
> 20	  Modal,
> 21	  Page,
> 22	  Text,
> 23	  TextField,
> 24	  Tooltip,
> 25	} from '@shopify/polaris';
> 26	import { useQueryClient } from '@tanstack/react-query';
> 27	import { useParams } from 'next/navigation';
> 28	imp
> … [truncated, 1,448 more chars]
> ```

> **↳ result**
> ```
> 145:        compareAtPrice: source.compareAtPrice ?? null,
> 150:        weightGrams: source.weightGrams ?? null,
> analytics.ts
> catalog.ts
> collections.ts
> context.ts
> customers.ts
> data
> discounts.ts
> index.ts
> inventory.ts
> orders.ts
> random.ts
> seed.test.ts
> shop.ts
> ```

🔧 **Bash**
```
cat "apps/admin/src/app/store/[slug]/locations/page.tsx"; echo ===; grep -n "compareAtPrice" packages/db/prisma/seed/data/*.ts | head -5
```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/settings/locations/page.tsx
```

> **↳ result**
> ```
> 80	    fulfillsOnlineOrders: location.fulfillsOnlineOrders,
> 81	  };
> 82	}
> 83	
> 84	/** Drops the blank fields, so an untouched address stays null rather than a husk of "". */
> 85	function addressPayload(address: AddressDraft): Record<string, string> | null {
> 86	  const filled = Object.entries(address).filter(([, value]) => value.trim() !== '');
> 87	  if (filled.length === 0) return null;
> 88	  return Object.fromEntries(filled.map(([key, value]) => [key, value.trim()]));
> 89	}
> 90	
> 91	function LocationDialog({
> 92	  open,
> 93	  location,
> 94	  onClose,
> 95	  onSaved,
> 96	}: {
> 97	  open: boolean;
> 98	  /** Absent when adding. */
> 99	  location?: Location;
> 100	  onClose: () => void;
> 101	  onSaved: (message: s
> … [truncated, 10,199 more chars]
> ```

> **↳ result**
> ```
> Exit code 1
> 'use client';
> 
> /**
>  * Placeholder for Locations, which belongs to WS-B (B6). The settings hub links
>  * here, so the route has to exist before B6 lands — a hub card that 404s is the
>  * same KPI failure as a dead nav item. B6 REPLACES this file.
>  */
> import { ComingOnline } from '../../../../components/shell/page-skeleton.tsx';
> 
> export default function LocationsPage() {
>   return (
>     <ComingOnline title="Locations" description="Where you stock and ship from lands with B6." />
>   );
> }
> (eval):1: == not found
> ```

🔧 **Bash**
```
grep -rn "compareAtPrice" packages/db/prisma/seed/data/ | head -4; grep -rn "barcode" packages/db/prisma/seed/ | head -4; echo ---; grep -rn '"/locations"\|/locations`\|locations\x27' apps/admin/src/navigation apps/admin/src/app/store/[slug]/settings/page.tsx 2>/dev/null | head; echo ---; grep -rn "locations" apps/admin/src/app/store/\[slug\]/settings/page.tsx | head
```

> **↳ result**
> ```
> packages/db/prisma/seed/data/products.ts:26:  compareAtPrice?: number;
> packages/db/prisma/seed/data/products.ts:91:    compareAtPrice: 15800,
> packages/db/prisma/seed/data/products.ts:294:    compareAtPrice: 11500,
> packages/db/prisma/seed/data/products.ts:425:    compareAtPrice: 19500,
> ---
> (eval):1: no matches found: apps/admin/src/app/store/[slug]/settings/page.tsx
> ---
> apps/admin/src/app/store/[slug]/settings/page.tsx:67:    href: '/locations',
> ```

🔧 **Bash**
```
sed -n '50,90p' "apps/admin/src/app/store/[slug]/settings/page.tsx"
```

> **↳ result**
> ```
> icon: CreditCardIcon,
>   },
>   {
>     title: 'Shipping and delivery',
>     description: 'Rates customers see at checkout',
>     href: '/settings/shipping',
>     icon: DeliveryIcon,
>   },
>   {
>     title: 'Taxes',
>     description: 'How much tax you charge',
>     href: '/settings/taxes',
>     icon: ReceiptIcon,
>   },
>   {
>     title: 'Locations',
>     description: 'Where you stock and ship from',
>     href: '/locations',
>     icon: LocationIcon,
>   },
>   {
>     title: 'Checkout',
>     description: 'How checkout behaves',
>     href: '/settings/checkout',
>     icon: SettingsIcon,
>   },
>   {
>     title: 'Notifications',
>     description: 'Emails sent to customers',
>     href: '/settings/notifications',
>     icon: Notificatio
> … [truncated, 193 more chars]
> ```

### 🤖 Claude

Confirmed: the Settings hub links to a stale placeholder. Now let me verify the variant-wipe hypothesis against the contract's zod defaults, then run the test suites.

🔧 **Bash**
```
cat > /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-workstream-b-critical-review-1fb97e/50678d78-3745-46c7-8a32-649efa5dc878/scratchpad/zodcheck.ts <<'EOF'
import { updateProductInput } from './packages/contracts/src/products.ts';
// Simulates what the B5 form sends for an existing variant: id, price, sku, optionValues only.
const parsed = updateProductInput.parse({
  title: 'Tee',
  variants: [{ id: 'var_01ABCDEFGHJKMNPQRSTVWXYZ01', price: { amount: 1999, currencyCode: 'USD' }, sku: 'SKU-1', optionValues: { Size: 'S' } }],
});
console.log(JSON.stringi
… [truncated, 276 more chars]
```

> **↳ result**
> ```
> undefined
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api:
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "tsx" not found
> ```

🔧 **Bash**
```
cat > scratch-zodcheck.mjs <<'EOF'
import { updateProductInput } from '@merchant/contracts/products';
const parsed = updateProductInput.parse({
  title: 'Tee',
  variants: [{ id: 'var_01ABCDEFGHJKMNPQRSTVWXYZ01', price: { amount: 1999, currencyCode: 'USD' }, sku: 'SKU-1', optionValues: { Size: 'S' } }],
});
console.log(JSON.stringify(parsed.variants?.[0], null, 2));
EOF
node --experimental-strip-types --import ./apps/api/node_modules/tsx/dist/loader.mjs scratch-zodcheck.mjs 2>/dev/null || ./node_modules/.bin/tsx scratch-zodcheck.mjs 2>/dev/null || (cd apps/api && ../../node_modules/.bin/tsx ..
… [truncated, 69 more chars]
```

> **↳ result**
> ```
> (eval):9: no such file or directory: ../../node_modules/.bin/tsx
> ```

🔧 **Bash**
```
find node_modules/.pnpm -maxdepth 1 -name "tsx@*" | head -2; ls apps/api/node_modules/.bin/ 2>/dev/null | grep -i tsx
```

> **↳ result**
> ```
> bfs: error: node_modules/.pnpm: No such file or directory.
> ```

🔧 **Bash**
```
ls .env 2>/dev/null && grep -n "DATABASE_URL" .env | head -2; pnpm install --silent 2>&1 | tail -5
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
ls node_modules/.bin/ | grep -cE 'tsx|vitest'; ls -la .env 2>&1 | head -2
```

> **↳ result**
> ```
> 0
> ls: .env: No such file or directory
> ```

🔧 **Bash**
```
pnpm install 2>&1 | tail -8
```

> **↳ result**
> ```
> Scope: all 11 workspace projects
> Lockfile is up to date, resolution step is skipped
> Already up to date
> 
> Done in 7s
> ```

🔧 **Bash**
```
ls apps/api/node_modules/.bin/ | grep -E '^(tsx|vitest)$'; echo ---; pnpm worktree:env --migrate 2>&1 | tail -6
```

> **↳ result**
> ```
> tsx
> vitest
> ---
>   ✓ database merchant_workstream_b_critical_review_1fb97e  ·  redis db 6
>   ✓ created database
>   ✓ migrated and seeded
> 
>   Each worktree now has its own database and Redis keyspace.
>   Ports 3000/3001/3002 are still shared on purpose — one dev stack at a time.
> ```

🔧 **Bash**
```
cat > scratch-zodcheck.mjs <<'EOF'
import { updateProductInput } from '@merchant/contracts/products';
const parsed = updateProductInput.parse({
  title: 'Tee',
  variants: [{ id: 'var_01ABCDEFGHJKMNPQRSTVWXYZ01', price: { amount: 1999, currencyCode: 'USD' }, sku: 'SKU-1', optionValues: { Size: 'S' } }],
});
console.log(JSON.stringify(parsed.variants?.[0], null, 2));
EOF
cd apps/api && ./node_modules/.bin/tsx ../../scratch-zodcheck.mjs; cd ../.. && rm scratch-zodcheck.mjs
```

> **↳ result**
> ```
> node:internal/modules/run_main:123
>     triggerUncaughtException(
>     ^
> 
> Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@merchant/contracts' imported from /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/scratch-zodcheck.mjs
> Did you mean to import "file:///Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/products.ts"?
>     at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)
>     at packageResolve (node:internal/modules/esm/resolve:768:81)
>     at moduleResolve (node:internal/modules/esm/resolve:855:18)
>     at defaultResolve (node:internal/modul
> … [truncated, 951 more chars]
> ```

🔧 **Bash**
```
mkdir -p apps/api/scratch && cat > apps/api/scratch-zod.ts <<'EOF'
import { updateProductInput } from '@merchant/contracts/products';
const parsed = updateProductInput.parse({
  title: 'Tee',
  variants: [{ id: 'var_01ABCDEFGHJKMNPQRSTVWXYZ01', price: { amount: 1999, currencyCode: 'USD' }, sku: 'SKU-1', optionValues: { Size: 'S' } }],
});
console.log(JSON.stringify(parsed.variants?.[0], null, 2));
EOF
(cd apps/api && ./node_modules/.bin/tsx scratch-zod.ts); rm -rf apps/api/scratch-zod.ts apps/api/scratch
```

> **↳ result**
> ```
> {
>   "sku": "SKU-1",
>   "barcode": null,
>   "price": {
>     "amount": 1999,
>     "currencyCode": "USD"
>   },
>   "compareAtPrice": null,
>   "optionValues": {
>     "Size": "S"
>   },
>   "requiresShipping": true,
>   "taxable": true,
>   "weightGrams": null,
>   "inventoryPolicy": "deny",
>   "inventoryQuantity": 0,
>   "id": "var_01ABCDEFGHJKMNPQRSTVWXYZ01"
> }
> ```

### 🤖 Claude

Confirmed — the contract fills defaults for every unsent variant field, and the service writes them verbatim. Now running the test suites.

🔧 **Bash**
```
cd apps/api && ./node_modules/.bin/vitest run test/products.test.ts test/collections.test.ts test/inventory.test.ts test/files.test.ts 2>&1 | tail -25
```

> **↳ result**
> ```
> RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api
> 
>  ✓ test/collections.test.ts (27 tests) 1735ms
>  ✓ test/products.test.ts (16 tests) 313ms
>  ✓ test/inventory.test.ts (18 tests) 388ms
>  ✓ test/files.test.ts (7 tests) 64ms
> 
>  Test Files  4 passed (4)
>       Tests  68 passed (68)
>    Start at  17:36:03
>    Duration  3.26s (transform 152ms, setup 27ms, collect 409ms, tests 2.50s, environment 0ms, prepare 105ms)
> ```

🔧 **Bash**
```
pnpm verify 2>&1 | tail -15
```

> **↳ result**
> ```
> undefined
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "verify" not found
> ```

🔧 **Bash**
```
grep -n '"verify"\|"typecheck"\|"lint"' package.json | head;
```

> **↳ result**
> ```
> 9:    "typecheck": "tsc --noEmit",
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e && grep -n '"verify"' package.json && pnpm verify 2>&1 | tail -20
```

> **↳ result**
> ```
> 26:    "verify": "node scripts/check-env-parity.mjs && pnpm lint && pnpm typecheck && pnpm test",
> @merchant/api:test:    ✓ tenancy > keeps one shop’s shipping rates out of another’s  468ms
> @merchant/api:test:  ✓ test/themes.test.ts (15 tests) 1403ms
> @merchant/api:test:  ✓ test/analytics.test.ts (11 tests) 764ms
> @merchant/api:test:  ✓ test/payments.test.ts (9 tests) 584ms
> @merchant/api:test:  ✓ test/vault.test.ts (6 tests) 171ms
> @merchant/api:test:  ✓ test/files.test.ts (7 tests) 239ms
> @merchant/api:test:  ✓ src/services/settings/shipping.test.ts (7 tests) 3ms
> @merchant/api:test:  ✓ test/rate-limit.test.ts (1 test) 353ms
> @merchant/api:test:  ✓ test/host.test.ts (2 tests) 0ms
> @merchant/api:tes
> … [truncated, 384 more chars]
> ```

### 🤖 Claude

All checks green. Now reproducing the two suspected defects end-to-end against the real database.

🔧 **Bash**
```
cat > apps/api/test-scratch-review.test.ts <<'EOF'
import { updateProductInput } from '@merchant/contracts/products';
import { dbForShop, dbAdmin } from '@merchant/db/tenant';
import { describe, expect, it } from 'vitest';
import { createProduct, updateProduct } from './src/services/catalog/products.ts';
import { adjust } from './src/services/inventory/adjust.ts';
import { newId } from '@merchant/config/ids';

describe('review repros', () => {
  it('form-shaped PUT wipes variant fields the form does not carry', async () => {
    const shop = await dbAdmin.shop.findFirstOrThrow({ select: { id:
… [truncated, 3,151 more chars]
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
./node_modules/.bin/vitest run test-scratch-review.test.ts 2>&1 | tail -40
```

> **↳ result**
> ```
> RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api
> 
> No test files found, exiting with code 1
> 
> filter: test-scratch-review.test.ts
> include: test/**/*.test.ts, src/**/*.test.ts
> exclude:  **/node_modules/**, **/dist/**, **/cypress/**, **/.{idea,git,cache,output,temp}/**, **/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*
> ```

🔧 **Bash**
```
mv test-scratch-review.test.ts test/zz-review-scratch.test.ts && sed -i '' 's|./src/services|../src/services|g' test/zz-review-scratch.test.ts && ./node_modules/.bin/vitest run test/zz-review-scratch.test.ts 2>&1 | tail -40
```

> **↳ result**
> ```
> AssertionError: expected null to be '0123456789012' // Object.is equality
> 
> [32m- Expected:[39m 
> "0123456789012"
> 
> [31m+ Received:[39m 
> null
> 
>  ❯ test/zz-review-scratch.test.ts:34:27
>      32|     const after = updated.variants[0]!;
>      33|     console.log('AFTER PUT:', { barcode: after.barcode, compareAtPrice…
>      34|     expect(after.barcode).toBe('0123456789012'); // FAILS if wiped
>        |                           ^
>      35|   });
>      36| 
> 
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯
> 
>  FAIL  test/zz-review-scratch.test.ts > review repros > renaming an option keeps variant identity and stock
> AssertionError: expected 'var_01M14CZ6EK2JY9W5W67QKCTY30' to be 'var_01M14CZ69KTP88Q4Z2BP1K9ZVR' // Object.
> … [truncated, 735 more chars]
> ```

### 🤖 Claude

Both defects confirmed by failing assertions. Cleaning up and finishing the remaining checks.

🔧 **Bash**
```
rm test/zz-review-scratch.test.ts; cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e && grep -n "cors\|CORS" docker-compose.yml | head -5; echo ---; cat "apps/admin/src/app/store/[slug]/products/new/page.tsx"; echo ---; grep -rn "B5\|B6" docs/AGENT-LOG.md | tail -6
```

> **↳ result**
> ```
> ---
> 'use client';
> 
> /**
>  * `/store/{slug}/products/new`. Owner: WS-B (B5).
>  *
>  * The same form as the edit page with nothing loaded into it; on save it
>  * redirects to the created product, the way Shopify does.
>  */
> import { useParams } from 'next/navigation';
> import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
> import { useSession } from '../../../../../lib/session.ts';
> import { ProductForm } from '../_components/product-form.tsx';
> 
> export default function NewProductPage() {
>   const { slug } = useParams<{ slug: string }>();
>   // The shop's currency decides what the price fields mean, so the form waits
>   // for it rather than guessing USD and mislabelling every inp
> … [truncated, 2,949 more chars]
> ```

🔧 **Bash**
```
grep -n -A8 -i "products index\|Index pages" docs/issues/PARITY.md | head -50
```

> **↳ result**
> ```
> 41:## Index pages (B5, C5, C6, G4)
> 42-
> 43-Anatomy, top to bottom: page title + top-right primary button ("Add
> 44-product", "Create discount") → card containing: tabs row (`All` first) →
> 45-filter row (search input stretching left, filter buttons, sort button
> 46-right) → IndexTable: checkbox column, thumbnail where natural, first column
> 47-bold-ish link, status badges inline → footer pagination ("1-50 of N",
> 48-prev/next arrows). Selecting rows swaps the header for a bulk-actions bar.
> 49-Empty state: centered illustration-sized card, heading + one sentence +
> ```

🔧 **Bash**
```
grep -n "it(\|describe(" apps/api/test/tenancy.test.ts | head -20; echo ---; grep -n "it(" apps/api/test/inventory.test.ts | head -20
```

> **↳ result**
> ```
> 112:describe('HTTP layer', () => {
> 113:  it('lists only the session shop’s rows', async () => {
> 133:  it('404s a get-by-id across the fence, in the SPEC error shape', async () => {
> 151:  it('404s a cross-tenant write without touching the row', async () => {
> 169:describe('reads', () => {
> 170:  it('scopes findMany / findUnique / findFirst', async () => {
> 180:  it('scopes the OrThrow variants', async () => {
> 185:  it('scopes count, aggregate and groupBy', async () => {
> 197:  it('scopes the Shop model to the tenant itself', async () => {
> 204:describe('writes', () => {
> 205:  it('update by another shop’s id throws P2025 and leaves the row unchanged', async () => {
> 214:  it('delete by another shop’
> … [truncated, 1,787 more chars]
> ```

🔧 **Bash**
```
sed -n '1,60p' apps/admin/src/lib/collection-rules.test.ts | grep -n -A4 "conditionToInput\|inputToCondition" | head -30
```

> **↳ result**
> ```
> 15:  conditionToInput,
> 16:  inputToCondition,
> 17-  isRuleComplete,
> 18-  newRule,
> 19-  relationsFor,
> 20-  withColumn,
> ```

🔧 **Bash**
```
grep -n -B2 -A8 "conditionToInput\|inputToCondition" apps/admin/src/lib/collection-rules.test.ts | sed -n '10,60p'
```

> **↳ result**
> ```
> 22-
> 23-describe('legal relations', () => {
> 24-  it('offers every text relation on a text column', () => {
> --
> 76-describe('price is minor units on the wire', () => {
> 77-  it('shows a decimal and sends an integer', () => {
> 78:    expect(conditionToInput('price', '2000')).toBe('20.00');
> 79:    expect(inputToCondition('price', '20.00')).toBe('2000');
> 80:    expect(inputToCondition('price', '19.99')).toBe('1999');
> 81-  });
> 82-
> 83-  it('round-trips without drifting', () => {
> 84-    for (const minor of ['1', '999', '2000', '123456']) {
> 85:      expect(inputToCondition('price', conditionToInput('price', minor))).toBe(minor);
> 86-    }
> 87-  });
> 88-
> 89-  it('leaves the other columns’ values alone', ()
> … [truncated, 1,170 more chars]
> ```

### 🤖 Claude

The review is complete. All checks are green (`pnpm verify`: lint, typecheck, 275 API tests including tenancy), but the workstream is **not** production-ready — I found and reproduced two data-loss defects on the product form's primary flow, plus a dead Settings link and a broken input on the smart-collection builder.

---

# Critical review — Workstream B (Catalog & inventory)

Scope: B1–B6 per [WORKSTREAMS.md](docs/WORKSTREAMS.md) — API routes/services for products, collections, inventory, locations, files; catalog/inventory Prisma schema; the five contracts files; admin pages for products, collections, inventory, and locations. Verified against SPEC.md §5–§9, the B1–B6 issue files, PARITY.md, and DECISIONS.md (the SVG/20 MB presign deviation is a logged decision — not relitigated).

## Findings

**[CRITICAL] Saving the product form silently wipes variant fields the form doesn't carry** — [products.ts:81](packages/contracts/src/products.ts:81), [products.ts:222-246](apps/api/src/services/catalog/products.ts:222)
- **What**: Any `PUT /admin/api/products/:id` whose variants omit `barcode`, `compareAtPrice`, `weightGrams`, `inventoryPolicy`, `requiresShipping`, or `taxable` resets those columns to defaults on every variant — and the B5 form ([product-draft.ts:249-254](apps/admin/src/lib/product-draft.ts:249)) only ever sends `id`, `price`, `sku`, `optionValues`.
- **Evidence**: Reproduced against the seeded database: created a variant with `barcode`, `compareAtPrice: $29.99`, `weightGrams: 500`, `inventoryPolicy: 'continue'`, then replayed exactly what the form sends — the row came back `barcode: null, compareAtPrice: null, weightGrams: null, inventoryPolicy: 'deny'`. Root cause: `createVariantInput` inherits `.default(null)` / `.default(true)` / `.default('deny')` from `productVariantSchema`, so zod fills every unsent field at parse time and the service can't distinguish "not sent" from "sent null" — contradicting the contract's own "`undefined` means leave it alone" doc on `updateProductInput`. Concretely: open any seeded sale product (e.g. seed rows with `compareAtPrice: 15800`), change its title, click Save → the storefront's sale pricing is gone, invisibly.
- **Fix**: Strip the defaults from `upsertVariantInput` (make those fields truly `.optional()`), and in `variantColumns` fall back to the existing row's value when a field is `undefined`. The existing `rowAsPayload` merge is the right template — extend it to field level.

**[HIGH] Renaming a product option destroys all variants: ids, SKUs, and stock** — [product-draft.ts:154-175](apps/admin/src/lib/product-draft.ts:154), [products.ts:442-475](apps/api/src/services/catalog/products.ts:442)
- **What**: Editing an option's name regenerates the client variant table keyed by the *new* name, so no row matches: ids are dropped, SKUs blank, prices reset to row 1's price, stock to 0 — and on save the server (matching by id, then by option signature, both of which changed) deletes every existing variant and creates fresh rows, cascading away their `InventoryLevel`s.
- **Evidence**: Reproduced: variant "S" with 7 units in stock; renamed option `Size` → `Sizing` with the same values, sent the form-shaped payload → the returned "S" variant has a **new id** and **0 stock**. The merchant also watches prices/SKUs visibly reset in the form while typing the new name (each keystroke re-reconciles). Shopify preserves variants across an option rename; the WS-B DECISIONS entry only promises id survival for *value* renames carrying ids — which the form never does.
- **Fix**: In `reconcileVariants`, match old rows to new combinations positionally when only option *names* changed (same value lists), carrying `id`/sku/price/available across. Server-side, `planVariants` could add the same fallback: when the option count and value sets are unchanged, match by per-position value tuple rather than by name-keyed signature.

**[HIGH] Settings → Locations opens a stale "coming soon" placeholder; the real page is unreachable** — [locations/page.tsx:1](apps/admin/src/app/store/[slug]/locations/page.tsx:1), [settings/page.tsx:67](apps/admin/src/app/store/[slug]/settings/page.tsx:67)
- **What**: The settings hub card links to `/store/{slug}/locations`, which is still A4's placeholder reading "Where you stock and ship from lands with B6." B6 built the finished page at `settings/locations/page.tsx` but never replaced the placeholder or repointed the link, so the only UI path to Locations shows a not-yet-built screen.
- **Evidence**: [AGENT-LOG.md:152](docs/AGENT-LOG.md) says explicitly: "B6: one at /locations — REPLACE those two files, do not add alongside." Nothing in the app links to `/settings/locations`. This is a dead feature in the demo (SPEC §18 KPI, CLAUDE.md "no dead code").
- **Fix**: Delete the placeholder and either move the finished page to `/locations` or point the hub card at `/settings/locations`.

**[HIGH] The smart-collection price condition field rewrites itself and can't be typed into** — [rules-builder.tsx:188-203](apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx:188), [collection-rules.ts:93-109](apps/admin/src/lib/collection-rules.ts:93)
- **What**: The money TextField's `value` is `conditionToInput(condition)` while every keystroke runs `inputToCondition` — a canonicalizing round-trip through minor units on a controlled input.
- **Evidence**: Typing "2" stores `200` and the field instantly displays "2.00" (cursor to end). The next keystroke "5" makes the input "2.005", which *rounds* to `201` → "2.01". "$25" is unreachable by typing; only paste works. The unit tests pin both pure halves ([collection-rules.test.ts:78-86](apps/admin/src/lib/collection-rules.test.ts:78)) but never the composed loop. This is code-trace-confirmed, not browser-run — but the mechanism (React controlled input + per-keystroke canonicalization) is unambiguous.
- **Fix**: Keep the raw typed string in component state and convert to minor units only on blur/save (the same string-until-the-boundary pattern the product form's price fields already use).

**[MEDIUM] Products index is missing the mandated sort control and vendor filter** — [products/page.tsx:184](apps/admin/src/app/store/[slug]/products/page.tsx:184)
- **What**: `IndexFilters` is rendered with `filters={[]}` and no `sortOptions`, but B5 mandates "Filters (status, vendor)… Sort by title/created", PARITY.md's index anatomy specifies "filter buttons, sort button right", and the API already implements `sortKey`/`vendor` ([products.ts:287](apps/api/src/services/catalog/products.ts:287)) — server capability with no UI on the KPI centerpiece page.
- **Fix**: Add `sortOptions` (title, created) and a vendor `filters` entry to the existing `IndexFilters`.

**[LOW] New smart collection: displayed sort order and saved sort order disagree** — [collection-form.tsx:328-338](apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:328)
- **What**: Switching type to Automated leaves `sortOrder: 'manual'` in state while the Select's options exclude it — the browser renders the first option ("Best selling") but the save sends `manual`, which the API coerces to `created-desc`. The merchant sees "Best selling", gets "Newest first".
- **Fix**: When type flips to smart, patch `sortOrder` to `'created-desc'`.

**[LOW] A `deny` variant with negative stock can't be restocked via `adjust`** — [adjust.ts:247-252](apps/api/src/services/inventory/adjust.ts:247)
- **What**: The policy check fires whenever the post-adjust level is negative, so a *positive* delta that doesn't reach zero (oversold under `continue`, policy later flipped to `deny` — which the CRITICAL bug above does en masse) returns 409 on a restock; `refund.ts`/`cancel.ts` restocks through `adjustMany` would fail the whole refund batch.
- **Fix**: Only enforce the check when `input.delta < 0`.

**[LOW] Minor display defects**: a sold-out single-variant product reads "Inventory not tracked" instead of "0 in stock" ([products/page.tsx:57-62](apps/admin/src/app/store/[slug]/products/page.tsx:57)); in a multi-location shop the read-only stock field is labeled "Available at {first location}" but shows the *sum across all locations* ([product-form.tsx:259-262](apps/admin/src/app/store/[slug]/products/_components/product-form.tsx:259)); `deleteLocation`'s last-location and stocked checks run outside the delete transaction, so two concurrent deletes can leave a shop with zero locations ([query.ts:129-145](apps/api/src/services/inventory/query.ts:129)); the rules builder hardcodes a "$" prefix and 2-decimal display regardless of shop currency ([collection-rules.ts:96](apps/admin/src/lib/collection-rules.ts:96)).

## What held up well

Not findings, but relevant to "production ready": the tenant client is used everywhere (no raw `dbAdmin` in WS-B request paths); every stock mutation in the codebase — including WS-C's fulfill/refund/cancel and WS-E's checkout — goes through `adjustMany`, and the SQL-increment-under-row-lock design is real and concurrency-tested; money is integer minor units end to end with string-typed inputs; smart-collection rules translate to SQL (not in-memory), with NULL-correct negation.

---

**(a) Flows traced end-to-end**: product create → option matrix expansion → nested write → DTO; product form save (draft → `draftToInput` → PUT → variant reconcile plan → stock via `/inventory/set`); option edit → client reconcile → server `planVariants` → variant delete/create → inventory cascade; smart collection create/edit → rule translation → preview/membership/read paths (all five sort orders); inventory inline edit → `changedLevels` → `setMany` → adjustment history; location CRUD including delete guards; presigned upload → bucket PUT → `ProductImage.url`.

**(b) Checks run**: `pnpm verify` — env parity, Biome, `tsc` across all 10 packages, and 275 API tests (20 files) all green, including the tenancy suite and the WS-B suites (products 16, collections 27, inventory 18, files 7). Two purpose-built repro tests against the real seeded Postgres confirmed the CRITICAL and the option-rename findings with failing assertions (`barcode: null` after a form-shaped PUT; variant id changed and 7 units of stock gone after an option rename); the repro file was removed afterward.

**(c) Not verified**: browser-level behavior — I did not boot the dev stack (ports are shared with other worktrees), so the rules-builder typing defect, pixel parity, the Polaris `Select` fallback rendering, and the actual MinIO CORS behavior on browser PUTs (no explicit CORS config exists in `docker-compose.yml`; MinIO's permissive default is assumed) are confirmed by code trace only. The Playwright smoke suite (`pnpm e2e`) was not run — it needs the full seeded stack. Multi-location and non-USD-currency paths have no automated coverage anywhere and were reviewed by reading only.

The two data-loss bugs share one root cause (zod defaults masquerading as explicit values) and one fix site each — I'd hold the "production ready" label until those and the Locations link are addressed.

### 👤 User

fix all the issues you found. if you think something is not worth fixing, dont fix it. spawn sub agents where neccessary. make sure you do not go out of bounds of workstream B. other streams might still be in progress!

### 🤖 Claude

I'll fix these findings on a proper `ws-b/` branch off fresh main, per the repo workflow. Skipping only the `deleteLocation` concurrency race (improbable, and a correct fix needs locking machinery disproportionate to the risk). Everything else gets fixed.

🔧 **Bash**
```
git status --short | head -5; git fetch origin main 2>&1 | tail -2; git log --oneline origin/main -3
```

> **↳ result**
> ```
> From github.com:pauljurgens11/shopify
>  * branch            main       -> FETCH_HEAD
> fcc1b04 docs(root): resolve-issue skill — the loop as actually practised (#59)
> 49bd670 fix(shared): checkout emits orders/paid, confirmation email gets its button, one customer path (#63)
> 3e03b77 feat(ws-e): checkout UI, hosted card fields and confirmation (#61)
> ```

🔧 **Bash**
```
git checkout -b ws-b/critical-review-fixes origin/main 2>&1 | tail -2 && git log --oneline -1 && pnpm install --silent 2>&1 | tail -2; pnpm worktree:env --migrate 2>&1 | tail -3
```

> **↳ result**
> ```
> Switched to a new branch 'ws-b/critical-review-fixes'
> branch 'ws-b/critical-review-fixes' set up to track 'origin/main' by rebasing.
> fcc1b04 docs(root): resolve-issue skill — the loop as actually practised (#59)
> 
>   Each worktree now has its own database and Redis keyspace.
>   Ports 3000/3001/3002 are still shared on purpose — one dev stack at a time.
> ```

🔧 **Bash**
```
git diff --stat 2b9c3f0 fcc1b04 -- packages/contracts/src/products.ts apps/api/src/services/catalog/ apps/api/src/services/inventory/ apps/admin/src/lib/ "apps/admin/src/app/store/[slug]/products" "apps/admin/src/app/store/[slug]/collections" "apps/admin/src/app/store/[slug]/inventory" "apps/admin/src/app/store/[slug]/locations" "apps/admin/src/app/store/[slug]/settings/locations" | tail -5
```

> **↳ result**
> ```
> apps/admin/src/lib/discount-draft.test.ts | 67 +++++++++++++++++++++++++++++++
>  1 file changed, 67 insertions(+)
> ```

### 🤖 Claude

No relevant drift. Checking contract consumers before the change:

🔧 **Bash**
```
grep -rn "updateProductInput\|upsertVariantInput\|UpdateProductInput" --include="*.ts" --include="*.tsx" apps packages e2e 2>/dev/null | grep -v node_modules | grep -v "contracts/src/products.ts"
```

> **↳ result**
> ```
> apps/api/src/routes/admin/products/index.ts:13:  updateProductInput,
> apps/api/src/routes/admin/products/index.ts:73:    const input = updateProductInput.parse(request.body);
> apps/api/src/services/catalog/products.ts:27:  UpdateProductInput,
> apps/api/src/services/catalog/products.ts:482:  input: UpdateProductInput,
> ```

### 🤖 Claude

Only WS-B's own code consumes it. Let me check the sort contract field names, then start editing.

🔧 **Bash**
```
grep -n -A8 "sortQuery" packages/contracts/src/common.ts | head -14; grep -rn "settings/locations" apps/admin/src apps/api/src e2e 2>/dev/null | grep -v node_modules
```

> **↳ result**
> ```
> 111:export const sortQuery = z.object({
> 112-  sortKey: z.string().optional(),
> 113-  sortOrder: z.enum(['asc', 'desc']).default('desc'),
> 114-});
> 115-
> 116-/** `paginated(productSchema)` → `{ data: Product[]; nextCursor: string | null }`. */
> 117-export function paginated<T extends z.ZodTypeAny>(item: T) {
> 118-  return z.object({ data: z.array(item), nextCursor: z.string().nullable() });
> 119-}
> ```

### 🤖 Claude

Nothing else references `settings/locations`. Starting with the contract fix (root cause of the CRITICAL):

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/products.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/packages/contracts/src/products.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the service — per-field overlay for kept rows plus the positional option-rename remap:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/catalog/products.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the client half — carry variant identity across an option rename:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the product form: only apply stock writes when the field was actually editable, and drop the misleading location label:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the Locations placeholder replacement — move the real page to `/store/{slug}/locations` (as A4's AGENT-LOG instructed) and remove the orphaned `settings/locations` copy:

🔧 **Bash**
```
git mv "apps/admin/src/app/store/[slug]/settings/locations/page.tsx" "apps/admin/src/app/store/[slug]/locations/page.tsx" 2>&1; rmdir "apps/admin/src/app/store/[slug]/settings/locations" 2>&1; git status --short | head
```

> **↳ result**
> ```
> fatal: destination exists, source=apps/admin/src/app/store/[slug]/settings/locations/page.tsx, destination=apps/admin/src/app/store/[slug]/locations/page.tsx
> rmdir: apps/admin/src/app/store/[slug]/settings/locations: Directory not empty
>  M apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
>  M apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
>  M apps/admin/src/lib/product-draft.ts
>  M apps/api/src/services/catalog/products.ts
>  M packages/contracts/src/products.ts
> ```

🔧 **Bash**
```
git rm -q "apps/admin/src/app/store/[slug]/locations/page.tsx" && git mv "apps/admin/src/app/store/[slug]/settings/locations/page.tsx" "apps/admin/src/app/store/[slug]/locations/page.tsx" && git status --short | grep -i location
```

> **↳ result**
> ```
> Exit code 128
> fatal: renaming 'apps/admin/src/app/store/[slug]/settings/locations/page.tsx' failed: No such file or directory
> ```

🔧 **Bash**
```
ls "apps/admin/src/app/store/[slug]/settings/locations/" "apps/admin/src/app/store/[slug]/locations/" 2>&1; git status --short | grep -i locat
```

> **↳ result**
> ```
> ls: apps/admin/src/app/store/[slug]/locations/: No such file or directory
> apps/admin/src/app/store/[slug]/settings/locations/:
> page.tsx
> D  apps/admin/src/app/store/[slug]/locations/page.tsx
> ```

🔧 **Bash**
```
mkdir -p "apps/admin/src/app/store/[slug]/locations" && git mv "apps/admin/src/app/store/[slug]/settings/locations/page.tsx" "apps/admin/src/app/store/[slug]/locations/page.tsx" && rmdir "apps/admin/src/app/store/[slug]/settings/locations" && git status --short | grep -i locat
```

> **↳ result**
> ```
> M  apps/admin/src/app/store/[slug]/locations/page.tsx
> D  apps/admin/src/app/store/[slug]/settings/locations/page.tsx
> ```

🔧 **Bash**
```
grep -n "\.\./" "apps/admin/src/app/store/[slug]/locations/page.tsx"
```

> **↳ result**
> ```
> 29:import { PageSkeleton } from '../../../../../components/shell/page-skeleton.tsx';
> 30:import { useToast } from '../../../../../components/shell/toast-provider.tsx';
> 31:import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
> ```

🔧 **Bash**
```
sed -i '' 's|\.\./\.\./\.\./\.\./\.\./|../../../../|g' "apps/admin/src/app/store/[slug]/locations/page.tsx" && grep -n "import.*\.\./" "apps/admin/src/app/store/[slug]/locations/page.tsx"
```

> **↳ result**
> ```
> 29:import { PageSkeleton } from '../../../../components/shell/page-skeleton.tsx';
> 30:import { useToast } from '../../../../components/shell/toast-provider.tsx';
> 31:import { type ApiError, apiFetch, useApiQuery } from '../../../../lib/api.ts';
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/locations/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/locations/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the rules-builder money/text input fix plus currency-aware display in `collection-rules.ts`:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/collection-rules.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/collection-rules.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/collection-rules.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/collection-rules.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the collection form's sort-order desync on type flip:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the inventory service — allow restocking a `deny` variant that's below zero:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/inventory/adjust.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/src/services/inventory/adjust.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the products index: sold-out phrasing, sort options, and the vendor filter:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/products/page.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

All code fixes are in. Now regression tests — first, the existing test conventions:

🔧 **Bash**
```
sed -n '1,110p' apps/api/test/products.test.ts
```

> **↳ result**
> ```
> /**
>  * B1 — products & variants API.
>  *
>  * Scope is the engine logic the product form (B5), the storefront (E1) and the
>  * seed (H1) all depend on, against a real Postgres: option matrix → variant
>  * set, PUT reconciliation, handle uniqueness, and the list query. Trivial
>  * get/delete round-trips are deliberately absent (SPEC §14 — no CRUD sweeps).
>  * General cross-tenant isolation belongs to A2's suite; the one exception here
>  * is `?query=`, whose `OR` clause is the classic place a shop filter escapes.
>  */
> import { CSRF_HEADER_VALUE } from '@merchant/config/constants';
> import type { FastifyInstance } from 'fastify';
> import { afterAll, beforeAll, describe, expect, it } from 'vitest';
> import
> … [truncated, 3,118 more chars]
> ```

🔧 **Bash**
```
grep -n "describe(\|it(" apps/api/test/products.test.ts
```

> **↳ result**
> ```
> 91:describe('variant generation', () => {
> 92:  it('expands options into the cartesian product, in option order', async () => {
> 110:  it('keeps the attributes of each supplied combination and templates the rest', async () => {
> 133:  it('gives an option-less product the single Default Title variant', async () => {
> 145:  it('rejects an option set that would explode the variant table', async () => {
> 160:describe('money', () => {
> 161:  it('refuses a fractional price rather than silently rounding it', async () => {
> 172:describe('handles', () => {
> 173:  it('slugifies the title and suffixes a clash the way Shopify does', async () => {
> 183:  it('conflicts on an explicitly chosen handle instead of ren
> … [truncated, 657 more chars]
> ```

🔧 **Bash**
```
sed -n '196,261p' apps/api/test/products.test.ts
```

> **↳ result**
> ```
> describe('PUT reconciliation', () => {
>   it('keeps surviving variant ids, creates new combinations, drops the rest', async () => {
>     const created = await createProduct({
>       title: 'Reconcile Tee',
>       options: [
>         { name: 'Size', position: 0, values: ['S', 'M'] },
>         { name: 'Color', position: 1, values: ['Black', 'White'] },
>       ],
>       variants: [{ price: usd(3000) }],
>     });
>     const idFor = (list: VariantDto[], title: string) =>
>       list.find((v) => v.title === title)?.id ?? null;
>     const originalBlack = idFor(created.variants, 'S / Black');
>     const originalWhite = idFor(created.variants, 'S / White');
> 
>     const response = await write('PUT', `${PRODUCTS}/${
> … [truncated, 2,226 more chars]
> ```

🔧 **Bash**
```
grep -n "location" apps/api/test/helpers.ts | head; grep -n "locationId\|/admin/api/locations" apps/api/test/inventory.test.ts | head -8
```

> **↳ result**
> ```
> 126:  // cascade from the variant and from the location. Adjustments have no FK — the
> 130:  await dbAdmin.location.deleteMany({ where });
> 48:  const response = await write('POST', '/admin/api/locations', { name });
> 76:const availableAt = async (variantId: string, locationId: string) =>
> 77:  (await dbAdmin.inventoryLevel.findFirst({ where: { variantId, locationId } }))?.available ?? null;
> 99:      locationId: warehouse,
> 107:    expect(history[0]).toMatchObject({ delta: 12, reason: 'received', locationId: warehouse });
> 114:    await adjust(db, { variantId, locationId: warehouse, delta: 5, reason: 'received' });
> 117:      locationId: warehouse,
> 133:    await adjust(db, { variantId, locationId:
> … [truncated, 44 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/test/products.test.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/test/products.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
sed -n '40,60p;160,195p' apps/api/test/inventory.test.ts
```

> **↳ result**
> ```
> method,
>     url,
>     headers: { cookie, 'x-requested-with': CSRF_HEADER_VALUE },
>     ...(payload === undefined ? {} : { payload }),
>   });
> }
> 
> async function createLocation(name: string): Promise<string> {
>   const response = await write('POST', '/admin/api/locations', { name });
>   expect(response.statusCode, response.body).toBe(201);
>   return response.json().id;
> }
> 
> /** A product whose single variant is the thing we move stock on. */
> async function createVariant(
>   title: string,
>   options: { inventoryPolicy?: 'deny' | 'continue'; sku?: string } = {},
> ): Promise<{ productId: string; variantId: string }> {
>   const response = await write('POST', '/admin/api/products', {
>     title,
>     variants: [
> … [truncated, 1,440 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/test/inventory.test.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/api/test/inventory.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
grep -n "dbAdmin" apps/api/test/inventory.test.ts | head -3; grep -n "describe(\|it(" apps/admin/src/lib/product-draft.test.ts | head
```

> **↳ result**
> ```
> 11:import { dbAdmin } from '@merchant/db/client';
> 74:  dbAdmin.inventoryAdjustment.findMany({ where: { variantId }, orderBy: { createdAt: 'asc' } });
> 77:  (await dbAdmin.inventoryLevel.findFirst({ where: { variantId, locationId } }))?.available ?? null;
> 58:describe('the option matrix', () => {
> 59:  it('expands first-option-slowest, exactly like the API', () => {
> 70:  it('ignores a half-typed option, so the table does not flicker while typing', () => {
> 75:  it('names the single row Default Title when there are no options', () => {
> 80:describe('addOptionValues', () => {
> 84:  it('adds every value from a single paste, not just the last', () => {
> 89:  it('ignores blanks and case-insensitive dupli
> … [truncated, 213 more chars]
> ```

🔧 **Bash**
```
sed -n '95,140p' apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> describe('reconcileVariants', () => {
>   it('keeps the price, sku and id of a combination that survives an option edit', () => {
>     const before = reconcileVariants([option('Size', ['S', 'M'])], emptyDraft().variants).map(
>       (row, i) => ({ ...row, id: `var_kept${i}`, price: `${10 + i}.00`, sku: `SKU-${i}` }),
>     );
> 
>     const after = reconcileVariants([option('Size', ['S', 'M', 'L'])], before);
> 
>     expect(after.map((v) => v.title)).toEqual(['S', 'M', 'L']);
>     expect(at(after, 0)).toMatchObject({ id: 'var_kept0', price: '10.00', sku: 'SKU-0' });
>     expect(at(after, 1)).toMatchObject({ id: 'var_kept1', price: '11.00', sku: 'SKU-1' });
>     // The new row inherits a price so it is not s
> … [truncated, 1,486 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
grep -n "renameOptionKeys\|^import\|from './product-draft" apps/admin/src/lib/product-draft.test.ts | head -8
```

> **↳ result**
> ```
> 12:import type { Product } from '@merchant/contracts/products';
> 13:import { describe, expect, it } from 'vitest';
> 14:import {
> 27:} from './product-draft.ts';
> 117:  it('keeps every row across an option RENAME, via renameOptionKeys', () => {
> 131:    const after = reconcileVariants(newOptions, renameOptionKeys(oldOptions, newOptions, before));
> 149:    expect(renameOptionKeys(oldOptions, newOptions, variants)).toBe(variants);
> ```

🔧 **Bash**
```
sed -n '14,27p' apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> import {
>   addOptionValues,
>   draftFromProduct,
>   draftToInput,
>   emptyDraft,
>   htmlToText,
>   isSimpleHtml,
>   matrixOf,
>   reconcileVariants,
>   stockChanges,
>   textToHtml,
>   validate,
>   variantTitleOf,
> } from './product-draft.ts';
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/lib/product-draft.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now append the DECISIONS.md and AGENT-LOG.md entries, then run the full verify:

🔧 **Bash**
```
cat >> DECISIONS.md <<'EOF'
2026-08-28 | WS-B | `upsertVariantInput` (PUT /products variants) is `.partial()` WITHOUT create-side defaults, and the service overlays only the DEFINED fields of a mentioned variant onto the existing row — the inherited defaults made an omitted `barcode` parse as explicit `null` and omitted `inventoryPolicy` as `'deny'`, so the admin form (which sends only id/price/sku/optionValues) wiped compareAtPrice/barcode/weight/policy on every save. Loosening: accepts strictly more payloads; only B's own route/service consume the schema.
2026-08-28 | WS-B | Option RENAME pr
… [truncated, 1,311 more chars]
```

> **↳ result**
> ```
> 122 120 │   /**
>   
> 
> Checked 409 files in 312ms. No fixes applied.
> Found 6 errors.
> check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Some errors were emitted while running checks.
>   
> 
>  ELIFECYCLE  Command failed with exit code 1.
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | grep -E "^[a-z/].*\.(ts|tsx)|━.*lint|error\[" | head; pnpm lint 2>&1 | grep -B3 -A18 "×" | head -80
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx:242:27 lint/suspicious/noArrayIndexKey ━━━━━━━━━━
> apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx format ━━━━━━━━━━━━━━━━━━━
> apps/admin/src/lib/collection-rules.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> apps/admin/src/lib/product-draft.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> apps/api/test/inventory.test.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> packages/contracts/src/products.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> apps/admin/src/app/store/[slug]/collections/_components/rules-builder.
> … [truncated, 3,424 more chars]
> ```

🔧 **Bash**
```
pnpm format 2>&1 | tail -3
```

> **↳ result**
> ```
> > biome format --write .
> 
> Formatted 408 files in 102ms. Fixed 5 files.
> [This command modified 5 files you've previously read: apps/admin/src/lib/collection-rules.ts, packages/contracts/src/products.ts, apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx, apps/admin/src/lib/product-draft.ts, apps/api/test/inventory.test.ts. Call Read before editing.]
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> 232	                  labelHidden
> 233	                  options={relationOptions(rule.column)}
> 234	                  value={rule.relation}
> 235	                  onChange={(relation) =>
> 236	                    setRule(index, { ...rule, relation: relation as CollectionRule['relation'] })
> 237	                  }
> 238	                />
> 239	              </Box>
> 240	              <Box minWidth="180px">
> 241	                <RuleValueField
> 242	                  // Remount on a column change, so the text restarts from the
> 243	                  // (possibly cleared) condition rather than the old column's.
> 244	                  key={`${index}-${rule.column}`}
> 245	                  rule={rule}
> 246
> … [truncated, 178 more chars]
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e/apps/admin/src/app/store/[slug]/collections/_components/rules-builder.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
pnpm verify 2>&1 | tail -8
```

> **↳ result**
> ```
> @merchant/api:test:    Start at  17:55:06
> @merchant/api:test:    Duration  54.75s (transform 5.07s, setup 756ms, collect 17.28s, tests 31.02s, environment 0ms, prepare 1.33s)
> @merchant/api:test: 
> 
>  Tasks:    10 successful, 10 total
> Cached:    5 cached, 10 total
>   Time:    1m11.856s
> ```

🔧 **Bash**
```
cd apps/api && ./node_modules/.bin/vitest run test/products.test.ts test/inventory.test.ts 2>&1 | tail -8; cd ../admin && ./node_modules/.bin/vitest run src/lib/product-draft.test.ts src/lib/collection-rules.test.ts 2>&1 | tail -7
```

> **↳ result**
> ```
> ✓ test/inventory.test.ts (19 tests) 2146ms
>  ✓ test/products.test.ts (18 tests) 805ms
> 
>  Test Files  2 passed (2)
>       Tests  37 passed (37)
>    Start at  17:56:07
>    Duration  4.57s (transform 238ms, setup 31ms, collect 546ms, tests 2.95s, environment 0ms, prepare 571ms)
> 
>  ✓ src/lib/product-draft.test.ts (22 tests) 18ms
> 
>  Test Files  2 passed (2)
>       Tests  34 passed (34)
>    Start at  17:56:12
>    Duration  778ms (transform 264ms, setup 0ms, collect 358ms, tests 24ms, environment 0ms, prepare 364ms)
> ```

### 🤖 Claude

All suites green, including the four new regression tests. Let me verify the UI changes live in the browser — first checking whether the shared ports are free:

🔧 **Bash**
```
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN 2>/dev/null | head -5; echo "exit:$?"
```

> **↳ result**
> ```
> COMMAND   PID        USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
> node    36239 pauljurgens   13u  IPv6 0x47bc8c26a3c27ca2      0t0  TCP *:3002 (LISTEN)
> node    36240 pauljurgens   13u  IPv6 0x36e8d3833e18d8d3      0t0  TCP *:3000 (LISTEN)
> node    38129 pauljurgens   30u  IPv4 0xf374531cccacd4b7      0t0  TCP *:3001 (LISTEN)
> exit:0
> ```

🔧 **Bash**
```
for pid in 36239 36240 38129; do echo "$pid: $(lsof -a -p $pid -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2-)"; done
```

> **↳ result**
> ```
> 36239: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/resolve-docs-issue-3f28ad/apps/storefront
> 36240: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/resolve-docs-issue-3f28ad/apps/admin
> 38129: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/resolve-docs-issue-3f28ad/apps/api
> ```

🔧 **Bash**
```
git add -A && git status --short && git commit -m "fix(ws-b): stop product saves wiping variant fields, survive option renames, un-strand Locations [contracts]

Critical-review fixes for workstream B:

- upsertVariantInput is .partial() without create-side defaults, and the
  update service overlays only the DEFINED fields of a mentioned variant
  onto its row — a form-shaped PUT (id/price/sku/optionValues only) no
  longer resets barcode, compareAtPrice, weight, requiresShipping,
  taxable and inventoryPolicy on every save.
- Option renames re-key existing rows position-for-position, client
… [truncated, 1,384 more chars]
```

> **↳ result**
> ```
> M  ../../DECISIONS.md
> M  src/app/store/[slug]/collections/_components/collection-form.tsx
> M  src/app/store/[slug]/collections/_components/rules-builder.tsx
> M  src/app/store/[slug]/locations/page.tsx
> M  src/app/store/[slug]/products/_components/product-form.tsx
> M  src/app/store/[slug]/products/_components/variants-card.tsx
> M  src/app/store/[slug]/products/page.tsx
> D  src/app/store/[slug]/settings/locations/page.tsx
> M  src/lib/collection-rules.ts
> M  src/lib/product-draft.test.ts
> M  src/lib/product-draft.ts
> M  ../api/src/services/catalog/products.ts
> M  ../api/src/services/inventory/adjust.ts
> M  ../api/test/inventory.test.ts
> M  ../api/test/products.test.ts
> M  ../../docs/AGENT-LOG.md
> M  ../../pac
> … [truncated, 312 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/workstream-b-critical-review-1fb97e && git push -u origin ws-b/critical-review-fixes 2>&1 | tail -2 && gh pr create --title "fix(ws-b): critical-review fixes — variant data loss, option renames, Locations page [contracts]" --body "$(cat <<'EOF'
Fixes every finding from the workstream B critical review that was worth fixing.

## Data integrity (the two reproduced bugs)
- **Form-shaped product PUTs no longer wipe variant fields they don't carry.** `upsertVariantInput` is now `.partial()` without create-side defaults, and `updateP
… [truncated, 3,144 more chars]
```

> **↳ result**
> ```
> * [new branch]      ws-b/critical-review-fixes -> ws-b/critical-review-fixes
> branch 'ws-b/critical-review-fixes' set up to track 'origin/ws-b/critical-review-fixes' by rebasing.
> https://github.com/pauljurgens11/shopify/pull/66
> ```

🔧 **Bash**
```
gh pr merge --auto --squash --delete-branch 2>&1 | tail -2; gh pr view 66 --json mergeable,mergeStateStatus,autoMergeRequest --jq '{mergeable, mergeStateStatus, auto: .autoMergeRequest != null}'
```

> **↳ result**
> ```
> {"auto":true,"mergeStateStatus":"DIRTY","mergeable":"CONFLICTING"}
> ```

### 🤖 Claude

The PR is CONFLICTING — the known concurrent-append issue on `DECISIONS.md`/`AGENT-LOG.md` (main moved since I branched). Running the documented fix:

🔧 **Bash**
```
pnpm sync 2>&1 | tail -6
```

> **↳ result**
> ```
> ==> pushing ws-b/critical-review-fixes
> To github.com:pauljurgens11/shopify.git
>  + 99719d8...ef6a668 ws-b/critical-review-fixes -> ws-b/critical-review-fixes (forced update)
> 
> Done. pr-checks starts within a minute; auto-merge lands it from there.
>     gh pr checks   # if you want to watch it
> ```

🔧 **Bash**
```
sleep 45 && gh pr view 66 --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}'; gh pr checks 66 2>&1 | head -5
```

> **↳ result**
> ```
> <tool_use_error>Blocked: sleep 45 followed by: gh pr view 66 --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}' gh pr checks 66 head -5. To wait for a condition, use Monitor with an until-loop (e.g. `until <check>; do sleep 2; done`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.</tool_use_error>
> ```

🔧 **ToolSearch**
```
{"query": "select:Monitor", "max_results": 1}
```

🔧 **Bash**
```
until [ "$(gh pr view 66 --json mergeable --jq .mergeable)" != "UNKNOWN" ]; do sleep 5; done; gh pr view 66 --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}'
```

> **↳ result**
> ```
> {"mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE"}
> ```

### 🤖 Claude

Mergeable now — checks are running with auto-merge armed. I'll watch for the outcome in the background:

🔧 **Bash**
```
until state=$(gh pr view 66 --json state,mergeStateStatus --jq '.state + " " + .mergeStateStatus' 2>/dev/null) && { [ "${state%% *}" = "MERGED" ] || [ "${state#* }" = "DIRTY" ] || gh pr checks 66 --json bucket --jq 'any(.bucket == "fail")' 2>/dev/null | grep -q true; }; do sleep 30; done; echo "PR 66 final: $state"; gh pr checks 66 2>/dev/null | head -5
```

> **↳ result**
> ```
> Command running in background with ID: b7wnbg6kk. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-workstream-b-critical-review-1fb97e/50678d78-3745-46c7-8a32-649efa5dc878/tasks/b7wnbg6kk.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

### 🤖 Claude

All fixes are in — [PR #66](https://github.com/pauljurgens11/shopify/pull/66) is open, mergeable, and armed to auto-merge once CI is green (I'm watching it in the background and will report the outcome).

**What was fixed** (branch `ws-b/critical-review-fixes`, one squash commit, 17 files):

- **CRITICAL — variant field wipe**: `upsertVariantInput` is now `.partial()` without create-side defaults, and `updateProduct` overlays only the payload's *defined* fields onto each kept row. A form-shaped PUT no longer resets `barcode`, `compareAtPrice`, `weightGrams`, `requiresShipping`, `taxable`, or `inventoryPolicy`. Logged in `DECISIONS.md` (contracts loosening; only WS-B's own code consumes the schema).
- **HIGH — option rename destroyed variants**: existing rows are re-keyed old-name→new-name positionally before matching, in both the form (`renameOptionKeys` before `reconcileVariants`) and the API (`withRenamedOptionKeys` before `planVariants`). Renaming "Size"→"Sizing" now keeps ids, SKUs, prices, and inventory levels — verified with a real-Postgres test that carries 7 units of stock across the rename.
- **HIGH — stranded Locations page**: the real page moved to `/store/{slug}/locations`, replacing A4's "coming soon" placeholder exactly as its AGENT-LOG entry instructed; the orphaned `settings/locations` copy is deleted. The Settings hub card now opens the finished page.
- **HIGH — untypeable price condition**: the rules-builder value field keeps the raw typed text and canonicalizes only on the rule, so "$25" is typeable again (this also fixes spaces being eaten in text conditions). Display and currency prefix now follow the shop currency.
- **MEDIUM — products index**: added the B5-mandated sort control (created/title, both directions) and a vendor filter with an applied-filter chip.
- **LOWs**: restocking a `deny` variant out of a negative balance no longer 409s (only decrements are policed — refund/cancel restocks hit this); sold-out products read "0 in stock"; the stock column dropped the misleading `Available at {location}` label and only writes stock when the cells were editable; new smart collections no longer display one sort order and save another.

**Deliberately not fixed**: the `deleteLocation` check-then-delete race — improbable, and a correct fix needs locking machinery disproportionate to the risk (noted in the PR).

**Verification**: `pnpm verify` fully green — lint, typecheck, all 278 API tests (tenancy suite included) plus admin unit tests, with 4 new regression tests covering the two data-loss bugs, the rename re-key, and the restock rule. One caveat, also noted in the PR: I didn't do a live browser pass because the shared dev ports are owned by another worktree's running stack and I didn't want to kill an in-progress agent's servers — the UI changes are typechecked and unit-tested, but the pages deserve one manual look after merge.

**Bounds**: every touched file is WS-B-owned (routes, services, contracts/products.ts, B's admin pages and lib modules, B's test files) except the `/locations` placeholder, which A4's log explicitly told B6 to replace; `DECISIONS.md`/`AGENT-LOG.md` were append-only. No other workstream's code was modified.

### 👤 User

<task-notification>
<task-id>b7wnbg6kk</task-id>
<tool-use-id>toolu_0182Khpmq5dU3JvyR3H1ueNu</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-workstream-b-critical-review-1fb97e/50678d78-3745-46c7-8a32-649efa5dc878/tasks/b7wnbg6kk.output</output-file>
<status>completed</status>
<summary>Background command "Watch PR 66 until merged or a check fails" completed (exit code 0)</summary>
</task-notification>

🔧 **Bash**
```
cat /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-workstream-b-critical-review-1fb97e/50678d78-3745-46c7-8a32-649efa5dc878/tasks/b7wnbg6kk.output
```

> **↳ result**
> ```
> PR 66 final: MERGED UNKNOWN
> enable	pass	3s	https://github.com/pauljurgens11/shopify/actions/runs/33182771035/job/98887925876	
> pr-checks	pass	1m25s	https://github.com/pauljurgens11/shopify/actions/runs/33182772531/job/98887931107	
> rebase	pass	4s	https://github.com/pauljurgens11/shopify/actions/runs/33182771050/job/98888062595	
> triage	pass	23s	https://github.com/pauljurgens11/shopify/actions/runs/33182771050/job/98887948897	
> 
> [exited with code 0]
> ```

### 🤖 Claude

[PR #66](https://github.com/pauljurgens11/shopify/pull/66) has **merged into main** — all checks passed (`pr-checks` green in 1m25s) and auto-merge landed it with the branch deleted. All the workstream B review fixes are now on `main`.
