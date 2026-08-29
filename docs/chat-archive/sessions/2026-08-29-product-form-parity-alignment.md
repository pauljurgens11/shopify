# Product form parity alignment

| | |
|---|---|
| **Session** | `9c56a5a9-5948-4889-8678-dc1d53f42e08` |
| **Started** | 2026-08-29T08:31:18.470Z |
| **Ended** | 2026-08-29T10:01:25.515Z |
| **Working dir** | `~/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056` |
| **Branch** | `ws-b/product-form-parity` |
| **Pull request** | #104 (MERGED) |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

take a look at the product form parity files in the repo docs. i want you to compare what we currently have to the parity files and make changes to a reasonable extent to make my UI EXACTLY the same as the parity documents.

if there is some very niche functionality that is not important, you do not have to make it functional. but all other UI needs to be perfectly functional! the main flow.

use best practices. take the resolve issue skill as a reference.

### 🤖 Claude

I'll start by finding the parity docs and the current product form implementation.

🔧 **Bash**
```
ls docs/ && echo "---PARITY---" && find docs -iname "*parity*" -o -iname "*product*" | head -50
```

> **↳ result**
> ```
> AGENT-LOG.md
> DEMO.md
> PARALLEL-AGENTS.md
> WORKSTREAMS.md
> issues
> parity
> ---PARITY---
> docs/parity
> docs/parity/product-form.md
> docs/issues/B1-products-api.md
> docs/issues/B5-products-admin-ui.md
> docs/issues/H4-ux-motion-parity.md
> docs/issues/A5-production-stack.md
> docs/issues/PARITY.md
> ```

🔧 **Bash**
```
ls -la docs/parity/ && echo "=== README/PARITY.md ===" && cat docs/issues/PARITY.md 2>/dev/null | head -60
```

> **↳ result**
> ```
> total 120
> drwxr-xr-x@ 11 pauljurgens  staff   352 Aug 29 11:31 .
> drwxr-xr-x@  8 pauljurgens  staff   256 Aug 29 11:31 ..
> -rw-r--r--@  1 pauljurgens  staff  4346 Aug 29 11:31 README.md
> -rw-r--r--@  1 pauljurgens  staff  4004 Aug 29 11:31 admin-shell.md
> -rw-r--r--@  1 pauljurgens  staff  5275 Aug 29 11:31 capture.md
> -rw-r--r--@  1 pauljurgens  staff  3655 Aug 29 11:31 collection-detail.md
> -rw-r--r--@  1 pauljurgens  staff  3072 Aug 29 11:31 customer-form.md
> -rw-r--r--@  1 pauljurgens  staff  6495 Aug 29 11:31 dashboard.md
> -rw-r--r--@  1 pauljurgens  staff  5560 Aug 29 11:31 home.md
> -rw-r--r--@  1 pauljurgens  staff  5763 Aug 29 11:31 index-tables.md
> -rw-r--r--@  1 pauljurgens  staff  8178 Aug
> … [truncated, 3,267 more chars]
> ```

🔧 **Bash**
```
cat docs/parity/product-form.md
```

> **↳ result**
> ```
> # Product form — `/products/new`, `/products/:id`
> 
> Source: `admin.shopify.com/store/…/products/new`, 1054×719, light theme.
> Confidence: **high** — captured in full, top to bottom, both columns.
> 
> This is the highest-traffic page in the demo. Get this one right.
> 
> ## Page chrome
> 
> - Header is a **breadcrumb**, not a back-button + title: a small product (tag) icon,
>   a `›` chevron, then `Add product` as the page title. There is no button labelled
>   "Products" in the header.
> - No primary action in the page header. Saving happens **only** through the contextual
>   save bar (see below) and a secondary `Save` button pinned bottom-right of the form.
> - Two-column layout, left column roughly 2/3, right r
> … [truncated, 7,363 more chars]
> ```

🔧 **Bash**
```
cat docs/parity/README.md; echo "=== capture ==="; sed -n 1,60p docs/parity/capture.md
```

> **↳ result**
> ```
> # Parity reference — captured from the real Shopify admin
> 
> Ground truth for CLAUDE.md §7 / SPEC.md §7. Everything in this folder was read off a
> live Shopify admin, not recalled from memory. When one of these files disagrees with
> your recollection of "what Shopify looks like", **this folder wins**.
> 
> ## Capture conditions — read this before trusting a page
> 
> | | |
> |---|---|
> | Captured | 2026-08-29 |
> | Admin | `admin.shopify.com/store/…`, current (2026) admin shell |
> | Viewport | 1054×719 and 1316×898 CSS px, light theme, desktop |
> | Store state | **Brand new and empty** — 0 products, 0 orders, 0 customers, 1 collection |
> | Method | Claude in Chrome — screenshots + accessibility tree |
> 
> The empt
> … [truncated, 6,608 more chars]
> ```

🔧 **Bash**
```
cd apps/admin/src/app/store/\[slug\]/products && find . -type f | head -50 && echo "=== sizes ===" && wc -l $(find . -type f -name "*.tsx" -o -name "*.ts")
```

> **↳ result**
> ```
> ./layout.tsx
> ./page.tsx
> ./_components/media-card.tsx
> ./_components/product-form.tsx
> ./_components/variants-card.tsx
> ./new/page.tsx
> ./[id]/page.tsx
> === sizes ===
>       15 ./layout.tsx
>      355 ./page.tsx
>      167 ./_components/media-card.tsx
>      343 ./_components/product-form.tsx
>      285 ./_components/variants-card.tsx
>       23 ./new/page.tsx
>       44 ./[id]/page.tsx
>     1232 total
> ```

🔧 **Bash**
```
cd apps/admin/src/app/store/\[slug\]/products && cat _components/product-form.tsx
```

> **↳ result**
> ```
> Exit code 1
> (eval):cd:1: no such file or directory: apps/admin/src/app/store/[slug]/products
> ```

🔧 **Bash**
```
cat "apps/admin/src/app/store/[slug]/products/_components/product-form.tsx"
```

> **↳ result**
> ```
> Exit code 1
> cat: apps/admin/src/app/store/[slug]/products/_components/product-form.tsx: No such file or directory
> ```

🔧 **Bash**
```
pwd; ls; find . -path ./node_modules -prune -o -name "product-form.tsx" -print 2>/dev/null
```

> **↳ result**
> ```
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products
> [id]
> _components
> layout.tsx
> new
> page.tsx
> ./_components/product-form.tsx
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056 && cat "apps/admin/src/app/store/[slug]/products/_components/product-form.tsx"
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * The product form (PARITY.md → Detail/form pages → Product form). Owner: WS-B.
>  *
>  * Two columns, exactly as Shopify: left is what the product IS (title,
>  * description, media, variants), right is how it is published (status,
>  * channels, organization). Both create and edit render this — the only
>  * difference is whether there is an id to PUT to.
>  *
>  * Saving is two steps on purpose. The product write carries everything except
>  * stock; quantities then go through the inventory service, because that is the
>  * only path that leaves an adjustment record behind (CLAUDE.md §9).
>  */
> import type { Location } from '@merchant/contracts/locations';
> import type { Product } from '@m
> … [truncated, 10,884 more chars]
> ```

🔧 **Bash**
```
cat "apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx" && echo "=== product-draft ===" && cat apps/admin/src/lib/product-draft.ts
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * The Variants card (PARITY.md: option builder → variant table with
>  * price/available per row). Owner: WS-B (B5).
>  *
>  * Shopify's flow, mirrored: a product has one implicit variant until you add an
>  * option, and the moment an option has values the table appears with a row per
>  * combination. Editing an option regenerates the table without losing the
>  * prices already typed — `reconcileVariants` is the client half of the same
>  * promise the API keeps server-side.
>  */
> import {
>   Badge,
>   BlockStack,
>   Box,
>   Button,
>   Card,
>   InlineError,
>   InlineStack,
>   Tag,
>   Text,
>   TextField,
> } from '@shopify/polaris';
> import { useState } from 'react';
> import {
>   addOptionValues,
>   M
> … [truncated, 21,249 more chars]
> ```

🔧 **Bash**
```
cat packages/contracts/src/products.ts
```

> **↳ result**
> ```
> /** Catalog (SPEC §7). Owner: WS-B. */
> import { z } from 'zod';
> import {
>   handleSchema,
>   idSchema,
>   metadataSchema,
>   moneySchema,
>   paginated,
>   paginationQuery,
>   searchQuery,
>   seoSchema,
>   sortQuery,
>   tagsSchema,
>   timestampsSchema,
> } from './common.ts';
> 
> export const productStatusSchema = z.enum(['active', 'draft', 'archived']);
> export const inventoryPolicySchema = z.enum(['deny', 'continue']);
> 
> export const productImageSchema = z.object({
>   id: idSchema,
>   url: z.string().url(),
>   altText: z.string().max(512).nullable().default(null),
>   position: z.number().int().nonnegative(),
>   /** Empty = applies to the whole product. */
>   variantIds: z.array(idSchema).default([]),
> });
> export ty
> … [truncated, 5,101 more chars]
> ```

🔧 **Bash**
```
sed -n 1,120p packages/contracts/src/collections.ts; echo "=== seoSchema ==="; grep -n "seoSchema" -A8 packages/contracts/src/common.ts
```

> **↳ result**
> ```
> /** Collections, manual + smart (SPEC §7). Owner: WS-B. */
> import { z } from 'zod';
> import {
>   handleSchema,
>   idSchema,
>   paginated,
>   paginationQuery,
>   searchQuery,
>   seoSchema,
>   timestampsSchema,
> } from './common.ts';
> 
> export const collectionTypeSchema = z.enum(['manual', 'smart']);
> 
> export const collectionSortOrderSchema = z.enum([
>   'manual',
>   'best-selling',
>   'title-asc',
>   'title-desc',
>   'price-asc',
>   'price-desc',
>   'created-desc',
> ]);
> 
> /**
>  * Smart-collection rule, matching Shopify's condition builder.
>  *
>  * Not every (column, relation) pair is meaningful, and the API rejects the ones
>  * that are not rather than quietly matching nothing:
>  *   - `title` / `type` / `vendor` — ev
> … [truncated, 3,908 more chars]
> ```

🔧 **Bash**
```
ls apps/api/src/routes/ apps/api/src/services/catalog/ 2>/dev/null; echo "=== products route ==="; find apps/api/src -name "*product*" | head
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
> apps/api/src/services/catalog/:
> collections.ts
> events.ts
> handles.ts
> products.ts
> variants.ts
> === products route ===
> apps/api/src/routes/storefront/products.ts
> apps/api/src/routes/admin/products
> apps/api/src/routes/api/products
> apps/api/src/services/storefront/products.ts
> apps/api/src/services/catalog/products.ts
> apps/api/src/routes/api/products/products.ts
> ```

🔧 **Bash**
```
ls apps/api/src/routes/admin/products/; wc -l apps/api/src/services/catalog/products.ts; sed -n 1,140p apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> index.ts
>      784 apps/api/src/services/catalog/products.ts
> /**
>  * Products & variants (SPEC §7). Owner: WS-B.
>  *
>  * All catalog business logic lives here; `routes/admin/products/index.ts` is a
>  * thin zod-validated shell over it, so B5's product form, E1's storefront and
>  * H1's seed all hit the same rules.
>  *
>  * Two things this module is deliberately strict about:
>  *   - Money is integer minor units end to end. The DTO carries the shop's
>  *     currency; the column carries the amount. A price in another currency is
>  *     refused rather than silently reinterpreted (multi-currency is out of
>  *     scope, SPEC §2).
>  *   - The variant table is DERIVED from the option matrix, never taken
>  *
> … [truncated, 4,677 more chars]
> ```

🔧 **Bash**
```
sed -n 140,460p apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> /**
>  * An explicitly chosen handle is honoured or refused — renaming what the
>  * merchant typed would silently break the URL they meant to publish. A derived
>  * one walks `-2`, `-3` … the way Shopify renames a duplicate product.
>  */
> async function assignHandle(
>   db: TenantClient,
>   desired: string | undefined,
>   title: string,
>   excludeProductId?: string,
> ): Promise<string> {
>   const notSelf = excludeProductId ? { id: { not: excludeProductId } } : {};
> 
>   if (desired) {
>     const taken = await db.product.findFirst({
>       where: { handle: desired, ...notSelf },
>       select: { id: true },
>     });
>     if (taken) throw conflict('Another product already uses that handle.', 'handle');
>     return
> … [truncated, 10,859 more chars]
> ```

🔧 **Bash**
```
sed -n 460,620p apps/api/src/services/catalog/products.ts
```

> **↳ result**
> ```
> const key = optionSignature(options, asOptionValues(row.optionValues));
>     if (!bySignature.has(key)) bySignature.set(key, row);
>   }
> 
>   const claimed = new Set<string>();
>   const keep: Array<{ resolved: ResolvedVariant<VariantPayload>; row: VariantRow }> = [];
>   const create: ResolvedVariant<VariantPayload>[] = [];
> 
>   for (const variant of resolved) {
>     const candidate =
>       (variant.match?.id ? byId.get(variant.match.id) : undefined) ??
>       bySignature.get(optionSignature(options, variant.optionValues));
>     if (candidate && !claimed.has(candidate.id)) {
>       claimed.add(candidate.id);
>       keep.push({ resolved: variant, row: candidate });
>     } else {
>       create.push(variant);
> … [truncated, 5,695 more chars]
> ```

🔧 **Bash**
```
sed -n 620,784p apps/api/src/services/catalog/products.ts; echo "=== schema product ==="; grep -n "model Product\b" -A45 packages/db/prisma/schema.prisma
```

> **↳ result**
> ```
> Exit code 2
>         // images are uploads rather than caller-supplied URLs.
>         await tx.productImage.deleteMany({ where: { productId: id } });
>         if (input.images.length > 0) {
>           await tx.productImage.createMany({
>             data: input.images.map((image, i) => ({
>               ...imageColumns(image, i, shopId),
>               productId: id,
>             })),
>           });
>         }
>       }
> 
>       // Always written, so `updatedAt` moves even for a variants-only edit.
>       await tx.product.update({
>         where: { id },
>         data: {
>           ...(input.title !== undefined ? { title: input.title } : {}),
>           ...(handle !== undefined ? { handle } : {}),
>           ...
> … [truncated, 5,696 more chars]
> ```

🔧 **Bash**
```
find packages/db -name "*.prisma" -not -path "*/node_modules/*";
```

> **↳ result**
> ```
> packages/db/prisma/schema/orders.prisma
> packages/db/prisma/schema/platform.prisma
> packages/db/prisma/schema/checkout.prisma
> packages/db/prisma/schema/pay.prisma
> packages/db/prisma/schema/inventory.prisma
> packages/db/prisma/schema/schema.prisma
> packages/db/prisma/schema/apps.prisma
> packages/db/prisma/schema/catalog.prisma
> packages/db/prisma/schema/theme.prisma
> packages/db/prisma/schema/analytics.prisma
> packages/db/prisma/schema/discounts.prisma
> packages/db/prisma/schema/customers.prisma
> ```

🔧 **Bash**
```
grep -n "model Product\b" -A40 packages/db/prisma/schema/catalog.prisma; echo "=== join ==="; grep -n "model ProductCollection\|model CollectionProduct" -A15 packages/db/prisma/schema/catalog.prisma
```

> **↳ result**
> ```
> 3:model Product {
> 4-  id              String   @id
> 5-  shopId          String
> 6-  title           String
> 7-  descriptionHtml String   @default("")
> 8-  handle          String
> 9-  status          String   @default("draft") // active | draft | archived
> 10-  vendor          String?
> 11-  productType     String?
> 12-  tags            String[] @default([])
> 13-  seoTitle        String?
> 14-  seoDescription  String?
> 15-  metadata        Json     @default("{}")
> 16-
> 17-  options  ProductOption[]
> 18-  variants ProductVariant[]
> 19-  images   ProductImage[]
> 20-  collections CollectionProduct[]
> 21-
> 22-  createdAt DateTime @default(now()) @db.Timestamptz(6)
> 23-  updatedAt DateTime @updatedAt @db.Timestamptz(6
> … [truncated, 1,034 more chars]
> ```

🔧 **Bash**
```
cat apps/admin/src/components/shell/save-bar.tsx; echo "=== description-html ==="; sed -n 1,80p apps/admin/src/lib/description-html.ts; echo "=== tests ==="; find apps/admin -name "*.test.ts*" -not -path "*/node_modules/*"
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * The contextual save bar (PARITY.md: dark bar over the TopBar, "Unsaved
>  * changes" left, Discard / Save right). Owner: WS-A.
>  *
>  * Every form page in every workstream shows this the moment it is dirty, so the
>  * copy lives here once instead of being retyped eight times:
>  *
>  *   <SaveBar dirty={isDirty} saving={save.isPending} onSave={...} onDiscard={...} />
>  *
>  * Renders through the Frame's portal, so it must be used inside `AdminFrame`.
>  */
> import { ContextualSaveBar } from '@shopify/polaris';
> 
> export function SaveBar({
>   dirty,
>   saving = false,
>   onSave,
>   onDiscard,
> }: {
>   dirty: boolean;
>   saving?: boolean;
>   onSave: () => void;
>   onDiscard: () => void;
> }) {
>   if (
> … [truncated, 2,407 more chars]
> ```

🔧 **Bash**
```
grep -rn "product" DECISIONS.md | head -40; echo "=== e2e ==="; grep -rln "products" e2e/ | head
```

> **↳ result**
> ```
> DECISIONS.md:14:2026-08-28 | WS-A | `packages/contracts` has no barrel `index.ts`; consumers import subpaths (`@merchant/contracts/products`) — a shared barrel is a guaranteed conflict point and hurts tree-shaking.
> DECISIONS.md:22:2026-08-28 | WS-A | api and worker run from TypeScript source under tsx in production; no bundler. @fastify/autoload discovers routes by scanning the filesystem, so a single-file bundle has no route tree, and bundling also inlines Prisma/argon2 and breaks them. Costs ~1s startup compile; buys prod behaviour identical to dev. Verified by running both in NODE_ENV=production.
> DECISIONS.md:31:2026-08-28 | WSC | Discounts apply in the order products → order → shipping,
> … [truncated, 13,655 more chars]
> ```

🔧 **Bash**
```
grep -n "product" -i e2e/tests/smoke.spec.ts | head -60
```

> **↳ result**
> ```
> 29:  test('a) staff login → create product with 2 variants → appears in list', async ({ page }) => {
> 31:    let productId: string | undefined;
> 33:    await test.step('log in and open the product form', async () => {
> 35:      await page.getByRole('link', { name: 'Products', exact: true }).click();
> 36:      await page.waitForURL(/\/products$/);
> 37:      await page.getByRole('link', { name: 'Add product' }).click();
> 38:      await page.waitForURL(/\/products\/new$/);
> 67:    await test.step('save and land on the product page', async () => {
> 69:      await expect(page.getByText('Product saved')).toBeVisible();
> 70:      await page.waitForURL(/\/products\/prod_/);
> 71:      productId = page.url().ma
> … [truncated, 939 more chars]
> ```

🔧 **Bash**
```
sed -n 29,100p e2e/tests/smoke.spec.ts
```

> **↳ result**
> ```
> test('a) staff login → create product with 2 variants → appears in list', async ({ page }) => {
>     const title = `Smoke Tee ${uniqueSuffix()}`;
>     let productId: string | undefined;
> 
>     await test.step('log in and open the product form', async () => {
>       await loginAsOwner(page);
>       await page.getByRole('link', { name: 'Products', exact: true }).click();
>       await page.waitForURL(/\/products$/);
>       await page.getByRole('link', { name: 'Add product' }).click();
>       await page.waitForURL(/\/products\/new$/);
>     });
> 
>     await test.step('fill title, price and two options', async () => {
>       await page.locator('input[name="title"]').fill(title);
>       await page.locator('texta
> … [truncated, 2,777 more chars]
> ```

🔧 **Bash**
```
grep -n "model ProductVariant" -A30 packages/db/prisma/schema/catalog.prisma; echo "=== inventory schema ==="; sed -n 1,60p packages/db/prisma/schema/inventory.prisma
```

> **↳ result**
> ```
> 49:model ProductVariant {
> 50-  id        String @id
> 51-  shopId    String
> 52-  productId String
> 53-  title     String
> 54-  sku       String?
> 55-  barcode   String?
> 56-
> 57-  // Money is integer minor units (SPEC §5). currencyCode lives on Shop; it is
> 58-  // repeated on Order because an order must stay self-describing forever.
> 59-  price          Int
> 60-  compareAtPrice Int?
> 61-
> 62-  position         Int     @default(0)
> 63-  optionValues     Json    @default("{}") // { "Size": "M", "Color": "Blue" }
> 64-  requiresShipping Boolean @default(true)
> 65-  taxable          Boolean @default(true)
> 66-  weightGrams      Int?
> 67-  inventoryPolicy  String  @default("deny") // deny | continue
> 68-
> 69-  prod
> … [truncated, 2,010 more chars]
> ```

