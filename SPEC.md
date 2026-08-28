# PROJECT NORTHSTAR — Multi-Tenant Shopify Clone

**This document is the single source of truth.** Every agent reads this before writing code. If code and this document disagree, this document wins. If this document is ambiguous, the agent picks the option that maximizes the KPI and records the decision in `DECISIONS.md` (append-only, one line per decision).

---

## 1. Mission & KPI

Build a multi-tenant e-commerce platform that is visually and functionally indistinguishable from Shopify for common e-commerce use.

**Priority order (resolve every trade-off with this):** 1. appearance parity, 2. functionality, 3. performance, 4. everything else (incl. security beyond the §15 baseline).

**KPI: A person who knows Shopify opens the admin or a storefront checkout and cannot tell it is not Shopify.**

This means:
- The admin panel is a 1:1 reproduction of the current Shopify admin UI/UX (layout, navigation, component styling, interaction patterns, empty states, toasts, save bars). Not "inspired by" — **identical**. We use Shopify's own open-source **Polaris** design system to guarantee pixel parity.
- The checkout looks and behaves like Shopify checkout (single-page, contact → delivery → payment sections, order summary sidebar).
- Loading feels Shopify-fast: skeleton states, optimistic saves, sub-second page transitions.

**Deviations from Shopify (intentional, the ONLY two):**
1. **Payments**: our own payment platform ("**Pay**") with card tokenization + multi-processor routing (merchant connects Stripe / Maverick / others; we route). Like CheckoutChamp. Tokens are processor-agnostic so subscriptions/repeat billing work across processors.
2. **Storefront**: instead of a theme store, an **AI storefront builder** (Lovable-style chat + live preview) that generates and iterates the shop's storefront.

**Timeline: 2 days.** Everything in this doc is scoped to be achievable in 2 days by parallel agents. When in doubt: ship the KPI, cut the rest.

**Branding**: The product is named **"Merchant"** in UI chrome where a brand name is unavoidable (login page title, `<title>` tags). Do NOT use the Shopify name or Shopify logo anywhere (trademark). Everything else — layout, colors, components — is Polaris and therefore looks exactly like Shopify.

---

## 2. Scope

### In scope (must ship)
- Multi-tenant core: one deployment, many shops. Shop signup creates an isolated shop.
- Staff accounts per shop with roles/permissions; session auth.
- Products (variants, options, images, SEO), collections (manual + smart), inventory across multiple locations.
- Orders (create via checkout, view, fulfill, refund, cancel, timeline), draft orders **(cut if time-boxed out)**.
- Customers (list, detail, addresses, order history, segments-lite).
- Discounts (amount off order, amount off products, free shipping; code-based and automatic).
- Themed storefront per shop: home, collection, product, cart, search pages; rendered from AI-builder output.
- Checkout: cart → information → shipping → payment → order confirmation. Guest + customer login.
- Pay platform: card vault + tokenization, processor adapters (Mock, Stripe, Maverick stub), per-merchant routing rules, refunds, saved cards for repeat billing/subscription charges.
- Analytics: dashboard with sales over time, orders, conversion funnel, top products; live view-lite.
- App surface: private apps page — merchant creates an app, gets Admin API token, configures webhooks; REST Admin API subset; webhook delivery.
- AI builder: chat panel + live preview; generates/edits storefront (sections, settings, theme tokens); versioned; publish.
- Settings: general, locations, staff/permissions, payments (connect processors + routing), shipping rates (flat/price-based), taxes (simple %), checkout settings, notifications-lite.

### Out of scope (do NOT build — hard stop)
- POS, Shopify Markets/multi-currency selling (single currency per shop; default USD), gift cards, B2B, Shopify Flow/automation, marketing campaigns/email sending (beyond order confirmation email), blogs/pages CMS (nav links can be external), metafields UI (schema supports JSON `metadata` columns), fulfillment services/3PL integrations, real carrier-calculated shipping, tax providers (Avalara etc.), multi-language, currency conversion, real Maverick API integration (adapter is interface-complete but returns simulated responses unless creds provided), mobile apps, GraphQL Admin API (REST only).

If an agent believes something out-of-scope is needed to hit the KPI, it writes the argument in `DECISIONS.md` and builds the minimal version.

