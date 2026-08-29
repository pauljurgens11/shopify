# How domains work locally

| | |
|---|---|
| **Session** | `3b8ea5b6-afcf-4a6e-a0fc-7588036323bd` |
| **Started** | 2026-08-29T09:36:44.121Z |
| **Ended** | 2026-08-29T10:21:22.006Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode` |
| **Branch** | `ws-d/stripe-test-mode` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

currently, how does the domains work. if i create a new website (im running locally) what happens?

### 🤖 Claude

I'll dig into how tenant/domain resolution actually works in this repo.

🔧 **Bash**
```
grep -rn "domain" --include=*.ts --include=*.tsx --include=*.prisma -il packages apps | head -50
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
grep -n "domain\|slug" packages/db/prisma/schema.prisma | head -40
```

> **↳ result**
> ```
> ugrep: warning: packages/db/prisma/schema.prisma: No such file or directory
> ```

🔧 **Bash**
```
ls && echo "---" && find . -name "schema.prisma" -not -path "*/node_modules/*"
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
pwd && ls -la
```

> **↳ result**
> ```
> /Users/pauljurgens/Downloads/projects/shopify
> total 760
> drwxr-xr-x@ 35 pauljurgens  staff    1120 Aug 29 12:27 .
> drwxr-xr-x@ 16 pauljurgens  staff     512 Aug 28 11:04 ..
> drwxr-xr-x@  7 pauljurgens  staff     224 Aug 28 17:46 .claude
> -rw-r--r--@  1 pauljurgens  staff     357 Aug 28 11:28 .dockerignore
> -rw-------@  1 pauljurgens  staff    2570 Aug 29 12:04 .env
> -rw-------@  1 pauljurgens  staff    2461 Aug 28 19:42 .env.bak-1787935348
> -rw-r--r--@  1 pauljurgens  staff    2677 Aug 29 12:20 .env.example
> drwxr-xr-x  16 pauljurgens  staff     512 Aug 29 12:27 .git
> -rw-r--r--@  1 pauljurgens  staff    1153 Aug 28 11:28 .gitattributes
> drwxr-xr-x@  5 pauljurgens  staff     160 Aug 28 11:28 .githooks
> … [truncated, 1,646 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; find packages/db -name "schema.prisma" -not -path "*/node_modules/*" 2>/dev/null; ls packages
```

> **↳ result**
> ```
> Exit code 1
> ```

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/packages
```

> **↳ result**
> ```
> Exit code 1
> (eval):1: pipe failed: too many open files in system
> ```

🔧 **ToolSearch**
```
{"query": "select:Glob,Grep", "max_results": 5}
```

> **↳ result**
> ```
> No matching deferred tools found
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema.prisma
```

> **↳ result**
> ```
> File does not exist. Note: your current working directory is /Users/pauljurgens/Downloads/projects/shopify. Did you mean schema?
> ```

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema
```

> **↳ result**
> ```
> ENFILE: file table overflow, open '/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/boc7xgy0t.output'
> ```

🔧 **Read**
```
/Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema/shop.prisma
```

> **↳ result**
> ```
> File does not exist. Note: your current working directory is /Users/pauljurgens/Downloads/projects/shopify.
> ```

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/packages/db/prisma/schema 2>&1 | head -30
```

> **↳ result**
> ```
> analytics.prisma
> apps.prisma
> catalog.prisma
> checkout.prisma
> customers.prisma
> discounts.prisma
> inventory.prisma
> migrations
> orders.prisma
> pay.prisma
> platform.prisma
> schema.prisma
> theme.prisma
> ```

### 🤖 Claude

That worked — Bash is back. Let me look at tenant resolution.

🔧 **Bash**
```
sed -n '1,120p' packages/db/prisma/schema/platform.prisma
```

> **↳ result**
> ```
> // Platform-level models: not tenant-scoped (Shop IS the tenant). Owner: WS-A.
> 
> model Shop {
>   id           String   @id
>   slug         String   @unique
>   name         String
>   email        String?
>   currencyCode String   @default("USD")
>   timezone     String   @default("UTC")
>   plan         String   @default("trial")
> 
>   // Onboarding checklist state shown on admin Home (SPEC §8).
>   onboarding Json @default("{}")
> 
>   // Settings that have no table of their own (SPEC §16 Settings pages).
>   taxSettings      Json @default("{}")
>   checkoutSettings Json @default("{}")
>   shippingRates    Json @default("[]")
> 
>   createdAt DateTime @default(now()) @db.Timestamptz(6)
>   updatedAt DateTime @updatedAt @db
> … [truncated, 1,188 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rln "customDomain\|CustomDomain" apps packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | head -30
```

> **↳ result**
> ```
> apps/storefront/src/lib/tenant.ts
> apps/api/test/custom-domain.test.ts
> apps/api/test/helpers.ts
> apps/api/src/app.ts
> apps/api/src/plugins/tenancy.ts
> apps/api/src/lib/custom-domains.ts
> packages/config/src/ids.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/storefront/src/lib/tenant.ts
```

> **↳ result**
> ```
> /**
>  * Storefront tenant resolution (SPEC §6): the shop comes from the Host header.
>  *
>  * Local:  {shopSlug}.lvh.me:3002  (lvh.me resolves to 127.0.0.1 — no /etc/hosts)
>  * Prod:   wildcard subdomain, plus custom domains looked up in CustomDomain.
>  *
>  * Owner: WS-E.
>  */
> 
> import { env } from '@merchant/config/env';
> import { headers } from 'next/headers';
> 
> export async function resolveShopSlug(): Promise<string | null> {
>   const host = (await headers()).get('host');
>   if (!host) return null;
> 
>   // Lowercased like apps/api/src/lib/host.ts — DNS names are case-insensitive,
>   // and the two resolvers disagreeing means a shop that loads on the API but
>   // 404s on the storefront (test/host.test.ts
> … [truncated, 1,667 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/api/src/lib/custom-domains.ts
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
> … [truncated, 1,197 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/api/src/lib/host.ts; echo "=== TENANCY ==="; sed -n '1,160p' apps/api/src/plugins/tenancy.ts
```

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
> … [truncated, 6,662 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rln "signup\|sign-up" apps/api/src apps/admin/src 2>/dev/null | head -20; echo "=== domains pages ==="; find apps/admin/src -ipath "*domain*" | head -20; echo "=== api domain routes ==="; find apps/api/src -ipath "*domain*" | head
```

> **↳ result**
> ```
> apps/api/src/lib/slug.ts
> apps/api/src/routes/storefront/customers/index.ts
> apps/api/src/routes/auth/index.ts
> apps/api/src/services/customers/customers.ts
> apps/api/src/services/themes/onboarding.ts
> apps/admin/src/app/signup/page.tsx
> apps/admin/src/app/login/page.tsx
> apps/admin/src/lib/session.ts
> apps/admin/src/components/shell/auth-card.tsx
> === domains pages ===
> === api domain routes ===
> apps/api/src/lib/custom-domains.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/api/src/lib/slug.ts; echo "=== SIGNUP ROUTE ==="; grep -n "signup" -A 90 apps/api/src/routes/auth/index.ts | head -140
```

> **↳ result**
> ```
> /**
>  * Shop slug derivation (SPEC §8 signup). Owner: WS-A.
>  *
>  * "Aurora Supply Co." → `aurora-supply-co`, the store's storefront subdomain
>  * and its admin URL segment. It must satisfy the same rule the contract
>  * enforces on an explicitly supplied slug: lowercase alphanumerics separated by
>  * single hyphens, 3–63 characters.
>  */
> import { RESERVED_SHOP_SLUGS } from '@merchant/config/constants';
> import { newSecret } from '@merchant/config/ids';
> 
> const MIN = 3;
> const MAX = 63;
> 
> export function slugify(input: string): string {
>   const base = input
>     .normalize('NFKD')
>     // Strip combining marks so "Café" becomes "cafe" rather than "caf".
>     .replace(/[\u0300-\u036f]/g, '')
>     .toLowerCa
> … [truncated, 6,901 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; echo "=== customDomain writes ==="; grep -rn "customDomain\." apps packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules; echo "=== settings nav ==="; grep -rn "domain" -i apps/admin/src/navigation apps/admin/src/app/store 2>/dev/null | head -20
```

> **↳ result**
> ```
> === customDomain writes ===
> apps/api/test/helpers.ts:139:  await dbAdmin.customDomain.deleteMany({ where });
> apps/api/test/custom-domain.test.ts:30:  await dbAdmin.customDomain.create({
> apps/api/src/lib/custom-domains.ts:41:  const domain = await dbAdmin.customDomain.findUnique({
> === settings nav ===
> apps/admin/src/app/store/[slug]/storefront/preview-url.ts:23:/** `{slug}.{origin-host}` — the origin is a bare domain, the shop is a subdomain. */
> apps/admin/src/app/store/[slug]/storefront/preview-url.test.ts:7:  it('points at the shop’s own storefront subdomain', () => {
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "BASE_DOMAIN\|STOREFRONT_URL\|ADMIN_URL\|API_URL" .env.example; echo "=== dev:localhost ==="; grep -n "dev:localhost" -A 3 package.json
```

> **↳ result**
> ```
> 22:API_URL=http://api.lvh.me:3001
> 23:ADMIN_URL=http://admin.lvh.me:3000
> 24:STOREFRONT_BASE_DOMAIN=lvh.me:3002
> === dev:localhost ===
> 12:    "dev:localhost": "ADMIN_URL=http://localhost:3000 API_URL=http://localhost:3001 STOREFRONT_BASE_DOMAIN=localhost:3002 turbo run dev",
> 13-    "build": "turbo run build",
> 14-    "typecheck": "turbo run typecheck",
> 15-    "test": "turbo run test --filter=!@merchant/e2e",
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/admin/src/app/store/\[slug\]/storefront/preview-url.ts; echo "=== RESERVED ==="; grep -n "RESERVED_SHOP_SLUGS" -A 12 packages/config/src/constants.ts | head -25
```

> **↳ result**
> ```
> /**
>  * Where the preview iframe points (SPEC §12). Owner: WS-F.
>  *
>  * Always the REAL storefront origin (`{slug}.lvh.me:3002`), never a proxy: the
>  * whole point of the preview is that the merchant sees what a visitor sees,
>  * with the same cookies, the same cache and the same renderer.
>  */
> export const STOREFRONT_ORIGIN = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN ?? 'http://lvh.me:3002';
> 
> export type PreviewPage = 'home' | 'product' | 'collection';
> 
> export type PreviewTarget = {
>   shopSlug: string;
>   page: PreviewPage;
>   /** Signed, short-lived, version-scoped. Omit to show what shoppers see. */
>   token?: string | null;
>   productHandle?: string | null;
>   collectionHandle?: string | null;
> … [truncated, 1,826 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "resolveShopSlug" apps/storefront/src --include="*.ts" --include="*.tsx" | head -20; echo "=== middleware ==="; ls apps/storefront/src/ && find apps/storefront/src -name "middleware*"
```

> **↳ result**
> ```
> apps/storefront/src/app/products/[handle]/page.tsx:14:import { resolveShopSlug } from '../../../lib/tenant.ts';
> apps/storefront/src/app/products/[handle]/page.tsx:19:  const slug = await resolveShopSlug();
> apps/storefront/src/app/checkout/route.ts:16:import { resolveShopSlug } from '../../lib/tenant.ts';
> apps/storefront/src/app/checkout/route.ts:26:  const slug = await resolveShopSlug();
> apps/storefront/src/app/api/revalidate/route.ts:15:import { resolveShopSlug } from '../../../lib/tenant.ts';
> apps/storefront/src/app/api/revalidate/route.ts:20:  const slug = await resolveShopSlug();
> apps/storefront/src/app/account/actions.ts:17:import { resolveShopSlug } from '../../lib/tenant.ts';
> apps/sto
> … [truncated, 1,339 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "shopSlug\|storeUrl\|lvh\|STOREFRONT" apps/admin/src/app/signup/page.tsx | head -20; echo "=== contract ==="; grep -n "signupInput" -A 20 packages/contracts/src/auth.ts | head -30
```

> **↳ result**
> ```
> 34:  // an error on a field this form does not render (`shopSlug`, say) would
> === contract ===
> 51:export const signupInput = z.object({
> 52-  shopName: z.string().min(1).max(255),
> 53-  shopSlug: z
> 54-    .string()
> 55-    .min(3)
> 56-    .max(63)
> 57-    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only')
> 58-    // `www` never resolves a storefront (lib/host.ts) and prod Caddy owns
> 59-    // `admin.*`/`api.*` — a shop on these slugs would sign up fine and then
> 60-    // simply not exist on the web.
> 61-    .refine((slug) => !RESERVED_SHOP_SLUGS.has(slug), 'That store URL is reserved')
> 62-    .optional(),
> 63-  email: emailInput,
> 64-  password: z.string().min(8, 'Pas
> … [truncated, 302 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,60p' apps/admin/src/app/store/\[slug\]/layout.tsx 2>/dev/null || ls apps/admin/src/app/store/\[slug\]/ | head
```

> **↳ result**
> ```
> import { BRAND_NAME } from '@merchant/config/constants';
> import type { Metadata } from 'next';
> import { AdminFrame } from '../../../components/shell/admin-frame.tsx';
> 
> /**
>  * Every page under `/store/{slug}` renders inside the admin shell (SPEC §6, §9).
>  * Owner: WS-A — leaf issues add pages under this, not around it.
>  *
>  * A SERVER component so it can carry `metadata`: this is Home's title, and each
>  * section directory overrides it with its own (H3). It used to be `'use client'`
>  * for `useParams`; a server layout is handed `params` directly, so nothing is
>  * lost and the shell below is still a client component.
>  */
> // `template` is repeated here on purpose. A segment whose `title` is a pl
> … [truncated, 670 more chars]
> ```

### 🤖 Claude

Here's how it actually works in this repo.

## Three tenant-resolution paths

[apps/api/src/plugins/tenancy.ts](apps/api/src/plugins/tenancy.ts) decorates every request with `shopId` + a scoped Prisma client, by one of three routes:

| Path prefix | Resolves from |
|---|---|
| `/admin/api/*` | staff session cookie → `session.shopId` |
| `/storefront/api/*` | **Host header** |
| `/api/*` | Bearer token → `App` row → `shopId` |

Only the storefront path is domain-based. `/auth/*`, `/health`, `/vault/*` resolve nothing.

## The Host → shop rule

[shopSlugFromHost()](apps/api/src/lib/host.ts:19) is a pure string function: take `Host`, drop the port, lowercase, and if it ends in `.{STOREFRONT_BASE_DOMAIN}`, the label in front is the slug. It returns `null` — never a guess — for the apex, `www`, and multi-level subdomains. The storefront duplicates this in [apps/storefront/src/lib/tenant.ts](apps/storefront/src/lib/tenant.ts) (can't share it — that module imports `next/headers`).

`STOREFRONT_BASE_DOMAIN` is `lvh.me:3002` by default. `lvh.me` is public wildcard DNS pointing at `127.0.0.1`, so `*.lvh.me` just works with no `/etc/hosts` edit. `pnpm dev:localhost` swaps it to `localhost:3002` (also wildcard-resolving) so the in-app browser will render subresources.

If the Host is *not* under the base domain, it falls through to [shopForCustomDomain()](apps/api/src/lib/custom-domains.ts:33), which looks up the `custom_domains` table.

## So: what happens when you create a store locally

1. `POST /auth/signup` with `shopName` (the admin signup form doesn't render a slug field, though `signupInput` accepts an optional `shopSlug`).
2. [slugify()](apps/api/src/lib/slug.ts:15): `"Aurora Supply Co."` → `aurora-supply-co`. Non-Latin/punctuation-only names, or one of the reserved slugs (`www`, `admin`, `api`), fall back to `store-{random}`.
3. [createShop()](apps/api/src/routes/auth/index.ts:76) walks candidates `slug`, `slug-2`, `slug-3`… then a random tail, taking the first that inserts — so a concurrent signup race loses the name, not the store.
4. Shop + `OrderSequence` (starts at #1001) + owner `StaffUser` created in one transaction, default theme installed, session cookie set — signup logs you in.

You immediately get:
- **Storefront**: `http://{slug}.lvh.me:3002` — live, zero config. Its server components call the API at `http://{slug}.lvh.me:3001`, because that Host is what carries the tenant.
- **Admin**: `http://admin.lvh.me:3000/store/{slug}/…`. Note the slug here is *cosmetic* — [the layout](apps/admin/src/app/store/[slug]/layout.tsx) just passes it to `AdminFrame` for URL building; the real tenant comes from the session cookie, so a hand-typed foreign slug in the URL doesn't grant access to another shop's data.
- **Preview iframe** in the theme builder points at the real `{slug}.lvh.me:3002` origin, not a proxy.

Slug→shop lookups are cached 30s, **hits only** — a miss isn't cached, so a brand-new shop resolves on the very next request instead of 404ing for half a minute.

## The gap worth knowing about

`CustomDomain` is **read-only in the product**. The model exists, tenancy resolves against it, CORS honors it, and there's a test — but there is no admin UI and no API route that ever writes a row (`grep` for `customDomain.create` hits only [the test](apps/api/test/custom-domain.test.ts:30)). So locally you cannot attach `shop.example.com` to a store through the app; you'd have to insert the row directly *and* make DNS resolve that hostname to 127.0.0.1, which means editing `/etc/hosts` — something CLAUDE.md explicitly rules out.

Practically: **every store you create locally is reachable only at its `{slug}.lvh.me:3002` subdomain**, and that's automatic.

### 👤 User

how does payments work locally?

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; find packages/pay/src -type f | sort; echo "=== API pay routes ==="; find apps/api/src -ipath "*pay*" -o -ipath "*vault*" -o -ipath "*checkout*" | grep -v node_modules | sort
```

> **↳ result**
> ```
> packages/pay/src/adapter.ts
> packages/pay/src/adapters/maverick.test.ts
> packages/pay/src/adapters/maverick.ts
> packages/pay/src/adapters/mock.test.ts
> packages/pay/src/adapters/mock.ts
> packages/pay/src/adapters/simulated.ts
> packages/pay/src/adapters/stripe.test.ts
> packages/pay/src/adapters/stripe.ts
> packages/pay/src/adapters/test-cards.ts
> packages/pay/src/credentials.ts
> packages/pay/src/crypto.test.ts
> packages/pay/src/crypto.ts
> packages/pay/src/index.ts
> packages/pay/src/router.test.ts
> packages/pay/src/router.ts
> packages/pay/src/routing.test.ts
> packages/pay/src/routing.ts
> packages/pay/src/vault.test.ts
> packages/pay/src/vault.ts
> === API pay routes ===
> apps/api/src/routes/admin/payments
> apps/api/s
> … [truncated, 403 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,80p' packages/pay/src/adapters/test-cards.ts
```

> **↳ result**
> ```
> /**
>  * The published test-card matrix (SPEC §11). Owner: WS-D.
>  *
>  * These numbers are a contract with the demo, the seed and the Playwright smoke
>  * suite — somebody types them into a checkout by hand. They are Stripe's own
>  * test numbers, so the same card behaves the same way whether the merchant is
>  * on `mock` or on Stripe test keys.
>  *
>  * `hard_failure` is the one we invented. The router's failover is only
>  * demonstrable if some card can make a processor fall over without the card
>  * itself being at fault, and `4000000000000119` (Stripe's "processing error"
>  * card) is the natural home for it.
>  */
> export const TEST_CARDS = {
>   approved: '4242424242424242',
>   declined: '400000000000000
> … [truncated, 765 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,70p' packages/pay/src/vault.ts; echo "=== TOKENIZE ROUTE ==="; sed -n '1,60p' apps/api/src/routes/vault/tokenize.ts
```

> **↳ result**
> ```
> /**
>  * Card vault (SPEC §11). Owner: WS-D.
>  *
>  * The ONLY module permitted to decrypt a card blob. AES-256-GCM under a single
>  * VAULT_MASTER_KEY — deliberately simple, with no rotation machinery.
>  *
>  * Two rules, and they are the whole security model here:
>  *   1. A PAN never leaves this module except into a processor adapter.
>  *   2. A PAN never reaches a log line, an error message, or an exception.
>  *
>  * Everything outside `packages/pay` speaks `CardToken` — id, brand, last4,
>  * expiry — and nothing more. If another package imports `getCard`, that import
>  * is the bug (CLAUDE.md §9).
>  */
> import { env } from '@merchant/config/env';
> import { newId } from '@merchant/config/ids';
> import type
> … [truncated, 4,146 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,80p' packages/pay/src/adapters/mock.ts
```

> **↳ result**
> ```
> /**
>  * `mock` processor adapter (SPEC §11). Owner: WS-D.
>  *
>  * Always available, no credentials. Deterministic test cards (SPEC §11):
>  *   4242424242424242 → approved
>  *   4000000000000002 → declined
>  *   4000000000009995 → insufficient_funds
>  *   …0119            → hard_failure (simulated outage, so failover is demoable)
>  * Everything else approves — see test-cards.ts.
>  *
>  * This adapter powers the local demo and the e2e suite, so it must never depend
>  * on network access, and it must never throw: the router reads outcomes, not
>  * exceptions.
>  */
> import type { MoneyDto } from '@merchant/contracts/common';
> import type { AuthorizeRequest, AuthResult, ProcessorResult } from '@merchant/contract
> … [truncated, 1,899 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,70p' packages/pay/src/adapters/simulated.ts; echo "=== INDEX ==="; cat packages/pay/src/index.ts
```

> **↳ result**
> ```
> /**
>  * The transaction ledger shared by the two adapters that can run without a
>  * processor behind them (`mock`, and `maverick` with no credentials).
>  * Owner: WS-D.
>  *
>  * It exists so those adapters behave like a real processor at the one place it
>  * matters to the rest of the system: you cannot capture twice, cannot refund
>  * more than you captured, and cannot void a captured transaction. Without that,
>  * the admin's refund UI would look correct while quietly permitting a merchant
>  * to refund $200 against a $100 order.
>  *
>  * In memory on purpose — there is nothing here worth persisting, and a restart
>  * between demo runs is a feature. Two consequences of that, both handled below:
>  *
>  *
> … [truncated, 3,530 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; awk '/^## 11\.|^## §11|^### 11\./,/^## 12\./' SPEC.md | head -200
```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; ls docs/issues/ | head -60
```

> **↳ result**
> ```
> ## 11. Pay — Payments Platform (Deviation #1)
> 
> Package `packages/pay`, mounted into `apps/api` (routes) but logically isolated. **Design goal: PAN isolation + processor-agnostic tokens + merchant-configurable routing.**
> 
> ### Vault
> - `POST /vault/tokenize` (called from checkout browser directly): `{ number, expMonth, expYear, cvc }` → validates (Luhn), encrypts the card blob with AES-256-GCM under a single `VAULT_MASTER_KEY` env var, stores in `VaultCard`, returns `{ cardTokenId: 'card_tok_...', brand, last4, expMonth, expYear }`. Simple single-key scheme — no envelope/rotation machinery.
> - Only `packages/pay` code decrypts; keep PAN out of logs. That's the whole rule.
> - One-line note in READ
> … [truncated, 2,047 more chars]
> ```

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
> C7-orders-index-filters.md
> D1-vault.md
> D2-processor-adapters.md
> D3-payment-router.md
> D4-payments-settings-ui.md
> E1-storefront-api-cart.md
> E2-storefront-pages.md
> E3-checkout-api.md
> E4-checkout-ui.md
> E5-customer-accounts.md
> E6-checkout-save-card.md
> E7-theme-publish-revalidation.md
> F1-theme-engine-
> … [truncated, 312 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,120p' packages/pay/src/routing.ts
```

> **↳ result**
> ```
> /**
>  * Which processors get tried, and in what order (SPEC §11). Owner: WS-D.
>  *
>  * Pure on purpose — no database, no adapters, no clock. Everything that decides
>  * where a charge goes lives here so it can be reasoned about and tested without
>  * a processor in the loop; `router.ts` does the executing and the persisting.
>  *
>  * The model, from SPEC §11: a merchant orders `RoutingRule`s, each pointing at
>  * a connected processor with a percentage `weight` and optional `conditions`.
>  * For a given charge, the rules whose conditions match are the candidates; one
>  * is picked by weight, and the rest become the fallback chain for hard
>  * failures. Declines never reach the chain — that decision belo
> … [truncated, 3,855 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "orders/paid\|analytics\|emitEvent\|webhook" packages/pay/src/router.ts apps/api/src/services/checkout/complete.ts | head -30; echo "=== charge saved card ==="; grep -rn "charge-saved\|chargeSaved\|savedCard\|paymentMethod" apps/api/src/routes/admin/payments/payments.ts | head -20
```

> **↳ result**
> ```
> apps/api/src/services/checkout/complete.ts:322:    // the one place `orders/paid` can fire for a storefront purchase.
> apps/api/src/services/checkout/complete.ts:325:      topic: 'orders/paid',
> packages/pay/src/router.ts:159:  // collected anything yet, so `orders/paid` for it would be a lie — the
> packages/pay/src/router.ts:406:  // this is where `orders/paid` belongs — `charge()` stays silent for it.
> === charge saved card ===
> apps/api/src/routes/admin/payments/payments.ts:16:  chargeSavedCardInput,
> apps/api/src/routes/admin/payments/payments.ts:18:  paymentMethodSchema,
> apps/api/src/routes/admin/payments/payments.ts:22:import { capturePayment, chargeSavedCard, PaymentError, voidPayment } fro
> … [truncated, 793 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "processorConfig\|routingRule" packages/db/src/seed*.ts packages/db/prisma/seed* 2>/dev/null | head -20; echo "=== seed files ==="; find packages/db -name "*.ts" -path "*seed*" | grep -v node_modules | head -20
```

> **↳ result**
> ```
> (eval):1: no matches found: packages/db/src/seed*.ts
> === seed files ===
> packages/db/prisma/seed/inventory.ts
> packages/db/prisma/seed/shop.ts
> packages/db/prisma/seed/customers.ts
> packages/db/prisma/seed/analytics.ts
> packages/db/prisma/seed/pay.ts
> packages/db/prisma/seed/context.ts
> packages/db/prisma/seed/collections.ts
> packages/db/prisma/seed/seed.test.ts
> packages/db/prisma/seed/apps.ts
> packages/db/prisma/seed/random.ts
> packages/db/prisma/seed/orders.ts
> packages/db/prisma/seed/discounts.ts
> packages/db/prisma/seed/index.ts
> packages/db/prisma/seed/checkouts.ts
> packages/db/prisma/seed/catalog.ts
> packages/db/prisma/seed/seed-if-empty.ts
> packages/db/prisma/seed/data/images.ts
> packages/db/prisma/se
> … [truncated, 58 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "VAULT_MASTER_KEY\|STRIPE\|MAVERICK" .env.example packages/config/src/env.ts | head -20; echo "=== maverickMode ==="; grep -n "maverickMode" -A 15 packages/pay/src/adapters/maverick.ts | head -30
```

> **↳ result**
> ```
> .env.example:38:VAULT_MASTER_KEY=0000000000000000000000000000000000000000000000000000000000000000
> .env.example:42:STRIPE_SECRET_KEY=
> .env.example:43:MAVERICK_API_KEY=
> .env.example:44:MAVERICK_MERCHANT_ID=
> packages/config/src/env.ts:47:  VAULT_MASTER_KEY: z
> packages/config/src/env.ts:49:    .regex(/^[0-9a-fA-F]{64}$/, 'VAULT_MASTER_KEY must be 64 hex chars (32 bytes)'),
> packages/config/src/env.ts:50:  STRIPE_SECRET_KEY=[REDACTED]''),
> packages/config/src/env.ts:51:  MAVERICK_API_KEY: z.string().optional().default(''),
> packages/config/src/env.ts:52:  MAVERICK_MERCHANT_ID: z.string().optional().default(''),
> packages/config/src/env.ts:109:export const hasStripeKey = (): boole
> … [truncated, 1,582 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,90p' packages/db/prisma/seed/pay.ts
```

> **↳ result**
> ```
> /**
>  * Saved cards for a few repeat customers — what D4's "charge saved card" block
>  * on the order page demos (SPEC §11: the repeat-billing primitive).
>  *
>  * The vault blob is sealed HERE, duplicating the AES-256-GCM shape from
>  * `packages/pay/src/crypto.ts` + `vault.ts` (JSON `{number, cvc}` under
>  * `VAULT_MASTER_KEY`; ciphertext/iv/authTag as three base64 columns), because
>  * `packages/db` cannot import `packages/pay` — pay depends on db and turbo
>  * rejects the cycle (DECISIONS.md, WS-H). The format is deliberately frozen:
>  * SPEC §11 rules out envelope encryption and key rotation, so there is nothing
>  * here to drift. If `crypto.ts` ever does change, `pnpm db:reset` + one charge
>  * in
> … [truncated, 2,248 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "D1\|D2\|D3\|D4" docs/AGENT-LOG.md | head -20; echo "=== payments settings UI ==="; find apps/admin/src/app -ipath "*payment*" -type f | head -20
```

> **↳ result**
> ```
> 16:2026-08-28 12:05 | WS-D | CLAIM D1 vault (crypto, Luhn, tokenize endpoint) | branch ws-d/vault
> 17:2026-08-28 12:50 | WS-D | Fixed a platform bug found by D1's rate-limited route: app.ts errorResponseBuilder returned a plain object, but @fastify/rate-limit THROWS that value — with no statusCode it fell through to 500. It now returns `new ApiError('rate_limited', …)`, so any route with `config.rateLimit` gets a real SPEC-shaped 429. WS-A: one-line change in your file, flagged rather than silently kept.
> 19:2026-08-28 13:05 | WS-D | pr-checks.yml had VAULT_MASTER_KEY unquoted — YAML read 64 zeros as the number 0, so CI ran with VAULT_MASTER_KEY="0" and any test that touches env() died. Quoted
> … [truncated, 7,302 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "processorConfig\|candidates\|selectProcessorChain\|fallback\|mock" packages/pay/src/router.ts | head -40
```

> **↳ result**
> ```
> 4: * Weighted selection across matching RoutingRules, then a fallback chain.
> 35:import { type RoutingCandidate, selectProcessorChain } from './routing.ts';
> 226:  const configs = await db.processorConfig.findMany({
> 235:  const candidates: RoutingCandidate[] = rules
> 236:    .filter((rule) => byId.has(rule.processorConfigId))
> 238:      processorConfigId: rule.processorConfigId,
> 239:      processor: byId.get(rule.processorConfigId)?.processor as ProcessorKey,
> 247:      processorConfigId: config.id,
> 258:  const byRules = candidates.length > 0 ? selectProcessorChain(candidates, ctx, rng) : [];
> 265:      byId.get(candidate.processorConfigId) as {
> 332:      processorConfigId: config.processorConfigI
> … [truncated, 181 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "processorConfig" packages/db/prisma/seed/*.ts | head; echo "=== decline no cascade ==="; grep -n "declined\|hard_failure\|retryable" packages/pay/src/router.ts | head -25
```

> **↳ result**
> ```
> packages/db/prisma/seed/shop.ts:54:  await db.processorConfig.deleteMany(where);
> packages/db/prisma/seed/shop.ts:264:  await db.processorConfig.create({
> packages/db/prisma/seed/shop.ts:281:      processorConfigId: configId,
> packages/db/prisma/seed/seed.test.ts:448:    const config = await dbAdmin.processorConfig.findUniqueOrThrow({
> === decline no cascade ===
> 277: * Only `hard_failure` continues the loop. That single `break` on `declined` is
> 291:    outcome: 'hard_failure',
> 294:    retryable: true,
> 301:    if (result.outcome !== 'hard_failure') break;
> 354:  return result.outcome === 'declined' ? result.code : 'processor_error';
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '220,270p' packages/pay/src/router.ts; echo "=== SEED processor ==="; sed -n '255,295p' packages/db/prisma/seed/shop.ts
```

> **↳ result**
> ```
> */
> async function resolveChain(
>   db: TenantClient,
>   ctx: { amount: MoneyDto; brand: CardBrand },
>   rng?: () => number,
> ): Promise<ChainLink[]> {
>   const configs = await db.processorConfig.findMany({
>     where: { enabled: true },
>     orderBy: { createdAt: 'asc' },
>   });
>   if (configs.length === 0) return [];
> 
>   const byId = new Map(configs.map((config) => [config.id, config]));
>   const rules = await db.routingRule.findMany({ orderBy: { position: 'asc' } });
> 
>   const candidates: RoutingCandidate[] = rules
>     .filter((rule) => byId.has(rule.processorConfigId))
>     .map((rule) => ({
>       processorConfigId: rule.processorConfigId,
>       processor: byId.get(rule.processorConfigId)?.processor a
> … [truncated, 2,478 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '130,220p' packages/pay/src/router.ts
```

> **↳ result**
> ```
> amount: input.amount,
>     capture,
>     idempotencyKey: input.idempotencyKey,
>     ...(input.customer ? { customer: input.customer } : {}),
>     ...(input.billingAddress ? { billingAddress: input.billingAddress } : {}),
>     ...(input.reference ? { reference: input.reference } : {}),
>   };
> 
>   const { result, trail, config } = await runChain(chain, request, card, deps);
> 
>   let payment: Payment;
>   try {
>     payment = await recordCharge(db, shopId, { input, card, result, trail, config, capture });
>   } catch (error) {
>     // A concurrent request with the same key got there first — a double-clicked
>     // Pay button, or a client retrying while the first call is still open. The
>     // unique index on (
> … [truncated, 2,732 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '100,130p' packages/pay/src/router.ts; echo "=== signup connects processor? ==="; grep -rn "processorConfig" apps/api/src/routes/auth/index.ts apps/api/src/services/themes/onboarding.ts | head
```

> **↳ result**
> ```
> /* -------------------------------------------------------------------------- */
> /* charge                                                                      */
> /* -------------------------------------------------------------------------- */
> 
> export async function charge(
>   db: TenantClient,
>   shopId: string,
>   input: ChargeInput,
>   deps: RouterDeps = {},
> ): Promise<Payment> {
>   // Idempotency first, before anything is decrypted or any processor is told
>   // about this charge. A retry after a dropped response must be free.
>   const existing = await db.payment.findFirst({ where: { idempotencyKey: input.idempotencyKey } });
>   if (existing) return replayCharge(existing, input);
> 
>   const card =
> … [truncated, 550 more chars]
> ```

### 🤖 Claude

## How payments run locally

**Nothing external is involved.** The whole flow is real code end to end, with a deterministic fake processor at the bottom.

**1. Card never touches the checkout server.** The browser posts card fields *directly* to `POST /vault/tokenize` ([apps/api/src/routes/vault/tokenize.ts](apps/api/src/routes/vault/tokenize.ts)). That endpoint is unauthenticated by design — there's no session at that point in the flow — so it resolves the shop from the **`Origin` header** (same `{slug}.{base}` parsing as everything else) and bounds abuse with `RATE_LIMITS.checkoutPayment` (5/min). It returns `{ cardTokenId: 'card_tok_…', brand, last4, expMonth, expYear }`.

**2. The vault.** [packages/pay/src/vault.ts](packages/pay/src/vault.ts) Luhn-checks, derives the brand from IIN ranges, and seals `{number, cvc}` with AES-256-GCM under `VAULT_MASTER_KEY`. `.env.example` ships 64 zeros, so `cp .env.example .env` works with no edits. It's the only module that decrypts.

**3. Test cards** ([test-cards.ts](packages/pay/src/adapters/test-cards.ts)):

| Card | Outcome |
|---|---|
| `4242424242424242` | approved |
| `4000000000000002` | declined |
| `4000000000009995` | insufficient_funds |
| `…0119` | hard_failure (simulated outage) |
| anything else | **approves** — "a demo that declines by default is a dead demo" |

**4. Routing.** `charge()` loads enabled `ProcessorConfig` rows + `RoutingRule`s, filters by conditions (brand / min / max), weighted-picks one, and the rest become the failover chain. `resolveChain` decrypts processor credentials at the last moment. The seed connects a **`mock` "Mock Gateway (test)"** processor at 100% weight for the demo shop, so checkout just works after `pnpm db:setup`.

**5. Adapters.** `mock` needs no credentials, ever. `stripe` and `maverick` fall back gracefully: Stripe is inert without a key; `maverick` runs `simulated` mode via `maverickMode(creds)` and the admin renders a badge from it.

**The failover demo is deliberately built in:** `…0119` **hard-fails on mock but approves on maverick** — that asymmetry exists purely so mock→maverick failover is demonstrable live, not just unit-tested.

---

## Against SPEC §11 and the D1–D4 plan

**It matches, and in places exceeds it.** Every §11 bullet is implemented and every D issue is merged (D1 #5, D2 #9, D3 #12, D4). Concretely:

- ✅ Vault: Luhn, AES-256-GCM, single key, no rotation machinery — exactly the "deliberately simple" scheme specified.
- ✅ Three adapters with the specified availability semantics.
- ✅ `RoutingRule` with weight + conditions, weighted-random pick, fallback chain.
- ✅ **Declines do not cascade.** [router.ts:301](packages/pay/src/router.ts:301) — `if (result.outcome !== 'hard_failure') break;`. This is CLAUDE.md §9's named landmine and it's correctly handled.
- ✅ Saved cards → `PaymentMethod` → admin "charge saved card" on order detail (the repeat-billing primitive). E6 wired the checkout "save this card" checkbox to it, so it works on live customers, not just seed rows.
- ✅ `orders/paid` webhook + analytics — with a refinement: it fires only when money actually **moved**, so an authorize-only approval doesn't lie. The capture fires it instead.

**Two deliberate deviations from the spec text**, both logged in AGENT-LOG:

1. **`authorize()` signature.** SPEC shows `authorize(req)` taking `cardTokenId`; the implementation is `authorize(req, card: CardMaterial, creds)` — the router detokenizes and passes the PAN in. Better: adapters never touch the vault, keeping the "only `packages/pay` decrypts" rule structural rather than conventional.
2. **No payments-level refund route.** D3 deliberately omitted it so the refund cap lives in exactly one place (`refundPayment`); WS-C's C3 calls it directly.

**Things worth knowing that aren't in the spec** — all defensive additions, none contradicting it: idempotency on `(shopId, idempotencyKey)` with correct replay semantics (a reused key against a *different* amount throws rather than silently returning the wrong payment); the in-memory `SimulatedProcessor` ledger that enforces no double-capture and no over-refund, so the admin refund UI can't quietly let a merchant refund $200 against a $100 order; and routing rules treated as a *preference, not a whitelist* — no matching rule falls back to every enabled processor, so an incomplete routing table can't stop a shop taking money.

**One thing to expect:** a store you create via signup has **no** `ProcessorConfig`, so its first checkout throws `"No payment processor is connected. Connect one in Settings → Payments."` That's spec-conformant (§11 says the merchant connects processors there, and D4 built the one-click mock connect), but it does mean a fresh signup isn't payment-ready the way the seeded demo store is.

### 👤 User

is this done?

* We want to have a version of Shopify payments i.e our payment processing, but it should support card tokenization so that we can save the subscriptions and the card token should be processable by multiple payment processors (i.e Maverick, Stripe 
   * Like Checkoutchamp
   * Merchant can connect their payment processors and it routes the payment there

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '270,345p' packages/pay/src/router.ts
```

> **↳ result**
> ```
> ),
>   }));
> }
> 
> /**
>  * Walk the chain until something is decided.
>  *
>  * Only `hard_failure` continues the loop. That single `break` on `declined` is
>  * the no-cascade rule; if it ever becomes a `continue`, the platform starts
>  * retrying rejected cards across processors.
>  */
> async function runChain(
>   chain: ChainLink[],
>   request: AuthorizeRequest,
>   card: CardMaterial,
>   deps: RouterDeps,
> ): Promise<{ result: AuthResult; trail: RoutingTrailEntry[]; config: ChainLink }> {
>   const resolve = deps.adapters ?? adapterFor;
>   const trail: RoutingTrailEntry[] = [];
>   let last = chain[0] as ChainLink;
>   let result: AuthResult = {
>     outcome: 'hard_failure',
>     processor: last.processor,
>     message:
> … [truncated, 1,451 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "CardMaterial\|paymentMethod\|payment_method\|createPaymentMethod\|card\[number\]" packages/pay/src/adapters/stripe.ts | head -25
```

> **↳ result**
> ```
> 13: * enablement, so a stock account will reject `paymentMethods.create` with a
> 21:import type { CardMaterial, ProcessorAdapter, ProcessorCredentials } from '../adapter.ts';
> 178:  card: CardMaterial,
> 184:    const paymentMethod = await stripe.paymentMethods.create(
> 203:        payment_method: paymentMethod.id,
> 207:        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
> 248:      // requires_payment_method (the confirm was rejected without throwing),
> 262:  card: CardMaterial,
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,30p' packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> /**
>  * `stripe` processor adapter (SPEC §11). Owner: WS-D.
>  *
>  * Real implementation: vault decrypts the PAN → Stripe PaymentMethod →
>  * PaymentIntent, using the merchant's own key from ProcessorConfig. Not
>  * connected unless the merchant pastes a key.
>  *
>  * The interesting code in this file is `classifyStripeError`. Everything else
>  * is SDK plumbing; that function is where the "declines never cascade" rule of
>  * SPEC §11 is actually enforced, and it is what the unit tests cover.
>  *
>  * NOTE on raw PAN: Stripe gates unformatted card numbers on the API behind PCI
>  * enablement, so a stock account will reject `paymentMethods.create` with a
>  * card object. That is Stripe's policy, not a bug he
> … [truncated, 752 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "it(\|describe(" packages/pay/src/router.test.ts | head -40
```

> **↳ result**
> ```
> 187:describe('charge — the no-cascade rule', () => {
> 188:  it('never retries a decline on the next processor', async () => {
> 215:  it('does retry a hard failure, and records both hops in the routing trail', async () => {
> 245:  it('stops as failed when every processor in the chain hard-fails', async () => {
> 272:describe('charge — persistence', () => {
> 273:  it('writes a Payment row for a failure too, so the order page can show the attempt', async () => {
> 290:  it('records the card metadata but never the number', async () => {
> 307:  it('authorizes without capturing when capture is false', async () => {
> 323:  it('refuses to charge when the shop has connected no processor', async () => {
> 333:  i
> … [truncated, 2,132 more chars]
> ```

### 🤖 Claude

Yes — all four bullets are built and merged. Point by point:

## ✅ Our own payment processing

`packages/pay` is a real processing layer, not a Stripe wrapper: our own vault, our own `Payment` records, our own capture/void/refund state machine with caps enforced *before* the processor is called. The admin's Payments settings and the order-page payment card are ours.

## ✅ Tokenization, and the token is genuinely processor-agnostic

This is the part that matters most, and it's right. The `card_tok_…` is **ours** — an AES-256-GCM-sealed PAN in our `VaultCard` table, not a Stripe or Maverick object.

The proof is in [runChain](packages/pay/src/router.ts:281): the card is detokenized **once**, before the loop, and the *same* `CardMaterial` is handed to every adapter in the chain. Stripe's adapter creates a Stripe PaymentMethod at charge time as a per-charge derivative ([stripe.ts:184](packages/pay/src/adapters/stripe.ts:184)); Maverick maps to its own shape. So one saved token charges on mock today and Stripe tomorrow with no re-collection — which is precisely the CheckoutChamp property and precisely what you *can't* do with a Stripe-native token.

The failover test at [router.test.ts:215](packages/pay/src/router.test.ts:215) exercises exactly this: one token, two processors, both hops recorded in `routingTrail`.

## ✅ Saved cards for repeat billing

`PaymentMethod` links customer → card token; `chargeSavedCard` runs it through the identical router path (tested at [router.test.ts:739](packages/pay/src/router.test.ts:739)). Checkout's "Save this card" checkbox is wired to it (E6), and admin order detail has a Charge-saved-card block. Works on live customers, not just seed rows.

## ✅ Merchant connects processors → routing

`/store/{slug}/settings/payments` — one-click mock, Stripe secret-key modal validated through `verifyCredentials`, Maverick creds-optional. Credentials AES-encrypted in `ProcessorConfig`, decrypted only at charge time. Routing rules editor with weight %, brand multi-select, min/max amount, reorder. Weighted-random pick + hard-failure fallback chain, declines never cascading.

---

## Two honest gaps

**1. The subscription *engine* doesn't exist — only its primitive.** You said "save the subscriptions." What's built is the reusable token + a charge API you can call at any time. There is no scheduler, no billing cycles, no dunning or retry ladder, no subscription model in the schema. SPEC §11 drew the line exactly there ("a cron'd subscription engine is OUT of scope, the reusable token + charge API is IN"), so this is a deliberate scoping call rather than a miss — but if you expected to demo a recurring charge firing on a schedule, that's the piece to add.

**2. The live Stripe/Maverick paths have never been run against a real account.** Both are interface-complete and unit-tested at the error-mapping layer, but everything you'll see locally is simulated. One specific caveat worth knowing: Stripe gates raw PANs on `paymentMethods.create` behind PCI enablement, so pasting a stock test key will get you a rejection mapped to a decline — that's Stripe's policy, and it's documented in [the adapter header](packages/pay/src/adapters/stripe.ts:12), but it means "paste real keys and it works" is true only for a PCI-enabled account.

Neither affects the demo, which runs entirely on `mock` and shows the routing, failover, and saved-card story end to end.

### 👤 User

so explain to me exactly how it works. more simply. what is implemented. what was even asked in the spec.

### 🤖 Claude

## What the spec asked for

SPEC §11 calls it "Deviation #1" — meaning it's one of two things deliberately built *beyond* a plain Shopify clone. The ask, in plain terms:

> Build our own mini payments platform. It has three parts:
> 1. **A vault** — we hold the card, not a processor. Card goes in, a token comes out.
> 2. **Adapters** — a common interface that Stripe, Maverick, and a fake processor all implement.
> 3. **Routing** — the merchant connects their own processor accounts and writes rules deciding which charge goes where. Like CheckoutChamp.

Plus: saved cards for repeat billing.

## The one idea the whole thing rests on

Normally, when you tokenize a card with Stripe, **Stripe** holds the card and gives you a token that only Stripe can charge. If you later want to move to a different processor, you can't — your tokens are worthless outside Stripe. That's the lock-in.

Here, **we** hold the card. We encrypt the actual card number in our own database and hand out our own token. When it's time to charge, we decrypt the card and hand the raw number to whichever processor we chose *at that moment*.

That's the whole trick. Our token isn't tied to any processor, because it was never a processor's token to begin with.

## How a payment actually happens

**Step 1 — Card goes into the vault.**
The shopper types their card on the checkout page. The browser sends it *directly* to our vault endpoint — it never passes through the checkout server. We check it's a valid number, encrypt it, save it, and return a token like `card_tok_01H8X...`. From here on, nothing outside the vault ever sees the card number again.

**Step 2 — Pick a processor.**
Checkout says "charge this token $49.99." The router looks up which processors this merchant has connected, and which routing rules they wrote. Rules look like *"Amex under $500 → Stripe, 70% weight."* It filters to the rules that match this card and amount, then picks one by weight. Everything that didn't get picked becomes the backup list.

**Step 3 — Charge it.**
The router decrypts the card, hands it to the chosen processor's adapter, and gets back one of three answers:

- **Approved** → done. Record the payment, fire the `orders/paid` event.
- **Declined** → **stop.** The card was rejected. Trying the next processor would just be re-asking a question that was already answered no. (This is the rule the codebase guards hardest — it's one line, `break`, and there's a comment on it explaining that turning it into `continue` would break the platform.)
- **Hard failure** (the processor's servers are down, network died) → the card is fine, the *processor* is broken. Try the next one on the backup list, with the same token.

**Step 4 — Record it.** A `Payment` row is written either way, including failures, with a "routing trail" showing every processor that was tried. That's what the order page shows.

## What's actually implemented

| Piece | Status |
|---|---|
| Vault (encrypt, tokenize, decrypt) | Done |
| Fake processor with test cards | Done — this is what runs locally |
| Stripe adapter | Written, never run against a real account |
| Maverick adapter | Written, returns fake responses unless you add credentials |
| Routing rules + weighted split + failover | Done |
| Settings → Payments UI to connect processors and write rules | Done |
| Saved cards + "charge saved card" from an order | Done |

**Locally, you only ever touch the fake processor.** It's deterministic: `4242 4242 4242 4242` approves, `4000 0000 0000 0002` declines, `...9995` is insufficient funds, and anything ending `0119` pretends the processor crashed. That last one exists purely so you can *watch* the failover happen — it crashes on the fake processor and approves on Maverick, so a single checkout visibly hops from one processor to the other.

## What isn't there

**Subscriptions don't exist as a feature.** You asked for card tokens "so that we can save the subscriptions." What's built is the *ingredient*: a saved card you can charge again at any time, from the admin or from code. What's missing is everything that makes it a subscription — a billing schedule, a job that wakes up monthly and charges, retry logic when a renewal fails.

The spec drew that line explicitly ("a cron'd subscription engine is OUT of scope, the reusable token + charge API is IN"), so it's a deliberate cut, not an oversight. But if your mental picture was "recurring billing works," it doesn't — you can charge a saved card on demand, and nothing charges it on a schedule.

**The real processors are unproven.** Stripe and Maverick are fully written but have never talked to a live account. Everything you'll see in a demo is simulated.

### 👤 User

so when i talk about this i can say that it is implemented but untested? can you test it?

### 🤖 Claude

Careful — "untested" would undersell it and you'd get caught out. The accurate line is narrower. Let me verify rather than assert.

🔧 **Bash**
```
pnpm --filter @merchant/pay exec vitest run 2>&1 | tail -30
```

🔧 **Bash**
```
pnpm stack status 2>&1 | head -20
```

> **↳ result**
> ```
> RUN  v3.2.7 /Users/pauljurgens/Downloads/projects/shopify/packages/pay
> 
>  ✓ src/routing.test.ts (12 tests) 20ms
>  ✓ src/crypto.test.ts (13 tests) 15ms
>  ✓ src/adapters/maverick.test.ts (16 tests) 11ms
> 
>  ✓ src/vault.test.ts (47 tests) 46ms
>  ✓ src/adapters/mock.test.ts (19 tests) 86ms
>  ✓ src/adapters/stripe.test.ts (12 tests) 7ms
> 
>  ✓ src/router.test.ts (28 tests) 920ms
> 
>  Test Files  7 passed (7)
>       Tests  147 passed (147)
>    Start at  13:04:10
>    Duration  2.08s (transform 625ms, setup 0ms, collect 1.76s, tests 1.10s, environment 1ms, prepare 1.37s)
> ```

> **↳ result**
> ```
> > merchant@ stack /Users/pauljurgens/Downloads/projects/shopify
> > bash scripts/stack.sh "status"
> 
> 
> ==> main
>   checkout               /Users/pauljurgens/Downloads/projects/shopify
>   branch                 main
>   head                   add595d feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts] (#104) 
>   dated                  3 minutes ago
>   ✓ up to date with origin/main
> 
> ==> Landed on main
>   add595d feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts] (#104) (3 minutes ago)
>   aaee31a fix(shared): render the products vendor filter, drop the phantom skeleton button (#103) (13 minutes ago)
>   183a23f feat(ws-g): d
> … [truncated, 502 more chars]
> ```

### 🤖 Claude

147 unit tests pass in 2s. Now the real question — does it work over HTTP end to end?

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; curl -s -m 3 http://api.lvh.me:3001/health 2>&1 | head -5; echo "---exit $?"; lsof -nP -iTCP:3001 -sTCP:LISTEN 2>/dev/null | head -3
```

> **↳ result**
> ```
> {"status":"ok","uptime":57.635019166}---exit 0
> COMMAND  PID        USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
> node    8895 pauljurgens   24u  IPv4 0x2c5d99a9fb5dbe3b      0t0  TCP *:3001 (LISTEN)
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; ls e2e/ e2e/tests 2>/dev/null | head -20; echo "=== grep pay in e2e ==="; grep -rln "4242\|tokenize\|payment" e2e/ 2>/dev/null | grep -v node_modules | head
```

> **↳ result**
> ```
> e2e/:
> node_modules
> package.json
> playwright.config.ts
> tests
> tsconfig.json
> 
> e2e/tests:
> helpers.ts
> smoke.spec.ts
> === grep pay in e2e ===
> e2e/tests/smoke.spec.ts
> e2e/tests/helpers.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "test(\|test.describe(" e2e/tests/smoke.spec.ts
```

> **↳ result**
> ```
> 29:test.describe('mandatory smoke flows', () => {
> 30:  test('a) staff login → create product with 2 variants → appears in list', async ({ page }) => {
> 116:  test('b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund', async ({
> 164:  test('c) discount code applies at checkout', async ({ page }) => {
> 221:  test('d) AI builder: apply preset → publish → storefront reflects it', async ({ page }) => {
> 285:  test('e) second shop signup is isolated from the demo shop', async ({ page }) => {
> 315:test('skeleton: api answers /health', async ({ request }) => {
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; for p in 3000 3002; do printf "%s: " $p; lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1 && echo LISTENING || echo down; done; echo "=== tokenize approved card ==="; curl -s -X POST http://api.lvh.me:3001/vault/tokenize -H 'Content-Type: application/json' -H 'Origin: http://demo.lvh.me:3002' -d '{"number":"4242 4242 4242 4242","expMonth":11,"expYear":2028,"cvc":"123"}'
```

> **↳ result**
> ```
> 3000: LISTENING
> 3002: LISTENING
> === tokenize approved card ===
> {"cardTokenId":"card_tok_01M16FN83DJDP4QSP5CB74K57N","brand":"visa","last4":"4242","expMonth":11,"expYear":2028}
> ```

### 🤖 Claude

Vault works live. Now the router — let me drive a real checkout.

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "app\.\(post\|get\|patch\)" apps/api/src/routes/storefront/checkouts.ts | head -20; echo "=== cart routes ==="; grep -rn "app\.\(post\|get\)" apps/api/src/routes/storefront/cart*.ts 2>/dev/null | head -10; ls apps/api/src/routes/storefront/
```

> **↳ result**
> ```
> 41:  app.post('/checkouts', async (request, reply) => {
> 49:  app.get('/checkouts/:token', async (request) => {
> 62:  app.get('/checkouts/:token/shipping-rates', async (request) => {
> 71:  app.post(
> === cart routes ===
> apps/api/src/routes/storefront/cart.ts:58:  app.get('/cart', async (request, reply) => cartSchema.parse(await currentCart(request, reply)));
> apps/api/src/routes/storefront/cart.ts:60:  app.post('/cart', async (request, reply) => {
> apps/api/src/routes/storefront/cart.ts:66:  app.post('/cart/lines', async (request, reply) => {
> cart.ts
> checkouts.ts
> collections.ts
> customers
> events.ts
> products.ts
> shop.ts
> theme.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '35,100p' apps/api/src/routes/storefront/checkouts.ts
```

> **↳ result**
> ```
> export default async function routes(app: FastifyInstance) {
>   app.addHook('onSend', async (_request, reply) => {
>     privateResponse(reply);
>   });
> 
>   /* ---------------------------------------------------------------- create */
>   app.post('/checkouts', async (request, reply) => {
>     // The cart cookie is the shopper's identity here; E4 never passes an id.
>     const cart = request.cookies[CART_COOKIE];
>     const checkout = await createCheckout(request.db, requireShop(request), cart);
>     return reply.status(201).send(checkoutSchema.parse(checkout));
>   });
> 
>   /* ------------------------------------------------------------------- get */
>   app.get('/checkouts/:token', async (request) => {
> … [truncated, 2,323 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "completeCheckoutInput\|updateCheckoutInput" -A 25 packages/contracts/src/checkout.ts | head -70
```

> **↳ result**
> ```
> 83:export const updateCheckoutInput = z.object({
> 84-  email: z.string().email().optional(),
> 85-  phone: z.string().max(64).nullable().optional(),
> 86-  acceptsMarketing: z.boolean().optional(),
> 87-  shippingAddress: addressSchema.optional(),
> 88-  billingAddress: addressSchema.nullable().optional(),
> 89-  billingSameAsShipping: z.boolean().optional(),
> 90-  selectedShippingRateId: idSchema.nullable().optional(),
> 91-  discountCode: z.string().max(64).nullable().optional(),
> 92-  note: z.string().max(2000).nullable().optional(),
> 93-});
> 94:export type UpdateCheckoutInput = z.infer<typeof updateCheckoutInput>;
> 95-
> 96-/** "Pay now". `cardTokenId` came from the vault; this API never sees a PAN. */
> 97:e
> … [truncated, 1,112 more chars]
> ```

### 🤖 Claude

Now a full purchase over HTTP, three cards:

🔧 **Bash**
```
cat > /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/buy.sh <<'EOF'
#!/bin/bash
# One real purchase against the running stack. $1 = card number, $2 = label
API=http://demo.lvh.me:3001
ORIGIN=http://demo.lvh.me:3002
JAR=$(mktemp)
CARD="$1"; LABEL="$2"

VARIANT=$(curl -s "$API/storefront/api/products?limit=1" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["data"][0]["variants"][0]["id"])')
curl -s -c "$JAR" -b "$JAR" -X POST "$API/storefront/api/cart/lines" -H 'Content-Type: application/json' \
  -d "{\"variantI
… [truncated, 1,472 more chars]
```

> **↳ result**
> ```
> --- approved (4242424242424242) -> card_tok_01M16FP33C6426Q39NT74S3QHG
> {"errors":[{"code":"invalid_request","message":"An email address is required.","field":"email"}]}
> --- declined (4000000000000002) -> card_tok_01M16FP3C0C3A0WZF6HXCZF39R
> {"errors":[{"code":"invalid_request","message":"An email address is required.","field":"email"}]}
> --- insufficient (4000000000009995) -> card_tok_01M16FP3MXYEN36X9TW6BQSBZH
> {"errors":[{"code":"invalid_request","message":"An email address is required.","field":"email"}]}
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "addressSchema" -A 20 packages/contracts/src/common.ts | head -30
```

> **↳ result**
> ```
> 127:export const addressSchema = z.object({
> 128-  firstName: z.string().max(255).nullable().default(null),
> 129-  lastName: z.string().max(255).nullable().default(null),
> 130-  company: z.string().max(255).nullable().default(null),
> 131-  address1: z.string().max(255),
> 132-  address2: z.string().max(255).nullable().default(null),
> 133-  city: z.string().max(255),
> 134-  province: z.string().max(255).nullable().default(null),
> 135-  provinceCode: z.string().max(10).nullable().default(null),
> 136-  country: z.string().max(255),
> 137-  countryCode: z.string().length(2).toUpperCase(),
> 138-  zip: z.string().max(32),
> 139-  phone: z.string().max(64).nullable().default(null),
> 140-});
> 141:export type Address
> … [truncated, 633 more chars]
> ```

🔧 **Bash**
```
S=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/buy.sh
sed -i '' 's|"provinceCode":"OR","countryCode":"US"|"provinceCode":"OR","country":"United States","countryCode":"US"|' $S
sed -i '' 's|"billingSameAsShipping":true}'"'"' >/dev/null|"billingSameAsShipping":true}'"'"' \| head -c 200|' $S
grep -n 'billingSameAsShipping' $S
```

> **↳ result**
> ```
> 16:  "billingSameAsShipping":true}' | head -c 200
> ```

🔧 **Bash**
```
S=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/buy.sh
sed -i '' 's|  "billingSameAsShipping":true}'"'"' \| head -c 200|  "billingSameAsShipping":true}'"'"' >/dev/null|' $S
$S 4242424242424242 approved
$S 4000000000000002 declined
$S 4000000000009995 insufficient
```

> **↳ result**
> ```
> --- approved (4242424242424242) -> card_tok_01M16FPM14ET2PAM4BGJP996BQ
> {"errors":[{"code":"invalid_request","message":"A shipping method is required.","field":"selectedShippingRateId"}]}
> Traceback (most recent call last):
>   File "<string>", line 1, in <module>
> KeyError: 'cardTokenId'
> --- declined (4000000000000002) -> 
> {"errors":[{"code":"invalid_request","message":"Invalid input: must start with \"card_tok_\"","field":"cardTokenId"}]}
> Traceback (most recent call last):
>   File "<string>", line 1, in <module>
> KeyError: 'cardTokenId'
> --- insufficient (4000000000009995) -> 
> {"errors":[{"code":"rate_limited","message":"Rate limit exceeded. Retry in 42 seconds."}]}
> ```

🔧 **Bash**
```
S=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/buy.sh
python3 - "$S" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
s=s.replace('''CARDTOK=$(curl''','''RATE=$(curl -s -c "$JAR" -b "$JAR" "$API/storefront/api/checkouts/$TOKEN/shipping-rates" | python3 -c 'import sys,json;print(json.load(sys.stdin)[0]["id"])')
curl -s -c "$JAR" -b "$JAR" -X PUT "$API/storefront/api/checkouts/$TOKEN" -H 'Content-Type: application/json' -d "{\\"selectedShippingRateId\\":\\"$RATE\\"}" >/dev/null
CARDTOK=$(curl''')
open(p,'w').write(s)
PY
$S
… [truncated, 26 more chars]
```

> **↳ result**
> ```
> --- approved (4242424242424242) -> card_tok_01M16FQ2G39VQ5A8T7G6T62AGT
> {"errors":[{"code":"rate_limited","message":"Rate limit exceeded. Retry in 28 seconds."}]}
> ```

### 🤖 Claude

Rate limiter is firing (5 payments/min — working as specified). Backgrounding the run past the window:

🔧 **Bash**
```
sleep 70; S=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/buy.sh; $S 4242424242424242 approved; sleep 20; $S 4000000000000002 declined; sleep 20; $S 4000000000009995 insufficient
```

> **↳ result**
> ```
> Command running in background with ID: buz0gul3g. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/buz0gul3g.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

### 🤖 Claude

While that runs — checking the failover path, which needs two processors connected:

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; pnpm db:query "select id, processor, display_name, enabled from processor_configs" 2>&1 | tail -10
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify
> > bash scripts/db-query.sh "select id, processor, display_name, enabled from processor_configs"
> 
> ERROR:  column "display_name" does not exist
> LINE 1: select id, processor, display_name, enabled from processor_c...
>                               ^
> HINT:  Perhaps you meant to reference the column "processor_configs.displayName".
>  ELIFECYCLE  Command failed with exit code 1.
> ```

### 🤖 Claude

Understood — that's the actual gap. Let me be precise about what can and can't be tested here.

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "  it(\|describe(" packages/pay/src/adapters/stripe.test.ts
```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "  it(\|describe(" packages/pay/src/adapters/maverick.test.ts
```

> **↳ result**
> ```
> 59:describe('mapMaverickAuthResponse', () => {
> 60:  it('maps an approval, echoing the amount we asked for', () => {
> 70:  it('reports capture:false as an authorization', () => {
> 77:  it('maps issuer response codes onto the contract decline codes', () => {
> 91:  it('keeps an issuer outage a decline — the next processor reaches the same issuer', () => {
> 101:  it('maps a processor-side malfunction to hard_failure so the router can fail over', () => {
> 111:  it('treats an approval with no transaction id as a hard failure, not a silent approval', () => {
> 118:describe('maverick simulated mode', () => {
> 119:  it('runs simulated without credentials and live with them', () => {
> 125:  it('marks every sim
> … [truncated, 824 more chars]
> ```

> **↳ result**
> ```
> 17:describe('classifyStripeError — card errors are declines, never hard failures', () => {
> 18:  it('maps a generic decline', () => {
> 25:  it('prefers decline_code over code, which is where the real reason lives', () => {
> 31:  it('maps expiry and card-data errors onto the contract decline codes', () => {
> 43:  it('keeps transient issuer declines terminal — retrying elsewhere is card testing', () => {
> 51:describe('classifyStripeError — transport and credential failures may fail over', () => {
> 52:  it('maps a connection error to hard_failure', () => {
> 58:  it('maps a Stripe-side API error to hard_failure', () => {
> 64:  it('maps rate limiting to hard_failure', () => {
> 70:  it('maps bad or unautho
> … [truncated, 515 more chars]
> ```

🔧 **Bash**
```
cat /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/buz0gul3g.output 2>/dev/null
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; J=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/admin.jar
curl -s -c $J -X POST http://api.lvh.me:3001/auth/login -H 'Content-Type: application/json' -H 'Origin: http://admin.lvh.me:3000' -d '{"email":"owner@demo.dev","password":"password123"}' | head -c 200; echo; echo "=== processors ==="; curl -s -b $J -H 'Origin: http://admin.lvh.me:3000' http://api.lvh.me:3001/admin/api/payments/processors
```

> **↳ result**
> ```
> {"user":{"id":"usr_01M16F9HFWF81XYV7C96ZTDEK7","email":"owner@demo.dev","firstName":"Aurora","lastName":"Owner","role":"owner","permissions":{},"lastLoginAt":"2026-08-28T09:12:00.000Z","createdAt":"20
> === processors ===
> {"data":[{"id":"proc_01M16F9HM6VFJYS1598YSV73P4","processor":"mock","displayName":"Mock Gateway (test)","enabled":true,"testMode":true,"connected":true,"lastVerifiedAt":"2026-06-29T12:00:00.000Z","createdAt":"2026-05-31T12:00:00.000Z","updatedAt":"2026-08-29T09:58:25.159Z"}]}
> ```

### 🤖 Claude

That's a good question, and the blocker isn't what you'd expect. Let me check two things.

🔧 **ToolSearch**
```
{"query": "select:WebSearch,WebFetch", "max_results": 2}
```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,50p' docs/issues/A5-production-stack.md; echo "=== deploy files ==="; ls -d Dockerfile* docker-compose*.yml Caddyfile* deploy* infra* 2>/dev/null
```

> **↳ result**
> ```
> Exit code 1
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
> All four apps already have multi-stage Dockerfiles (Next apps buil
> … [truncated, 1,960 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; ls docker-compose*.yml 2>/dev/null; ls deploy 2>/dev/null; find apps -maxdepth 2 -name Dockerfile 2>/dev/null; echo "=== A5 in log ==="; grep -n "A5" docs/AGENT-LOG.md | head
```

🔧 **WebSearch**
```
{"query": "Stripe paymentMethods.create raw card number API blocked PCI test mode 2026"}
```

> **↳ result**
> ```
> docker-compose.prod.yml
> docker-compose.yml
> caddy
> apps/storefront/Dockerfile
> apps/admin/Dockerfile
> apps/api/Dockerfile
> apps/worker/Dockerfile
> === A5 in log ===
> 175:2026-08-28T14:47Z | WS-A | CLAIM A5 production stack (prod compose, Caddy, GHCR push, CustomDomain fallback) | branch ws-a/production-stack
> 197:2026-08-28T20:20Z | WS-A / WS-B / WS-C (A5, B5, B6, C5, C6, G4) | Left for you, all confirmed and NOT fixed by me: (1) pagination "1-50 of N" is impossible on every admin index because `paginated()` in `packages/contracts/src/common.ts` returns no total — needs a `totalCount` on the envelope plus each list service; already noted in DECISIONS. (2) The orders index Customer column shows the E
> … [truncated, 2,648 more chars]
> ```

> **↳ result**
> ```
> Web search results for query: "Stripe paymentMethods.create raw card number API blocked PCI test mode 2026"
> 
> Links: [{"title":"Forward card details to third-party API endpoints | Stripe Documentation","url":"https://docs.stripe.com/payments/vault-and-forward"},{"title":"Store Card Details Securely in Stripe | RapidDev","url":"https://www.rapidevelopers.com/stripe-guide/how-to-store-card-details-securely-with-stripe"},{"title":"Test card numbers | Stripe Documentation","url":"https://docs.stripe.com/testing"},{"title":"We are getting Card Error: Sending credit card numbers directly to the stripe API is generally unsafe. We suggest you use test tokens that map to the test card you are using. w
> … [truncated, 2,467 more chars]
> ```

🔧 **Bash**
```
cat /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/buz0gul3g.output 2>/dev/null; echo "--- (end)"
```

> **↳ result**
> ```
> --- approved (4242424242424242) -> card_tok_01M16FSGZFSWNQ2AFYNGK2DTCA
> {"status":"success","orderId":"ord_01M16FSHMSG02TR15CWFV4FFQV","orderNumber":1041,"confirmationUrl":"/checkouts/chk_f2f6de29d73fcd20493d13ebee3964c319c8e6ebc8f415e2/thank-you"}
> --- declined (4000000000000002) -> card_tok_01M16FT5SNV1JJX82W3CHZAS1B
> {"status":"failed","message":"Your card was declined.","code":"declined"}
> --- (end)
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '170,215p' packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> return created;
> }
> 
> /** Stripe amounts are minor units too, so no conversion — only the case differs. */
> const currency = (amount: MoneyDto) => amount.currencyCode.toLowerCase();
> 
> async function authorize(
>   req: AuthorizeRequest,
>   card: CardMaterial,
>   creds: ProcessorCredentials,
> ): Promise<AuthResult> {
>   try {
>     const stripe = client(creds);
> 
>     const paymentMethod = await stripe.paymentMethods.create(
>       {
>         type: 'card',
>         card: {
>           number: card.number,
>           exp_month: card.expMonth,
>           exp_year: card.expYear,
>           cvc: card.cvc,
>         },
>         billing_details: billingDetails(req, card),
>       },
>       // Suffixed so a retry of the whole a
> … [truncated, 792 more chars]
> ```

### 🤖 Claude

I ran the tests. Here's where it actually stands.

## What I verified just now

**147 unit tests pass** across the pay package (vault 47, router 28, mock 19, maverick 16, crypto 13, routing 12, stripe 12).

**Live over HTTP**, real purchases against the running stack — cart → checkout → vault → router → order:

```
4242424242424242 → {"status":"success","orderNumber":1041}
4000000000000002 → {"status":"failed","code":"declined"}
```

The vault returned `card_tok_01M16F…` with no PAN in the response, the approval created a real order, and the decline created no order. I also hit the payment rate limiter (5/min) mid-test, which is it working as specified.

So **"implemented but untested" is wrong and would undersell you.** The accurate line is: *"fully tested against our own processor; the Stripe and Maverick integrations are written and unit-tested at the logic layer but have never made a live API call."*

That distinction matters because the Stripe unit tests aren't nothing — 12 of them cover `classifyStripeError`, which is where the "declines never cascade" rule is enforced. What's untested is the SDK plumbing around it.

---

## Can we deploy a Stripe demo? Yes — and deployment isn't the hard part

**Deployment is already built.** A5 shipped (PR #86): `docker-compose.prod.yml` + Caddy with wildcard tenant routing and automatic TLS, images pushed to GHCR. Verified with two API replicas. Point it at a domain, swap Caddy's internal CA for Let's Encrypt (already noted in the Caddyfile), and it's live.

**The real blocker is Stripe's raw-card policy.** [Stripe blocks raw card numbers on the API by default — even test cards](https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis). And that's not incidental to us: our entire premise is that *we* hold the PAN so the token works across processors. The thing Stripe gates is exactly the thing that makes this CheckoutChamp-like rather than Stripe-lock-in.

Two ways through, and I'd do both:

**Path A — canned test PaymentMethods (works today, no waiting).** In test mode, map our test PANs to Stripe's pre-tokenized `pm_card_visa` / `pm_card_chargeDeclined` and skip `paymentMethods.create`, going straight to the PaymentIntent. That runs the real Stripe API for PaymentIntent creation, confirm, capture, refund, void, and error mapping — everything except the one call Stripe gates. It's a change to a single function in [stripe.ts](packages/pay/src/adapters/stripe.ts:178). You could demo a genuine Stripe charge appearing in a Stripe dashboard this week.

**Path B — request raw card data access.** Stripe support enables it for test accounts, and [explicitly says no compliance documentation is required for testing](https://support.stripe.com/questions/enabling-access-to-raw-card-data-apis). Then the adapter runs *completely unmodified* — full fidelity, the real end-to-end claim. It's one support ticket; the only cost is waiting on them.

Path A gets you demoable now; Path B is the version you can make the strong claim about.

**Maverick is a different story.** It needs a real merchant account, which is a sales process rather than a signup. Realistically it stays simulated unless you already have a relationship there — worth deciding whether that matters for your demo or whether Stripe alone proves the multi-processor point.

One caveat if you deploy publicly: keep it test-mode-only and don't invite real cards. It's a study clone, and the vault's security model is capped at the SPEC §15 baseline by design.

Want me to build Path A? It's contained, and I'd add the test-mode branch behind an explicit flag so the live-key path stays exactly as written.

### 👤 User

<task-notification>
<task-id>buz0gul3g</task-id>
<tool-use-id>toolu_01A1WHcx3K51GqKUAWSvyQae</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/buz0gul3g.output</output-file>
<status>completed</status>
<summary>Background command "Run three purchases past the rate-limit window" completed (exit code 0)</summary>
</task-notification>

🔧 **Bash**
```
cat /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/tasks/buz0gul3g.output
```

> **↳ result**
> ```
> --- approved (4242424242424242) -> card_tok_01M16FSGZFSWNQ2AFYNGK2DTCA
> {"status":"success","orderId":"ord_01M16FSHMSG02TR15CWFV4FFQV","orderNumber":1041,"confirmationUrl":"/checkouts/chk_f2f6de29d73fcd20493d13ebee3964c319c8e6ebc8f415e2/thank-you"}
> --- declined (4000000000000002) -> card_tok_01M16FT5SNV1JJX82W3CHZAS1B
> {"status":"failed","message":"Your card was declined.","code":"declined"}
> --- insufficient (4000000000009995) -> card_tok_01M16FTSVEJFGB1F0BEPMB13SN
> {"status":"failed","message":"Your card has insufficient funds.","code":"insufficient_funds"}
> 
> [exited with code 0]
> ```

### 🤖 Claude

The third card finished — all three test cards behave correctly end to end:

```
4242424242424242 → success, order #1041
4000000000000002 → failed, code "declined"
4000000000009995 → failed, code "insufficient_funds"
```

The insufficient-funds case is the one worth noting: it comes back as its own distinct code rather than being flattened into a generic decline, so the checkout can show the shopper the right message.

Nothing changed in the demo store except one extra test order (#1041, `paytest@example.com`) — I can delete it if you'd rather the seed stay clean.

My question from the last message still stands: want me to build **Path A** (map test PANs to Stripe's canned `pm_card_visa` PaymentMethods behind a test-mode flag, so you can demo a real Stripe charge without waiting on their support)?

### 👤 User

what is the simplest way to demo stripe and test it working. pick that and follow through with it.

### 🤖 Claude

Simplest is Path A — Stripe's canned test PaymentMethods, no support ticket, works on any stock test account. Let me confirm the exact identifiers first.

🔧 **WebFetch**
```
{"url": "https://docs.stripe.com/testing", "prompt": "List the prebuilt/canned test PaymentMethod ids (identifiers starting with pm_card_) that can be used server-side in test mode instead of raw card numbers. Include which card number each corresponds to and what outcome it produces (success, generic decline, insufficient funds, expired card, processing error, incorrect CVC). Quote the exact identifier strings."}
```

🔧 **ToolSearch**
```
{"query": "select:EnterWorktree", "max_results": 1}
```

> **↳ result**
> ```
> # Stripe Test PaymentMethod IDs (pm_card_*)
> 
> Here are the prebuilt test PaymentMethod IDs that can be used server-side in test mode:
> 
> ## Successful Payments
> 
> | PaymentMethod | Card Number | Outcome |
> |---|---|---|
> | `pm_card_visa` | 4242424242424242 | Success |
> | `pm_card_visa_debit` | 4000056655665556 | Success (Visa debit) |
> | `pm_card_mastercard` | 5555555555554444 | Success |
> | `pm_card_mastercard_debit` | 5200828282828210 | Success (Mastercard debit) |
> | `pm_card_mastercard_prepaid` | 5105105105105100 | Success (Mastercard prepaid) |
> | `pm_card_amex` | 378282246310005 | Success |
> | `pm_card_discover` | 6011111111111117 | Success |
> | `pm_card_diners` | 3056930009020004 | Success |
> | `pm_
> … [truncated, 834 more chars]
> ```

### 🤖 Claude

On it. Building now — the only thing I'll need from you at the end is a Stripe **test** key (you paste it yourself; I don't handle keys).

🔧 **EnterWorktree**
```
{"name": "ws-d-stripe-test-mode"}
```

> **↳ result**
> ```
> Created worktree at /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode on branch worktree-ws-d-stripe-test-mode. The session is now working in the worktree. Use ExitWorktree to leave mid-session, or exit the session to be prompted.
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode; sed -n '30,110p' packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> /**
>  * Stripe error → the one distinction the router keys on.
>  *
>  *   declined     — terminal. The card, the account or the request was rejected.
>  *                  Trying the next processor would either fail identically or,
>  *                  worse, retry a rejected card somewhere else, which is how a
>  *                  platform gets flagged for card testing.
>  *   hard_failure — we never got an answer, or the answer was about OUR
>  *                  credentials rather than the card. Another processor may work.
>  *
>  * Dispatch is on `err.type` (the class name Stripe stamps on every error)
>  * rather than `instanceof`, so a duplicated copy of the SDK in node_modules
>  * cannot silently downgr
> … [truncated, 2,425 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode; cat packages/pay/src/adapter.ts | head -60; echo "=== CardBrand ==="; grep -n "cardBrand\|CardBrand" -A 6 packages/contracts/src/pay.ts | head -20
```

> **↳ result**
> ```
> /**
>  * The processor boundary (SPEC §11). Owner: WS-D.
>  *
>  * Every processor implements exactly this. The router, the checkout, and the
>  * admin know nothing else about payments — which is what makes adding a
>  * processor a one-file change.
>  *
>  * Two deliberate deviations from the SPEC §11 sketch, both logged in
>  * DECISIONS.md:
>  *
>  *   1. `creds` is passed into every method rather than bound at construction.
>  *      Routing is per-merchant (SPEC §11), so one process serves many shops'
>  *      credentials; a per-shop adapter instance would mean a per-shop SDK
>  *      client cache — and a place for one tenant's key to be reused for
>  *      another. Stateless adapters make that class of bug un
> … [truncated, 2,222 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode; sed -n '41,46p' packages/contracts/src/pay.ts; echo "=== client() + creds ==="; sed -n '140,178p' packages/pay/src/adapters/stripe.ts; echo "=== credentials.ts ==="; grep -n "secretKey\|apiKey" packages/pay/src/credentials.ts apps/api/src/routes/admin/payments/processors.ts | head -20
```

> **↳ result**
> ```
> 'diners',
>   'unknown',
> ]);
> export type CardBrand = z.infer<typeof cardBrandSchema>;
> 
> /** Everything the rest of the system is allowed to know about a card. */
> === client() + creds ===
>     retryable: failure.outcome === 'hard_failure',
>   };
> }
> 
> /* --- SDK plumbing ---------------------------------------------------------- */
> 
> /**
>  * Keyed by the secret key itself, so two shops can never share a client. Stripe
>  * clients hold a keep-alive agent, which is the only reason to reuse them.
>  */
> const clients = new Map<string, Stripe>();
> 
> class MissingStripeKey extends Error {
>   readonly type = 'StripeAuthenticationError';
>   constructor() {
>     super('Stripe is not connected: no secret key on this pro
> … [truncated, 824 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode; grep -rn "secretKey" packages/contracts/src/pay.ts apps/api/src/routes/admin/payments/processors.ts apps/admin/src/app/store/\[slug\]/settings/payments/page.tsx | head -15; echo "=== verifyCredentials ==="; sed -n '/function verifyCredentials/,/^}/p' packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> packages/contracts/src/pay.ts:148:  /** Adapter-specific: { secretKey } for stripe, { apiKey, merchantId } for maverick. */
> apps/admin/src/app/store/[slug]/settings/payments/page.tsx:94:  const [secretKey, setSecretKey] = useState('');
> apps/admin/src/app/store/[slug]/settings/payments/page.tsx:118:        ? { secretKey: secretKey.trim() }
> apps/admin/src/app/store/[slug]/settings/payments/page.tsx:150:        disabled: provider.key === 'stripe' && !secretKey.trim(),
> apps/admin/src/app/store/[slug]/settings/payments/page.tsx:167:              value={secretKey}
> === verifyCredentials ===
> async function verifyCredentials(creds: ProcessorCredentials): Promise<boolean> {
>   try {
>     await client(cr
> … [truncated, 77 more chars]
> ```

### 🤖 Claude

Now building it. New module for the mapping:

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode; cat > packages/pay/src/adapters/stripe-test-cards.ts <<'EOF'
/**
 * Stripe test mode: our PAN → Stripe's canned test PaymentMethod. Owner: WS-D.
 *
 * WHY THIS EXISTS. Our whole design holds the PAN ourselves so that one
 * `card_tok_` is chargeable on any processor (SPEC §11). Stripe blocks exactly
 * that: raw card numbers on the API are gated behind "raw card data API
 * access", which a stock account does not have — even in test mode, even with
 * Stripe's own test numbers. So `paymentMethods.create({
… [truncated, 3,191 more chars]
```

> **↳ result**
> ```
> This session is isolated in the worktree /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode, but this command is too complex to verify that it stays inside the worktree. Refusing to run it — a worktree-isolated session's git operations must target its own worktree. Split it into plain, separate commands and run them from /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode.
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe-test-cards.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe-test-cards.ts (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now wire it into the adapter:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now the env var (shared package — additive with a default):

🔧 **Bash**
```
sed -n '45,56p' packages/config/src/env.ts
```

> **↳ result**
> ```
> // AES-256-GCM key: exactly 32 bytes, hex-encoded. Wrong length must fail at
>   // boot, not at the first card tokenization during a demo.
>   VAULT_MASTER_KEY: z
>     .string()
>     .regex(/^[0-9a-fA-F]{64}$/, 'VAULT_MASTER_KEY must be 64 hex chars (32 bytes)'),
>   STRIPE_SECRET_KEY=[REDACTED]''),
>   MAVERICK_API_KEY: z.string().optional().default(''),
>   MAVERICK_MERCHANT_ID: z.string().optional().default(''),
> 
>   // --- object storage ---
>   S3_ENDPOINT: z.string().url(),
>   S3_REGION: z.string().default('us-east-1'),
> ```

🔧 **Bash**
```
sed -n '36,48p' .env.example
```

> **↳ result**
> ```
> # --- Pay / vault (SPEC §11) ---------------------------------------------------
> # AES-256-GCM master key: exactly 64 hex chars (32 bytes). openssl rand -hex 32
> VAULT_MASTER_KEY=0000000000000000000000000000000000000000000000000000000000000000
> 
> # Optional per-deployment processor creds. Absent => adapter reports "not connected".
> # Per-merchant credentials live encrypted in ProcessorConfig, not here.
> STRIPE_SECRET_KEY=
> MAVERICK_API_KEY=
> MAVERICK_MERCHANT_ID=
> 
> # --- Object storage (MinIO locally, S3 in prod) -------------------------------
> S3_ENDPOINT=http://localhost:9000
> S3_REGION=us-east-1
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/config/src/env.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/config/src/env.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
grep -n "boolean\|z.coerce\|'true'" packages/config/src/env.ts | head -15
```

> **↳ result**
> ```
> 14:const booleanish = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
> 34:  API_PORT: z.coerce.number().int().positive().default(3001),
> 35:  ADMIN_PORT: z.coerce.number().int().positive().default(3000),
> 36:  STOREFRONT_PORT: z.coerce.number().int().positive().default(3002),
> 42:  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
> 56:  STRIPE_RAW_CARD_DATA: booleanEnv.default(false),
> 66:  S3_FORCE_PATH_STYLE: booleanish.default('true'),
> 71:  SMTP_PORT: z.coerce.number().int().positive().default(1025),
> 74:  SMTP_SECURE: booleanish.default('false'),
> 110:export const isProduction = (): boolean => env().NODE_ENV === 'production';
> 111:export const isTes
> … [truncated, 265 more chars]
> ```

### 🤖 Claude

The convention is `booleanish` with a string default:

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/config/src/env.ts
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/config/src/env.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Edit**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/.env.example
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/.env.example has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now tests for the mapping and the gate:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe-test-cards.test.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay/src/adapters/stripe-test-cards.test.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
pnpm --filter @merchant/pay exec vitest run src/adapters/stripe-test-cards.test.ts 2>&1 | tail -25
```

> **↳ result**
> ```
> undefined
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/pay:
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "vitest" not found
> ```

🔧 **Bash**
```
pnpm install 2>&1 | tail -8
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
> Done in 16.7s
> ```

🔧 **Bash**
```
pnpm --filter @merchant/pay exec vitest run 2>&1 | tail -25
```

> **↳ result**
> ```
> Copy .env.example to .env — it works with zero edits.
> 
>  ❯ env ../config/src/env.ts:96:11
>      94|       .map((i) => `  ${i.path.join('.')}: ${i.message}`)
>      95|       .join('\n');
>      96|     throw new Error(
>        |           ^
>      97|       `Invalid environment.\n\n${details}\n\nCopy .env.example to .env…
>      98|     );
>  ❯ vaultKey src/vault.ts:128:28
>  ❯ sealCardBlob src/vault.ts:134:51
>  ❯ src/vault.test.ts:131:20
> 
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯
> 
> 
>  Test Files  2 failed | 6 passed (8)
>       Tests  3 failed | 126 passed (129)
>    Start at  13:14:16
>    Duration  7.10s (transform 9.51s, setup 0ms, collect 16.75s, tests 1.04s, environment 3ms, prepare 9.36s)
> 
> undefined
> /Users/pauljurgens/
> … [truncated, 161 more chars]
> ```

🔧 **Bash**
```
pnpm worktree:env --migrate 2>&1 | tail -15
```

> **↳ result**
> ```
> > merchant@ worktree:env /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode
> > bash scripts/worktree-env.sh "--migrate"
> 
> error: all 15 Redis slots are taken — archive a finished worktree first
> error: no Redis slot for ws-d-stripe-test-mode — remove a finished worktree's directory (or fix its .env) and rerun
>  ELIFECYCLE  Command failed with exit code 1.
> ```

### 🤖 Claude

All Redis slots are taken by other worktrees. The pay unit tests don't need Redis or a database — just a valid env:

🔧 **Bash**
```
cp .env.example .env && echo "copied" && pnpm --filter @merchant/pay exec vitest run 2>&1 | tail -22
```

> **↳ result**
> ```
> copied
>  ✓ src/adapters/stripe.test.ts (12 tests) 14ms
>  ✓ src/adapters/stripe-test-cards.test.ts (10 tests) 12ms
> 
> ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯
> 
>  FAIL  src/router.test.ts [ src/router.test.ts ]
> Error: Cannot find module '.prisma/client/default'
> Require stack:
> - /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/default.js
>  ❯ Object.<anonymous> ../../node_modules/.pnpm/@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/default.js:2:6
> 
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
> 
> 
>  Test Files  1 failed | 7 pa
> … [truncated, 360 more chars]
> ```

### 🤖 Claude

10 new tests pass. `router.test.ts` just needs the Prisma client generated in this worktree:

🔧 **Bash**
```
pnpm --filter @merchant/db exec prisma generate 2>&1 | tail -4
```

> **↳ result**
> ```
> Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
> 
> Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
> ```

🔧 **Bash**
```
pnpm --filter @merchant/pay exec vitest run 2>&1 | tail -14
```

> **↳ result**
> ```
> ✓ charge — idempotency > survives two concurrent charges on one key without a unique-index 500  468ms
>    ✓ capture, void and refund > caps two partial refunds at the captured amount  546ms
>    ✓ capture, void and refund > caps against the sum of refund rows, not against a single request  488ms
>    ✓ capture, void and refund > enforces its own cap even when the processor would allow more  515ms
>    ✓ capture, void and refund > two concurrent refunds cannot exceed the captured amount  328ms
>    ✓ capture, void and refund > refuses an idempotency key that already refunded a different payment  456ms
>    ✓ capture, void and refund > releases a pending reservation older than the TTL — cap and key both
> … [truncated, 305 more chars]
> ```

### 🤖 Claude

All 157 pass (147 existing + 10 new). Now typecheck and lint:

🔧 **Bash**
```
pnpm --filter @merchant/pay --filter @merchant/config exec tsc --noEmit -p tsconfig.json 2>&1 | tail -15
```

🔧 **Bash**
```
pnpm exec biome check packages/pay/src/adapters/stripe-test-cards.ts packages/pay/src/adapters/stripe-test-cards.test.ts packages/pay/src/adapters/stripe.ts packages/config/src/env.ts 2>&1 | tail -25
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

> **↳ result**
> ```
> > 8 │ import { TEST_CARDS } from './test-cards.ts';
>    > 9 │ import { isStripeTestKey, testPaymentMethodFor } from './stripe-test-cards.ts';
>        │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>     10 │ 
>     11 │ const card = (number: string, brand: CardMaterial['brand'] = 'visa'): CardMaterial => ({
>   
>   i Safe fix: Organize imports and exports (Biome)
>   
>      6  6 │   import { describe, expect, it } from 'vitest';
>      7  7 │   import type { CardMaterial } from '../adapter.ts';
>      8    │ - import·{·TEST_CARDS·}·from·'./test-cards.ts';
>      9    │ - import·{·isStripeTestKey,·testPaymentMethodFor·}·from·'./stripe-test-cards.ts';
>         8 │ + import·{·is
> … [truncated, 462 more chars]
> ```

🔧 **Bash**
```
pnpm exec biome check --write packages/pay/src/adapters/stripe-test-cards.test.ts 2>&1 | tail -5
```

> **↳ result**
> ```
> Checked 1 file in 10ms. Fixed 1 file.
> [This command modified 1 file you've previously read: packages/pay/src/adapters/stripe-test-cards.test.ts. Call Read before editing.]
> ```

🔧 **Bash**
```
cat packages/pay/src/credentials.ts
```

> **↳ result**
> ```
> /**
>  * Processor credentials at rest (SPEC §11). Owner: WS-D.
>  *
>  * A merchant's Stripe secret key is stored AES-256-GCM encrypted in
>  * `ProcessorConfig`, under the same `VAULT_MASTER_KEY` as the card vault. One
>  * key for both is a deliberate simplification the SPEC calls for — separate
>  * keys would buy nothing without rotation, and rotation is explicitly out of
>  * scope.
>  *
>  * The rule these functions exist to enforce: credentials go in as a sealed
>  * blob and come out only inside `packages/pay`, on their way to an adapter.
>  * No API response ever contains them — `processorConfigSchema` has a
>  * `connected` boolean and no credential field at all, which is what makes that
>  * hard to get w
> … [truncated, 2,024 more chars]
> ```

🔧 **Bash**
```
tail -4 DECISIONS.md
```

> **↳ result**
> ```
> 2026-08-29 | WS-B | The product form's Description is a real rich text editor (`contenteditable` + `document.execCommand`), so `ProductDraft.description`/`descriptionIsRich` are gone and the draft holds RAW HTML end to end. This REPLACES the "unwrap simple html into a textarea" decision for products; `lib/description-html.ts` and its round-trip test stay, because the collection form still edits that way. execCommand is deprecated and is still the only rich-text primitive every browser implements identically — ProseMirror/Lexical would be a locked-stack change (SPEC §3).
> 2026-08-29 | WS-B | The product page header is a BREADCRUMB (product icon → `›` → title) hand-built inside `Page`, not Pola
> … [truncated, 1,313 more chars]
> ```

🔧 **Bash**
```
git branch -m ws-d/stripe-test-mode && git branch --show-current
```

> **↳ result**
> ```
> ws-d/stripe-test-mode
> ```

🔧 **Bash**
```
cat >> DECISIONS.md <<'ENTRY'
2026-08-29 | WS-D | On an `sk_test_` key the Stripe adapter charges Stripe's canned test PaymentMethods (`pm_card_visa` & co) instead of tokenizing our vaulted PAN, because Stripe rejects raw card numbers on the API unless the account has "raw card data access" — so a stock test key could not run a single charge, making the adapter undemoable. Everything after tokenization (PaymentIntent, confirm, capture, refund, void, `classifyStripeError`) still hits the real API, so this proves the adapter rather than mocking it. Gated on the key prefix, so `sk_live_` can neve
… [truncated, 276 more chars]
```

> **↳ result**
> ```
> 2026-08-29 | WS-D | On an `sk_test_` key the Stripe adapter charges Stripe's canned test PaymentMethods (`pm_card_visa`
> ```

🔧 **Bash**
```
git add -A && git status --short
```

> **↳ result**
> ```
> M  .env.example
> M  DECISIONS.md
> M  packages/config/src/env.ts
> A  packages/pay/src/adapters/stripe-test-cards.test.ts
> A  packages/pay/src/adapters/stripe-test-cards.ts
> M  packages/pay/src/adapters/stripe.ts
> ```

🔧 **Bash**
```
git commit -q -F - <<'MSG'
feat(ws-d): make the Stripe adapter demoable on a stock test key

Stripe rejects raw card numbers on the API unless the account has "raw
card data access" — even in test mode, even with Stripe's own test
numbers. Our design holds the PAN ourselves so one card_tok_ is
chargeable on any processor, which is precisely what that gate blocks,
so paymentMethods.create failed on a fresh sk_test_ key and the adapter
could not be demoed at all.

On a test key, tokenization is now substituted with Stripe's documented
canned PaymentMethods (pm_card_visa & co), mapped from the SP
… [truncated, 555 more chars]
```

> **↳ result**
> ```
> Checked 4 files in 124ms. No fixes applied.
> 50eb252 feat(ws-d): make the Stripe adapter demoable on a stock test key
> ```

### 🤖 Claude

Code is committed and unit-tested. Now I need your Stripe **test** key to prove it against the real API — I don't handle keys, so you'll add it yourself. Let me get the verification ready first:

🔧 **Write**
```
/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts
```

> **↳ result**
> ```
> File created successfully at: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
grep -n '"exports"' -A 20 packages/pay/package.json
```

> **↳ result**
> ```
> 6:  "exports": {
> 7-    "./*": "./src/*.ts"
> 8-  },
> 9-  "scripts": {
> 10-    "typecheck": "tsc --noEmit",
> 11-    "test": "vitest run"
> 12-  },
> 13-  "dependencies": {
> 14-    "@merchant/config": "workspace:*",
> 15-    "@merchant/contracts": "workspace:*",
> 16-    "@merchant/db": "workspace:*",
> 17-    "stripe": "^22.6.0",
> 18-    "ulid": "^2.3.0",
> 19-    "zod": "^3.24.1"
> 20-  },
> 21-  "devDependencies": {
> 22-    "@types/node": "^22.10.7",
> 23-    "typescript": "^5.7.3",
> 24-    "vitest": "^3.0.5"
> 25-  }
> 26-}
> ```

🔧 **Bash**
```
sed -n '55,90p' packages/pay/src/adapter.ts
```

> **↳ result**
> ```
> card: CardMaterial,
>     creds: ProcessorCredentials,
>   ): Promise<AuthResult>;
>   capture(txnId: string, amount: MoneyDto, creds: ProcessorCredentials): Promise<ProcessorResult>;
>   /**
>    * `opts.idempotencyKey` reaches the processor (Stripe's idempotency header,
>    * Maverick's `idempotency-key`), so retrying a refund whose first attempt's
>    * outcome was lost REPLAYS it instead of refunding twice.
>    */
>   refund(
>     txnId: string,
>     amount: MoneyDto,
>     creds: ProcessorCredentials,
>     opts?: { idempotencyKey?: string },
>   ): Promise<ProcessorResult>;
>   voidAuth(txnId: string, creds: ProcessorCredentials): Promise<ProcessorResult>;
>   verifyCredentials(creds: ProcessorCredentials): Prom
> … [truncated, 15 more chars]
> ```

🔧 **Write**
```
/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts
```

> **↳ result**
> ```
> The file /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
cd packages/pay && pnpm exec tsx /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts 2>&1 | tail -15
```

> **↳ result**
> ```
> undefined
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "tsx" not found
> 
> Did you mean "pnpm exec tsc"?
> ```

🔧 **Bash**
```
cd apps/api && pnpm exec tsx /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts 2>&1 | tail -15
```

> **↳ result**
> ```
> Exit code 1
> (eval):cd:1: no such file or directory: apps/api
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/apps/api && pnpm exec tsx /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts 2>&1 | tail -15
```

> **↳ result**
> ```
> Copy .env.example to .env — it works with zero edits.
> 
>     at env (/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/packages/config/src/env.ts:96:11)
>     at <anonymous> (/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts:13:19)
>     at Object.<anonymous> (/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts:80:2)
>     at Module._compile (node:internal/modules/cjs/loader:1781:14)
>     at Object.transformer (/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/node
> … [truncated, 444 more chars]
> ```

🔧 **Bash**
```
sed -n '1,30p' packages/config/src/env.ts | head -30; grep -rn "dotenv" packages/config/src/*.ts apps/api/src/index.ts 2>/dev/null | head
```

> **↳ result**
> ```
> sed: packages/config/src/env.ts: No such file or directory
> (eval):1: no matches found: packages/config/src/*.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode && grep -rn "dotenv\|loadEnv\|\.env" packages/config/src/env.ts | head
```

> **↳ result**
> ```
> packages/config/src/env.ts:5: *  - Add a var here and to `.env.example` in the SAME commit. CI enforces the
> packages/config/src/env.ts:91:  const parsed = schema.safeParse(process.env);
> packages/config/src/env.ts:97:      `Invalid environment.\n\n${details}\n\nCopy .env.example to .env — it works with zero edits.\n`,
> ```

🔧 **Bash**
```
node --env-file=.env --import ./apps/api/node_modules/tsx/dist/loader.mjs /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts 2>&1 | tail -8
```

> **↳ result**
> ```
> at nextStep (node:internal/modules/customization_hooks:189:26) {
>   code: 'MODULE_NOT_FOUND',
>   requireStack: [
>     '/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts'
>   ]
> }
> 
> Node.js v22.23.2
> ```

🔧 **Bash**
```
cp /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts ./verify-stripe.local.ts && node --env-file=.env --import ./apps/api/node_modules/tsx/dist/loader.mjs ./verify-stripe.local.ts 2>&1 | tail -8
```

> **↳ result**
> ```
> at nextStep (node:internal/modules/customization_hooks:189:26)
>     at resolveBaseSync (file:///Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/node_modules/.pnpm/tsx@4.23.12/node_modules/tsx/dist/register-C4vWVmug.mjs:2:10932)
>     at resolveDirectorySync (file:///Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/node_modules/.pnpm/tsx@4.23.12/node_modules/tsx/dist/register-C4vWVmug.mjs:2:12238)
>     at resolveTsPathsSync (file:///Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/node_modules/.pnpm/tsx@4.23.12/node_modules/tsx/dist/register-C4vWVmug.mjs:2:13445) {
>   code: 'ERR_MODULE_NOT_
> … [truncated, 26 more chars]
> ```

🔧 **Bash**
```
rm -f ./verify-stripe.local.ts && cp /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify/3b8ea5b6-afcf-4a6e-a0fc-7588036323bd/scratchpad/verify-stripe.ts ./apps/api/verify-stripe.local.ts && node --env-file=.env --import ./apps/api/node_modules/tsx/dist/loader.mjs ./apps/api/verify-stripe.local.ts 2>&1 | tail -8
```

> **↳ result**
> ```
> STRIPE_SECRET_KEY is empty in .env — nothing to verify.
> ```

🔧 **Bash**
```
git check-ignore -v .env && git status --short | head -5
```

> **↳ result**
> ```
> .gitignore:13:.env	.env
> ?? apps/api/verify-stripe.local.ts
> ```

### 🤖 Claude

Everything is built and the verification harness runs — it's waiting only on a key.

## Where things stand

**Built and committed** on branch `ws-d/stripe-test-mode` (worktree, not main):
- [stripe-test-cards.ts](packages/pay/src/adapters/stripe-test-cards.ts) — maps our PANs to Stripe's canned `pm_card_*` PaymentMethods
- [stripe.ts](packages/pay/src/adapters/stripe.ts) — a `tokenize()` seam that takes the canned path only on `sk_test_` keys
- `STRIPE_RAW_CARD_DATA` env flag for later, if Stripe enables raw card access on your account
- 10 new unit tests; **157 pass** in the pay package; typecheck and lint clean

The safety property is structural: `sk_live_` can never reach the substitution, and there's a test asserting exactly that.

## What I need from you

Add your Stripe **test** secret key to this file:

```bash
open -e /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ws-d-stripe-test-mode/.env
```

Set the line that's currently `STRIPE_SECRET_KEY=` to your `sk_test_…` key from the [Stripe test-mode dashboard](https://dashboard.stripe.com/test/apikeys). The file is gitignored, and I won't read it — the script reads it through the normal env parser and **refuses to run on anything that isn't a test key**.

Tell me when it's saved and I'll run the live verification: authorize on all four test cards, a refund, and an authorize-then-capture — all against Stripe's real API, with the results printed here. You'll be able to see the same charges appear in your Stripe test dashboard, which is the demo.

One thing to flag now so it doesn't surprise you mid-demo: on Stripe, the `…0119` card comes back as a **`processing_error` decline, not a failover**. That's Stripe's real behaviour and our classifier deliberately treats issuer-answered processing errors as terminal. So the processor-failover story stays a mock→maverick demo; the Stripe demo is "our vault token charged on real Stripe."