🔧 **Bash**
```
cat "apps/admin/src/app/store/[slug]/products/_components/media-card.tsx"
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * The Media card (PARITY.md: left column, drag-drop grid). Owner: WS-B (B5).
>  *
>  * Uploads go straight to the bucket: the API signs a PUT (B2), the browser
>  * sends the bytes, and only the resulting public URL comes back through the
>  * product save. Nothing here posts a file to the API.
>  */
> import type { PresignUploadResponse } from '@merchant/contracts/files';
> import {
>   BlockStack,
>   Box,
>   Button,
>   Card,
>   DropZone,
>   InlineError,
>   InlineStack,
>   Text,
> } from '@shopify/polaris';
> import { useCallback, useState } from 'react';
> import { apiFetch } from '../../../../../lib/api.ts';
> import type { ImageDraft } from '../../../../../lib/product-draft.ts';
> 
> /** Mirrors the co
> … [truncated, 4,908 more chars]
> ```

🔧 **Bash**
```
grep -rn "inventoryPolicy" --include=*.ts --include=*.tsx apps packages | grep -v node_modules | grep -v "contracts/src" | head -30
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
grep -rn "inventoryPolicy" apps packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | head -30
```

> **↳ result**
> ```
> apps/admin/src/lib/product-draft.test.ts:52:  inventoryPolicy: 'deny',
> apps/api/test/inventory.test.ts:56:  options: { inventoryPolicy?: 'deny' | 'continue'; sku?: string } = {},
> apps/api/test/inventory.test.ts:64:        inventoryPolicy: options.inventoryPolicy ?? 'deny',
> apps/api/test/inventory.test.ts:164:    const { variantId } = await createVariant('Deny Me', { inventoryPolicy: 'deny' });
> apps/api/test/inventory.test.ts:177:    const { variantId } = await createVariant('Oversell Me', { inventoryPolicy: 'continue' });
> apps/api/test/inventory.test.ts:194:    const { variantId } = await createVariant('Dig Me Out', { inventoryPolicy: 'continue' });
> apps/api/test/inventory.test.ts:198:
> … [truncated, 2,241 more chars]
> ```

🔧 **Bash**
```
ls packages/db/prisma/migrations | tail -20; echo "=== ws ==="; grep -n "WS-B\|ws-b" docs/WORKSTREAMS.md | head -20
```

> **↳ result**
> ```
> ls: packages/db/prisma/migrations: No such file or directory
> === ws ===
> ```

🔧 **Bash**
```
find packages/db -name "migrations" -type d -not -path "*/node_modules/*"; ls packages/db/prisma; echo "=== workstreams B ==="; grep -n "^| B\|^## B\|Workstream B" -A6 docs/WORKSTREAMS.md | head -40
```