---

## 3. Tech Stack (locked — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.x, strict mode everywhere | No JS files except config |
| Monorepo | pnpm workspaces + Turborepo | `pnpm` only; never npm/yarn |
| Admin app | Next.js 15 (App Router) + **@shopify/polaris ^13** + polaris-icons | Client-heavy; React Query for data. See "Why Polaris" below |
| Storefront | Next.js 15 (App Router), Tailwind CSS 4 | Multi-tenant by Host header; SSR + edge-cacheable |
| API | Fastify 5 + Zod validation | Single REST API service, OpenAPI-documented via zod schemas |
| DB | PostgreSQL 16 | One database, shared schema, `shop_id` on every tenant row |
| ORM | Prisma 6 | Tenant-scoped client extension (see §6) |
| Cache/queue | Redis 7 + BullMQ | Webhooks, emails, analytics rollups, AI jobs |
| Object storage | S3 API — MinIO locally | Product images, theme assets |
| Email | Mailpit locally (SMTP), console fallback | Order confirmation only |
| AI | Anthropic API, model `claude-sonnet-5` | AI builder; key via `ANTHROPIC_API_KEY`; graceful degradation to canned templates if unset |
| Auth | Custom: argon2id + httpOnly session cookies (Redis-backed sessions) | No third-party auth SaaS |
| Payments crypto | AES-256-GCM envelope encryption, key from `VAULT_MASTER_KEY` env (KMS in prod) | Vault is its own module with private tables |
| Unit tests | Vitest | Only where mandated in §14 |
| E2E | Playwright | Smoke suite only |
| Lint/format | Biome | One config at root, no per-package overrides |

Node 22 LTS. All services are Dockerized; local dev = `docker compose up -d` (infra) + `pnpm dev` (apps).

**Why Polaris (settled — do not relitigate):** the KPI is pixel parity, and Polaris *is* Shopify's own UI: composing its components produces the Shopify look with zero interpretation. Rebuilding that look in Tailwind/shadcn would make every agent hand-recreate Shopify from memory — 20 slightly different interpretations, KPI dead. Polaris is plain React/TypeScript with well-documented props; agents handle it fine. Mitigations for the long tail:
- Pin `@shopify/polaris` to **v13** exactly (best-documented version). Do not upgrade mid-project.
- **Escape hatch**: if a Polaris component fights you for >20 minutes, build the element in plain JSX styled with Polaris CSS custom properties (`--p-*` tokens) so pixels stay identical. Log it in `DECISIONS.md`.
- **Charts**: try `@shopify/polaris-viz` first (exact Shopify charts); if it resists, the sanctioned fallback is **Recharts** styled with Polaris tokens (huge agent familiarity). Either is acceptable.
- Everything non-admin (storefront, checkout, theme sections, AI builder preview) is **Tailwind** — maximal agent fluency where the design is ours anyway.

---

## 4. Monorepo Layout & Ownership

```
/
├── SPEC.md                     ← this file
├── DECISIONS.md                ← append-only decision log (any agent may append, never edit)
├── docker-compose.yml          ← postgres, redis, minio, mailpit
├── turbo.json / pnpm-workspace.yaml / biome.json
├── apps/
│   ├── api/          # Fastify: all business logic, REST API (port 3001)
│   ├── admin/        # Next.js + Polaris admin (port 3000)
│   ├── storefront/   # Next.js multi-tenant storefront + checkout (port 3002)
│   └── worker/       # BullMQ workers (webhooks, email, analytics rollup, AI jobs)
├── packages/
│   ├── db/           # Prisma schema, migrations, seed, tenant-scoped client
│   ├── contracts/    # Zod schemas + TS types for EVERY API request/response, webhook payload, theme JSON, Pay interfaces. THE INTEGRATION CONTRACT.
│   ├── pay/          # Vault, ProcessorAdapter interface, adapters (mock, stripe, maverick), router
│   ├── theme-engine/ # Section registry, theme JSON validation, React renderers for all sections
│   └── config/       # Shared env parsing (zod), constants, id generation, money utils
└── e2e/              # Playwright smoke suite
```

