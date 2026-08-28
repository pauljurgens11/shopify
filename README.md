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

| | URL |
|---|---|
| Admin | http://admin.lvh.me:3000 — `owner@demo.dev` / `password123` |
| Storefront | http://demo.lvh.me:3002 |
| API | http://localhost:3001 |
| Mail (Mailpit) | http://localhost:8025 |
| Object storage (MinIO) | http://localhost:9001 |

`lvh.me` resolves to `127.0.0.1`, so wildcard shop subdomains work with no
`/etc/hosts` editing.

Requires **Node 22** and **pnpm 9** (`corepack enable` picks up the pinned version).

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

Named "Merchant" wherever a brand name is unavoidable. Built with Shopify's
open-source [Polaris](https://polaris.shopify.com/) design system; not affiliated
with or endorsed by Shopify, and the Shopify name and logo are not used.

The card vault is a demonstration of PAN isolation, not a PCI-DSS-certified
environment. A production deployment would need proper PCI scoping (SPEC §11).