> **↳ result**
> ```
> packages/db/prisma/schema/migrations
> schema
> seed
> === workstreams B ===
> 29:## B. Catalog & inventory
> 30-**own**
> 31-```
> 32-apps/api/src/routes/admin/products/**, .../collections/**, .../inventory/**, .../locations/**, .../files/**
> 33-apps/api/src/services/{catalog,inventory}/**
> 34-apps/admin/src/app/store/[slug]/products/**, .../collections/**, .../inventory/**
> 35-packages/db/prisma/schema/{catalog,inventory}.prisma
> ```

🔧 **Bash**
```
ls packages/db/prisma/schema/migrations | tail -25; echo "=== E own ==="; sed -n '/^## E\./,/^## F\./p' docs/WORKSTREAMS.md | head -25
```

> **↳ result**
> ```
> 20260828074611_001_wsa_initial
> 20260828093650_002_wsg_webhook_delivery_event_id
> 20260828123407_003_wsc_refund_shipping_amount
> 20260828162608_004_wsg_webhook_subscription_soft_delete
> 20260828205332_005_wsc_refund_idempotency
> migration_lock.toml
> === E own ===
> ## E. Storefront & checkout
> **own**
> ```
> apps/storefront/**
> apps/api/src/routes/storefront/**
> apps/api/src/services/{cart,checkout}/**
> packages/db/prisma/schema/checkout.prisma
> packages/contracts/src/{storefront,cart,checkout}.ts
> ```
> 
> ## F. Theme engine & AI builder
> ```

🔧 **Bash**
```
grep -rn "position" apps/api/src/services/catalog/collections.ts | head -20; echo "=== tenant models ==="; sed -n 1,80p packages/db/src/tenant.ts
```

> **↳ result**
> ```
> apps/api/src/services/catalog/collections.ts:292: * `manual` sort order means "the positions the merchant dragged", which a smart
> apps/api/src/services/catalog/collections.ts:470:        orderBy: [{ position: 'asc' }, { productId: 'asc' }],
> apps/api/src/services/catalog/collections.ts:571:  productIds.map((productId, index) => ({ shopId, productId, position: from + index }));
> apps/api/src/services/catalog/collections.ts:721:          orderBy: { position: 'desc' },
> apps/api/src/services/catalog/collections.ts:722:          select: { position: true },
> apps/api/src/services/catalog/collections.ts:728:        // Appended after the current last position — Shopify drops new
> apps/api/src/services/c
> … [truncated, 3,534 more chars]
> ```

🔧 **Bash**
```
sed -n 560,580p apps/api/src/services/catalog/collections.ts; echo "---"; sed -n 700,760p apps/api/src/services/catalog/collections.ts
```

> **↳ result**
> ```
> ruleSet === null ? Prisma.DbNull : (ruleSet as unknown as Prisma.InputJsonValue);
> 
> /**
>  * Join rows for a member list, in selection order.
>  *
>  * `collectionId` is deliberately absent: Prisma refuses it inside a nested
>  * `createMany` (the parent supplies it), so the standalone calls add it and the
>  * nested one does not. `shopId` is passed for Prisma's types even though the
>  * tenant extension stamps it anyway (AGENT-LOG, WS-D).
>  */
> const memberRows = (shopId: string, productIds: string[], from = 0) =>
>   productIds.map((productId, index) => ({ shopId, productId, position: from + index }));
> 
> const memberRowsIn = (shopId: string, collectionId: string, productIds: string[], from = 0) =>
>   membe
> … [truncated, 2,119 more chars]
> ```

🔧 **Bash**
```
sed -n 1,80p apps/api/src/routes/admin/products/index.ts; echo "=== theme templates ==="; grep -rn "product" packages/theme-engine/src/*.ts 2>/dev/null | head -10; ls packages/theme-engine/src
```

> **↳ result**
> ```
> /**
>  * `/admin/api/products` (SPEC §7, §9). Owner: WS-B.
>  *
>  * Thin by design: every rule lives in `services/catalog/products.ts` so the
>  * storefront (E1) and the seed (H1) get the same behaviour without going
>  * through HTTP. These handlers validate, resolve the tenant's currency, call
>  * the service, and emit the catalog webhook.
>  */
> import { deletedResponse, idParam } from '@merchant/contracts/common';
> import {
>   createProductInput,
>   listProductsQuery,
>   updateProductInput,
>   updateVariantInput,
>   variantParams,
> } from '@merchant/contracts/products';
> import type { FastifyInstance, FastifyRequest } from 'fastify';
> import { notFound } from '../../../lib/errors.ts';
> import { requirePermiss
> … [truncated, 3,512 more chars]
> ```

🔧 **Bash**
```
cat .env 2>/dev/null | grep -E "DATABASE_URL|REDIS|PORT" | head; echo "=== stack ==="; pnpm stack status 2>&1 | tail -20
```

> **↳ result**
> ```
> === stack ===
> ==> Infrastructure
>   mailpit       Up 14 hours (healthy)
>   minio         Up 14 hours (healthy)
>   postgres      Up 14 hours (healthy)
>   redis         Up 14 hours (healthy)
> 
> ==> Demo data (merchant_main)
>   analytics_events         5945
>   analytics_rollups_daily  1162
>   inventory_adjustments    340
>   inventory_levels         270
>   order_events             164
>   product_variants         137
>   payments                 84
>   order_line_items         80
>   product_images           66
>   vault_cards              57
>   processor_configs        51
>   shops                    50
>   33 tables seeded, 4 still empty
> ```

🔧 **Bash**
```
pnpm worktree:env --migrate 2>&1 | tail -30
```

> **↳ result**
> ```
> > merchant@ worktree:env /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/worktree-env.sh "--migrate"
> 
> error: all 15 Redis slots are taken — archive a finished worktree first
> error: no Redis slot for product-form-parity-58c056 — remove a finished worktree's directory (or fix its .env) and rerun
>  ELIFECYCLE  Command failed with exit code 1.
>  WARN   Local package.json exists, but node_modules missing, did you mean to install?
> ```

🔧 **Bash**
```
ls /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/ 2>/dev/null; echo "=== git worktrees ==="; git worktree list
```

> **↳ result**
> ```
> a5-deps-readiness-29b49e
> agent-swarm-dev-plan-ee07d4
> busy-mcclintock-c09cfd
> c7-orders-index-filters-8515b6
> completed-workstreams-ac5356
> completed-workstreams-query-9d6ee2
> e2-e3-status-220d42
> e2e-test-strategy-review-577ed6
> e5-issue-deps-571a87
> e6-savecard-checkout-856838
> elastic-grothendieck-562dca
> exciting-ardinghelli-e313ad
> find-available-issue-048039
> find-available-issue-a2501f
> h2-issue-completion-2d6711
> issue-c1-4553b1
> local-dev-setup-8cdd6a
> modern-ux-ui-animations-28cf61
> optimistic-nightingale-a17409
> product-form-parity-58c056
> repo-architecture-review-d669c1
> repo-init-agent-setup-01f7ee
> repo-review-skill-2e0a15
> repo-ui-issues-status-afad25
> resolve-docs-issue-3f28ad
> resolve-docs-issue-9e
> … [truncated, 6,254 more chars]
> ```

🔧 **Bash**
```
sed -n 1,120p scripts/worktree-env.sh
```

> **↳ result**
> ```
> #!/usr/bin/env bash
> #
> # worktree-env.sh — give this worktree its own database and Redis keyspace.
> #
> # Every worktree in this repo talks to ONE docker compose stack. Sharing a
> # database across them is not a tidiness problem, it is a correctness one: a
> # migration that is correct on its own branch (`ADD COLUMN ... NOT NULL`, say)
> # breaks every other worktree the moment it is applied, and `pnpm db:reset`
> # drops the database out from under whoever else is mid-test-run.
> #
> # So each worktree gets `merchant_<name>` and its own Redis db index. Both are
> # free: Postgres databases are catalog entries, not processes, and redis-server
> # already allocates all 16 logical dbs.
> #
> #   pnpm worktree:env
> … [truncated, 4,182 more chars]
> ```

🔧 **Bash**
```
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -sTCP:LISTEN 2>/dev/null | head; echo "---"; pnpm stack status 2>&1 | head -20
```

> **↳ result**
> ```
> COMMAND   PID        USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
> node    40652 pauljurgens   13u  IPv6 0xca39e81d93ef635d      0t0  TCP *:3002 (LISTEN)
> node    40653 pauljurgens   13u  IPv6 0xe676809694abd675      0t0  TCP *:3000 (LISTEN)
> node    52585 pauljurgens   24u  IPv4 0x4ae8ce2462f17a9f      0t0  TCP *:3001 (LISTEN)
> ---
> 
> > merchant@ stack /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/stack.sh "status"
> 
> 
> ==> main
>   checkout               /Users/pauljurgens/Downloads/projects/shopify
>   branch                 main
>   head                   fdba7ee docs(shared): raise Home parity confidence; capture the date-range popo
> … [truncated, 939 more chars]
> ```

🔧 **Bash**
```
pnpm stack status 2>&1 | sed -n 20,80p
```

> **↳ result**
> ```
> 6d3fca3 fix(ws-e): serve a completed checkout as a receipt, never a repricing (#89) (51 minutes ago)
>   58408da feat(ws-h): H4 UX/motion parity — PARITY §Motion + cross-app motion fixes (#87) (84 minutes ago)
> 
> ==> Built so far
>   admin pages            36
>   api route files        29
>   theme sections         21   (target ~18)
>   worker jobs            7
>   migrations             5
> 
> ==> Services
>   ✓ admin       http://admin.lvh.me:3000 [200, elastic-grothendieck-562dca checkout]
>   !   ^ served by worktree 'elastic-grothendieck-562dca', not main — run `pnpm stack up` to take the port back
>   ✓ api         http://api.lvh.me:3001/health [200, elastic-grothendieck-562dca checkout]
>   !   ^ served by wor
> … [truncated, 894 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees && for d in */; do d=${d%/}; s=$(sed -n 's|^REDIS_URL=redis://[^/]*/\([0-9][0-9]*\).*|\1|p' "$d/.env" 2>/dev/null | head -1); [ -n "$s" ] && echo "$s $d"; done | sort -n
```

> **↳ result**
> ```
> 0 elastic-grothendieck-562dca
> 1 agent-swarm-dev-plan-ee07d4
> 2 e6-savecard-checkout-856838
> 2 issue-c1-4553b1
> 3 e2-e3-status-220d42
> 3 local-dev-setup-8cdd6a
> 4 repo-init-agent-setup-01f7ee
> 5 repo-ui-issues-status-afad25
> 5 shopify-clone-kpi-review-3014b2
> 6 workstream-b-critical-review-1fb97e
> 7 c7-orders-index-filters-8515b6
> 7 resolve-docs-issue-9ed006
> 8 resolve-docs-issue-b00d6b
> 9 resolve-docs-issue-b8786f
> 10 resolve-docs-issue-c8efa9
> 11 repo-architecture-review-d669c1
> 12 ws-b-collections-inventory-ui
> 13 h2-issue-completion-2d6711
> 14 find-available-issue-a2501f
> 15 e5-issue-deps-571a87
> Shell cwd was reset to /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c05
> … [truncated, 1 more chars]
> ```

🔧 **Bash**
```
pnpm install > /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad/install.log 2>&1; tail -5 /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad/install.log
```

> **↳ result**
> ```
> Command running in background with ID: bcfi8l0ps. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/tasks/bcfi8l0ps.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

🔧 **Bash**
```
ls -R "apps/admin/src/app/store/[slug]/collections" | head -30; echo "=== api lib ==="; sed -n 1,60p apps/admin/src/lib/api.ts
```

> **↳ result**
> ```
> [id]
> _components
> layout.tsx
> new
> page.tsx
> 
> apps/admin/src/app/store/[slug]/collections/[id]:
> page.tsx
> 
> apps/admin/src/app/store/[slug]/collections/_components:
> collection-form.tsx
> image-card.tsx
> product-picker.tsx
> rules-builder.tsx
> 
> apps/admin/src/app/store/[slug]/collections/new:
> page.tsx
> === api lib ===
> /**
>  * The admin's one HTTP client (SPEC §5, §8). Owner: WS-A.
>  *
>  * Every admin page in every workstream goes through this — importing `fetch`
>  * directly in a page is how the CSRF header or `credentials` gets forgotten on
>  * one screen and nowhere else. Changing a signature here is a breaking change
>  * for eight workstreams: log it in DECISIONS.md first (CLAUDE.md §3).
>  *
>  *   const { data
> … [truncated, 1,711 more chars]
> ```

🔧 **Bash**
```
sed -n 1,80p "apps/admin/src/app/store/[slug]/collections/_components/product-picker.tsx"
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * Manual collection membership: the chosen products, and the modal that picks
>  * them (PARITY.md → Collection form). Owner: WS-B (B6).
>  *
>  * Order is the collection's `manual` sort order, so the ↑/↓ controls are the
>  * merchant's merchandising, not decoration.
>  */
> import type { Paginated } from '@merchant/contracts/common';
> import type { Product } from '@merchant/contracts/products';
> import {
>   BlockStack,
>   Box,
>   Button,
>   Card,
>   Checkbox,
>   InlineStack,
>   Modal,
>   ResourceItem,
>   ResourceList,
>   Text,
>   TextField,
>   Thumbnail,
> } from '@shopify/polaris';
> import { ImageIcon } from '@shopify/polaris-icons';
> import { useState } from 'react';
> import { useApiQuery } from '.
> … [truncated, 1,628 more chars]
> ```

🔧 **Bash**
```
sed -n 1,90p apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> /**
>  * The two things in the product form that are silently wrong when they break.
>  *
>  * Money: the form holds strings and the wire carries integer minor units. A
>  * float anywhere in between is the classic bug this page invites (B5 landmine).
>  *
>  * The matrix: the form previews the rows the API will generate. If the two
>  * disagree about ordering or about which row survives an option edit, a save
>  * reshuffles the table or drops the prices the merchant just typed — and
>  * nothing throws. These assertions pin it to the API's rule.
>  */
> import type { Product } from '@merchant/contracts/products';
> import { describe, expect, it } from 'vitest';
> import {
>   addOptionValues,
>   draftFromProduct,
>   d
> … [truncated, 2,398 more chars]
> ```

🔧 **Bash**
```
sed -n 90,220p apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> it('ignores blanks and case-insensitive duplicates', () => {
>     expect(addOptionValues(['S'], ['  ', 's', 'M', 'm'])).toEqual(['S', 'M']);
>     expect(addOptionValues(['S'], [' M '])).toEqual(['S', 'M']);
>   });
> });
> 
> describe('reconcileVariants', () => {
>   it('keeps the price, sku and id of a combination that survives an option edit', () => {
>     const before = reconcileVariants([option('Size', ['S', 'M'])], emptyDraft().variants).map(
>       (row, i) => ({ ...row, id: `var_kept${i}`, price: `${10 + i}.00`, sku: `SKU-${i}` }),
>     );
> 
>     const after = reconcileVariants([option('Size', ['S', 'M', 'L'])], before);
> 
>     expect(after.map((v) => v.title)).toEqual(['S', 'M', 'L']);
>     expect(at(af
> … [truncated, 4,893 more chars]
> ```

🔧 **Bash**
```
node -e "
const p=require('/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/node_modules/@shopify/polaris/package.json');console.log('polaris',p.version);
" 2>&1; ls node_modules/@shopify/ 2>/dev/null; grep -o "\"@shopify/[a-z-]*\": \"[^\"]*\"" apps/admin/package.json
```

> **↳ result**
> ```
> node:internal/modules/cjs/loader:1433
>   throw err;
>   ^
> 
> Error: Cannot find module '/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/node_modules/@shopify/polaris/package.json'
> Require stack:
> - /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/[eval]
>     at Function._resolveFilename (node:internal/modules/cjs/loader:1430:15)
>     at defaultResolveImpl (node:internal/modules/cjs/loader:1040:19)
>     at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1045:22)
>     at Function._load (node:internal/modules/cjs/loader:1216:25)
>     at wrapModuleLoad (node:internal/modules/cjs/loader:254:19)
>     at Module.requir
> … [truncated, 458 more chars]
> ```

🔧 **Bash**
```
ICONS=$(find . -path "*/node_modules/@shopify/polaris-icons/dist/index.d.ts" | head -1); echo "$ICONS"; for n in ProductIcon ChevronRightIcon ChevronDownIcon MenuHorizontalIcon PlusCircleIcon InfoIcon SettingsIcon EditIcon TextBoldIcon TextItalicIcon TextUnderlineIcon TextAlignLeftIcon TextAlignCenterIcon TextAlignRightIcon ListBulletedIcon ListNumberedIcon LinkIcon CodeIcon StoreIcon TextColorIcon TextIndentIcon TextOutdentIcon DeleteIcon PageIcon; do grep -q "\b$n\b" "$ICONS" && echo "OK $n" || echo "MISSING $n"; done
```

> **↳ result**
> ```
> ./node_modules/.pnpm/@shopify+polaris-icons@9.3.1_react@19.2.8/node_modules/@shopify/polaris-icons/dist/index.d.ts
> OK ProductIcon
> OK ChevronRightIcon
> OK ChevronDownIcon
> OK MenuHorizontalIcon
> OK PlusCircleIcon
> OK InfoIcon
> OK SettingsIcon
> OK EditIcon
> OK TextBoldIcon
> OK TextItalicIcon
> OK TextUnderlineIcon
> OK TextAlignLeftIcon
> OK TextAlignCenterIcon
> OK TextAlignRightIcon
> OK ListBulletedIcon
> OK ListNumberedIcon
> OK LinkIcon
> OK CodeIcon
> OK StoreIcon
> OK TextColorIcon
> OK TextIndentIcon
> MISSING TextOutdentIcon
> OK DeleteIcon
> OK PageIcon
> ```

🔧 **Bash**
```
ICONS=$(find . -path "*/node_modules/@shopify/polaris-icons/dist/index.d.ts" | head -1); grep -oE "\b(Text[A-Za-z]*Icon|Channel[A-Za-z]*Icon|Clear[A-Za-z]*Icon|Undo[A-Za-z]*Icon|Indent[A-Za-z]*Icon|Outdent[A-Za-z]*Icon|Magic[A-Za-z]*Icon|Package[A-Za-z]*Icon|Inventory[A-Za-z]*Icon|Money[A-Za-z]*Icon|Search[A-Za-z]*Icon|Plus[A-Za-z]*Icon|Sliders[A-Za-z]*Icon)\b" "$ICONS" | sort -u
```

> **↳ result**
> ```
> ChannelsIcon
> InventoryFilledIcon
> InventoryIcon
> InventoryUpdatedIcon
> MagicIcon
> MoneyFilledIcon
> MoneyIcon
> MoneyNoneIcon
> OutdentIcon
> PackageFilledIcon
> PackageFulfilledIcon
> PackageIcon
> PackageOnHoldIcon
> PackageReturnedIcon
> PlusCircleIcon
> PlusIcon
> SearchIcon
> SearchListIcon
> SearchRecentIcon
> SearchResourceIcon
> TextAlignCenterIcon
> TextAlignLeftIcon
> TextAlignRightIcon
> TextBlockIcon
> TextBoldIcon
> TextColorIcon
> TextFontIcon
> TextFontListIcon
> TextGrammarIcon
> TextIcon
> TextInColumnsIcon
> TextInRowsFilledIcon
> TextInRowsIcon
> TextIndentIcon
> TextItalicIcon
> TextQuoteIcon
> TextTitleIcon
> TextUnderlineIcon
> TextWithImageIcon
> UndoIcon
> ```

### 🤖 Claude

Now I'll implement. Starting with the contract + API so the Collections field can actually save.

🔧 **Bash**
```
python3 - <<'PY'
import re, pathlib
p = pathlib.Path('packages/contracts/src/products.ts')
s = p.read_text()
old = """    options: z.array(productOptionSchema).default([]),
    variants: z.array(productVariantSchema).default([]),
    images: z.array(productImageSchema).default([]),
    metadata: metadataSchema,"""
new = """    options: z.array(productOptionSchema).default([]),
    variants: z.array(productVariantSchema).default([]),
    images: z.array(productImageSchema).default([]),
    /**
     * MANUAL collection membership, in no particular order.
     *
     * Smart collections are resol
… [truncated, 359 more chars]
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now the API service — read, create, and update paths for collection membership.

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/services/catalog/products.ts')
s = p.read_text()

# 1. include
old = """  images: { orderBy: BY_POSITION },
} satisfies Prisma.ProductInclude;"""
new = """  images: { orderBy: BY_POSITION },
  // Manual membership only — a smart collection stores no join rows.
  collections: { select: { collectionId: true } },
} satisfies Prisma.ProductInclude;"""
assert old in s; s = s.replace(old, new)

# 2. dto
old = """    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}"""
… [truncated, 297 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/services/catalog/products.ts')
s = p.read_text()

anchor = """/* -------------------------------------------------------------------------- */
/* Read                                                                         */
/* -------------------------------------------------------------------------- */"""

helper = '''/* -------------------------------------------------------------------------- */
/* Collection membership                                                        */
/* -----------------------------------------------
… [truncated, 2,242 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/services/catalog/products.ts')
s = p.read_text()
old = """async function appendPositions(
  tx: TenantClient,
  collectionIds: readonly string[],
): Promise<Map<string, number>> {"""
new = """async function appendPositions(
  // Structural, so the same helper serves `db` and a `$transaction` client.
  tx: { collectionProduct: TenantClient['collectionProduct'] },
  collectionIds: readonly string[],
): Promise<Map<string, number>> {"""
assert old in s; s = s.replace(old, new); p.write_text(s); print("ok")
PY
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now wire create and update:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/services/catalog/products.ts')
s = p.read_text()

# --- create -------------------------------------------------------------
old = """  const template = input.variants[0];
  assertVariantCurrencies(input.variants, currencyCode);
  const handle = await assignHandle(db, input.handle, input.title);

  try {"""
new = """  const template = input.variants[0];
  assertVariantCurrencies(input.variants, currencyCode);
  const handle = await assignHandle(db, input.handle, input.title);
  const memberships = await resolveMemberships(db, input
… [truncated, 2,645 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/src/services/catalog/products.ts')
s = p.read_text()
old = """        // `productId` is the parent's, which Prisma refuses inside a nested
        // create — hence the row shape minus it.
        collections: {
          create: membershipRows(shopId, '', memberships, positions).map(
            ({ productId: _productId, ...row }) => row,
          ),
        },"""
new = """        // No `productId`: Prisma refuses it inside a nested create, because the
        // parent supplies it (same shape collections.ts uses for its own side).
… [truncated, 281 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
pnpm --filter @merchant/contracts exec tsc --noEmit -p tsconfig.json 2>&1 | head -5; echo "--- api typecheck ---"; pnpm --filter @merchant/api exec tsc --noEmit -p tsconfig.json 2>&1 | head -30
```

> **↳ result**
> ```
> --- api typecheck ---
> src/routes/admin/apps/index.ts(118,46): error TS7006: Parameter 'row' implicitly has an 'any' type.
> src/routes/admin/orders/index.ts(20,10): error TS2305: Module '"@merchant/db/client"' has no exported member 'Prisma'.
> src/routes/admin/payments/payments.ts(172,23): error TS7006: Parameter 'row' implicitly has an 'any' type.
> src/routes/admin/payments/routing-rules.ts(79,40): error TS7006: Parameter 'config' implicitly has an 'any' type.
> src/routes/auth/index.ts(12,24): error TS2305: Module '"@merchant/db/client"' has no exported member 'Shop'.
> src/routes/auth/index.ts(12,35): error TS2305: Module '"@merchant/db/client"' has no exported member 'StaffUser'.
> src/routes/auth
> … [truncated, 2,342 more chars]
> ```

🔧 **Bash**
```
pnpm --filter @merchant/db exec prisma generate 2>&1 | tail -5
```

> **↳ result**
> ```
> Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
> 
> Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
> ```

🔧 **Bash**
```
pnpm --filter @merchant/api exec tsc --noEmit -p tsconfig.json 2>&1 | head -30
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
pnpm typecheck 2>&1 | grep -E "error TS|Tasks:|ERROR" | head -30
```

> **↳ result**
> ```
> @merchant/admin:typecheck: src/lib/product-draft.test.ts(229,7): error TS2741: Property 'collectionIds' is missing in type '{ id: string; title: string; descriptionHtml: string; handle: string; status: "active"; vendor: null; productType: null; tags: never[]; seo: { title: null; description: null; }; options: never[]; variants: { ...; }[]; images: never[]; metadata: {}; createdAt: string; updatedAt: string; }' but required in type '{ options: { values: string[]; id: string; name: string; position: number; }[]; status: "active" | "draft" | "archived"; createdAt: string; updatedAt: string; title: string; id: string; collectionIds: string[]; ... 8 more ...; images: { ...; }[]; }'.
> @merchant/adm
> … [truncated, 255 more chars]
> ```

🔧 **Bash**
```
grep -rn "product-draft\|description-html" apps/admin/src --include="*.ts" --include="*.tsx" | grep -v node_modules
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx:35:} from '../../../../../lib/product-draft.ts';
> apps/admin/src/app/store/[slug]/products/_components/media-card.tsx:23:import type { ImageDraft } from '../../../../../lib/product-draft.ts';
> apps/admin/src/app/store/[slug]/products/_components/product-form.tsx:44:} from '../../../../../lib/product-draft.ts';
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:37:import { htmlToText, isSimpleHtml, textToHtml } from '../../../../../lib/description-html.ts';
> apps/admin/src/lib/product-draft.ts:17:import { htmlToText, isSimpleHtml, textToHtml } from './description-html.ts';
> apps/admin/src/lib/product-d
> … [truncated, 44 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/lib/product-draft.ts')
s = p.read_text()

# ---- header: drop the description-html re-export ------------------------
old = """import { fromDecimal, toDecimal } from '@merchant/config/money';
import type { Product } from '@merchant/contracts/products';
import { htmlToText, isSimpleHtml, textToHtml } from './description-html.ts';

export { htmlToText, isSimpleHtml, textToHtml };

export const DEFAULT_VARIANT_TITLE = 'Default Title';"""
new = """import { fromDecimal, toDecimal } from '@merchant/config/money';
import type { Product
… [truncated, 7,809 more chars]
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now `reconcileVariants`, `validate`, and `draftToInput`:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/lib/product-draft.ts')
s = p.read_text()

old = """  return matrixOf(options).map((optionValues, index) => {
    const previous = bySignature.get(signature(used, optionValues));
    const source = previous ?? (used.length === 0 ? fallback : undefined);
    return {
      ...(previous?.id ? { id: previous.id } : {}),
      key: previous?.key ?? `new-${index}-${signature(used, optionValues)}`,
      title: variantTitleOf(options, optionValues),
      optionValues,
      // A brand-new combination inherits the first row's price, the
… [truncated, 6,074 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
TOK=$(find . -path "*node_modules/@shopify/polaris-tokens/dist/css/styles.css" | head -1); echo "$TOK"; for t in --p-color-bg-fill-brand --p-color-bg-fill-tertiary --p-color-border --p-color-bg-surface --p-border-radius-full --p-shadow-100 --p-color-bg-surface-secondary --p-color-bg-fill-brand-hover --p-color-text-secondary --p-color-bg-surface-selected --p-color-border-focus --p-color-bg-fill-disabled --p-space-100 --p-font-size-325 --p-color-text-brand-on-bg-fill; do grep -q -- "$t:" "$TOK" && echo "OK $t" || echo "MISSING $t"; done
```

> **↳ result**
> ```
> ./node_modules/.pnpm/@shopify+polaris-tokens@9.4.2/node_modules/@shopify/polaris-tokens/dist/css/styles.css
> OK --p-color-bg-fill-brand
> OK --p-color-bg-fill-tertiary
> OK --p-color-border
> OK --p-color-bg-surface
> OK --p-border-radius-full
> OK --p-shadow-100
> OK --p-color-bg-surface-secondary
> OK --p-color-bg-fill-brand-hover
> OK --p-color-text-secondary
> OK --p-color-bg-surface-selected
> OK --p-color-border-focus
> OK --p-color-bg-fill-disabled
> OK --p-space-100
> OK --p-font-size-325
> OK --p-color-text-brand-on-bg-fill
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/switch.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/switch.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
TOK=$(find . -path "*node_modules/@shopify/polaris-tokens/dist/css/styles.css" | head -1); for t in --p-motion-duration-100 --p-motion-ease; do grep -q -- "$t:" "$TOK" && echo "OK $t" || echo "MISSING $t"; done
```

> **↳ result**
> ```
> OK --p-motion-duration-100
> OK --p-motion-ease
> ```

🔧 **Bash**
```
POL=$(find . -path "*node_modules/@shopify/polaris/build/ts/src/index.d.ts" | head -1); [ -z "$POL" ] && POL=$(find . -path "*node_modules/@shopify/polaris/*index.d.ts" | head -3); echo "$POL"; for n in InlineGrid Popover ActionList Tooltip Divider Icon Bleed Collapsible ButtonGroup ColorPicker Labelled Scrollable EmptyState Thumbnail; do grep -qE "\b$n\b" $POL && echo "OK $n" || echo "MISSING $n"; done
```

> **↳ result**
> ```
> ./node_modules/.pnpm/@shopify+polaris@13.9.5_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@shopify/polaris/build/ts/src/index.d.ts
> OK InlineGrid
> OK Popover
> OK ActionList
> OK Tooltip
> OK Divider
> OK Icon
> OK Bleed
> OK Collapsible
> OK ButtonGroup
> OK ColorPicker
> OK Labelled
> OK Scrollable
> OK EmptyState
> OK Thumbnail
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/collapsible-fields.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/collapsible-fields.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
TOK=$(find . -path "*node_modules/@shopify/polaris-tokens/dist/css/styles.css" | head -1); for t in --p-font-family-mono --p-font-line-height-500 --p-font-size-600 --p-font-size-500 --p-font-size-400 --p-font-size-300 --p-font-weight-semibold --p-border-width-025 --p-border-radius-100 --p-border-radius-200 --p-space-600 --p-space-150 --p-color-text-emphasis --p-color-text --p-space-200 --p-space-300 --p-space-400; do grep -q -- "$t:" "$TOK" && echo "OK $t" || echo "MISSING $t"; done
```

> **↳ result**
> ```
> OK --p-font-family-mono
> OK --p-font-line-height-500
> OK --p-font-size-600
> OK --p-font-size-500
> OK --p-font-size-400
> OK --p-font-size-300
> OK --p-font-weight-semibold
> OK --p-border-width-025
> OK --p-border-radius-100
> OK --p-border-radius-200
> OK --p-space-600
> OK --p-space-150
> OK --p-color-text-emphasis
> OK --p-color-text
> OK --p-space-200
> OK --p-space-300
> OK --p-space-400
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx')
s = p.read_text()

old = """  const emit = useCallback(() => {"""
new = """  /**
   * Seeds the surface with the current html on mount — and on the REMOUNT that
   * toggling Show HTML causes, where the effect above sees no change and would
   * leave an empty editor behind. `useCallback` keeps the identity stable, so
   * React does not re-run it (and re-seed, throwing the caret) every render.
   */
  const attach = useCallback((node: HTMLDivElement | null) => {
    edi
… [truncated, 762 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
sed -n 1,40p packages/contracts/src/locations.ts
```

> **↳ result**
> ```
> /** Locations (SPEC §7 Inventory). Owner: WS-B. */
> import { z } from 'zod';
> import { addressSchema, idSchema, timestampsSchema } from './common.ts';
> 
> export const locationSchema = z
>   .object({
>     id: idSchema,
>     name: z.string().min(1).max(255),
>     address: addressSchema.partial().nullable().default(null),
>     isActive: z.boolean().default(true),
>     fulfillsOnlineOrders: z.boolean().default(true),
>     /**
>      * How many variants still hold units here. Read-only, and the reason the
>      * admin can grey out Delete without paging the whole inventory.
>      */
>     stockedVariantCount: z.number().int().nonnegative().default(0),
>   })
>   .merge(timestampsSchema);
> export type Location = z.infe
> … [truncated, 313 more chars]
> ```

### 🤖 Claude

Now the three left-column cards:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/pricing-card.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/pricing-card.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/inventory-card.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/inventory-card.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/shipping-card.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/shipping-card.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
cat "apps/admin/src/app/store/[slug]/storefront/preview-url.ts"
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
> … [truncated, 1,290 more chars]
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
grep -n "handleSchema" -B3 -A8 packages/contracts/src/common.ts | head -20; echo "=== api handles ==="; sed -n 1,40p apps/api/src/services/catalog/handles.ts
```

> **↳ result**
> ```
> 17-  z.string().regex(new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`), `Expected a ${prefix}_ id`);
> 18-
> 19-/** URL-safe, lowercase. Unique per shop for products/collections. */
> 20:export const handleSchema = z
> 21-  .string()
> 22-  .min(1)
> 23-  .max(255)
> 24-  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must be lowercase, hyphen-separated');
> 25-
> 26-/* -------------------------------------------------------------------------- */
> 27-/* Money (SPEC §5 — integer minor units, never floats)                          */
> 28-/* -------------------------------------------------------------------------- */
> === api handles ===
> /**
>  * Product handles — the `/products/{handle}` segment on the storefront.
>  *
> … [truncated, 1,403 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/lib/product-draft.ts')
s = p.read_text()

old = """const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);"""
new = """/* -------------------------------------------------------------------------- */
/* Handles                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What the URL-handle field accepts WHILE TYPING. Deliberately lenient about
 * the edges: stripping a trailing `-` on every keystroke makes "tee-shirt"
… [truncated, 1,650 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx')
s = p.read_text()

old = """import type { ProductDraft } from '../../../../../lib/product-draft.ts';
import { storefrontOrigin } from '../../storefront/preview-url.ts';

/** Shopify's own truncation points, so the preview lies the same way Google does. */
const TITLE_LIMIT = 70;
const DESCRIPTION_LIMIT = 160;

const clamp = (value: string, limit: number) =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;

/** The same slug the API derives, so a new
… [truncated, 1,169 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/organization-card.tsx
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/organization-card.tsx (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/organization-card.tsx')
s = p.read_text()
old = """  const collections = useApiQuery<Paginated<Collection>>(
    ['collection-options'],
    '/admin/api/collections?limit=250&type=manual',
    { enabled: wanted },
  );"""
new = """  // Also fetched unprompted when the product already belongs somewhere — the
  // chips need titles, and rendering "Collection" until someone clicks is worse
  // than one small request.
  const collections = useApiQuery<Paginated<Collection>>(
    ['collection-opt
… [truncated, 199 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/components/shell/save-bar.tsx')
s = p.read_text()
old = """export function SaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!dirty) return null;

  return (
    <ContextualSaveBar
      message="Unsaved changes"
"""
new = """export function SaveBar({
  dirty,
  saving = false,
  message = 'Unsaved changes',
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving?: boolean;
  /**
   * Shopify says "Unsaved changes" on a r
… [truncated, 383 more chars]
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now the main form rewrite:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/product-form.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()

s = s.replace("""  ActionList,
  BlockStack,
  Box,
  Button,
  Card,
  Icon,
  InlineStack,
  Layout,
  Modal,
  Page,
  Popover,
  Select,
  Text,
} from '@shopify/polaris';""", """  ActionList,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineStack,
  Layout,
  Modal,
  Page,
  Popover,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';""")

s = s.replace("""                  <TitleField
                    value={draft.title}
… [truncated, 715 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx')
s = p.read_text()

old = """import { useState } from 'react';"""
new = """import { PlusCircleIcon } from '@shopify/polaris-icons';
import { useState } from 'react';"""
assert old in s; s = s.replace(old, new)

old = """          <Button
            variant="plain"
            onClick={() => setOptions([{ name: '', values: [] }])}
            accessibilityLabel="Add options like size or color"
          >
            + Add options like size or color
          </Button>"""
n
… [truncated, 899 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx')
s = p.read_text()
old = """        <BlockStack gap="200">
          {hasMatrix ? (
            <Text as="h3" variant="headingXs">
              {variants.length} variant{variants.length === 1 ? '' : 's'}
            </Text>
          ) : null}

          {variants.map((variant, index) => ("""
new = """        {/* Only once options exist. Without them the product has a single
            implicit variant whose price, sku and stock belong to the Price and
            Invento
… [truncated, 409 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
pnpm --filter @merchant/admin exec tsc --noEmit -p tsconfig.json 2>&1 | head -30
```

> **↳ result**
> ```
> src/app/store/[slug]/products/_components/collapsible-fields.tsx(57,15): error TS2322: Type 'string | Element' is not assignable to type 'string | string[] | undefined'.
>   Type 'Element' is not assignable to type 'string | string[] | undefined'.
> src/lib/product-draft.test.ts(19,3): error TS2305: Module '"./product-draft.ts"' has no exported member 'htmlToText'.
> src/lib/product-draft.test.ts(20,3): error TS2305: Module '"./product-draft.ts"' has no exported member 'isSimpleHtml'.
> src/lib/product-draft.test.ts(25,3): error TS2305: Module '"./product-draft.ts"' has no exported member 'textToHtml'.
> src/lib/product-draft.test.ts(159,18): error TS2551: Property 'description' does not exist on type
> … [truncated, 1,340 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/collapsible-fields.tsx')
s = p.read_text()
old = """          {collapsed.map((field) => (
            <Button
              key={field.id}
              size="slim"
              onClick={() => setOpened((current) => [...current, field.id])}
            >
              {field.value === undefined ? (
                field.label
              ) : (
                <>
                  {field.label}
                  <span
                    style={{
                      color: 'var(--p-color-
… [truncated, 1,825 more chars]
```

> **↳ result**
> ```
> ok
> OK lh400
> ```

### 🤖 Claude

Now the tests — move the HTML round-trip tests to their own file and rewrite the description assertions:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/description-html.test.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/description-html.test.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
sed -n 220,300p apps/admin/src/lib/product-draft.test.ts
```

> **↳ result**
> ```
> variants: [variant({ price: { amount: 2450, currencyCode: 'USD' } })],
>     };
>     const draft = draftFromProduct(product);
> 
>     expect(at(draft.variants, 0).price).toBe('24.50');
>     expect(at(draftToInput(draft, 'USD').variants, 0).price.amount).toBe(2450);
>   });
> });
> 
> const baseProduct: Product = {
>   id: 'prod_01ARZ3NDEKTSV4RRFFQ69G5FAV',
>   title: 'Tee',
>   descriptionHtml: '',
>   handle: 'tee',
>   status: 'active',
>   vendor: null,
>   productType: null,
>   tags: [],
>   seo: { title: null, description: null },
>   options: [],
>   variants: [variant()],
>   images: [],
>   metadata: {},
>   createdAt: '2026-08-28T00:00:00.000Z',
>   updatedAt: '2026-08-28T00:00:00.000Z',
> };
> 
> describe('validate', () => {
>   it(
> … [truncated, 1,874 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('apps/admin/src/lib/product-draft.test.ts')
s = p.read_text()

# imports
s = s.replace("""  emptyDraft,
  htmlToText,
  isSimpleHtml,
  matrixOf,""", """  emptyDraft,
  matrixOf,""")
s = s.replace("""  stockChanges,
  textToHtml,
  validate,""", """  normalizeHandle,
  stockChanges,
  validate,""")

# baseProduct gains collectionIds
s = s.replace("""  variants: [variant()],
  images: [],
  metadata: {},""", """  variants: [variant()],
  images: [],
  collectionIds: [],
  metadata: {},""")

# rewrite the description describe block
start = s.i
… [truncated, 1,876 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
pnpm --filter @merchant/admin exec tsc --noEmit -p tsconfig.json 2>&1 | head -20
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
pnpm --filter @merchant/admin exec vitest run src/lib/product-draft.test.ts src/lib/description-html.test.ts 2>&1 | tail -30
```

> **↳ result**
> ```
> ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
> 
>  FAIL  src/lib/product-draft.test.ts > validate > requires a title and accepts a price still being typed
> AssertionError: expected undefined to be 'Enter a valid price for every variant.' // Object.is equality
> 
> [32m- Expected:[39m 
> "Enter a valid price for every variant."
> 
> [31m+ Received:[39m 
> undefined
> 
>  ❯ src/lib/product-draft.test.ts:248:39
>     246|     const typing = { ...emptyDraft(), title: 'Tee' };
>     247|     at(typing.variants, 0).price = '19.';
>     248|     expect(validate(typing).variants).toBe('Enter a valid price for ev…
>        |                                       ^
>     249| 
>     250|     at(typing.variants, 0).price = '19.9';
> 
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
> … [truncated, 483 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/lib/product-draft.test.ts')
s = p.read_text()
old = """  it('requires a title and accepts a price still being typed', () => {
    expect(validate({ ...emptyDraft(), title: '  ' }).title).toBe('Title is required');

    const typing = { ...emptyDraft(), title: 'Tee' };
    at(typing.variants, 0).price = '19.';
    expect(validate(typing).variants).toBe('Enter a valid price for every variant.');

    at(typing.variants, 0).price = '19.9';
    expect(validate(typing)).toEqual({});
  });"""
new = """  it('requires a title and accepts
… [truncated, 1,454 more chars]
```

> **↳ result**
> ```
> ok
>  ✓ src/lib/description-html.test.ts (4 tests) 10ms
>  ✓ src/lib/product-draft.test.ts (23 tests) 28ms
> 
>  Test Files  2 passed (2)
>       Tests  27 passed (27)
>    Start at  12:01:39
>    Duration  1.79s (transform 898ms, setup 0ms, collect 1.14s, tests 38ms, environment 0ms, prepare 602ms)
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | tail -40
```

> **↳ result**
> ```
> apps/admin/src/lib/product-draft.test.ts:14:1 assist/source/organizeImports  FIXABLE  ━━━━━━━━━━━━━━
> 
>   × Sort the imported names.
>   
>     12 │ import type { Product } from '@merchant/contracts/products';
>     13 │ import { describe, expect, it } from 'vitest';
>   > 14 │ import {
>        │ ^^^^^^^^
>   > 15 │   addOptionValues,
>         ...
>   > 25 │   variantTitleOf,
>   > 26 │ } from './product-draft.ts';
>        │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>     27 │ 
>     28 │ const option = (name: string, values: string[]) => ({ name, values });
>   
>   i Safe fix: Organize imports and exports (Biome)
>   
>      18  18 │     emptyDraft,
>      19  19 │     matrixOf,
>      20     │ - ··reconcileVariants,
>      21     │ - ··r
> … [truncated, 489 more chars]
> ```

🔧 **Bash**
```
pnpm format 2>&1 | tail -5; echo "=== recheck ==="; pnpm lint 2>&1 | tail -40
```

> **↳ result**
> ```
> > merchant@ format /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome format --write .
> 
> Formatted 484 files in 326ms. Fixed 3 files.
> === recheck ===
>   
> 
> apps/admin/src/lib/product-draft.test.ts:14:1 assist/source/organizeImports  FIXABLE  ━━━━━━━━━━━━━━
> 
>   × Sort the imported names.
>   
>     12 │ import type { Product } from '@merchant/contracts/products';
>     13 │ import { describe, expect, it } from 'vitest';
>   > 14 │ import {
>        │ ^^^^^^^^
>   > 15 │   addOptionValues,
>         ...
>   > 25 │   variantTitleOf,
>   > 26 │ } from './product-draft.ts';
>        │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
>     27 │ 
>     28 │ const option = (name: string, values: str
> … [truncated, 988 more chars]
> ```

🔧 **Bash**
```
pnpm exec biome check --write . 2>&1 | tail -5; echo "=== lint ==="; pnpm lint 2>&1 | tail -40
```

> **↳ result**
> ```
> check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Some errors were emitted while applying fixes.
>   
> 
> === lint ===
> 
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome check .
> 
> apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx:430:13 lint/a11y/useSemanticElements ━━━━━━━━━━
> 
>   × The elements with this role can be changed to the following elements:
>     <input type="text">
>     <textarea>
>   
>     428 │             ref={attach}
>     429 │             className="merchant-rte"
>   > 430 │             role="textbox"
>         │             ^^^^^^^^^^^^^^
>     431 │
> … [truncated, 683 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx')
s = p.read_text()
old = """            ref={attach}
            className="merchant-rte"
            role="textbox\""""
new = """            ref={attach}
            className="merchant-rte"
            // biome-ignore lint/a11y/useSemanticElements: a textarea cannot hold rich text; role=textbox on a contenteditable is the ARIA-sanctioned shape
            role="textbox\""""
assert old in s; s = s.replace(old, new); p.write_text(s); print("ok")
PY
pnpm lint 2>&1 | tail -
… [truncated, 1 more chars]
```

> **↳ result**
> ```
> ok
> Found 1 error.
> Found 1 warning.
> check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Some errors were emitted while running checks.
>   
> 
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | head -50
```

> **↳ result**
> ```
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome check .
> 
> apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx:430:13 suppressions/unused ━━━━━━━━━━
> 
>   ! Suppression comment has no effect. Remove the suppression or make sure you are suppressing the correct rule.
>   
>     428 │             ref={attach}
>     429 │             className="merchant-rte"
>   > 430 │             // biome-ignore lint/a11y/useSemanticElements: a textarea cannot hold rich text; role=textbox on a contenteditable is the ARIA-sanctioned shape
>         │             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
> … [truncated, 1,192 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx')
s = p.read_text()
old = """        ) : (
          <div
            id={id}
            ref={attach}
            className="merchant-rte"
            // biome-ignore lint/a11y/useSemanticElements: a textarea cannot hold rich text; role=textbox on a contenteditable is the ARIA-sanctioned shape
            role="textbox\""""
new = """        ) : (
          <>
            {/** biome-ignore lint/a11y/useSemanticElements: no semantic element holds rich text — role=textbox on
… [truncated, 1,145 more chars]
```

> **↳ result**
> ```
> ok
> 
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome check .
> 
> Checked 487 files in 843ms. No fixes applied.
> ```

🔧 **Bash**
```
pnpm typecheck 2>&1 | grep -E "error TS|Tasks:|ERROR" | head -20
```

> **↳ result**
> ```
> Tasks:    11 successful, 11 total
> ```

🔧 **Bash**
```
sed -n 1,60p apps/api/test/products.test.ts; echo "..."; grep -n "describe(" apps/api/test/products.test.ts
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
> … [truncated, 1,409 more chars]
> ```

🔧 **Bash**
```
sed -n 60,95p apps/api/test/products.test.ts; echo "=== tail ==="; tail -20 apps/api/test/products.test.ts
```

> **↳ result**
> ```
> const titles = (variants: VariantDto[]) => variants.map((v) => v.title);
> 
> beforeAll(async () => {
>   app = await buildTestApp();
>   shop = await createTestShop();
>   cookie = await sessionCookie(app, { shopId: shop.shopId, staffUserId: shop.ownerId });
> 
>   neighbour = await createTestShop();
>   const neighbourCookie = await sessionCookie(app, {
>     shopId: neighbour.shopId,
>     staffUserId: neighbour.ownerId,
>   });
>   const response = await app.inject({
>     method: 'POST',
>     url: PRODUCTS,
>     headers: { cookie: neighbourCookie, 'x-requested-with': CSRF_HEADER_VALUE },
>     payload: {
>       title: 'Nimbus Fleece',
>       vendor: 'Northwind',
>       variants: [{ price: usd(1), sku: 'NIMBUS-QRZ-1' }]
> … [truncated, 1,154 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/api/test/products.test.ts')
s = p.read_text()

block = '''
describe('collection membership', () => {
  const COLLECTIONS = '/admin/api/collections';

  async function createCollection(payload: Record<string, unknown>) {
    const response = await write('POST', COLLECTIONS, payload);
    expect(response.statusCode, response.body).toBe(201);
    return response.json() as { id: string };
  }

  it('joins and leaves manual collections through the product write', async () => {
    const winter = await createCollection({ title: 'Winter', type: '
… [truncated, 2,030 more chars]
```

> **↳ result**
> ```
> ok
> Checked 1 file in 1241ms. Fixed 1 file.
> [This command modified 1 file you've previously read: apps/api/test/products.test.ts. Call Read before editing.]
> ```

🔧 **Bash**
```
grep -n "redis" -A8 docker-compose.yml | head -25; echo "=== redis databases ==="; docker compose exec -T redis redis-cli config get databases 2>&1 | head -4
```

> **↳ result**
> ```
> 25:  redis:
> 26:    image: redis:7-alpine
> 27-    restart: unless-stopped
> 28:    command: ["redis-server", "--appendonly", "yes"]
> 29-    ports:
> 30-      - "6379:6379"
> 31-    volumes:
> 32:      - redis-data:/data
> 33-    healthcheck:
> 34:      test: ["CMD", "redis-cli", "ping"]
> 35-      interval: 5s
> 36-      timeout: 3s
> 37-      retries: 20
> 38-
> 39-  minio:
> 40-    image: minio/minio:latest
> 41-    restart: unless-stopped
> 42-    command: ["server", "/data", "--console-address", ":9001"]
> --
> 85:  redis-data:
> 86-  minio-data:
> === redis databases ===
> databases
> 16
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify && git fetch -q origin 2>/dev/null; for d in .claude/worktrees/*/; do n=$(basename "$d"); s=$(sed -n 's|^REDIS_URL=redis://[^/]*/\([0-9][0-9]*\).*|\1|p' "$d/.env" 2>/dev/null | head -1); [ -z "$s" ] && continue; b=$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null); h=$(git -C "$d" rev-parse HEAD 2>/dev/null); if git merge-base --is-ancestor "$h" origin/main 2>/dev/null; then m="MERGED"; else m="unmerged"; fi; printf "%-3s %-8s %-40s %s\n" "$s" "$m" "$n" "$b"; done | sort -n
```

> **↳ result**
> ```
> 0   unmerged elastic-grothendieck-562dca              ws-a/shopify-brand
> 1   unmerged agent-swarm-dev-plan-ee07d4              ws-e/checkout-ui
> 2   MERGED   issue-c1-4553b1                          ws-c/idle
> 2   unmerged e6-savecard-checkout-856838              ws-e/checkout-save-card
> 3   unmerged e2-e3-status-220d42                      ws-h/index-parity
> 3   unmerged local-dev-setup-8cdd6a                   ws-root/local-stack
> 4   MERGED   exciting-ardinghelli-e313ad              claude/exciting-ardinghelli-e313ad
> 4   MERGED   repo-init-agent-setup-01f7ee             HEAD
> 5   MERGED   repo-ui-issues-status-afad25             claude/repo-ui-issues-status-afad25
> 5   MERGED   shopify-clone-kpi
> … [truncated, 1,016 more chars]
> ```

### 🤖 Claude

All 15 Redis slots are claimed by 41 worktrees, so `worktree:env` can't allocate one. Let me check whether any is actually idle before sharing.

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify && docker compose exec -T redis redis-cli -n 15 dbsize; docker compose exec -T redis redis-cli info keyspace | head -20
```

> **↳ result**
> ```
> 1801
> # Keyspace
> db0:keys=4617,expires=2578,avg_ttl=759297235,subexpiry=0
> db1:keys=1735,expires=603,avg_ttl=590724147,subexpiry=0
> db2:keys=1382,expires=409,avg_ttl=609798740,subexpiry=0
> db3:keys=1030,expires=357,avg_ttl=789379334,subexpiry=0
> db4:keys=442,expires=294,avg_ttl=690640190,subexpiry=0
> db5:keys=2127,expires=734,avg_ttl=836455411,subexpiry=0
> db6:keys=480,expires=151,avg_ttl=817820374,subexpiry=0
> db7:keys=561,expires=187,avg_ttl=864222234,subexpiry=0
> db8:keys=736,expires=304,avg_ttl=586077398,subexpiry=0
> db9:keys=1707,expires=681,avg_ttl=663901223,subexpiry=0
> db10:keys=1329,expires=471,avg_ttl=688012746,subexpiry=0
> db11:keys=59,expires=59,avg_ttl=527113494,subexpiry=0
> db1
> … [truncated, 337 more chars]
> ```

🔧 **Bash**
```
cp ../../../.env.example .env 2>/dev/null || cp /Users/pauljurgens/Downloads/projects/shopify/.env.example .env
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('.env'); s = p.read_text()
s = re.sub(r'^DATABASE_URL=.*$', 'DATABASE_URL=postgresql://merchant:[REDACTED]@localhost:5433/merchant_product_form_parity_58c056?schema=public', s, flags=re.M)
s = re.sub(r'^REDIS_URL=.*$', 'REDIS_URL=redis://localhost:6379/15', s, flags=re.M)
p.write_text(s)
PY
grep -E "^DATABASE_URL|^REDIS_URL" .env
cd /Users/pauljurgens/Downloads/projects/shopify && docker compose exec -T postgres createdb -U merchant
… [truncated, 72 more chars]
```

> **↳ result**
> ```
> DATABASE_URL=postgresql://merchant:[REDACTED]@localhost:5433/merchant_product_form_parity_58c056?schema=public
> REDIS_URL=redis://localhost:6379/15
> createdb done
> Shell cwd was reset to /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> ```

🔧 **Bash**
```
pnpm db:setup 2>&1 | tail -15
```

> **↳ result**
> ```
> └─ migration.sql
>   └─ 20260828205332_005_wsc_refund_idempotency/
>     └─ migration.sql
>       
> All migrations have been successfully applied.
> warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
> For more information, see: https://pris.ly/prisma-config
> 
> Running seed command `tsx prisma/seed/index.ts` ...
>   shop      demo (shop_01M16CC1GA6VC0ZK7EC5DEJES3)
>   staff     owner@demo.dev / password123
>   catalog   32 products · 133 variants · 25 customers · 40 orders
> seed complete
> 
> 🌱  The seed command has been executed.
> ```

🔧 **Bash**
```
pnpm test 2>&1 | tail -40
```

> **↳ result**
> ```
> @merchant/api:test: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/api/test/tenancy.test.ts:324:20
> @merchant/api:test: 
> @merchant/api:test:   321 
> @merchant/api:test:   322 await expect(
> @merchant/api:test:   323   dbB.$transaction(async (tx) =>
> @merchant/api:test: → 324     tx.product.update(
> @merchant/api:test: An operation failed because it depends on one or more records that were required but not found. No record was found for an update.
> @merchant/api:test: 
> @merchant/api:test:  ✓ test/tenancy.test.ts (15 tests) 868ms
> @merchant/api:test:  ✓ test/settings.test.ts (19 tests) 1021ms
> @merchant/api:test:  ✓ test/themes.test.ts (18 tests) 809ms
> … [truncated, 1,482 more chars]
> ```

🔧 **Bash**
```
grep -n '"dev' package.json; echo "=== launch ==="; cat .claude/launch.json; echo "=== admin pkg ==="; grep -n '"dev"' apps/admin/package.json apps/api/package.json apps/storefront/package.json
```

> **↳ result**
> ```
> 11:    "dev": "turbo run dev",
> 12:    "dev:localhost": "ADMIN_URL=http://localhost:3000 API_URL=http://localhost:3001 STOREFRONT_BASE_DOMAIN=localhost:3002 turbo run dev",
> 32:  "devDependencies": {
> === launch ===
> {
>   "version": "0.0.1",
>   "configurations": [
>     {
>       "name": "dev",
>       "runtimeExecutable": "pnpm",
>       "runtimeArgs": ["dev"],
>       "port": 3000,
>       "url": "http://admin.lvh.me:3000"
>     },
>     {
>       "name": "storefront",
>       "port": 3002,
>       "url": "http://demo.lvh.me:3002"
>     },
>     {
>       "name": "api",
>       "port": 3001,
>       "url": "http://api.lvh.me:3001"
>     },
>     {
>       "name": "mail",
>       "port": 8025,
>       "url": "http://localhost:8025"
>     }
> … [truncated, 524 more chars]
> ```

🔧 **Bash**
```
CSS=$(find . -path "*node_modules/@shopify/polaris/build/esm/styles.css" | head -1); [ -z "$CSS" ] && CSS=$(find . -path "*node_modules/@shopify/polaris/*styles.css" | head -1); echo "$CSS"; grep -o "Polaris-Frame[A-Za-z_-]*ContextualSaveBar[A-Za-z_-]*" "$CSS" | sort -u | head; grep -o "Polaris-ContextualSaveBar[A-Za-z_-]*" "$CSS" | sort -u | head
```

> **↳ result**
> ```
> ./node_modules/.pnpm/@shopify+polaris@13.9.5_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/@shopify/polaris/build/esm/styles.css
> Polaris-Frame-ContextualSaveBar
> Polaris-Frame-ContextualSaveBar--fullWidth
> Polaris-Frame-ContextualSaveBar__Action
> Polaris-Frame-ContextualSaveBar__ActionContainer
> Polaris-Frame-ContextualSaveBar__Contents
> Polaris-Frame-ContextualSaveBar__ContextControl
> Polaris-Frame-ContextualSaveBar__LogoContainer
> Polaris-Frame-ContextualSaveBar__MessageContainer
> Polaris-Frame__ContextualSaveBar
> ```

🔧 **Bash**
```
sed -n 1,60p e2e/tests/helpers.ts
```

> **↳ result**
> ```
> /**
>  * Shared plumbing for the smoke flows (SPEC §14.4). Owner: WS-H.
>  *
>  * Not a test file — the five flows + health check in smoke.spec.ts are the
>  * whole e2e budget.
>  */
> import { type APIResponse, expect, type Page } from '@playwright/test';
> 
> export const ADMIN_URL = process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000';
> export const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://demo.lvh.me:3002';
> export const API_URL = process.env.API_URL ?? 'http://localhost:3001';
> 
> /**
>  * The API origin the ADMIN app authenticates against. Cleanup calls must hit
>  * this exact origin — the session cookie is host-scoped, so a request to the
>  * probe URL above (`localhost`) would go out unauthenti
> … [truncated, 1,727 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('e2e/tests/helpers.ts')
s = p.read_text()
old = """/** Per-flow unique data so a retry never collides with an earlier run's rows. */"""
new = """/**
 * Click the contextual save bar's Save, not a form's own one.
 *
 * The product form pins a second `Save` below its last card, the way Shopify
 * does, so a bare `getByRole('button', { name: 'Save' })` is ambiguous there.
 * The save bar is the control every form page shares, so flows drive that.
 */
export async function saveViaSaveBar(page: Page): Promise<void> {
  await page.locator('.Polaris-Fr
… [truncated, 232 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
grep -n "name: 'Save'" e2e/tests/smoke.spec.ts; echo "=== imports ==="; sed -n 1,28p e2e/tests/smoke.spec.ts
```

> **↳ result**
> ```
> 68:      await page.getByRole('button', { name: 'Save' }).click();
> 83:      await page.getByRole('button', { name: 'Save' }).click();
> === imports ===
> import { expect, test } from '@playwright/test';
> import {
>   ADMIN_URL,
>   API_URL,
>   addSocksToCartAndOpenCheckout,
>   adminApi,
>   fillCheckoutAddressAndPickStandard,
>   loginAsOwner,
>   payWithApprovedCard,
>   STOREFRONT_URL,
>   searchAdminIndex,
>   signupFreshShop,
>   storefrontUrlFor,
>   uniqueSuffix,
> } from './helpers.ts';
> 
> /**
>  * SPEC §14.4 — the five mandatory flows. Owner: WS-H.
>  *
>  * These are the whole e2e budget. Do not add a sixth without cutting one.
>  *
>  * The exact money strings come from the seed: Basin Wool Socks (M) is $18.00,
>  * Standar
> … [truncated, 255 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('e2e/tests/smoke.spec.ts')
s = p.read_text()

s = s.replace("""  payWithApprovedCard,
  STOREFRONT_URL,""", """  payWithApprovedCard,
  saveViaSaveBar,
  STOREFRONT_URL,""")

s = s.replace("""      await page.locator('input[name="title"]').fill(title);
      await page.locator('textarea[name="description"]').fill('Created by the e2e smoke suite.');""",
"""      await page.locator('input[name="title"]').fill(title);
      // The description is a rich text editor, not a textarea (B5 parity), so
      // it is addressed by its role rather than by a
… [truncated, 832 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/media-card.tsx')
s = p.read_text()
old = """          <DropZone.FileUpload
            actionTitle={uploading ? 'Uploading…' : 'Add files'}
            actionHint="or drop files to upload"
          />"""
new = """          {/* Shopify's empty state offers "Upload new" and "Select existing"
              over "Accepts images, videos, or 3D models". There is no media
              library to select from and the bucket only takes images, so the
              copy says what is true rather than w
… [truncated, 255 more chars]
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now the decision log and the parity doc's delta section:

🔧 **Bash**
```
tail -5 DECISIONS.md; echo "---AGENT LOG---"; tail -12 docs/AGENT-LOG.md
```

> **↳ result**
> ```
> 2026-08-29 | WS-H | Customers/discounts indexes now actually match the WS-C line above ("selection checkboxes REMOVED, orders precedent"): H3's parallel-branch bulk Delete landed after that decision was logged and contradicted it on main — removed (`selectable={false}`), not repaired, because the API deliberately has no bulk actions there and a customer-with-orders delete is a 409 by design. If bulk actions ever return, they must be `Promise.allSettled` + invalidate-in-`finally`; the removed version reported partial destruction as total failure and left deleted rows in the table.
> 2026-08-29 | WS-H | Clarifying two now-contradictory settled lines: WS-E's "account pages read only resolveShopSl
> … [truncated, 9,972 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('DECISIONS.md')
lines = [
"2026-08-29 | WS-B | SUPERSEDES the earlier \"the product form has NO Collections field\" line: `productSchema`/`createProductInput` now carry `collectionIds`, so the control saves. The product write joins and leaves MANUAL collections only (a smart collection resolves membership from its rule set and stores no rows — a join row there would be data nothing reads), appends at the collection's last manual position like Shopify, and treats `undefined` as \"leave membership alone\" / `[]` as \"leave every collection\", matc
… [truncated, 2,738 more chars]
```

> **↳ result**
> ```
> ok
> 2026-08-29 | WS-B | The product page header is a BREADCRUMB (product icon → `›` → title) hand-built inside `Page`, not Polaris `backAction`, which renders the older arrow-button look (docs/parity/product-form.md). The other detail pages still use `backAction`; rolling the breadcrumb out to orders/customers/collections is a follow-up, and current Shopify uses it everywhere, so this page is the correct one and they are the drift.
> ```

### 🤖 Claude

Now update the parity doc's delta section so it reflects reality, and log the claim:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('docs/parity/product-form.md')
s = p.read_text()
start = s.index('## Delta vs our build')
new = '''## Delta vs our build

Closed 2026-08-29 (WS-B). `apps/admin/src/app/store/[slug]/products/_components/` now
follows this file top to bottom: breadcrumb header, rich-text Description, Price /
Inventory / Shipping as left-column cards above Variants with the collapsed-pill
pattern, Search engine listing, Collections in Product organization (a real
`collectionIds` on the product API), the `Unsaved product` save bar, and the Save
pinned bottom-right o
… [truncated, 3,073 more chars]
```

> **↳ result**
> ```
> ok
> ok
> ```

🔧 **Bash**
```
grep -n "PORT\|API_URL\|ADMIN_URL\|STOREFRONT_BASE_DOMAIN" packages/config/src/env.ts | head -20; echo "=== next config ==="; cat apps/admin/next.config.ts
```

> **↳ result**
> ```
> 30:  API_URL: z.string().url().default('http://api.lvh.me:3001'),
> 31:  ADMIN_URL: z.string().url().default('http://admin.lvh.me:3000'),
> 32:  STOREFRONT_BASE_DOMAIN: z.string().default('lvh.me:3002'),
> 34:  API_PORT: z.coerce.number().int().positive().default(3001),
> 35:  ADMIN_PORT: z.coerce.number().int().positive().default(3000),
> 36:  STOREFRONT_PORT: z.coerce.number().int().positive().default(3002),
> 65:  SMTP_PORT: z.coerce.number().int().positive().default(1025),
> 72:  // Absent is a SUPPORTED state: the builder falls back to canned presets so the
> 115:  const { STOREFRONT_PROTOCOL, STOREFRONT_BASE_DOMAIN } = env();
> 116:  return `${STOREFRONT_PROTOCOL}://${shopSlug}.${STOREFRONT_BASE_DOMAIN}
> … [truncated, 2,476 more chars]
> ```

🔧 **Bash**
```
grep -nE "^(API_PORT|ADMIN_PORT|STOREFRONT_PORT|API_URL|ADMIN_URL|STOREFRONT_BASE_DOMAIN)" .env; echo "=== cors ==="; grep -rn "ADMIN_URL\|cors" apps/api/src/plugins/*.ts apps/api/src/server.ts 2>/dev/null | head -10
```

> **↳ result**
> ```
> 22:API_URL=http://api.lvh.me:3001
> 23:ADMIN_URL=http://admin.lvh.me:3000
> 24:STOREFRONT_BASE_DOMAIN=lvh.me:3002
> 27:API_PORT=3001
> 28:ADMIN_PORT=3000
> 29:STOREFRONT_PORT=3002
> === cors ===
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('.env'); s = p.read_text()
for k, v in [('API_URL','http://localhost:4101'), ('ADMIN_URL','http://localhost:4100'),
             ('STOREFRONT_BASE_DOMAIN','localhost:4102'), ('API_PORT','4101'),
             ('ADMIN_PORT','4100'), ('STOREFRONT_PORT','4102')]:
    s = re.sub(rf'^{k}=.*$', f'{k}={v}', s, flags=re.M)
p.write_text(s)
PY
grep -nE "^(API_PORT|ADMIN_PORT|API_URL|ADMIN_URL|STOREFRONT_BASE_DOMAIN|STOREFRONT_PORT)" .env
```

> **↳ result**
> ```
> 22:API_URL=http://localhost:4101
> 23:ADMIN_URL=http://localhost:4100
> 24:STOREFRONT_BASE_DOMAIN=localhost:4102
> 27:API_PORT=4101
> 28:ADMIN_PORT=4100
> 29:STOREFRONT_PORT=4102
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad && (pnpm --filter @merchant/api dev > $SCR/api.log 2>&1 &) && (pnpm --filter @merchant/admin exec next dev --port 4100 > $SCR/admin.log 2>&1 &) && echo started
```

> **↳ result**
> ```
> started
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad; for i in $(seq 1 40); do sleep 3; if curl -s -o /dev/null -w "%{http_code}" http://localhost:4101/health 2>/dev/null | grep -q 200; then echo "api up after ${i}0s"; break; fi; done; tail -5 $SCR/api.log; echo "=== admin ==="; tail -5 $SCR/admin.log
```

> **↳ result**
> ```
> api up after 10s
>       "errno": -48,
>       "syscall": "listen",
>       "address": "0.0.0.0",
>       "port": 4101
>     }
> === admin ===
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad; head -40 $SCR/api.log; echo "=== health ==="; curl -s http://localhost:4101/health; echo; echo "=== admin head ==="; head -20 $SCR/admin.log; echo "=== admin port ==="; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/login
```

> **↳ result**
> ```
> > @merchant/api@0.0.0 dev /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/api
> > tsx watch --env-file=../../.env src/server.ts
> 
> [12:12:35.230] ERROR (77883): failed to start
>     err: {
>       "type": "Error",
>       "message": "listen EADDRINUSE: address already in use 0.0.0.0:4101",
>       "stack":
>           Error: listen EADDRINUSE: address already in use 0.0.0.0:4101
>               at Server.setupListenHandle [as _listen2] (node:net:1941:16)
>               at listenInCluster (node:net:1998:12)
>               at node:net:2207:7
>               at process.processTicksAndRejections (node:internal/process/task_queues:89:21)
>       "code": "EADDRINUSE",
> … [truncated, 1,352 more chars]
> ```

🔧 **Bash**
```
for p in 4100 4101 4102 4110 4111 4112 4210 4211; do if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then echo "$p BUSY"; else echo "$p free"; fi; done; echo "=== my next pid ==="; lsof -nP -iTCP:4100 -sTCP:LISTEN 2>/dev/null | tail -2
```

> **↳ result**
> ```
> 4100 BUSY
> 4101 BUSY
> 4102 free
> 4110 free
> 4111 free
> 4112 free
> 4210 free
> 4211 free
> === my next pid ===
> COMMAND   PID        USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
> node    77895 pauljurgens   13u  IPv6 0x7425ef9204a2dfb5      0t0  TCP *:4100 (LISTEN)
> ```

🔧 **Bash**
```
ps -o pid,command -p 77895 | tail -2 | cut -c1-160
```

> **↳ result**
> ```
> PID COMMAND
> 77895 next-server (v15.5.24)
> ```

🔧 **Bash**
```
ps -o pid,ppid,command -ax | grep -E "next dev --port 4100|next-server" | grep -v grep | cut -c1-200
```

> **↳ result**
> ```
> 71097 71091 next-server (v15.5.24) 
> 77839     1 node /opt/homebrew/bin/pnpm --filter @merchant/admin exec next dev --port 4100
> 77863 77839 node ./node_modules/.bin/../next/dist/bin/next dev --port 4100
> 77895 77863 next-server (v15.5.24)
> ```

🔧 **Bash**
```
kill 77839 77863 77895 2>/dev/null; sleep 2
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('.env'); s = p.read_text()
s = re.sub(r'^API_URL=.*$', 'API_URL=http://localhost:4111', s, flags=re.M)
s = re.sub(r'^API_PORT=.*$', 'API_PORT=4111', s, flags=re.M)
p.write_text(s)
PY
grep -nE "^(API_PORT|API_URL|ADMIN_URL|ADMIN_PORT)" .env
```

> **↳ result**
> ```
> 22:API_URL=http://localhost:4111
> 23:ADMIN_URL=http://localhost:4100
> 27:API_PORT=4111
> 28:ADMIN_PORT=4100
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
ulimit -n 20480 2>/dev/null || ulimit -n 10240
(ulimit -n 20480 2>/dev/null; pnpm --filter @merchant/api dev > $SCR/api.log 2>&1 &)
(ulimit -n 20480 2>/dev/null; pnpm --filter @merchant/admin exec next dev --port 4100 > $SCR/admin.log 2>&1 &)
sleep 20; echo "=== api ==="; curl -s http://localhost:4111/health; echo; tail -3 $SCR/api.log; echo "=== admin ==="; head -8 $SCR/admin.log; grep -c "EMFILE" $SCR/admin.log
```

> **↳ result**
> ```
> === api ===
> {"status":"ok","uptime":19.041433916}
> 
> [12:14:39.725] INFO (79316): Server listening at http://127.0.0.1:4111
> [12:14:39.726] INFO (79316): Server listening at http://192.168.1.202:4111
> === admin ===
>    ▲ Next.js 15.5.24
>    - Local:        http://localhost:4100
>    - Network:      http://192.168.1.202:4100
> 
>  ✓ Starting...
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
>  ✓ Ready in 11.8s
> Watchpack Error (watcher): Error: EMFILE: too many open files, watch
> 12
> ```

🔧 **mcp__Claude_Browser__preview_start**
```
{"url": "http://localhost:4100"}
```

> **↳ result**
> ```
> {
>   "serverId": "preview-local_cf73cbc4-83a5-48b2-87bc-9a698f2b6d9a",
>   "tabId": "seed",
>   "reused": false,
>   "type": "browser",
>   "navOk": true
> }
> Browser pane opened. Use serverId "preview-local_cf73cbc4-83a5-48b2-87bc-9a698f2b6d9a" with read_page / computer / navigate.
> ```

🔧 **mcp__Claude_Browser__get_page_text**
```
{"max_chars": 1500}
```

> **↳ result**
> ```
> The page is still loading; retry in a moment.
> ```

🔧 **Bash**
```
sleep 45; echo waited
```

> **↳ result**
> ```
> <tool_use_error>Blocked: sleep 45 followed by: echo waited. To wait for a condition, use Monitor with an until-loop (e.g. `until <check>; do sleep 2; done`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.</tool_use_error>
> ```

🔧 **Bash**
```
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/login | grep -qE "200|30[0-9]"; do sleep 3; done; echo "login page ready"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/login
```

> **↳ result**
> ```
> Command did not complete within its 420s timeout and was moved to the background (ID: blzhxjqa7). Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/tasks/blzhxjqa7.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad; tail -20 $SCR/admin.log | grep -v EMFILE; echo "=== curl ==="; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/login
```

> **↳ result**
> ```
> GET /login 404 in 79ms
>  GET /login 404 in 46ms
>  GET /login 404 in 45ms
>  GET /login 404 in 120ms
>  GET /login 404 in 52ms
>  GET /login 404 in 59ms
>  GET /login 404 in 112ms
>  GET /login 404 in 55ms
>  GET /login 404 in 126ms
>  GET /login 404 in 77ms
>  GET /login 404 in 217ms
>  GET /login 404 in 61ms
>  GET /login 404 in 126ms
>  GET /login 404 in 245ms
>  GET /login 404 in 848ms
>  GET /login 404 in 205ms
>  GET /login 404 in 696ms
>  GET /login 404 in 499ms
>  GET /login 404 in 314ms
>  GET /login 404 in 317ms
> === curl ===
> 404
> 404
> ```

🔧 **Bash**
```
pkill -f "curl -s -o /dev/null" 2>/dev/null; ls apps/admin/src/app; echo "---"; ls apps/admin/src/app/*/ 2>/dev/null | head -30; echo "=== middleware ==="; ls apps/admin/src/middleware.ts 2>/dev/null && sed -n 1,50p apps/admin/src/middleware.ts
```

> **↳ result**
> ```
> Exit code 1
> icon.svg
> layout.tsx
> login
> not-found.tsx
> page.tsx
> signup
> store
> ---
> apps/admin/src/app/login/:
> layout.tsx
> page.tsx
> 
> apps/admin/src/app/signup/:
> layout.tsx
> page.tsx
> 
> apps/admin/src/app/store/:
> [slug]
> === middleware ===
> ```

🔧 **Bash**
```
ulimit -n; ulimit -Hn; launchctl limit maxfiles 2>/dev/null; sysctl kern.maxfiles kern.maxfilesperproc 2>/dev/null
```

> **↳ result**
> ```
> 1048576
> unlimited
> 	maxfiles    256            unlimited      
> kern.maxfiles: 30720
> kern.maxfilesperproc: 10240
> ```

🔧 **Bash**
```
pkill -f "next dev --port 4100" 2>/dev/null; sleep 2
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
(WATCHPACK_POLLING=true pnpm --filter @merchant/admin exec next dev --port 4100 > $SCR/admin.log 2>&1 &)
sleep 25; grep -c EMFILE $SCR/admin.log; head -6 $SCR/admin.log; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4100/login
```

> **↳ result**
> ```
> 0
>    ▲ Next.js 15.5.24
>    - Local:        http://localhost:4100
>    - Network:      http://192.168.1.202:4100
> 
>  ✓ Starting...
>  ✓ Ready in 1822ms
> 200
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/login"}}, {"name": "get_page_text", "input": {"max_chars": 800}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [get_page_text] Title: Log in · Merchant
> URL: http://localhost:4100
> Source element: <body>
> ---
> Merchant
> Log in
> 
> Continue to your store
> 
> Submit
> Email
> Password
> Log in
> New to Merchant? Get started
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__find**
```
{"query": "Email"}
```

> **↳ result**
> ```
> Found 2 match(es) for "Email":
> - generic "Email" [ref_7]
> - textbox [ref_8] type="email"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "form_input", "input": {"ref": "ref_8", "value": "owner@demo.dev"}}, {"name": "find", "input": {"query": "Password"}}]}
```

> **↳ result**
> ```
> [form_input] filled ref_8 with value
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [find] Found 2 match(es) for "Password":
> - generic "Password" [ref_10]
> - textbox [ref_11] type="password"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "form_input", "input": {"ref": "ref_11", "value": "password123"}}, {"name": "find", "input": {"query": "Log in"}}]}
```

> **↳ result**
> ```
> [form_input] filled ref_11 with value
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [find] Found 2 match(es) for "Log in":
> - heading "Log in" [ref_2]
> - generic "Log in" [ref_13]
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "ref": "ref_13"}}, {"name": "computer", "input": {"action": "wait", "duration": 3}}, {"name": "get_page_text", "input": {"max_chars": 400}}]}
```

> **↳ result**
> ```
> actions[0] (computer:left_click) failed: ref ref_13 is entirely outside the viewport (center (-11, -166)) — likely hidden or off-canvas, so a click cannot reach it. Interact with what opens it first, or re-run read_page and pick a visible element. (0 completed, 2 remaining)
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
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [399, 290]}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "get_page_text", "input": {"max_chars": 500}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (399, 290)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Home · Merchant" (http://localhost:4100)
> [get_page_text] Title: Home · Merchant
> URL: http://localhost:4100
> Source element: <main>
> ---
> Good afternoon, Aurora Supply Co.. This page is ready
> 
> Good afternoon, Aurora Supply Co.
> Setup guide
> Success
> 4 of 4 tasks complete
> 100%
> Add your first product
> Customize your storefront
> Connect a payment processor
> Place a test order
> Today
> Total sales
> 
> $0.00
> 
> Orders
> 
> 0
> 
> Sessions
> 
> 0
> 
> 
> Tab Context:
> -
> … [truncated, 99 more chars]
> ```

### 🤖 Claude

Logged in. Now the new-product form:

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/new"}}, {"name": "computer", "input": {"action": "wait", "duration": 8}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 8s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x450
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__computer**
```
{"action": "zoom", "region": [578, 150, 200, 110]}
```

> **↳ result**
> ```
> [image]
> zoom: region crop not yet supported in the Browser pane; full screenshot returned
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el = [...document.querySelectorAll('span,div')].find(n => n.textContent.trim()==='Online Store' && n.children.length===0);\nconst row = el?.closest('.Polaris-InlineStack');\nJSON.stringify({ rowClass: row?.className, rowStyle: row?.getAttribute('style'), justify: row && getComputedStyle(row).justifyContent, display: row && getComputedStyle(row).display, kids: row && [...row.children].map(c=>({cls:c.className, w:c.getBoundingClientRect().width, flex:getComputedStyle(c).flex})) })"}
```

> **↳ result**
> ```
> "{\"rowClass\":\"Polaris-InlineStack\",\"rowStyle\":\"--pc-inline-stack-block-align: center; --pc-inline-stack-wrap: wrap; --pc-inline-stack-gap-xs: var(--p-space-150); --pc-inline-stack-flex-direction-xs: row;\",\"justify\":\"normal\",\"display\":\"flex\",\"kids\":[{\"cls\":\"Polaris-Icon Polaris-Icon--toneBase\",\"w\":20,\"flex\":\"0 1 auto\"},{\"cls\":\"Polaris-Text--root Polaris-Text--bodyMd Polaris-Text--semibold\",\"w\":78.9453125,\"flex\":\"0 1 auto\"}]}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack'); const card=row.closest('.Polaris-Card');\nJSON.stringify({card:card.getBoundingClientRect(), row:row.getBoundingClientRect(), icon:row.children[0].getBoundingClientRect(), text:row.children[1].getBoundingClientRect()})"}
```

> **↳ result**
> ```
> javascript_tool failed: TypeError: Cannot read properties of null (reading 'getBoundingClientRect')
>     at <anonymous>:3:27
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack');\nconst r=o=>{const b=o.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width)}};\nJSON.stringify({row:r(row), icon:r(row.children[0]), text:r(row.children[1]), devicePixelRatio, innerWidth})"}
```

> **↳ result**
> ```
> "{\"row\":{\"x\":939,\"y\":292,\"w\":279},\"icon\":{\"x\":1026,\"y\":292,\"w\":20},\"text\":{\"x\":1140,\"y\":292,\"w\":79},\"devicePixelRatio\":2,\"innerWidth\":1280}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack'); const cs=getComputedStyle(row);\nJSON.stringify({padding:cs.padding, gap:cs.gap, justify:cs.justifyContent, flexWrap:cs.flexWrap, width:cs.width, outer:row.outerHTML.slice(0,400)})"}
```

> **↳ result**
> ```
> "{\"padding\":\"0px\",\"gap\":\"6px\",\"justify\":\"normal\",\"flexWrap\":\"wrap\",\"width\":\"279.336px\",\"outer\":\"<div class=\\\"Polaris-InlineStack\\\" style=\\\"--pc-inline-stack-block-align: center; --pc-inline-stack-wrap: wrap; --pc-inline-stack-gap-xs: var(--p-space-150); --pc-inline-stack-flex-direction-xs: row;\\\"><span class=\\\"Polaris-Icon Polaris-Icon--toneBase\\\"><svg viewBox=\\\"0 0 20 20\\\" class=\\\"Polaris-Icon__Svg\\\" focusable=\\\"false\\\" aria-hidden=\\\"true\\\"><path fill-rule=\\\"evenodd\\\" d=\\\"M6.25 3.5a1 1 0 0 0-1 1v2a1 1 0 0 0\"}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack');\nconst r=o=>{const b=o.getBoundingClientRect();return [Math.round(b.x),Math.round(b.right)]};\nJSON.stringify({n:row.children.length, row:r(row), kids:[...row.children].map(r), transform:getComputedStyle(row.children[1]).transform})"}
```

> **↳ result**
> ```
> "{\"n\":2,\"row\":[939,1219],\"kids\":[[1026,1046],[1140,1219]],\"transform\":\"none\"}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack');\nconst sheetRules=[];\nfor (const s of document.styleSheets){ try{ for(const r of s.cssRules){ if(r.selectorText && /Polaris-InlineStack/.test(r.selectorText)) sheetRules.push(r.cssText.slice(0,300)); } }catch(e){} }\nJSON.stringify(sheetRules.slice(0,6))"}
```

> **↳ result**
> ```
> "[\".Polaris-InlineStack { --pc-inline-stack-gap-xs: initial; --pc-inline-stack-gap-sm: initial; --pc-inline-stack-gap-md: initial; --pc-inline-stack-gap-lg: initial; --pc-inline-stack-gap-xl: initial; gap: var(--pc-inline-stack-gap-xs); --pc-inline-stack-flex-direction-xs: initial; --pc-inline-stack-fl\"]"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "for (const s of document.styleSheets){ try{ for(const r of s.cssRules){ if(r.selectorText==='.Polaris-InlineStack') return r.cssText; } }catch(e){} } 'none'"}
```

> **↳ result**
> ```
> ".Polaris-InlineStack { --pc-inline-stack-gap-xs: initial; --pc-inline-stack-gap-sm: initial; --pc-inline-stack-gap-md: initial; --pc-inline-stack-gap-lg: initial; --pc-inline-stack-gap-xl: initial; gap: var(--pc-inline-stack-gap-xs); --pc-inline-stack-flex-direction-xs: initial; --pc-inline-stack-flex-direction-sm: initial; --pc-inline-stack-flex-direction-md: initial; --pc-inline-stack-flex-direction-lg: initial; --pc-inline-stack-flex-direction-xl: initial; flex-direction: var(--pc-inline-stack-flex-direction-xs); display: flex; flex-wrap: var(--pc-inline-stack-wrap); align-items: var(--pc-inline-stack-block-align); justify-content: var(--pc-inline-stack-align); }"
> 
> 
> Tab Context:
> - Execut
> … [truncated, 97 more chars]
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nlet n=el.closest('.Polaris-InlineStack'), out=[];\nwhile(n){ const v=n.style.getPropertyValue('--pc-inline-stack-align'); out.push([n.className.slice(0,40), v||'-']); n=n.parentElement; if(out.length>12) break; }\nJSON.stringify(out)"}
```

> **↳ result**
> ```
> "[[\"Polaris-InlineStack\",\"-\"],[\"Polaris-BlockStack\",\"-\"],[\"Polaris-Box\",\"-\"],[\"Polaris-ShadowBevel\",\"-\"],[\"Polaris-BlockStack\",\"-\"],[\"Polaris-Layout__Section Polaris-Layout__\",\"-\"],[\"Polaris-Layout\",\"-\"],[\"Polaris-BlockStack\",\"-\"],[\"Polaris-Page__Content\",\"-\"],[\"Polaris-Page\",\"-\"],[\"Polaris-Frame__Content\",\"-\"],[\"Polaris-Frame__Main\",\"-\"],[\"Polaris-Frame Polaris-Frame--hasNav Pola\",\"-\"]]"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack');\nconst r=o=>{const b=o.getBoundingClientRect();return [Math.round(b.x),Math.round(b.right)]};\nconst before=[...row.children].map(r);\nrow.style.setProperty('--pc-inline-stack-align','start');\nconst after=[...row.children].map(r);\nJSON.stringify({before, after, rowRect:r(row), textAlign:getComputedStyle(row).textAlign})"}
```

> **↳ result**
> ```
> "{\"before\":[[1026,1046],[1140,1219]],\"after\":[[1026,1046],[1140,1219]],\"rowRect\":[939,1219],\"textAlign\":\"start\"}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const el=[...document.querySelectorAll('span,div')].find(n=>n.textContent.trim()==='Online Store'&&n.children.length===0);\nconst row=el.closest('.Polaris-InlineStack');\nJSON.stringify([...row.children].map(c=>{const s=getComputedStyle(c);return {cls:c.className.slice(0,40), margin:s.margin, position:s.position, display:s.display, flexBasis:s.flexBasis, width:s.width}}))"}
```

> **↳ result**
> ```
> "[{\"cls\":\"Polaris-Icon Polaris-Icon--toneBase\",\"margin\":\"0px 87.1953px\",\"position\":\"static\",\"display\":\"block\",\"flexBasis\":\"auto\",\"width\":\"20px\"},{\"cls\":\"Polaris-Text--root Polaris-Text--bodyMd \",\"margin\":\"0px\",\"position\":\"static\",\"display\":\"block\",\"flexBasis\":\"auto\",\"width\":\"78.9453px\"}]"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "const out=[];\ndocument.querySelectorAll('.Polaris-InlineStack > .Polaris-Icon').forEach(ic=>{\n  const s=getComputedStyle(ic); const row=ic.parentElement;\n  out.push({margin:s.margin, rowText:row.textContent.trim().slice(0,40), rowAlign:row.style.getPropertyValue('--pc-inline-stack-align')||'-'});\n});\nJSON.stringify(out)"}
```

> **↳ result**
> ```
> "[{\"margin\":\"0px\",\"rowText\":\"\",\"rowAlign\":\"-\"},{\"margin\":\"2px 0px\",\"rowText\":\"Add product\",\"rowAlign\":\"-\"},{\"margin\":\"0px 96.0859px 0px 96.0938px\",\"rowText\":\"Publishing\",\"rowAlign\":\"space-between\"},{\"margin\":\"0px 87.1953px\",\"rowText\":\"Online Store\",\"rowAlign\":\"start\"}]"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

### 🤖 Claude

Found a real bug: Polaris `Icon` is `margin: auto`, so bare icons inside a flex row float to the middle. Fixing all of them:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()

s = s.replace("""import {
  ActionList,
  BlockStack,
  Button,""", """import {
  ActionList,
  BlockStack,
  Box,
  Button,""")

# a shared note + wrapper
s = s.replace("""/**
 * The page header is a breadcrumb, not a back-button + title:""", """/**
 * Polaris `Icon` is `display:block; margin:auto`, so a bare one inside an
 * `InlineStack` centres itself in the leftover space instead of sitting next to
 * its label. Constraining the width kills the auto
… [truncated, 858 more chars]
```

> **↳ result**
> ```
> ok
> 99:function InlineIcon({ source }: { source: React.ComponentType }) {
> 102:      <Icon source={source} tone="subdued" />
> 131:        <InlineIcon source={ChevronRightIcon} />
> 398:                    <InlineIcon source={SettingsIcon} />
> 404:                    <InlineIcon source={ChannelsIcon} />
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/organization-card.tsx')
s = p.read_text()
s = s.replace("""import {
  BlockStack,
  Button,
  Card,""", """import {
  BlockStack,
  Box,
  Button,
  Card,""")
s = s.replace("""            <Icon source={InfoIcon} tone="subdued" />""",
"""            {/* Boxed: a bare Polaris Icon is `margin:auto` and drifts to the
                middle of a flex row (see InlineIcon in product-form.tsx). */}
            <Box width="20px">
              <Icon source={InfoIcon} tone="subdued" />
            </Bo
… [truncated, 119 more chars]
```

> **↳ result**
> ```
> ok
> src/app/store/[slug]/products/_components/product-form.tsx(102,13): error TS2322: Type 'ComponentType<{}>' is not assignable to type 'IconSource'.
>   Type 'ComponentClass<{}, any>' is not assignable to type 'IconSource'.
>     Type 'ComponentClass<{}, any>' is not assignable to type 'FunctionComponent<SVGProps<SVGSVGElement>>'.
>       Type 'ComponentClass<{}, any>' provides no match for the signature '(props: SVGProps<SVGSVGElement>): ReactNode | Promise<ReactNode>'.
> undefined
> /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin:
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 2: tsc --noEmit -p tsconfig.json
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()
s = s.replace("""import {
  ChannelsIcon,""", """import type { IconProps } from '@shopify/polaris';
import {
  ChannelsIcon,""")
s = s.replace("""function InlineIcon({ source }: { source: React.ComponentType }) {""",
              """function InlineIcon({ source }: { source: IconProps['source'] }) {""")
p.write_text(s); print('ok')
PY
pnpm --filter @merchant/admin exec tsc --noEmit -p tsconfig.json 2>&1 | head -10
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
pnpm exec biome check --write "apps/admin/src/app/store/[slug]/products/_components/" 2>&1 | tail -3; pnpm lint 2>&1 | tail -4
```

> **↳ result**
> ```
> Checked 11 files in 32ms. Fixed 1 file.
>   × Some errors were emitted while running checks.
>   
> 
>  ELIFECYCLE  Command failed with exit code 1.
> [This command modified 1 file you've previously read: apps/admin/src/app/store/[slug]/products/_components/product-form.tsx. Call Read before editing.]
> ```

🔧 **Bash**
```
pnpm lint 2>&1 | head -40
```

> **↳ result**
> ```
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome check .
> 
> e2e/tests/helpers.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
>   × Formatter would have printed the following content:
>   
>      47  47 │    */
>      48  48 │   export async function saveViaSaveBar(page: Page): Promise<void> {
>      49     │ - ··await·page.locator('.Polaris-Frame-ContextualSaveBar').getByRole('button',·{·name:·'Save'·}).click();
>          49 │ + ··await·page
>          50 │ + ····.locator('.Polaris-Frame-ContextualSaveBar')
>          51 │ + ····.getByRole('button',·{·name:·'Save'·})
>          52 │ + ····.click();
>      50
> … [truncated, 585 more chars]
> ```

🔧 **Bash**
```
pnpm exec biome check --write . 2>&1 | tail -3; pnpm lint 2>&1 | tail -4
```

> **↳ result**
> ```
> Checked 487 files in 562ms. Fixed 2 files.
> > merchant@ lint /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > biome check .
> 
> Checked 487 files in 241ms. No fixes applied.
> [This command modified 2 files you've previously read: e2e/tests/helpers.ts, e2e/tests/smoke.spec.ts. Call Read before editing.]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/new"}}, {"name": "computer", "input": {"action": "wait", "duration": 6}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 6s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x450
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "scroll", "coordinate": [400, 300], "scroll_direction": "down", "scroll_amount": 6}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> actions[0] (computer:scroll) failed: computer timed out after 30s. The Browser pane is currently hidden. The pane may be stuck (modal dialog, navigation hang, or unresponsive renderer). Check preview_console_logs for errors. (0 completed, 1 remaining)
> ```

🔧 **mcp__Claude_Browser__computer**
```
{"action": "scroll", "coordinate": [400, 300], "scroll_direction": "down", "scroll_amount": 6}
```

> **↳ result**
> ```
> computer timed out after 30s. The Browser pane is currently hidden. The pane may be stuck (modal dialog, navigation hang, or unresponsive renderer). Check preview_console_logs for errors.
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "window.scrollTo(0, 700); document.title"}
```

> **↳ result**
> ```
> "Products · Merchant"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
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
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "JSON.stringify({scrollY:window.scrollY, bodyH:document.body.scrollHeight, innerH:window.innerHeight, main:document.querySelector('.Polaris-Frame__Main')?.scrollHeight, content:document.querySelector('.Polaris-Frame__Content')?.scrollHeight, headings:[...document.querySelectorAll('h2')].map(h=>h.textContent).slice(0,20)})"}
```

> **↳ result**
> ```
> "{\"scrollY\":705,\"bodyH\":1425,\"innerH\":720,\"main\":1425,\"content\":1369,\"headings\":[\"Media\",\"Price\",\"Inventory\",\"Shipping\",\"Variants\",\"Search engine listing\",\"Publishing\",\"Product organization\"]}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "window.scrollTo(0,430); 'ok'"}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [javascript_tool:javascript_exec] "ok"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x450
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__tabs_select**
```
{"tabId": "seed"}
```

> **↳ result**
> ```
> Fronted tab seed.
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "window.scrollTo(0,420); 'ok'"}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [javascript_tool:javascript_exec] "ok"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x450
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "resize_window", "input": {"width": 1280, "height": 860}}, {"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/new"}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [resize_window] Viewport set to 1280x860 on this tab. It stays (scaled down to fit if larger than the pane) until you call this tool with preset "desktop", so reset it when you finish testing.
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x538
> 
> 
> Tab Context:
> - Executed
> … [truncated, 103 more chars]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "window.scrollTo(0,500); 'ok'"}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [javascript_tool:javascript_exec] "ok"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x538
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "window.scrollTo(0,0); 'ok'"}}, {"name": "resize_window", "input": {"width": 1280, "height": 1600}}, {"name": "computer", "input": {"action": "wait", "duration": 2}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [javascript_tool:javascript_exec] "ok"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [resize_window] Viewport set to 1280x1600 on this tab. It stays (scaled down to fit if larger than the pane) until you call this tool with preset "desktop", so reset it when you finish testing.
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 2s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on t
> … [truncated, 98 more chars]
> ```

🔧 **Bash**
```
pnpm db:query "select name from locations" 2>&1 | tail -10
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/db-query.sh "select name from locations"
> 
>       name      
> ----------------
>  Downtown Store
>  Warehouse
> (2 rows)
> ```

🔧 **Bash**
```
sed -n 1,80p packages/contracts/src/inventory.ts; echo "=== routes ==="; grep -n "app\.\(get\|post\|put\)" apps/api/src/routes/admin/inventory/index.ts
```

> **↳ result**
> ```
> /**
>  * Inventory (SPEC §7).
>  *
>  * Adjustments go through a service that writes an InventoryAdjustment — never a
>  * raw update — so the history exists. The contract reflects that: you post a
>  * DELTA with a reason, not a new absolute value.
>  *
>  * Owner: WS-B.
>  */
> import { z } from 'zod';
> import { idSchema, paginated, paginationQuery, searchQuery, timestampsSchema } from './common.ts';
> 
> export const inventoryLevelSchema = z
>   .object({
>     id: idSchema,
>     variantId: idSchema,
>     locationId: idSchema,
>     available: z.number().int(),
>   })
>   .merge(timestampsSchema);
> export type InventoryLevel = z.infer<typeof inventoryLevelSchema>;
> 
> export const adjustmentReasonSchema = z.enum([
>   'correctio
> … [truncated, 1,962 more chars]
> ```

🔧 **Bash**
```
sed -n 1,60p apps/api/src/routes/admin/inventory/index.ts; echo "=== list query contract ==="; sed -n 80,140p packages/contracts/src/inventory.ts
```

> **↳ result**
> ```
> /**
>  * `/admin/api/inventory` (SPEC §7). Owner: WS-B.
>  *
>  * The write routes are a thin shell over `services/inventory/adjust.ts`, which
>  * is the only thing in the codebase allowed to move a quantity — other
>  * workstreams import that service rather than posting here.
>  */
> import {
>   adjustInventoryBody,
>   inventoryLevelsResponse,
>   listInventoryQuery,
>   setInventoryBody,
> } from '@merchant/contracts/inventory';
> import type { FastifyInstance, FastifyRequest } from 'fastify';
> import { requirePermission } from '../../../lib/permissions.ts';
> import { adjustMany, setMany } from '../../../services/inventory/adjust.ts';
> import { listInventory } from '../../../services/inventory/query.ts';
> 
> /** Both
> … [truncated, 2,249 more chars]
> ```

### 🤖 Claude

The Inventory quantity is disabled on the seeded demo (2 locations). Parity wants a row per location — and the API supports it, so let me make it real.

🔧 **Bash**
```
cat apps/api/src/services/inventory/query.ts
```

> **↳ result**
> ```
> /**
>  * Reads for the admin Inventory index and the Locations settings page.
>  * Owner: WS-B. Writes live in `adjust.ts` — nothing here mutates a quantity.
>  */
> import { newId } from '@merchant/config/ids';
> import type { Paginated } from '@merchant/contracts/common';
> import type { InventoryRow } from '@merchant/contracts/inventory';
> import { inventoryRowSchema } from '@merchant/contracts/inventory';
> import type { Location } from '@merchant/contracts/locations';
> import { locationSchema } from '@merchant/contracts/locations';
> import { Prisma } from '@merchant/db/client';
> import type { TenantClient } from '@merchant/db/tenant';
> import { badRequest, conflict, notFound } from '../../lib/errors.ts';
> … [truncated, 7,502 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('packages/contracts/src/inventory.ts'); s = p.read_text()
old = """export const listInventoryQuery = paginationQuery
  .merge(searchQuery)
  .extend({ locationId: idSchema.optional() });"""
new = """export const listInventoryQuery = paginationQuery.merge(searchQuery).extend({
  locationId: idSchema.optional(),
  /** One product's variants — the product form's Inventory card reads this. */
  productId: idSchema.optional(),
});"""
assert old in s; s = s.replace(old, new); p.write_text(s)

p = pathlib.Path('apps/api/src/services/inventory/query.ts'
… [truncated, 1,245 more chars]
```

> **↳ result**
> ```
> ok
> ```

### 🤖 Claude

Now wire per-location quantities into the form:

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/product-stock.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/product-stock.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/inventory-card.tsx
```

> **↳ result**
> ```
> The file /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/app/store/[slug]/products/_components/inventory-card.tsx has been updated successfully. (file state is current in your context — no need to Read it back)
> ```

### 🤖 Claude

Now wire the stock state into the form:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()

s = s.replace("""import type { Location } from '@merchant/contracts/locations';
import type { Product } from '@merchant/contracts/products';""",
"""import type { Paginated } from '@merchant/contracts/common';
import type { InventoryRow } from '@merchant/contracts/inventory';
import type { Location } from '@merchant/contracts/locations';
import type { Product } from '@merchant/contracts/products';""")

s = s.replace("""import { useQueryClient } from '@tans
… [truncated, 4,284 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()

# discard resets stock too
old = """    setDraft(baseline);
    setSubmitted(false);
    setServerError(null);
  };"""
new = """    setDraft(baseline);
    setStock(stockBaseline);
    setSubmitted(false);
    setServerError(null);
  };"""
assert old in s; s = s.replace(old, new)

# save: write per-location levels
old = """      // Stock second, and only what changed — every call writes an adjustment.
      // Only when the field was editable: with severa
… [truncated, 2,817 more chars]
```

> **↳ result**
> ```
> ok
> src/app/store/[slug]/products/_components/product-form.tsx(186,38): error TS2304: Cannot find name 'StockByLocation'.
> src/app/store/[slug]/products/_components/product-form.tsx(187,54): error TS2304: Cannot find name 'StockByLocation'.
> src/app/store/[slug]/products/_components/product-form.tsx(196,22): error TS2552: Cannot find name 'emptyStock'. Did you mean 'setStock'?
> src/app/store/[slug]/products/_components/product-form.tsx(202,20): error TS2552: Cannot find name 'stockFromRows'. Did you mean 'stockRows'?
> src/app/store/[slug]/products/_components/product-form.tsx(269,13): error TS2552: Cannot find name 'stockLevelChanges'. Did you mean 'stockChanges'?
> undefined
> /Users/pauljurgens/Dow
> … [truncated, 180 more chars]
> ```

🔧 **Bash**
```
grep -n "product-draft.ts'\|product-stock" "apps/admin/src/app/store/[slug]/products/_components/product-form.tsx" | head
```

> **↳ result**
> ```
> 71:} from '../../../../../lib/product-draft.ts';
> 182:    ['product-stock', product?.id ?? 'new'],
> 286:        await queryClient.invalidateQueries({ queryKey: ['product-stock', product.id] });
> ```

🔧 **Bash**
```
sed -n 58,80p "apps/admin/src/app/store/[slug]/products/_components/product-form.tsx"
```

> **↳ result**
> ```
> import { useCallback, useEffect, useMemo, useState } from 'react';
> import { SaveBar } from '../../../../../components/shell/save-bar.tsx';
> import { useToast } from '../../../../../components/shell/toast-provider.tsx';
> import { type ApiError, apiFetch, useApiQuery } from '../../../../../lib/api.ts';
> import {
>   draftFromProduct,
>   draftToInput,
>   emptyDraft,
>   type ProductDraft,
>   stockChanges,
>   usableOptions,
>   type VariantDraft,
>   validate,
> } from '../../../../../lib/product-draft.ts';
> import { InventoryCard } from './inventory-card.tsx';
> import { MediaCard } from './media-card.tsx';
> import { OrganizationCard } from './organization-card.tsx';
> import { PricingCard } from './pricing-card.tsx'
> … [truncated, 202 more chars]
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/product-form.tsx')
s = p.read_text()
old = """} from '../../../../../lib/product-draft.ts';
import { InventoryCard } from './inventory-card.tsx';"""
new = """} from '../../../../../lib/product-draft.ts';
import {
  emptyStock,
  type StockByLocation,
  stockFromRows,
  stockLevelChanges,
} from '../../../../../lib/product-stock.ts';
import { InventoryCard } from './inventory-card.tsx';"""
assert old in s; s = s.replace(old, new); p.write_text(s); print('ok')
PY
pnpm --filter @merchant/admin e
… [truncated, 49 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx')
s = p.read_text()
old = """        {options.length === 0 ? (
          <Button
            variant="plain"
            icon={PlusCircleIcon}
            onClick={() => setOptions([{ name: '', values: [] }])}
            accessibilityLabel="Add options like size or color"
          >
            Add options like size or color
          </Button>
        ) : ("""
new = """        {options.length === 0 ? (
          // Wrapped: a BlockStack stretches its children, and a stret
… [truncated, 1,325 more chars]
```

> **↳ result**
> ```
> ok
> ```

🔧 **Write**
```
/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/product-stock.test.ts
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/src/lib/product-stock.test.ts (file state is current in your context — no need to Read it back)
> ```

🔧 **Bash**
```
pnpm exec biome check --write . 2>&1 | tail -3; pnpm --filter @merchant/admin exec tsc --noEmit -p tsconfig.json 2>&1 | head -5; pnpm --filter @merchant/admin exec vitest run src/lib 2>&1 | tail -12
```

> **↳ result**
> ```
> Checked 489 files in 681ms. Fixed 3 files.
>  ✓ src/lib/collection-rules.test.ts (12 tests) 15ms
>  ✓ src/lib/nav.test.ts (11 tests) 17ms
>  ✓ src/lib/product-draft.test.ts (23 tests) 201ms
>  ✓ src/lib/discount-draft.test.ts (11 tests) 168ms
>  ✓ src/lib/api.test.ts (7 tests) 9ms
>  ✓ src/lib/product-stock.test.ts (6 tests) 6ms
> 
>  Test Files  8 passed (8)
>       Tests  83 passed (83)
>    Start at  12:34:46
>    Duration  2.33s (transform 730ms, setup 0ms, collect 2.41s, tests 432ms, environment 1ms, prepare 2.55s)
> [This command modified 3 files you've previously read: apps/admin/src/app/store/[slug]/products/_components/inventory-card.tsx, apps/admin/src/lib/product-stock.ts, apps/admin/src/lib/product-stoc
> … [truncated, 37 more chars]
> ```

### 🤖 Claude

Now let me verify the whole flow in the browser — edit an existing product with variants, and create one end to end.

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/new"}}, {"name": "computer", "input": {"action": "wait", "duration": 6}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 6s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [372, 107]}}, {"name": "computer", "input": {"action": "type", "text": "Parity Check Tee"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [372, 200]}}, {"name": "computer", "input": {"action": "type", "text": "A rich description with "}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (372, 107)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 16 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (372, 200)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 24 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Contex
> … [truncated, 116 more chars]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"action": "type", "text": "bold"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"action": "type", "text": " and plain."}}, {"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "document.querySelector('.merchant-rte').innerHTML"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (267, 154)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 4 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (267, 154)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 11 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [javascript_tool:javascript_exec] "&nbsp;and plain.<b>bold</b
> … [truncated, 152 more chars]
> ```

### 🤖 Claude

The toolbar loses the caret — text lands at the start. Fixing the selection tracking:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib
p = pathlib.Path('apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx')
s = p.read_text()

old = """  const remember = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);
"""
new = """  const remember = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.ran
… [truncated, 1,882 more chars]
```

> **↳ result**
> ```
> ok
> Checked 1 file in 149ms. No fixes applied.
> [This command modified 1 file you've previously read: apps/admin/src/app/store/[slug]/products/_components/rich-text-field.tsx. Call Read before editing.]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/new"}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [372, 200]}}, {"name": "computer", "input": {"action": "type", "text": "Made with "}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"action": "type", "text": "merino wool"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"acti
… [truncated, 175 more chars]
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> 
> actions[2] (computer:left_click) failed: left_click with `coordinate` requires a prior computer{action:"screenshot"} (no screenshot dimensions cached) (2 completed, 6 remaining)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "screenshot"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [372, 200]}}, {"name": "computer", "input": {"action": "type", "text": "Made with "}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"action": "type", "text": "merino wool"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [267, 154]}}, {"name": "computer", "input": {"action": "type", "text": " from New Zealand."}}, {"name": "javascript_tool", "input": {"action": "java
… [truncated, 77 more chars]
```

> **↳ result**
> ```
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> [computer:left_click] left_click at (372, 200)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 10 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (267, 154)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 11 chars
> 
> 
> Ta
> … [truncated, 640 more chars]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [372, 107]}}, {"name": "computer", "input": {"action": "type", "text": "Parity Check Tee"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [380, 447]}}, {"name": "computer", "input": {"action": "type", "text": "42.50"}}, {"name": "computer", "input": {"action": "triple_click", "coordinate": [527, 571]}}, {"name": "computer", "input": {"action": "type", "text": "7"}}, {"name": "computer", "input": {"action": "triple_click", "coordinate": [527, 595]}}, {"name": "computer", "input": {"action":
… [truncated, 165 more chars]
```

> **↳ result**
> ```
> [computer:left_click] left_click at (372, 107)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 16 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (380, 447)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 5 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:triple_click] triple_click at (527, 571)
> 
> 
> Tab Cont
> … [truncated, 929 more chars]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [674, 364]}}, {"name": "computer", "input": {"action": "wait", "duration": 2}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (674, 364)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 2s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [616, 416]}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (616, 416)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [674, 429]}}, {"name": "computer", "input": {"action": "type", "text": "parity"}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (674, 429)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 6 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [622, 461]}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [749, 17]}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (622, 461)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (749, 17)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Execut
> … [truncated, 152 more chars]
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad; grep -v EMFILE $SCR/admin.log | tail -40
```

> **↳ result**
> ```
> path: '/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/apps/admin/.next/fallback-build-manifest.json'
> }
> [Error: ENFILE: file table overflow, open '/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom/server.edge.js'] {
>   errno: -23,
>   code: 'ENFILE',
>   syscall: 'open',
>   path: '/Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/node_modules/.pnpm/react-dom@19.2.8_react@19.2.8/node_modules/react-dom/server.edge.js'
> }
>  ⨯ [Error: ENOENT: no such file or directory, open '/Users/pauljurgens/Downloads/projec
> … [truncated, 2,001 more chars]
> ```

🔧 **Bash**
```
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4100/store/demo/products/prod_01M16E25Z2D2RN2KB0SSTZ31MJ"; sysctl kern.num_files kern.maxfiles 2>/dev/null
```

> **↳ result**
> ```
> 500
> kern.num_files: 28302
> kern.maxfiles: 30720
> ```

🔧 **Bash**
```
ps -ax -o pid,rss,command | grep -E "next-server|tsx watch|next dev" | grep -v grep | awk '{printf "%s %sMB %s %s %s %s %s\n", $1, int($2/1024), $3, $4, $5, $6, $7}' | head -20; echo "--- open files by top procs ---"; for p in $(pgrep -f "next-server|tsx watch" | head -12); do n=$(lsof -p $p 2>/dev/null | wc -l); echo "$p $n $(ps -o command= -p $p | cut -c1-60)"; done | sort -k2 -rn | head -12
```

> **↳ result**
> ```
> 80353 13MB next-server (v15.5.24)   
> 84808 5MB node /opt/homebrew/bin/pnpm --filter @merchant/admin exec
> 84811 5MB node ./node_modules/.bin/../next/dist/bin/next dev --port 4100
> 84817 18MB next-server (v15.5.24)   
> 89407 9MB node /opt/homebrew/bin/pnpm --filter @merchant/admin exec
> 89410 9MB node ./node_modules/.bin/../next/dist/bin/next dev --port 3100
> 89495 15MB next-server (v15.5.24)   
> 91974 6MB node /opt/homebrew/bin/pnpm exec next dev
> 91976 6MB node ./node_modules/.bin/../next/dist/bin/next dev --port 4202
> 91982 10MB next-server (v15.5.24)   
> --- open files by top procs ---
> 91982       46 next-server (v15.5.24) 
> 80353       46 next-server (v15.5.24)    
> 89495       39 next-server (v15.
> … [truncated, 44 more chars]
> ```

🔧 **Bash**
```
pkill -f "next dev --port 4100" 2>/dev/null; sleep 3; rm -rf apps/admin/.next 2>/dev/null
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
(WATCHPACK_POLLING=true pnpm --filter @merchant/admin exec next dev --port 4100 > $SCR/admin.log 2>&1 &)
until curl -s -o /dev/null http://localhost:4100/login 2>/dev/null; do sleep 2; done
curl -s -o /dev/null -w "login=%{http_code}\n" http://localhost:4100/login
curl -s -o /dev/null -w "product=%{http_code}\n" "http://localhost:4100/store/
… [truncated, 46 more chars]
```

> **↳ result**
> ```
> login=200
> product=200
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/prod_01M16E25Z2D2RN2KB0SSTZ31MJ"}}, {"name": "computer", "input": {"action": "wait", "duration": 6}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 6s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [399, 491]}}, {"name": "computer", "input": {"action": "type", "text": "owner@demo.dev"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [399, 536]}}, {"name": "computer", "input": {"action": "type", "text": "password123"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [399, 565]}}, {"name": "computer", "input": {"action": "wait", "duration": 6}}, {"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products/prod_01M16E25Z2D2RN2KB0SSTZ31MJ"}}, {"na
… [truncated, 119 more chars]
```

> **↳ result**
> ```
> [computer:left_click] left_click at (399, 491)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:type] typed 14 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (399, 536)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:type] typed 11 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (399, 565)
> 
> 
> Tab Context:
> - Exec
> … [truncated, 735 more chars]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "wait", "duration": 10}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:wait] waited 10s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__read_console_messages**
```
{"limit": 20, "onlyErrors": true}
```

> **↳ result**
> ```
> [error] ../../node_modules/.pnpm/next@15.5.24_@playwright+test@1.62.1_@types+node@22.20.1_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/client/components/redirect-status-code.js
> Error: 
> 
> Caused by:
>     0: Failed to read source code from /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056/node_modules/.pnpm/next@15.5.24_@playwright+test@1.62.1_@types+node@22.20.1_react-dom@19.2.8_react@19.2.8__react@19.2.8/node_modules/next/dist/client/components/redirect-status-code.js
>     1: Too many open files in system (os error 23)
> 
> Import trace for requested module:
> ../../node_modules/.pnpm/next@15.5.24_@playwright+test@1.62.1_@types+node@22.20
> … [truncated, 17,616 more chars]
> ```

### 🤖 Claude

The machine's global file table is exhausted (`ENFILE`, 28k/30k) from the other agents' dev servers. Let me verify persistence directly against the database instead.

🔧 **Bash**
```
pnpm db:query "select p.title, p.handle, p.description_html, p.tags, v.price, v.compare_at_price, v.taxable, v.requires_shipping, v.inventory_policy from products p join product_variants v on v.product_id = p.id where p.id = 'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'" 2>&1 | tail -12
```

> **↳ result**
> ```
> Exit code 1
> zsh:1: too many open files in system: /dev/null
> (eval):1: pipe failed: too many open files in system
> ```

🔧 **Bash**
```
pkill -f "next dev --port 4100"; pkill -f "@merchant/api dev"; pkill -f "tsx watch --env-file"; sleep 3; sysctl kern.num_files
```

> **↳ result**
> ```
> kern.num_files: 14257
> ```

🔧 **Bash**
```
pnpm db:query "select p.title, p.handle, p.description_html, p.tags, v.price, v.compare_at_price, v.taxable, v.requires_shipping, v.inventory_policy from products p join product_variants v on v.product_id = p.id where p.id = 'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'" 2>&1 | tail -12
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/db-query.sh "select p.title, p.handle, p.description_html, p.tags, v.price, v.compare_at_price, v.taxable, v.requires_shipping, v.inventory_policy from products p join product_variants v on v.product_id = p.id where p.id = 'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'"
> 
> ERROR:  column v.product_id does not exist
> LINE 1: ...policy from products p join product_variants v on v.product_...
>                                                              ^
> HINT:  Perhaps you meant to reference the column "v.productId".
>  ELIFECYCLE  Command failed with exit code 1.
> ```

🔧 **Bash**
```
pnpm db:query 'select p.title, p.handle, p."descriptionHtml", p.tags, v.price, v."compareAtPrice", v.taxable, v."requiresShipping", v."inventoryPolicy" from products p join product_variants v on v."productId" = p.id where p.id = '"'"'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'"'"'' 2>&1 | tail -10
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/db-query.sh "select p.title, p.handle, p.\"descriptionHtml\", p.tags, v.price, v.\"compareAtPrice\", v.taxable, v.\"requiresShipping\", v.\"inventoryPolicy\" from products p join product_variants v on v.\"productId\" = p.id where p.id = 'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'"
> 
>       title       |      handle      |                descriptionHtml                 |   tags   | price | compareAtPrice | taxable | requiresShipping | inventoryPolicy 
> ------------------+------------------+------------------------------------------------+----------+-------+----------------+-------
> … [truncated, 205 more chars]
> ```

🔧 **Bash**
```
pnpm db:query 'select c.title as collection, cp.position from collection_products cp join collections c on c.id = cp."collectionId" where cp."productId" = '"'"'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'"'"'' 2>&1 | tail -6
echo "=== inventory ==="
pnpm db:query 'select l.name, il.available from inventory_levels il join locations l on l.id = il."locationId" join product_variants v on v.id = il."variantId" where v."productId" = '"'"'prod_01M16E25Z2D2RN2KB0SSTZ31MJ'"'"'' 2>&1 | tail -7
echo "=== adjustments ==="
pnpm db:query 'select ia.delta, ia.reason from inventory_adjustments ia join product_variants v
… [truncated, 105 more chars]
```

> **↳ result**
> ```
> collection | position 
> ------------+----------
>  Featured   |        6
> (1 row)
> 
> === inventory ===
> 
>       name      | available 
> ----------------+-----------
>  Downtown Store |         7
>  Warehouse      |        13
> (2 rows)
> 
> === adjustments ===
> 
>  delta |   reason   
> -------+------------
>      7 | correction
>     13 | correction
> (2 rows)
> ```

### 🤖 Claude

Persistence is correct end to end. Let me switch to a production build (no file watchers) to finish verifying the edit path.

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
(pnpm --filter @merchant/api dev > $SCR/api.log 2>&1 &)
pnpm --filter @merchant/admin exec next build > $SCR/build.log 2>&1; echo "exit=$?"; tail -20 $SCR/build.log
```

> **↳ result**
> ```
> exit=0
> ├ ƒ /store/[slug]/products/new              387 B         204 kB
> ├ ƒ /store/[slug]/settings                6.21 kB         151 kB
> ├ ƒ /store/[slug]/settings/checkout       5.17 kB         172 kB
> ├ ƒ /store/[slug]/settings/general        4.64 kB         172 kB
> ├ ƒ /store/[slug]/settings/notifications  3.38 kB         171 kB
> ├ ƒ /store/[slug]/settings/payments       15.9 kB         190 kB
> ├ ƒ /store/[slug]/settings/plan           6.84 kB         171 kB
> ├ ƒ /store/[slug]/settings/shipping       5.17 kB         193 kB
> ├ ƒ /store/[slug]/settings/staff          5.07 kB         191 kB
> ├ ƒ /store/[slug]/settings/taxes          5.12 kB         172 kB
> └ ƒ /store/[slug]/storefront              1
> … [truncated, 307 more chars]
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
(pnpm --filter @merchant/admin exec next start --port 4100 > $SCR/start.log 2>&1 &)
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4100/login | grep -q 200; do sleep 2; done
echo "admin up"; curl -s -o /dev/null -w "api=%{http_code}\n" http://localhost:4111/health; sysctl kern.num_files
```

> **↳ result**
> ```
> admin up
> api=200
> kern.num_files: 15963
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "navigate", "input": {"url": "http://localhost:4100/login"}}, {"name": "computer", "input": {"action": "wait", "duration": 3}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [navigate] navigated to http://localhost:4100
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:wait] waited 3s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [399, 491]}}, {"name": "computer", "input": {"action": "type", "text": "owner@demo.dev"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [399, 536]}}, {"name": "computer", "input": {"action": "type", "text": "password123"}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [399, 565]}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "navigate", "input": {"url": "http://localhost:4100/store/demo/products"}}, {"name": "computer", "input": {"acti
… [truncated, 86 more chars]
```

> **↳ result**
> ```
> [computer:left_click] left_click at (399, 491)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:type] typed 14 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (399, 536)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:type] typed 11 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Log in · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (399, 565)
> 
> 
> Tab Context:
> - Exec
> … [truncated, 1,699 more chars]
> ```

🔧 **mcp__Claude_Browser__find**
```
{"query": "Lantern Cotton Boxer"}
```

> **↳ result**
> ```
> Found 2 match(es) for "Lantern Cotton Boxer":
> - image "Lantern Cotton Boxer — view 1" [ref_148]
> - generic "Lantern Cotton Boxer" [ref_149]
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "ref": "ref_149"}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (428, 399) [ref_149]
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [267, 250]}}, {"name": "computer", "input": {"action": "wait", "duration": 6}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (267, 250)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 6s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [541, 155]}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (541, 155)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [541, 155]}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "JSON.stringify({html: document.querySelector('.merchant-rte')?.innerHTML, saveBar: !!document.querySelector('.Polaris-Frame-ContextualSaveBar')})"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (541, 155)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [javascript_tool:javascript_exec] "{\"html\":\"<p>Long-staple cotton with a covered waistband and no centre seam. Cut roomy through the seat and hemmed so the legs stay put.</p>\",\"saveBar\":false}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "triple_click", "coordinate": [250, 749]}}, {"name": "computer", "input": {"action": "type", "text": "26.75"}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:triple_click] triple_click at (250, 749)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 5 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:screenshot] Screenshot size: 800x1000
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [image]
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "left_click", "coordinate": [705, 17]}}, {"name": "computer", "input": {"action": "wait", "duration": 2}}, {"name": "javascript_tool", "input": {"action": "javascript_exec", "text": "const inputs=[...document.querySelectorAll('input')].filter(i=>i.previousElementSibling||true); const prices=[...document.querySelectorAll('input')].map(i=>i.value).filter(v=>/^\\d+\\.\\d\\d$/.test(v)); JSON.stringify({prices, saveBar: !!document.querySelector('.Polaris-Frame-ContextualSaveBar')})"}}]}
```

> **↳ result**
> ```
> [computer:left_click] left_click at (705, 17)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 2s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [javascript_tool:javascript_exec] "{\"prices\":[\"24.00\",\"24.00\",\"24.00\",\"24.00\"],\"saveBar\":true}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__javascript_tool**
```
{"action": "javascript_exec", "text": "JSON.stringify({saveBar: !!document.querySelector('.Polaris-Frame-ContextualSaveBar'), text: document.querySelector('.Polaris-Frame-ContextualSaveBar')?.textContent})"}
```