**Ownership rule for parallel agents:** an agent owns its workstream directories (§16) and may freely edit inside them. `packages/contracts` and `packages/db/prisma/schema.prisma` are **shared**: additive changes (new schema, new field with default) are allowed anytime; breaking changes (rename/retype/remove) require appending a `DECISIONS.md` entry FIRST and grepping for all usages. Never edit another workstream's app code — if you need something from it, define it in `contracts` and stub it.

---

## 5. Global Conventions (memorize these)

- **IDs**: ULIDs with type prefixes: `shop_`, `usr_`, `prod_`, `var_`, `col_`, `loc_`, `inv_`, `ord_`, `li_` (line item), `cus_`, `addr_`, `dis_`, `chk_` (checkout), `pay_` (payment), `card_tok_`, `proc_` (processor config), `app_`, `wh_` (webhook), `thm_` (theme version), `evt_`. Generator lives in `packages/config`.
- **Money**: integers in minor units (cents) + ISO currency code. Never floats. `Money = { amount: number; currencyCode: string }`. Helpers in `packages/config/money.ts`.
- **Timestamps**: `TIMESTAMPTZ`, ISO-8601 in JSON, UTC always.
- **API error shape** (every non-2xx): `{ "errors": [{ "code": "invalid_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "rate_limited" | "internal", "message": string, "field"?: string }] }`.
- **Pagination**: cursor-based: `?limit=50&cursor=...` → response `{ data: [...], nextCursor: string | null }`. Max limit 250.
- **Naming**: REST paths kebab/plural: `/admin/api/products`, `/admin/api/products/:id/variants`. JSON keys camelCase.
- **Order numbers**: per-shop sequential starting `#1001` (like Shopify), stored as `orderNumber` int; ULID stays the real ID.
- **All list endpoints** support `?query=` free-text search where the Shopify UI has a search box.
- **Env vars**: defined once in `packages/config/env.ts` (zod-parsed). `.env.example` at root is exhaustive and always up to date.
- **No dead code, no TODO-stubs that throw.** If a feature is cut, the UI element either works minimally or is not rendered.

---

## 6. Multi-Tenancy (the load-bearing wall)

One Postgres database, shared schema. **Every tenant-owned table has `shop_id TEXT NOT NULL` with an index.** One enforcement layer, kept simple:

- **App layer**: `packages/db` exports `dbForShop(shopId)` — a Prisma client extension that automatically injects `where: { shopId }` into every query and `data: { shopId }` into every create for tenant tables. API code MUST use `dbForShop`; the raw client `dbAdmin` is only used in: signup, platform-level auth lookup, and migrations/seed. This is a **functional** requirement, not a security nicety — cross-shop data bleeding through the UI breaks the multi-tenant demo instantly.

(No Postgres RLS — deliberately skipped for speed; the client extension is sufficient for this project.)

