# Workstream ownership map

SPEC §16 defines the eight workstreams. This file maps them to **exact paths**,
so "who owns this file" is never a judgement call.

Legend: **own** = edit freely · **shared** = additive freely, breaking needs a
`DECISIONS.md` line first · anything unlisted = read-only for you.

---

## A. Platform core — *lands first, everyone builds on it*

**own**
```
package.json, pnpm-workspace.yaml, turbo.json, biome.json, tsconfig.base.json
docker-compose.yml, .env.example, .github/**, scripts/**, .githooks/**
packages/config/**
packages/db/**                     (schema files are shared — see below)
apps/api/src/{app.ts,server.ts,plugins/**,lib/**}
apps/api/src/routes/auth/**, apps/api/src/routes/shops/**
apps/admin/src/app/layout.tsx, apps/admin/src/components/shell/**
apps/admin/src/navigation/**       (registry is pre-built; others fill leaf items)
apps/admin/src/lib/**
```
**deliverable:** api boots, staff login, shop signup, tenancy suite green.

---

## B. Catalog & inventory
**own**
```
apps/api/src/routes/admin/products/**, .../collections/**, .../inventory/**, .../locations/**, .../files/**
apps/api/src/services/{catalog,inventory}/**
apps/admin/src/app/(shop)/products/**, .../collections/**, .../inventory/**
packages/db/prisma/schema/{catalog,inventory}.prisma
packages/contracts/src/{products,collections,inventory,locations,files}.ts
apps/admin/src/navigation/items/products.ts
```

## C. Orders, customers & discounts
**own**
```
apps/api/src/routes/admin/orders/**, .../customers/**, .../discounts/**, .../draft-orders/**
apps/api/src/services/{orders,customers,discounts}/**
apps/admin/src/app/(shop)/orders/**, .../customers/**, .../discounts/**
packages/db/prisma/schema/{orders,customers,discounts}.prisma
packages/contracts/src/{orders,customers,discounts}.ts
apps/admin/src/navigation/items/{orders,customers,discounts}.ts
```

## D. Pay
**own**
```
packages/pay/**
apps/api/src/routes/vault/**, apps/api/src/routes/admin/payments/**
packages/db/prisma/schema/pay.prisma
packages/contracts/src/pay.ts
apps/admin/src/app/(shop)/settings/payments/**
```
Nothing outside `packages/pay` may import a processor SDK or decrypt a card blob.

## E. Storefront & checkout
**own**
```
apps/storefront/**
apps/api/src/routes/storefront/**
apps/api/src/services/{cart,checkout}/**
packages/db/prisma/schema/checkout.prisma
packages/contracts/src/{storefront,cart,checkout}.ts
```

## F. Theme engine & AI builder
**own**
```
packages/theme-engine/**
apps/admin/src/app/(shop)/storefront/**
apps/worker/src/jobs/ai-*.ts
apps/api/src/routes/admin/themes/**
packages/db/prisma/schema/theme.prisma
packages/contracts/src/theme.ts
apps/admin/src/navigation/items/storefront.ts
```

## G. Analytics, webhooks & apps
**own**
```
apps/worker/src/**                 (except ai-*.ts, owned by F)
apps/api/src/routes/admin/{apps,analytics,webhooks}/**
apps/api/src/routes/api/**         (public Admin REST API, Bearer token)
apps/admin/src/app/(shop)/{analytics,apps}/**
packages/db/prisma/schema/{analytics,apps}.prisma
packages/contracts/src/{analytics,apps,webhooks}.ts
apps/admin/src/navigation/items/{analytics,apps}.ts
```

## H. Polish & e2e — *last 25%*
**own**
```
e2e/**
README.md, docs/DEMO.md
packages/db/prisma/seed/**
```
H has a **cross-cutting edit licence** in the final phase: it may touch any
app's empty states, skeletons, and toasts. Announce it in `docs/AGENT-LOG.md`
before starting, so other agents rebase promptly.

---

## Shared surfaces — additive any time, breaking needs a DECISIONS line first

| Path | Rule |
|---|---|
| `packages/contracts/src/*.ts` | One file per domain, owned per the table above. Adding a *new* file is never a conflict. Adding a field to someone else's schema: allowed if optional/defaulted. |
| `packages/db/prisma/schema/*.prisma` | One file per domain. New model or new nullable/defaulted field: go ahead. Rename/retype/drop: `DECISIONS.md` first, then `rg` every usage in the same PR. |
| `packages/config/src/**` | Additive helpers welcome. Changing a signature: `DECISIONS.md` first. |
| `.env.example` + `packages/config/src/env.ts` | Always change together, same commit. |
| `DECISIONS.md`, `docs/AGENT-LOG.md` | Append at the bottom only (`merge=union`). |

## Conflict-free-by-construction registries

These are already complete. Fill in the leaf file for your workstream; you should
never need to edit the registry itself.

| Registry | Leaf files you own |
|---|---|
| `apps/admin/src/navigation/index.ts` | `navigation/items/<area>.ts` |
| `apps/api` route tree (autoloaded) | any new file under `src/routes/**` |
| `packages/theme-engine/src/sections/index.ts` | `sections/<section-name>.tsx` |
| `apps/worker/src/jobs/index.ts` | `jobs/<job-name>.ts` |