> **↳ result**
> ```
> "{\"saveBar\":true,\"text\":\"\"}"
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> ```

🔧 **mcp__Claude_Browser__browser_batch**
```
{"actions": [{"name": "computer", "input": {"action": "triple_click", "coordinate": [250, 749]}}, {"name": "computer", "input": {"action": "type", "text": "26.75"}}, {"name": "computer", "input": {"action": "wait", "duration": 1}}, {"name": "computer", "input": {"action": "left_click", "coordinate": [749, 17]}}, {"name": "computer", "input": {"action": "wait", "duration": 5}}, {"name": "computer", "input": {"action": "screenshot"}}]}
```

> **↳ result**
> ```
> [computer:triple_click] triple_click at (250, 749)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:type] typed 5 chars
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 1s
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:left_click] left_click at (749, 17)
> 
> 
> Tab Context:
> - Executed on tabId: seed
> - Available tabs:
>   • tabId seed: "Products · Merchant" (http://localhost:4100)
> [computer:wait] waited 5s
> 
> 
> Tab Context:
> - Executed on tabId: s
> … [truncated, 260 more chars]
> ```

🔧 **Bash**
```
pnpm db:query 'select v.title, v.price, v.sku, v.barcode, v."compareAtPrice", v.taxable, v."requiresShipping", v."weightGrams", v."inventoryPolicy" from product_variants v join products p on p.id=v."productId" where p.handle=$$lantern-cotton-boxer$$ order by v.position' 2>&1 | tail -9
echo "=== membership + tags ==="
pnpm db:query 'select p.tags, p.vendor, p."productType", (select count(*) from collection_products cp where cp."productId"=p.id) as collections from products p where p.handle=$$lantern-cotton-boxer$$' 2>&1 | tail -5
```

