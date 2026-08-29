# Merchant

A multi-tenant e-commerce platform. One deployment, many shops.

**[SPEC.md](SPEC.md) is the source of truth for what to build.
[CLAUDE.md](CLAUDE.md) is the source of truth for how to work in this repo.**
Read both before your first commit.

---

## Quickstart

```bash
cp .env.example .env          # works with zero edits
docker compose up -d          # postgres, redis, minio, mailpit
pnpm install
pnpm setup:git                # merge drivers, rerere, hooks — required
pnpm db:setup                 # migrate + seed
pnpm dev                      # api :3001, admin :3000, storefront :3002, worker
```

Requires **Node 22** and **pnpm 9** (`corepack enable` picks up the pinned
version). Nothing else — no global installs, no `/etc/hosts` editing, no API
keys. `.env.example` is checked in already working: the mock payment processor
needs no credentials and the AI builder falls back to three canned themes when
`ANTHROPIC_API_KEY` is empty.

> Measured on a fresh worktree against a running Docker stack: `pnpm install`
> ~15s warm, `pnpm db:setup` ~10s (the seed itself runs in ~5s), and `pnpm dev`
> serves all four apps a few seconds later — the admin's *first* page compile
> then takes 1–2 minutes, so the first URL you open will hang before it paints.
> The one number not yet measured is a genuinely cold machine, where
> `docker compose up -d` must pull images and `pnpm install` populates an empty
> store; budget more for both.

| | URL |
|---|---|
| Admin | http://admin.lvh.me:3000 — `owner@demo.dev` / `password123` |
| Storefront | http://demo.lvh.me:3002 |
| API | http://localhost:3001 |
| Mail (Mailpit) | http://localhost:8025 |
| Object storage (MinIO) | http://localhost:9001 |

`lvh.me` resolves to `127.0.0.1`, so wildcard shop subdomains work with no
`/etc/hosts` editing.

---

## Demo walkthrough