**Tenant resolution:**
- Admin: staff sessions are bound to a `shopId`; every `/admin/api/*` request resolves shop from the session. Admin URLs: `admin.<domain>/store/{shopSlug}/...` (mirrors Shopify's `admin.shopify.com/store/{slug}`).
- Storefront: resolved from Host header. Local: `{shopSlug}.lvh.me:3002` (lvh.me resolves to 127.0.0.1 — no /etc/hosts editing). Prod: wildcard subdomain + optional custom domains table.
- Admin API (apps): Bearer token → token row → shopId.

**Cross-tenant leakage is the one unforgivable bug.** The tenancy test suite (§14) is mandatory and blocking.

---

## 7. Data Model

Prisma schema in `packages/db`. Tables (all tenant tables have `id`, `shopId`, `createdAt`, `updatedAt`; `metadata JSONB` where noted):

**Platform**: `Shop` (slug, name, currencyCode, timezone, plan, onboarding state), `StaffUser` (email unique per shop, passwordHash, role: `owner|admin|staff`, permissions JSON), `Session` (Redis, not Postgres), `CustomDomain`.

**Catalog**: `Product` (title, descriptionHtml, handle unique-per-shop, status: `active|draft|archived`, vendor, productType, tags text[], seo fields, metadata), `ProductOption` (name, position, values[]), `ProductVariant` (title, sku, barcode, price Money, compareAtPrice, position, optionValues JSON, requiresShipping, taxable, weight, inventoryPolicy `deny|continue`), `ProductImage` (url, altText, position, variantIds[]), `Collection` (title, handle, descriptionHtml, type `manual|smart`, ruleSet JSON, sortOrder, imageUrl), `CollectionProduct` (join, position).

**Inventory**: `Location` (name, address, isActive, fulfillsOnlineOrders), `InventoryLevel` (variantId, locationId, available int, unique(variantId, locationId)). Adjustments go through a service that writes `InventoryAdjustment` (delta, reason, referenceId) — never raw updates, so history exists.

**Customers**: `Customer` (email, firstName, lastName, phone, acceptsMarketing, note, tags[], passwordHash nullable — storefront login optional), `CustomerAddress` (default flag).

**Orders**: `Order` (orderNumber, customerId nullable, email, phone, currencyCode, subtotal/discountTotal/shippingTotal/taxTotal/total Money ints, financialStatus `pending|authorized|paid|partially_refunded|refunded|voided`, fulfillmentStatus `unfulfilled|partially_fulfilled|fulfilled`, cancelledAt, cancelReason, shippingAddress JSON, billingAddress JSON, shippingLine JSON, discountCodes JSON, note, tags[]), `OrderLineItem` (productId, variantId, title, variantTitle, sku, quantity, price, totalDiscount, fulfilledQuantity), `Fulfillment` (locationId, trackingNumber, trackingUrl, lineItems JSON, status), `Refund` (amount, reason, lineItems JSON, paymentRefundId), `OrderEvent` (timeline: type, message, actor, payload JSON).

**Checkout**: `Cart` (token, lineItems JSON, storefront session cookie), `Checkout` (cartSnapshot, email, shippingAddress, shippingRateId, discountCode, totals JSON, status `open|completed|expired`, completedOrderId).

**Discounts**: `Discount` (title, code nullable — null = automatic, type `amount_off_order|amount_off_products|free_shipping`, valueType `percentage|fixed`, value, appliesTo JSON (all | collectionIds | productIds), minimumRequirement JSON, usageLimit, oncePerCustomer, usedCount, startsAt, endsAt, status).

**Pay** (see §11): `ProcessorConfig`, `PaymentMethod` (customer's saved card → vault token ref), `Payment` (orderId, checkoutId, amount, status `authorized|captured|refunded|partially_refunded|voided|failed`, processor, processorTxnId, cardTokenId, last4, brand, errorCode), `PaymentRefund`, `RoutingRule`, `VaultCard` (encrypted card blob, last4, brand, expMonth/Year — read/written only via `packages/pay`).

**Apps/Webhooks**: `App` (name, apiTokenHash, scopes[]), `WebhookSubscription` (topic, url, secret), `WebhookDelivery` (topic, payload, attempts, status, lastError).

**Theme/AI**: `ThemeVersion` (themeJson JSONB validated against contract, tokens JSONB, status `draft|published`, publishedAt, createdByMessage), `BuilderConversation` (messages JSONB), plus theme assets in S3.

**Analytics**: `AnalyticsEvent` (type `page_view|product_view|add_to_cart|begin_checkout|purchase`, sessionId, path, productId?, orderId?, value?, occurredAt) — insert-only, indexed on (shopId, occurredAt); `AnalyticsRollupDaily` (date, metric, value) written by worker.

Seed (`pnpm seed`): creates demo shop `demo` (staff `owner@demo.dev` / `password123`), 2 locations, ~30 products with real-looking images (use https://picsum.photos or bundled placeholders), 4 collections, 25 customers, 40 historical orders spread over 60 days (so analytics has data), 3 discounts, mock processor connected, and one published AI theme. **The seed is the demo. It must look like a real store (apparel works well: "Aurora Supply Co.").**

---

## 8. AuthN / AuthZ

- **Staff auth**: email+password (argon2id), session cookie `_merchant_session` (httpOnly, SameSite=Lax, Secure in prod), Redis session store, 7-day sliding expiry. Login page replicates Shopify's login look. Signup flow creates Shop + owner in one transaction, then a Shopify-style onboarding checklist on Home.
- **Permissions**: role-based. `owner` = everything; `admin` = everything except deleting shop/managing billing; `staff` = per-area boolean permissions (`products, orders, customers, discounts, analytics, settings, apps, builder`). Enforced in API route registration via `requirePermission('orders')` middleware. Admin UI hides nav items the user lacks (Shopify behavior).
- **Customer auth (storefront)**: optional email+password accounts; guest checkout is default path.
- **Admin API tokens** (apps): `shpat_`-style random 256-bit token shown once, stored hashed (SHA-256). Scopes checked per endpoint.
- **CSRF**: admin + storefront mutations use SameSite=Lax cookies + custom header check (`x-requested-with`) since API is same-site; Admin API (Bearer) exempt.
- **Rate limiting**: Fastify rate-limit — login: 10/min/IP; Admin API: 40 req/s burst 80 per token (mirrors Shopify's leaky bucket vibe); checkout payment attempts: 5/min/session.

---

## 9. Admin App — Pixel-Parity Requirements

**The single most important workstream for the KPI.** Rules:

- **Polaris ^13 components only.** No custom CSS beyond what Polaris tokens allow. If Polaris has a pattern for it, use exactly that pattern. `AppProvider` with default theme. Frame + TopBar + Navigation exactly as Shopify: dark top bar with global search (Cmd+K modal), notifications bell, shop avatar menu; left nav with exact Shopify structure and icons:
  - Home, Orders (badge count), Products (subitems: Collections, Inventory), Customers, Marketing *(render, minimal page)*, Discounts, Content *(omit)*, Markets *(omit)*, Analytics, **Online Store → replaced by "Storefront (AI Builder)"** with paintbrush icon, Apps, and pinned bottom: Settings.
- **Every page replicates its Shopify counterpart's layout**: same card structure, same column layout (e.g., product form: left column Title/Description/Media/Variants, right column Status/Publishing/Organization), same index tables (IndexTable with bulk actions, filters, tabs, sort), same empty states, same **contextual save bar** on dirty forms, same toasts ("Product saved"), skeleton pages while loading.
- **Pages to build** (in priority order): Home (metrics cards + onboarding guide), Orders index / Order detail (timeline, fulfill flow, refund flow) / Order fulfill page, Products index / Product form (variants editor with option builder) / Collections index+form / Inventory index (per-location editable quantities), Customers index / Customer detail, Discounts index / Discount form, Analytics dashboard, Storefront builder (see §12), Apps index + app detail (token + webhooks), Settings hub with: General, Plan (static), Staff, Locations, Payments, Shipping, Taxes, Checkout.
- Data via React Query against `apps/api`; optimistic updates on toggles; every table paginates at 50.
- Reference for parity: use Shopify's public demo screenshots/docs from memory; when uncertain about a layout detail, choose the simplest Polaris-idiomatic version — Polaris idiom ≈ Shopify.

---

## 10. Storefront & Checkout

- `apps/storefront` renders any shop by Host. Data fetched server-side from api (`/storefront/api/*` endpoints, no auth, shop-scoped, cache-friendly). Pages: `/` home, `/collections/{handle}`, `/products/{handle}`, `/search`, `/cart`, customer `/account` (login, orders). All rendered from the published `ThemeVersion` via `packages/theme-engine`.
- **Performance budget**: TTFB < 300ms locally, LCP < 1.5s on seeded demo, images via next/image, collection/product responses cacheable (`s-maxage=60, stale-while-revalidate`). Cart in cookie-referenced server cart.
- **Checkout** (`/checkouts/{token}`): faithful Shopify checkout reproduction — left column: express-checkout placeholder row, Contact, Delivery (address form, shipping method radio list with prices), Payment (card fields, billing address toggle); right sidebar: line items with images, discount code input, subtotal/shipping/taxes/total. Single page with sections, "Pay now" button. Card inputs are **our own hosted-fields-style component** that posts PAN directly to the vault endpoint (`/vault/tokenize`) so the checkout server never sees PAN; vault returns `card_tok_` used in `/storefront/api/checkouts/:token/complete`.
- Order confirmation page = Shopify's thank-you layout (map placeholder, order summary). Confirmation email via worker.
- Discounts engine (in `apps/api`, pure function in `packages/config` or api services): given cart + discount set → applied discounts + new totals. Unit-tested (§14).
- Taxes: flat shop-configured % (default 0). Shipping: merchant-defined flat + price-conditional rates.

---

## 11. Pay — Payments Platform (Deviation #1)

Package `packages/pay`, mounted into `apps/api` (routes) but logically isolated. **Design goal: PAN isolation + processor-agnostic tokens + merchant-configurable routing.**

### Vault
- `POST /vault/tokenize` (called from checkout browser directly): `{ number, expMonth, expYear, cvc }` → validates (Luhn), encrypts the card blob with AES-256-GCM under a single `VAULT_MASTER_KEY` env var, stores in `VaultCard`, returns `{ cardTokenId: 'card_tok_...', brand, last4, expMonth, expYear }`. Simple single-key scheme — no envelope/rotation machinery.
- Only `packages/pay` code decrypts; keep PAN out of logs. That's the whole rule.
- One-line note in README: production would need PCI-DSS scope; out of scope here.

### Processor adapters
```ts
interface ProcessorAdapter {
  readonly key: 'mock' | 'stripe' | 'maverick';
  authorize(req: { cardTokenId; amount: Money; capture: boolean; customer; billingAddress; idempotencyKey }): Promise<AuthResult>;
  capture(txnId, amount): Promise<Result>;
  refund(txnId, amount): Promise<Result>;
  voidAuth(txnId): Promise<Result>;
  verifyCredentials(config): Promise<boolean>;
}
```
- **mock**: always available, deterministic test cards (4242… approves, 4000000000000002 declines, 4000000000009995 insufficient_funds). Powers the local demo and e2e.
- **stripe**: real implementation via Stripe API (vault decrypts PAN → Stripe PaymentMethod → PaymentIntent, `STRIPE_SECRET_KEY` per merchant config). Works if merchant pastes real/test keys; otherwise not connected.
- **maverick**: interface-complete adapter with typed request/response mapped to Maverick's documented API shape, but returns simulated responses unless `MAVERICK_*` creds present. Clearly marked.

### Routing (CheckoutChamp-style)
- Merchant connects processors in Settings → Payments (credentials stored AES-encrypted in `ProcessorConfig`).
- `RoutingRule` ordered list: each rule = `{ processorConfigId, weight (percentage split), conditions?: { cardBrands?, minAmount?, maxAmount? } }` + global fallback chain: if processor A hard-fails (network/5xx, NOT decline), retry on next processor. Declines do NOT cascade (card was rejected).
- `PaymentRouter.charge(shopId, cardTokenId, amount, ctx)` picks processor by rules (weighted random within matching rules), executes, records `Payment`, emits `orders/paid` webhook + analytics event. Fully unit-tested (§14).
- Saved cards: customer checkout "save this card" → `PaymentMethod` links customer→cardToken; admin order detail can "charge saved card" (this is the subscription/repeat-billing primitive — a cron'd subscription engine is OUT of scope, the reusable token + charge API is IN).

---

## 12. AI Storefront Builder (Deviation #2)

Lovable-like experience inside admin at Storefront nav item. Split screen: **left chat panel, right live preview iframe** (device toggle desktop/mobile, page switcher Home/Product/Collection).

### Theme model (the contract — in `packages/contracts/theme.ts`)
A `ThemeDoc`:
```ts
{ tokens: { colorPrimary, colorBackground, colorText, colorAccent, fontHeading, fontBody, radius, buttonStyle },
  navigation: { links: {label, url}[] },
  pages: { home: Section[], product: Section[], collection: Section[] },  // product/collection have required core sections
  footer: { ... } }
```
`Section = { id, type, settings }` where `type` ∈ registry of ~18 section components implemented in `packages/theme-engine` (React, Tailwind, token-driven CSS variables): `hero`, `image-with-text`, `featured-collection`, `product-grid`, `collection-list`, `rich-text`, `image-banner`, `slideshow`, `testimonials`, `logo-list`, `newsletter`, `faq`, `contact`, `announcement-bar`, `product-detail` (core), `collection-page` (core), `cart-page` (core), `footer`. Each section's settings has a zod schema. Renderer = pure server components; safe by construction (no arbitrary code execution, no XSS: rich text sanitized).

### AI loop
- Chat message → API job → Claude (`claude-sonnet-5`) with system prompt containing: full ThemeDoc schema + section catalog with settings docs + current ThemeDoc + shop's actual products/collections (so it references real handles) → **tool call returning a complete new ThemeDoc** (or a JSON patch; full doc is simpler — do full doc). Validate with zod; on failure, one retry with error feedback; on second failure, apologize in chat.
- Result saved as new `ThemeVersion` draft; preview iframe points at storefront with `?preview=thm_...` (signed); **Publish** button promotes draft → published (storefront cache busted).
- Onboarding: on shop creation, builder auto-generates an initial theme from the shop name + industry question (or applies the default "Aurora" preset if no API key).
- Version history list with restore. Conversation persisted.
- **No API key fallback**: builder chat explains it needs `ANTHROPIC_API_KEY`; presets (3 canned ThemeDocs) still installable — demo never breaks.

---

## 13. Analytics, Webhooks, Jobs

- **Ingestion**: storefront emits events (§7 AnalyticsEvent) via `POST /storefront/api/events` (beacon), batched insert. Purchases recorded server-side at order creation (trustworthy revenue).
- **Dashboard** (admin Analytics + Home cards): total sales, orders, conversion rate (purchases/sessions), average order value, sales over time chart, top products, sales by channel (static "Online Store"). Charts via `@shopify/polaris-viz` (exact Shopify look). Queries: worker rolls up daily aggregates every 5 min; dashboard reads rollups + today's raw.
- **Webhooks**: topics `orders/create, orders/paid, orders/fulfilled, orders/cancelled, products/create, products/update, products/delete, customers/create, refunds/create, app/uninstalled`. Worker delivers POST with `X-Merchant-Hmac-Sha256` (HMAC of body with subscription secret), 5 retries exponential backoff, delivery log visible in app detail page.
- **Worker jobs**: webhook delivery, order confirmation email, analytics rollup, AI builder generation. All idempotent (job id = deterministic where possible).

---

## 14. Testing Policy (deliberately minimal — tests that help you build, nothing else)

**Mandatory (blocking):**
1. **Tenancy suite** (`apps/api` Vitest, runs against real Postgres from compose): create 2 shops, assert the main resource types (products, orders, customers) created in shop A are invisible via shop B's session — list and get. Short and fast; this exists because cross-shop bleed breaks the demo, not for security theater.
2. **Pay unit tests**: Luhn/tokenize/encrypt-decrypt roundtrip, router weighted selection + failover-on-hard-fail + no-cascade-on-decline, refund math, idempotency key dedupe.
3. **Money & discounts unit tests**: totals math, each discount type, stacking rules (one code + automatics), edge cases (100% off, discount > subtotal).
4. **Playwright smoke** (`e2e/`, runs against seeded stack): (a) staff login → create product with 2 variants → appears in list; (b) storefront: browse seeded product → add to cart → full checkout with mock card 4242 → confirmation page shows order → order appears in admin with correct totals → refund it; (c) discount code applies at checkout; (d) AI builder: apply a preset → publish → storefront reflects it; (e) second shop signup → its storefront/admin isolated from demo shop.

**Forbidden** (do not write): component snapshot tests, per-endpoint CRUD tests, mocking-heavy unit tests of glue code, coverage targets. If it doesn't catch a real regression in the 5 flows above or the 3 mandatory suites, don't write it.

CI (GitHub Actions, single workflow): typecheck → biome → unit → e2e smoke (compose services) → docker build. Keep under 10 min.

---

## 15. Security — Good-Enough Baseline (don't over-invest here)

**Priority order for this project is: appearance parity > functionality > performance > security.** Security effort is capped at the baseline below — it comes free with the architecture and keeps the demo from breaking. Do NOT spend time on hardening beyond this list (no CSP tuning, no SSRF filtering, no helmet audits, no key rotation, no pen-test thinking).

- Shop scoping via `dbForShop` everywhere (this is functionality, see §6).
- Zod validation at the API boundary (this is DX — it's how contracts are enforced).
- Passwords argon2id, session cookies httpOnly, API tokens stored hashed. All ~free with the chosen libs.
- Don't log card numbers; don't commit `.env`.

That's it. If a security nicety costs more than 15 minutes, skip it and move that time to pixel parity.

---

## 16. Parallel Agent Workstreams

Contracts-first: **Workstream A lands first (skeleton + contracts + db + auth), everyone else builds against it.** Until A lands, other agents write code against `packages/contracts` types and mock data.

| WS | Owner scope | Deliverable |
|---|---|---|
| **A. Platform core** | root config, `packages/db`, `packages/config`, `packages/contracts` (initial), `apps/api` skeleton (auth, tenancy, middleware), docker-compose, seed harness | Running api + login + shop signup + tenancy tests green |
| **B. Catalog & inventory** | api routes + admin pages: products, variants, collections, inventory, locations, image upload (MinIO presigned) | Product/collection/inventory CRUD, parity forms |
| **C. Orders & customers** | api + admin: orders index/detail/fulfill/refund/timeline, customers, discounts engine + UI | Order lifecycle + discounts, unit tests §14.3 |
| **D. Pay** | `packages/pay`, vault, adapters, router, Settings→Payments UI, admin "charge saved card" | Vault + mock/stripe/maverick + routing, tests §14.2 |
| **E. Storefront & checkout** | `apps/storefront`, checkout flow, cart, customer accounts, storefront API routes in api | Full purchase flow on seeded theme |
| **F. Theme engine & AI builder** | `packages/theme-engine`, builder admin page, AI job in worker, presets, preview/publish | Chat → new theme live in preview → publish |
| **G. Analytics, webhooks, apps** | worker, analytics ingestion/rollup/dashboard, apps pages, Admin REST API + tokens, webhook delivery | Dashboard with seeded data, webhook demo |
| **H. Polish & e2e** (last 25%) | `e2e/`, seed richness, empty states, skeletons, toasts, cross-workstream UX sweep, README | Smoke suite green, demo script |

**Conflict rules**: (1) contracts changes are additive or logged in `DECISIONS.md` first; (2) Prisma migrations are named `NNN_ws{X}_description` — pull latest before creating; (3) shared UI shell (Frame/Nav/TopBar) is owned by A — others add nav items via A's registry file `apps/admin/src/navigation.ts`; (4) if blocked on another workstream >30 min, stub against contracts and file a line in `DECISIONS.md`.

**Two-day cadence**: Day 1 AM — A complete, B/C/D/E scaffolds + contracts agreed. Day 1 PM — B/C/E functional paths, D vault+mock done. Day 2 AM — F/G, checkout↔pay integration, parity polish. Day 2 PM — H: seed, e2e, performance pass, README/demo.

---

## 17. Local Run & Deploy Flow

**Local (must be exactly this simple):**
```bash
cp .env.example .env          # works with zero edits (mock processor, no AI key needed)
docker compose up -d          # postgres, redis, minio, mailpit
pnpm install
pnpm db:setup                 # migrate + seed
pnpm dev                      # turbo: api :3001, admin :3000, storefront :3002, worker
```
Then: admin → http://admin.lvh.me:3000 (owner@demo.dev / password123), storefront → http://demo.lvh.me:3002. README top section = these 6 lines + demo walkthrough (login, tour, buy with 4242 card, refund, AI-build).

**Deploy (documented + Dockerized, not required to be live in 2 days):**
- Each app has a production Dockerfile (multi-stage, distroless-ish node:22-slim). `docker-compose.prod.yml` runs the full stack behind Caddy (automatic TLS, wildcard subdomain routing: `admin.*` → admin, `api.*` → api, everything else → storefront).
- Scale path (README section "Production architecture"): stateless api/admin/storefront/worker → horizontal scale behind LB; Postgres managed (RDS) + read replicas for analytics; Redis managed; S3 real; sessions already in Redis; vault master key → KMS; CDN in front of storefront with the cache headers already set; per-shop cache keys include published theme version. Rate limits + queues already externalized, so nothing blocks horizontal scaling.
- CI on `main` builds and pushes images; deploy = `docker compose -f docker-compose.prod.yml up -d` on a VM, or the same images on Fly/K8s.

---

## 18. Definition of Done

1. `README` quickstart works on a clean machine (verified once by workstream H).
2. All §14 mandatory tests green in CI.
3. The demo walkthrough passes: signup a brand-new shop → onboard → add product → AI-build storefront → publish → open storefront → buy it with 4242 → see order, analytics, webhook fire → refund.
4. A Shopify user screen-shares the admin and nothing looks off. **That is the KPI. Everything in this document serves it.**