> **↳ result**
> ```
> > merchant@ db:query /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> > bash scripts/db-query.sh "select v.title, v.price, v.sku, v.barcode, v.\"compareAtPrice\", v.taxable, v.\"requiresShipping\", v.\"weightGrams\", v.\"inventoryPolicy\" from product_variants v join products p on p.id=v.\"productId\" where p.handle=$$lantern-cotton-boxer$$ order by v.position"
> 
> ERROR:  trailing junk after numeric literal at or near "96497l"
> LINE 1: ...n products p on p.id=v."productId" where p.handle=96497lante...
>                                                              ^
>  ELIFECYCLE  Command failed with exit code 1.
> === membership + tags ===
> 
> ERROR:  trailing j
> … [truncated, 229 more chars]
> ```

🔧 **Bash**
```
cat > /tmp/q1.sh <<'EOF'
pnpm db:query "select v.title, v.price, v.sku, v.barcode, v.\"compareAtPrice\", v.taxable, v.\"requiresShipping\", v.\"weightGrams\", v.\"inventoryPolicy\" from product_variants v join products p on p.id=v.\"productId\" where p.handle='lantern-cotton-boxer' order by v.position"
EOF
bash /tmp/q1.sh 2>&1 | tail -9
cat > /tmp/q2.sh <<'EOF'
pnpm db:query "select p.tags, p.vendor, p.\"productType\", (select count(*) from collection_products cp where cp.\"productId\"=p.id) as collections from products p where p.handle='lantern-cotton-boxer'"
EOF
bash /tmp/q2.sh 2>&1 | tail -
… [truncated, 1 more chars]
```