Two paths. The seeded store is the one to show — it looks like a real business
that has been trading for two months. The fresh-signup path is the one that
proves the platform is genuinely multi-tenant, and it is the walkthrough the
Definition of Done (SPEC §18 #3) names.

A minute-by-minute presenter version of all of this — what to click, what to
say, which number to point at — is [docs/DEMO.md](docs/DEMO.md).

### The seeded store

`pnpm db:setup` builds **Aurora Supply Co.**: 32 products across 4 collections,
2 locations, 25 customers, and 40 orders numbered #1001–#1040 spread over the
last 60 days, with analytics events and daily rollups behind them.

1. **Log in** at http://admin.lvh.me:3000 as `owner@demo.dev` / `password123`.
   You land on Home: a dashboard over the last 30 days — four metric tiles, a
   two-series sales chart against the previous period, and a sales breakdown.
   (No setup guide: its four checks all pass on the seeded store, so the card
   hides itself. A fresh store shows it — see "A brand-new store" below.)
2. **Tour the admin.** Products (index with tabs, search and bulk actions; open
   one for the two-column form), Orders (#1001–#1040, mixed fulfillment and
   financial states), Customers, Discounts (`WELCOME10` is Active), Inventory
   across both locations, Analytics (date-range and comparison pills, sales
   chart, sales breakdown, sales by channel and by product, conversion funnel,
   live view).
3. **Build the storefront.** Storefront in the nav is the AI builder: chat on
   the left, a live preview of the real storefront on the right. Describe the
   store you want and it writes a new theme; with no `ANTHROPIC_API_KEY` set,
   apply one of the three presets instead — the demo never depends on the key.
   **Publish** promotes the draft, and the storefront picks it up within a
   minute (published themes are cached for 60s).
4. **Shop it.** http://demo.lvh.me:3002 — browse, open a product, add to cart,
   check out. Card fields post the number straight to the vault, so the
   checkout server only ever sees a `card_tok_…`. `4242 4242 4242 4242` with any
   future expiry and any CVC approves; `4000 0000 0000 0002` declines and leaves
   the checkout open and payable. The thank-you page shows the order number.
5. **Watch it land.** The order appears in the admin under Orders with the same
   total; Analytics moves (Orders, Total sales, and the live view's orders
   today); the confirmation email arrives in Mailpit at http://localhost:8025;
   and any webhook subscription on `orders/create` / `orders/paid` shows a
   delivered row in its app's delivery log.
6. **Refund it.** Open the order → **Refund** → set the quantity and the
   shipping amount → the button prices itself → the order returns as Refunded
   and the timeline records it.

Storefront customer accounts are seeded too: `jane@example.com` /
`password123` at http://demo.lvh.me:3002/account/login.

### A brand-new store

This is the Definition of Done walkthrough, and it is worth doing live because
nothing about it is prepared.

1. **Sign up** at http://admin.lvh.me:3000/signup. Store name, your name, email,
   password. The slug is derived from the store name and de-duplicated
   server-side, exactly the way a real store URL is assigned. Signing up logs
   you in; the next screen is your admin.
2. **Onboard.** The Home setup guide has four real checks — add a product,
   customize the storefront, connect a payment processor, place a test order —
   each of which reads actual state rather than a stored flag, and the card
   disappears once all four pass (which is why the seeded store's Home has
   none). The store already has a published theme: signup installs the default
   preset so a new shop opens on a real storefront instead of a blank page.
3. **Make it sellable.** Settings → Payments → connect **Mock Gateway** (one
   click, no credentials). Settings → Shipping and delivery → **Add rate** — a
   new shop starts with no rates, and checkout needs one to complete.
4. **Add a product.** Products → Add product. Title, description, price, and
   options if you want variants generated. Save.
5. **AI-build the storefront.** Storefront → describe the shop, or apply a
   preset → **Publish**.
6. **Open the storefront** at `http://{your-slug}.lvh.me:3002`. Your product is
   there and none of Aurora Supply Co.'s are — different Host, different tenant,
   same deployment.
7. **Buy it** with `4242 4242 4242 4242` through to the thank-you page, then see
   the order, the analytics and the webhook in your own admin, and refund it.

---

## Running many worktrees

### Watching `main`

While the swarm is running, `pnpm stack` keeps one always-on copy of `main` up
so you can see the product fill in. It drives the **main checkout** no matter
which worktree you run it from, and it gives that stack its own database
(`merchant_main`) so a branch's unmerged migration cannot break it.

```bash
pnpm stack up       # infra + deps + db + dev servers, then prints the URLs
pnpm stack status   # where main is, what is healthy, what has been built so far
pnpm stack sync     # pull main, reinstall, migrate, reseed, restart
pnpm stack watch    # do that automatically, every time a PR lands
pnpm stack logs     # tail the dev servers
pnpm stack down     # stop everything
```

`pnpm stack up` reclaims ports 3000/3001/3002 from stale dev servers left behind
by other worktrees, naming each one it stops.

### Isolating a worktree

All worktrees share one compose stack. Run this once in a new worktree:

```bash
pnpm worktree:env --migrate
```

It gives the worktree its own Postgres database and Redis db index, then
migrates and seeds it. Both are free — databases are catalog entries, not
processes, and redis-server already allocates all 16 logical dbs. Ports stay
shared deliberately: only one agent runs a dev stack at a time.

### Disk

```bash
pnpm stack disk
```

Ten worktrees means ten `node_modules`. The root `.npmrc` sets
`package-import-method=hardlink` so they share inodes with the pnpm store — a
hardlinked tree costs ~0 MB instead of ~840 MB. A worktree created before that
landed converts on its next `pnpm install`; `pnpm stack disk` flags which ones
are still carrying their own copy.

---

## Layout

```
apps/
  api/          Fastify 5 — all business logic and the REST API
  admin/        Next.js 15 + Polaris 13 — the Shopify-parity admin
  storefront/   Next.js 15 + Tailwind 4 — multi-tenant storefront + checkout
  worker/       BullMQ — webhooks, email, analytics rollups, AI jobs
packages/
  contracts/    Zod schemas for every boundary — THE integration contract
  db/           Prisma schema (multi-file), migrations, tenant-scoped client
  pay/          Vault, processor adapters, routing
  theme-engine/ Section registry and renderers
  config/       env, ids, money, constants
e2e/            Playwright smoke suite
```

## Commands

| Command | What |
|---|---|
| `pnpm dev` | all apps, watch mode |
| `pnpm verify` | lint + typecheck + test — run before every push |
| `pnpm db:migrate` | create + apply a migration |
| `pnpm db:reset` | drop, migrate, reseed |
| `pnpm e2e` | Playwright smoke (needs a seeded running stack) |

## Production architecture

Nothing here is deployed. This is the documented scale path (SPEC §17), and it
is short because the shape of the code already assumes it.

**The four services scale horizontally.** `api`, `admin`, `storefront` and
`worker` hold no request state between calls, so each is an autoscaling group
behind a load balancer. Staff sessions live in Redis, not in process memory, so
any api instance can serve any request. Rate limits are Redis-backed and the job
queues are BullMQ on the same Redis, so adding an instance adds capacity and
nothing else: there is no in-process scheduler, no sticky routing and no
singleton to elect.

**The stateful pieces become managed services.** Postgres → RDS, with the
analytics reads pointed at a read replica (the dashboard reads pre-computed
daily rollups plus today's raw events, which is exactly the workload a replica
serves well). Redis → a managed instance for sessions, rate limits and queues.
MinIO → S3; the app already talks to it through the S3 API with presigned
uploads, so it is a credentials-and-endpoint change. The vault's
`VAULT_MASTER_KEY` moves out of the environment into KMS — the encrypt/decrypt
path is confined to `packages/pay`, so it is one module that learns to ask KMS
for the key.

**A CDN goes in front of the storefront.** The storefront read endpoints already
send `public, s-maxage=60, stale-while-revalidate=300`, so a CDN caches them
without further work. Cache keys are per-shop by construction: the tenant is the
Host, and the shop context a page renders from carries the id of the published
theme version, so promoting a new theme changes what a key resolves to rather
than requiring a purge. Carts, checkouts and signed theme previews are marked
`no-store` in one place (`services/storefront/cache.ts`) so they can never enter
a shared cache.

**Packaging.** Each app has a production Dockerfile (`apps/*/Dockerfile`,
multi-stage on `node:22-slim`), and CI builds all four on every commit to `main`
— one job per app in `.github/workflows/main-checks.yml`. Publishing those
images to a registry is the one thing that job does not do yet.

The documented deployment target is a `docker-compose.prod.yml` that runs the
four images behind **Caddy**, which terminates TLS automatically and routes by
subdomain: `admin.*` → admin, `api.*` → api, everything else → storefront, which
is what makes `{shop}.example.com` resolve a tenant in production the same way
`{shop}.lvh.me:3002` does locally. That compose file and its Caddyfile land with
the deploy issue; when they are present in the repo root, deploying is
`docker compose -f docker-compose.prod.yml up -d` on a VM, or the same four
images on Fly or Kubernetes.

## Working here

This repo is built to be worked by many agents at once. Three things follow from
that, and skipping any of them will hurt:

1. **`pnpm setup:git` before your first commit.** It installs the merge drivers
   that `.gitattributes` refers to; without it, `pnpm-lock.yaml` conflicts on
   nearly every PR.
2. **Adding something means adding a file.** Routes, nav items, theme sections,
   worker jobs, and Prisma models each live in their own file behind a registry
   that is already complete. If you are editing a file another workstream also
   edits, you have missed the seam — see [CLAUDE.md](CLAUDE.md) §3.
3. **Small PRs.** One vertical slice, mergeable within the hour. Long branches do
   not rebase cleanly against 19 other agents.

Ownership map: [docs/WORKSTREAMS.md](docs/WORKSTREAMS.md).
Merge and CI mechanics: [docs/PARALLEL-AGENTS.md](docs/PARALLEL-AGENTS.md).
Decision log: [DECISIONS.md](DECISIONS.md) — append-only.

## Notes

This is a private study clone of the Shopify admin, built to be visually
indistinguishable from it. As of 2026-08-29 the running app therefore renders
the Shopify name and bag mark (DECISIONS; the earlier "never render the name or
logo" rule was reversed by the repo owner). It is **not affiliated with or
endorsed by Shopify**, is never deployed publicly and is not distributed; the
codebase itself keeps the neutral `@merchant/*` package scope. Built with
Shopify's open-source [Polaris](https://polaris.shopify.com/) design system.

The card vault demonstrates PAN isolation — the card number goes from the
browser straight to `/vault/tokenize` and only a `card_tok_…` reaches the
checkout server — but this is not a PCI-DSS-certified environment. A production
deployment would need proper PCI scoping (SPEC §11); that is out of scope here.
