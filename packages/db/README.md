# @merchant/db

Prisma schema, migrations, seed, and the tenant-scoped client.

## Multi-file schema

Models live in `prisma/schema/`, **one file per domain**. A single
`schema.prisma` would be the hottest merge conflict in this repo (CLAUDE.md §3).
`prisma/schema/schema.prisma` holds only the datasource and generator.

## Two hard rules

**1. `dbForShop(shopId)`, always.**

```ts
import { dbForShop } from '@merchant/db/tenant';
const db = dbForShop(request.shopId);
const products = await db.product.findMany();  // scoped automatically
```

`dbAdmin` is unscoped and is only for signup, platform auth lookup, migrations,
and seed. Anywhere else it is a bug (SPEC §6).

**2. No cross-domain-file relations.**

A Prisma relation needs a field on *both* models. If `orders.prisma` declared a
relation to `Shop`, every domain file would have to add a back-relation field to
`Shop` — turning `platform.prisma` into a file all eight workstreams edit.

So: within one domain file, use real relations. Across files, store the scalar id
only and join in the service layer. The costs are known and accepted — no
DB-level cascade from `Shop`, and no `include` across the boundary — and shop
deletion is not in scope (SPEC §2).

## Migrations

Named `NNN_ws{X}_description` (SPEC §16). Pull `main` immediately before
generating one; `.gitattributes` marks migrations `-merge`, so a conflict means
two agents took the same number. Rename yours — never merge the SQL.

```bash
pnpm db:migrate --name 003_wsb_product_media
```