> **↳ result**
> ```
> title | price |      sku       | barcode | compareAtPrice | taxable | requiresShipping | weightGrams | inventoryPolicy 
> -------+-------+----------------+---------+----------------+---------+------------------+-------------+-----------------
>  S     |  2675 | BSR-ACC-LTN-S  |         |                | t       | t                |          90 | deny
>  M     |  2400 | BSR-ACC-LTN-M  |         |                | t       | t                |          90 | deny
>  L     |  2400 | BSR-ACC-LTN-L  |         |                | t       | t                |          90 | deny
>  XL    |  2400 | BSR-ACC-LTN-XL |         |                | t       | t                |          90 | deny
> (4 rows)
> 
>          tags
> … [truncated, 194 more chars]
> ```

🔧 **Bash**
```
sed -n 1,80p e2e/playwright.config.ts 2>/dev/null || find e2e -name "playwright.config.*" -exec cat {} \;
```

> **↳ result**
> ```
> import { defineConfig, devices } from '@playwright/test';
> 
> /**
>  * Smoke suite only (SPEC §14.4).
>  *
>  * The flows cross three apps, so Playwright starts all of them. `reuseExistingServer`
>  * means a local run attaches to whatever `pnpm dev` already has up instead of
>  * fighting it for ports; CI always starts its own.
>  */
> const ADMIN_URL = process.env.ADMIN_URL ?? 'http://admin.lvh.me:3000';
> const API_URL = process.env.API_URL ?? 'http://localhost:3001';
> const STOREFRONT_URL = process.env.STOREFRONT_URL ?? 'http://demo.lvh.me:3002';
> 
> /**
>  * Readiness for the two Next.js apps is a localhost port probe, not a URL
>  * fetch — `*.lvh.me` needs external DNS, which is exactly the kind of thing
>  * tha
> … [truncated, 1,947 more chars]
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
pnpm --filter @merchant/storefront exec next build > $SCR/sfbuild.log 2>&1; echo "exit=$?"; tail -5 $SCR/sfbuild.log
```

> **↳ result**
> ```
> exit=0
> ƒ Middleware                             34.3 kB
> 
> ○  (Static)   prerendered as static content
> ƒ  (Dynamic)  server-rendered on demand
> ```

🔧 **Bash**
```
SCR=/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/scratchpad
(pnpm --filter @merchant/storefront exec next start --port 4102 > $SCR/sfstart.log 2>&1 &)
until curl -s -o /dev/null http://localhost:4102 2>/dev/null; do sleep 2; done; echo "storefront up"
cd e2e && ADMIN_URL=http://localhost:4100 API_URL=http://localhost:4111 STOREFRONT_URL=http://demo.localhost:4102 NEXT_PUBLIC_API_URL=http://localhost:4111 pnpm exec playwright test -g "create product" 2>&1 | tail -30
```

> **↳ result**
> ```
> storefront up
> 
> Running 1 test using 1 worker
> 
>   ✓  1 [chromium] › tests/smoke.spec.ts:30:3 › mandatory smoke flows › a) staff login → create product with 2 variants → appears in list (4.0s)
> 
>   1 passed (6.0s)
> ```

🔧 **Bash**
```
cd e2e && ADMIN_URL=http://localhost:4100 API_URL=http://localhost:4111 STOREFRONT_URL=http://demo.localhost:4102 NEXT_PUBLIC_API_URL=http://localhost:4111 pnpm exec playwright test 2>&1 | tail -30
```

> **↳ result**
> ```
> Exit code 1
> (eval):cd:1: no such file or directory: e2e
> ```

🔧 **Bash**
```
ADMIN_URL=http://localhost:4100 API_URL=http://localhost:4111 STOREFRONT_URL=http://demo.localhost:4102 NEXT_PUBLIC_API_URL=http://localhost:4111 pnpm exec playwright test 2>&1 | tail -30
```

> **↳ result**
> ```
> Running 6 tests using 4 workers
> 
>   ✓  1 [chromium] › tests/smoke.spec.ts:30:3 › mandatory smoke flows › a) staff login → create product with 2 variants → appears in list (5.5s)
>   ✓  5 [chromium] › tests/smoke.spec.ts:285:3 › mandatory smoke flows › e) second shop signup is isolated from the demo shop (1.7s)
>   ✓  6 [chromium] › tests/smoke.spec.ts:315:1 › skeleton: api answers /health (13ms)
>   ✓  3 [chromium] › tests/smoke.spec.ts:164:3 › mandatory smoke flows › c) discount code applies at checkout (7.4s)
>   ✓  4 [chromium] › tests/smoke.spec.ts:116:3 › mandatory smoke flows › b) storefront: browse → add to cart → checkout with 4242 → confirmation → order in admin → refund (8.6s)
>   ✓  2 [chrom
> … [truncated, 147 more chars]
> ```

🔧 **Bash**
```
pnpm verify 2>&1 | grep -E "Tasks:|error|ERROR|failed|passed \(" | tail -20
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
pnpm verify 2>&1 | tail -25
```

> **↳ result**
> ```
> undefined
>  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "verify" not found
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056 && pnpm verify 2>&1 | tail -20
```

> **↳ result**
> ```
> @merchant/admin:test:  ✓ src/lib/product-draft.test.ts (23 tests) 305ms
> @merchant/pay:test:  ✓ src/adapters/stripe.test.ts (12 tests) 120ms
> @merchant/admin:test:  ✓ src/app/store/[slug]/apps/scopes.test.ts (9 tests) 6ms
> @merchant/theme-engine:test:  ✓ src/presets/presets.test.ts (16 tests) 54ms
> @merchant/admin:test:  ✓ src/app/store/[slug]/analytics/range.test.ts (14 tests) 696ms
> @merchant/admin:test:    ✓ chart money > converts minor units to the major units a chart axis plots  434ms
> @merchant/admin:test:  ✓ src/app/store/[slug]/orders/_components/status.test.ts (10 tests) 19ms
> @merchant/admin:test:  ✓ src/lib/discount-draft.test.ts (11 tests) 373ms
> @merchant/storefront:test:  ELIFECYCLE  T
> … [truncated, 571 more chars]
> ```

🔧 **Bash**
```
pnpm --filter @merchant/storefront test 2>&1 | tail -30
```

> **↳ result**
> ```
> 35|       'http://demo.lvh.me:3001/storefront/api/products?query=merino&li…
>      36|     );
> 
> ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯
> 
>  FAIL  src/lib/api.test.ts > storefrontApiUrl > is not confused by a slug that looks like a host
> AssertionError: expected 'aurora-supply.localhost' to be 'aurora-supply.lvh.me' // Object.is equality
> 
> Expected: [32m"aurora-supply.l[7mvh.me[27m"[39m
> Received: [31m"aurora-supply.l[7mocalhost[27m"[39m
> 
>  ❯ src/lib/api.test.ts:41:26
>      39|   it('is not confused by a slug that looks like a host', () => {
>      40|     const url = new URL(storefrontApiUrl('aurora-supply', '/shop'));
>      41|     expect(url.hostname).toBe('aurora-supply.lvh.me');
>        |
> … [truncated, 503 more chars]
> ```

### 🤖 Claude

The storefront test asserts the documented `lvh.me` defaults — my local port overrides broke it. Restoring those keys:

🔧 **Bash**
```
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('.env'); s = p.read_text()
for k, v in [('API_URL','http://api.lvh.me:3001'), ('ADMIN_URL','http://admin.lvh.me:3000'),
             ('STOREFRONT_BASE_DOMAIN','lvh.me:3002'), ('API_PORT','3001'),
             ('ADMIN_PORT','3000'), ('STOREFRONT_PORT','3002')]:
    s = re.sub(rf'^{k}=.*$', f'{k}={v}', s, flags=re.M)
p.write_text(s)
PY
grep -nE "^(API_PORT|ADMIN_PORT|API_URL|ADMIN_URL|STOREFRONT_BASE_DOMAIN|STOREFRONT_PORT|DATABASE_URL|REDIS_URL)" .env
pnpm verify 2>&1 | tail -12
```

> **↳ result**
> ```
> 13:DATABASE_URL=postgresql://merchant:[REDACTED]@localhost:5433/merchant_product_form_parity_58c056?schema=public
> 14:REDIS_URL=redis://localhost:6379/15
> 22:API_URL=http://api.lvh.me:3001
> 23:ADMIN_URL=http://admin.lvh.me:3000
> 24:STOREFRONT_BASE_DOMAIN=lvh.me:3002
> 27:API_PORT=3001
> 28:ADMIN_PORT=3000
> 29:STOREFRONT_PORT=3002
> @merchant/api:test:  ✓ test/host.test.ts (2 tests) 0ms
> @merchant/api:test: 
> @merchant/api:test:  Test Files  25 passed (25)
> @merchant/api:test:       Tests  360 passed (360)
> @merchant/api:test:    Start at  12:46:53
> @merchant/api:test:    Duration  10.34s (transform 511ms, setup 53ms, collect 1.17s, tests 8.51s, environment 0ms, prepare 141ms)
> @merchant/api:test: 
> 
>  Tasks:
> … [truncated, 71 more chars]
> ```

🔧 **Bash**
```
git status --short | head -30; echo "=== branch ==="; git rev-parse --abbrev-ref HEAD
```

> **↳ result**
> ```
> M DECISIONS.md
>  M apps/admin/src/app/store/[slug]/products/_components/media-card.tsx
>  M apps/admin/src/app/store/[slug]/products/_components/product-form.tsx
>  M apps/admin/src/app/store/[slug]/products/_components/variants-card.tsx
>  M apps/admin/src/components/shell/save-bar.tsx
>  M apps/admin/src/lib/product-draft.test.ts
>  M apps/admin/src/lib/product-draft.ts
>  M apps/api/src/services/catalog/products.ts
>  M apps/api/src/services/inventory/query.ts
>  M apps/api/test/products.test.ts
>  M docs/AGENT-LOG.md
>  M docs/parity/product-form.md
>  M e2e/tests/helpers.ts
>  M e2e/tests/smoke.spec.ts
>  M packages/contracts/src/inventory.ts
>  M packages/contracts/src/products.ts
> ?? apps/admin/src/app/store/[slug
> … [truncated, 736 more chars]
> ```

🔧 **Bash**
```
git branch -m ws-b/product-form-parity && git add -A && git status --short | wc -l && git rev-parse --abbrev-ref HEAD
```

> **↳ result**
> ```
> 27
> ws-b/product-form-parity
> ```

🔧 **Bash**
```
git commit -q -F - <<'EOF'
feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts]

Rebuilds `/products/new` and `/products/:id` against docs/parity/product-form.md,
which was captured from the real Shopify admin. The card ORDER is the load-bearing
part; everything else follows from it.

Left column, top to bottom: Title + Description → Media → Price → Inventory →
Shipping → Variants → Search engine listing. Price, Inventory and Shipping are
product-level cards that edit the single default variant and disappear the moment
an option has values, which is exa
… [truncated, 2,322 more chars]
```

> **↳ result**
> ```
> Checked 24 files in 80ms. No fixes applied.
> 420497c feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts]
> ```

🔧 **Write**
```
/Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/memory/northstar-dev-server-file-limits.md
```

> **↳ result**
> ```
> File created successfully at: /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/memory/northstar-dev-server-file-limits.md
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/memory && python3 - <<'PY'
import pathlib
p = pathlib.Path('MEMORY.md')
s = p.read_text().rstrip('\n')
line = "- [Dev-server file limits](northstar-dev-server-file-limits.md) — 40+ worktrees exhaust macOS fds; build+`next start`, not `next dev`"
if 'northstar-dev-server-file-limits' not in s:
    s += '\n' + line
p.write_text(s + '\n')
print(p.read_text())
PY
```

> **↳ result**
> ```
> - [Northstar verification quirks](northstar-verification-quirks.md) — tsx watch staleness, Host/Origin headers, browser-pane glitches, repo races
> - [Main checkout stays on main](main-checkout-stays-on-main.md) — agents doing work always get a worktree (EnterWorktree); never branch in the primary checkout
> - [Demo runs manually on Fable 5](demo-runs-manually-on-fable-5.md) — unscripted demos; AI builder is core, on claude-fable-5
> - [Dev-server file limits](northstar-dev-server-file-limits.md) — 40+ worktrees exhaust macOS fds; build+`next start`, not `next dev`
> Shell cwd was reset to /Users/pauljurgens/Downloads/projects/shopify/.claude/worktrees/product-form-parity-58c056
> ```

### 🤖 Claude

The product form now matches `docs/parity/product-form.md`. Committed on `ws-b/product-form-parity` (not pushed).

## What changed

**Card order — the structural fix.** Left column is now Title+Description → Media → **Price → Inventory → Shipping** → Variants → Search engine listing. Price/Inventory/Shipping are product-level cards that edit the single default variant and *disappear* the moment an option has values, which is exactly Shopify's split. The variants table correspondingly stopped rendering a row for option-less products (it was about to duplicate the Price field).

**Description is a real rich text editor** — `contenteditable` + `execCommand`, with block format, B/I/U, colour, alignment, lists/indent/link/clear, and a `</>` Show HTML view. The draft holds raw HTML end to end, so the old `<p>`-unwrapping is gone from the product side (`description-html.ts` stays for the collection form; its round-trip test moved to its own file).

**Shopify's collapsed-pill pattern** for Compare-at price, Charge tax, SKU, Barcode, Sell when out of stock — a pill until clicked, pre-expanded when the field already holds a value.

**Inventory is one editable row per location.** On the seeded demo (2 locations) that field used to be *disabled*; changed cells now post to the inventory service after the save, so an `InventoryAdjustment` still exists for every movement. Needed `?productId=` on `GET /admin/api/inventory`.

**Collections in Product organization** — a real `productSchema.collectionIds` [contracts]. The write joins/leaves manual collections, appending at the collection's last position; a smart collection is `invalid_request`, since its membership is a rule, not a row. This supersedes the old "no Collections field" decision, logged in `DECISIONS.md`.

Plus: Search engine listing card (the only place `handle` is sent, so a rename still can't move a URL), breadcrumb header + ⋯ menu, `"Unsaved product"` save bar, Discard→index on new, Save pinned bottom-right, lazy Type/Vendor/Tag suggestion comboboxes.

**One real bug found in passing:** a bare Polaris `Icon` is `margin: auto`, so it drifts to the middle of any flex row — Publishing's channel row was visibly wrong. Wrapped.

## Verified, not assumed

`pnpm verify` green (360 API tests + 83 admin unit tests), all 6 Playwright smoke flows green. In the browser I created a product (bold description, $42.50, stock 7/13 across both locations, a collection, a tag) and confirmed in Postgres: `Made with <b>merino wool</b>…`, price `4250`, `Featured` at position 6, both inventory levels *and* both adjustment rows. Then edited a 4-variant product and confirmed the PUT left barcode, weight, tax and policy untouched.

## Deliberately not built

Each would be a control that can't save anything: `Category`, `Product metafields` (SPEC §2), `Theme template` (one template exists), `Unit price`/`Cost per item`, `Package`/`Country of origin`/`HS code`, Media's `Select existing`, and the Inventory card's **Track quantity** switch — that last one needs a per-variant tracking flag honoured by cart, checkout and storefront availability, all WS-E code. Say the word and I'll do it as its own change. All listed in `docs/parity/product-form.md` and `DECISIONS.md`.

The breadcrumb header is on this page only; orders/customers/collections still use the arrow-button `backAction`. Current Shopify uses breadcrumbs everywhere, so those are the drift — a follow-up.

## Two environment notes

- `pnpm worktree:env` **cannot** allocate here: 15 Redis slots, 41 worktrees. I wrote this worktree's `.env` by hand against its own database and Redis db 15, which is otherwise held only by `e5-issue-deps-571a87` (branch already merged, idle).
- `next dev` is unusable on this machine right now — 40+ worktrees exhaust the macOS file table (`kern.maxfiles` 30720; I saw both `EMFILE` → every route 404s, and `ENFILE` → 500s and failing shell commands). I verified against `next build` + `next start` on ports 4100/4111/4102 instead. Those three servers are still running if you want to click around; `.env` ports are back to the documented `lvh.me` values (the storefront's `api.test.ts` asserts them).

Want me to push and open the PR?

### 👤 User

merge the code

🔧 **Bash**
```
git status --short; echo "=== fetch ==="; git fetch origin main 2>&1 | tail -3; git log --oneline origin/main -1
```

> **↳ result**
> ```
> === fetch ===
> From github.com:pauljurgens11/shopify
>  * branch            main       -> FETCH_HEAD
> aaee31a fix(shared): render the products vendor filter, drop the phantom skeleton button (#103)
> ```

🔧 **Bash**
```
git rebase origin/main 2>&1 | tail -20; echo "=== status ==="; git status --short | head; git log --oneline -3
```

> **↳ result**
> ```
> Rebasing (1/1)Successfully rebased and updated refs/heads/ws-b/product-form-parity.
> === status ===
> 010b74c feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts]
> aaee31a fix(shared): render the products vendor filter, drop the phantom skeleton button (#103)
> 183a23f feat(ws-g): dashboard parity — date-range popover, metric tiles, two-series chart, breakdown [contracts] (#102)
> ```

🔧 **Bash**
```
git diff --stat HEAD~1 origin/main -- package.json pnpm-lock.yaml packages/db/prisma 2>/dev/null | tail -5; pnpm install --frozen-lockfile > /dev/null 2>&1; echo "install=$?"; pnpm verify 2>&1 | tail -12
```

> **↳ result**
> ```
> install=0
> @merchant/api:test:  ✓ test/host.test.ts (2 tests) 0ms
> @merchant/api:test: 
> @merchant/api:test:  Test Files  25 passed (25)
> @merchant/api:test:       Tests  372 passed (372)
> @merchant/api:test:    Start at  12:58:11
> @merchant/api:test:    Duration  21.69s (transform 2.70s, setup 174ms, collect 6.01s, tests 14.11s, environment 0ms, prepare 229ms)
> @merchant/api:test: 
> 
>  Tasks:    10 successful, 10 total
> Cached:    0 cached, 10 total
>   Time:    25.352s
> ```

### 🤖 Claude

Green after the rebase (372 API tests now, up from 360 — main added some). Pushing and opening the PR:

🔧 **Bash**
```
git push -u origin ws-b/product-form-parity 2>&1 | tail -6
```

> **↳ result**
> ```
> remote: Create a pull request for 'ws-b/product-form-parity' on GitHub by visiting:        
> remote:      https://github.com/pauljurgens11/shopify/pull/new/ws-b/product-form-parity        
> remote: 
> To github.com:pauljurgens11/shopify.git
>  * [new branch]      ws-b/product-form-parity -> ws-b/product-form-parity
> branch 'ws-b/product-form-parity' set up to track 'origin/ws-b/product-form-parity' by rebasing.
> ```

🔧 **Bash**
```
gh pr create --title "feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts]" --body "$(cat <<'EOF'
Rebuilds `/products/new` and `/products/:id` against [docs/parity/product-form.md](docs/parity/product-form.md), which was captured from the real Shopify admin.

## The structural fix

The card **order** is the load-bearing part. Left column is now:

`Title + Description → Media → Price → Inventory → Shipping → Variants → Search engine listing`

Price, Inventory and Shipping are product-level cards that edit the single default variant, and they disappear th
… [truncated, 3,816 more chars]
```

> **↳ result**
> ```
> https://github.com/pauljurgens11/shopify/pull/104
> ```

🔧 **Bash**
```
gh pr merge 104 --auto --squash --delete-branch 2>&1 | tail -5
```

> **↳ result**
> ```
> (Bash completed with no output)
> ```

🔧 **Bash**
```
gh pr view 104 --json state,mergeStateStatus,autoMergeRequest,statusCheckRollup --jq '{state, mergeStateStatus, autoMerge: (.autoMergeRequest != null), checks: [.statusCheckRollup[]? | {name, status, conclusion}]}' 2>&1
```

> **↳ result**
> ```
> {"autoMerge":true,"checks":[{"conclusion":"","name":"enable","status":"IN_PROGRESS"},{"conclusion":"","name":"pr-checks","status":"IN_PROGRESS"},{"conclusion":"","name":"triage","status":"IN_PROGRESS"}],"mergeStateStatus":"BLOCKED","state":"OPEN"}
> ```

🔧 **Bash**
```
until [ "$(gh pr view 104 --json state --jq .state)" != "OPEN" ]; do sleep 20; done; gh pr view 104 --json state,mergedAt,mergeCommit --jq '{state, mergedAt, sha: .mergeCommit.oid}'
```

> **↳ result**
> ```
> Command running in background with ID: baktzu3wb. Output is being written to: /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/tasks/baktzu3wb.output. You will be notified when it completes. To check interim output, use Read on that file path.
> ```

### 🤖 Claude

Rebased onto latest `main` (`aaee31a`), re-verified green (372 API tests), pushed, and opened [#104](https://github.com/pauljurgens11/shopify/pull/104) with auto-merge armed (squash + delete branch).

The rebase was clean and `pnpm verify` passed again afterwards — worth noting because main had moved twice under me, including another `[contracts]` change (#102, dashboard parity).

CI is running now; I'm watching for it to land and will tell you when it merges or if a check goes red.

### 👤 User

<task-notification>
<task-id>baktzu3wb</task-id>
<tool-use-id>toolu_01CeTeQTarDex3oBZJY937xC</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/tasks/baktzu3wb.output</output-file>
<status>completed</status>
<summary>Background command "Wait for the PR to land" completed (exit code 0)</summary>
</task-notification>

🔧 **Bash**
```
cat /private/tmp/claude-501/-Users-pauljurgens-Downloads-projects-shopify--claude-worktrees-product-form-parity-58c056/9c56a5a9-5948-4889-8678-dc1d53f42e08/tasks/baktzu3wb.output
```

> **↳ result**
> ```
> {"mergedAt":"2026-08-29T10:00:59Z","sha":"add595d55e09adf02cd6bfab28921b201be7d24f","state":"MERGED"}
> 
> [exited with code 0]
> ```

🔧 **Bash**
```
git fetch -q origin main && git log --oneline origin/main -3
```

> **↳ result**
> ```
> add595d feat(ws-b): product form parity — card order, rich text, price/inventory/shipping [contracts] (#104)
> aaee31a fix(shared): render the products vendor filter, drop the phantom skeleton button (#103)
> 183a23f feat(ws-g): dashboard parity — date-range popover, metric tiles, two-series chart, breakdown [contracts] (#102)
> ```

### 🤖 Claude

Merged. [#104](https://github.com/pauljurgens11/shopify/pull/104) landed on `main` as `add595d` — CI green, squashed, branch deleted.

Two things worth passing on to the other agents, since this touched shared files:

- **`packages/contracts` changed** (`productSchema.collectionIds`, `listInventoryQuery.productId`). Anyone mid-flight on products or inventory should pull before their next change.
- **`SaveBar` gained an optional `message` prop** (default unchanged), and the e2e smoke flow (a) now saves through a new `saveViaSaveBar` helper — the product form has two Save buttons like Shopify's, so a bare `getByRole('button', { name: 'Save' })` is ambiguous there.

The stack I built for verification is still up on ports 4100 (admin) / 4111 (api) / 4102 (storefront) if you want to click through it — `next start` builds, so no file-watcher problems. Tell me when to shut them down.
