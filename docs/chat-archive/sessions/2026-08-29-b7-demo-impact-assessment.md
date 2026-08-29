# B7 demo impact assessment

| | |
|---|---|
| **Session** | `ade11415-a109-4208-be49-e5f4cc468326` |
| **Started** | 2026-08-29T13:43:51.922Z |
| **Ended** | 2026-08-29T13:44:59.097Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

is b7 sth noticeable in demo? is it worth doing?

🔧 **Bash**
```
ls docs/issues/ | head -50 && echo "---" && find docs/issues -iname "*b7*"
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
> B7-variant-images.md
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
> E7-theme-publish-revalidatio
> … [truncated, 480 more chars]
> ```

🔧 **Bash**
```
cat docs/issues/B7-variant-images.md
```

> **↳ result**
> ```
> # B7 — variant images: populate `variantIds`, or the PDP gallery can never swap
> 
> | | |
> |---|---|
> | Workstream | B (form + API), with one read already waiting in E |
> | Size | M |
> | Depends on | B5 (landed) |
> | Unblocks | PDP variant → image swap (PARITY §Motion "instant, client-side") |
> | Branch | `ws-b/variant-images` |
> 
> ## You own
> ```
> apps/admin/src/lib/product-draft.ts
> apps/admin/src/app/store/[slug]/products/_components/**   (media card)
> apps/api/src/services/catalog/products.ts                 (write passthrough already exists)
> apps/storefront/src/components/product-form.tsx           (gallery swap — coordinate with WS-E)
> ```
> 
> ## Context (found in repo review, 2026-08-29, contracts sweep
> … [truncated, 2,182 more chars]
> ```

🔧 **Bash**
```
ls docs/ ; echo ---; grep -rn "variant" docs/DEMO*.md 2>/dev/null | head -20
```

> **↳ result**
> ```
> AGENT-LOG.md
> DEMO.md
> PARALLEL-AGENTS.md
> WORKSTREAMS.md
> chat-archive
> issues
> parity
> ---
> docs/DEMO.md:73:- **Products.** "Thirty-two products, a hundred and thirty-three variants."
> docs/DEMO.md:75:  two-column form — title, description, media and variants on the left; status,
> ```

🔧 **Bash**
```
sed -n 55,120p docs/DEMO.md
```

> **↳ result**
> ```
> (**Total sales $6,559.11**, **Orders 24**, Sessions, Average order value, over
> Last 30 days), the two-series sales chart against the previous period, and the
> Total sales breakdown beside it.
> 
> There is **no onboarding on this Home**, and that is the thing to say if anyone
> asks. Shopify serves Home in two forms — a setup page for a new store, this
> dashboard for an established one — and we switch on the same signal it does:
> Aurora has taken 40 orders, so it gets the dashboard. Beat 9 shows the other
> half of that, on a store created live.
> 
> ---
> 
> ## Beat 2 — 1:00 The admin tour
> 
> Move fast. Two minutes, six pages, no clicking into detail unless asked.
> 
> **Do → Say → Point at**, one nav item at a tim
> … [truncated, 2,619 more chars]
> ```

🔧 **Bash**
```
sed -n 120,200p docs/DEMO.md
```

> **↳ result**
> ```
> > shop flips within a second or two (measured live, repo review 2026-08-29).
> > If the ping ever misses (its one dev-mode gap: the route's first compile),
> > the 60-second cache is the fallback — reload once.
> 
> ---
> 
> ## Beat 4 — 5:30 Open the shop
> 
> **Do.** Switch to http://demo.lvh.me:3002 and reload.
> 
> **Say.** "Same deployment, different hostname. The subdomain is what resolves
> the tenant — there is no per-store deployment anywhere in this."
> 
> **Point at.** The theme you just published: the colours, the type and the
> sections are the ones from Beat 3. Scroll past the hero to the product grid.
> 
> **Do.** Open **Basin Wool Socks** → choose size **M** → **Add to cart** →
> *"Added to your cart."* → **Vi
> … [truncated, 2,140 more chars]
> ```

🔧 **Bash**
```
grep -rn "Colou\?r" packages/db/prisma/seed* -r --include=*.ts | head -20; echo ---; grep -rln "images" packages/db/prisma/seed* | head
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ---
> packages/db/prisma/seed/seed.test.ts
> packages/db/prisma/seed/collections.ts
> packages/db/prisma/seed/data/images.ts
> packages/db/prisma/seed/catalog.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "Color\|Colour" packages/db/prisma/seed/*.ts packages/db/prisma/seed/data/*.ts | head -20
```

> **↳ result**
> ```
> packages/db/prisma/seed/data/people.ts:114:    province: 'Colorado',
> packages/db/prisma/seed/data/products.ts:52:      { name: 'Color', values: ['Oatmeal', 'Slate'] },
> packages/db/prisma/seed/data/products.ts:81:      { name: 'Color', values: ['White', 'Blue'] },
> packages/db/prisma/seed/data/products.ts:111:      { name: 'Color', values: ['Natural', 'Black', 'Forest'] },
> packages/db/prisma/seed/data/products.ts:140:      { name: 'Color', values: ['Heather Grey', 'Navy'] },
> packages/db/prisma/seed/data/products.ts:195:      { name: 'Color', values: ['Stone', 'Olive'] },
> packages/db/prisma/seed/data/products.ts:222:    options: [{ name: 'Color', values: ['Charcoal', 'Rust', 'Moss'] }],
> package
> … [truncated, 330 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n 1,60p packages/db/prisma/seed/data/images.ts; echo ===; sed -n 40,90p packages/db/prisma/seed/data/products.ts
```

> **↳ result**
> ```
> Exit code 1
> /**
>  * Curated product photography (H1).
>  *
>  * Every id below is a pinned Unsplash photo, hand-picked to match the product
>  * it illustrates and verified reachable (HTTP 200) and on-subject by eye on a
>  * contact sheet before landing. Pinning beats a random-image service on the
>  * KPI: "Alpine Merino Crewneck" must show knitwear, not whatever a seeded
>  * placeholder happens to serve — and a pinned id is exactly as deterministic.
>  *
>  * Primary images are unique per product (two products sharing a photo in a
>  * collection grid reads as a data bug); secondaries may reuse another
>  * product's primary, since they only ever appear inside that product's own
>  * gallery. Adding a product?
> … [truncated, 3,432 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "imageUrl" apps/storefront/src/components/product-form.tsx apps/storefront/src/app/**/products/**/*.tsx 2>/dev/null | head -20; echo ===; grep -rn "variantIds" --include=*.ts --include=*.tsx apps packages | grep -v test | head -20
```

> **↳ result**
> ```
> Exit code 1
> (eval):1: == not found
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "variantIds" --include=*.ts --include=*.tsx apps packages | grep -v spec | head -20
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "variantIds" apps packages --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
```

> **↳ result**
> ```
> apps/api/src/services/inventory/adjust.ts:113:  const variantIds = [...new Set(targets.map((t) => t.variantId))];
> apps/api/src/services/inventory/adjust.ts:118:      where: { id: { in: variantIds } },
> apps/api/src/services/inventory/adjust.ts:125:  const missingVariant = variantIds.find((id) => !policies.has(id));
> apps/api/src/services/storefront/products.ts:62:  const own = row.images.find((image) => image.variantIds.includes(variant.id));
> apps/api/src/services/catalog/products.ts:130:      variantIds: image.variantIds,
> apps/api/src/services/catalog/products.ts:260:  image: { url: string; altText?: string | null; position?: number; variantIds?: string[] },
> apps/api/src/services/catalog/prod
> … [truncated, 590 more chars]
> ```

### 🤖 Claude

**Short answer: no, and it isn't worth doing as written.**

What I checked:

**The demo never hits it.** Beat 4 opens Basin Wool Socks and picks **Size M** — real Shopify doesn't swap the gallery on a size change either. No beat opens a colour-varying PDP, and the cart-line thumbnail already shows `images[0]`, which is what Shopify shows when no variant image is assigned. So all three waiting readers ([products.ts:62](apps/api/src/services/storefront/products.ts:62), [cart.ts:90](apps/api/src/services/cart/cart.ts:90), [query.ts:171](apps/api/src/services/inventory/query.ts:171)) fall back to exactly the correct-looking behavior.

**The data-loss half is real but unobservable.** The form does erase `variantIds` on save — but nothing in the repo ever writes them (seed writes `[]` at [catalog.ts:185](packages/db/prisma/seed/catalog.ts:185)), so you'd have to set them via the Admin REST API and then save from the form to see the bug. Not a demo path.

**Step 3 would actively hurt.** [images.ts](packages/db/prisma/seed/data/images.ts) says secondary photos deliberately reuse *other products'* primaries — they only ever appear inside that product's own gallery. Assigning "Slate" to the secondary means picking Slate on the Alpine Merino Crewneck swaps to a photo of the Hemlock Fleece Hoodie. A wrong-garment swap reads as a data bug to a Shopify user; no swap reads as "no variant image assigned," which is the normal Shopify state. B7 as specified makes parity worse unless you also source per-colour photography, which is well outside the two days.

**Recommendation: skip it.** If you want the seam closed for correctness, the only slice worth ~20 minutes is step 1 alone — carry `variantIds` through `ImageDraft` untouched so the form stops erasing what it doesn't edit, plus the round-trip test. Steps 2–4 are M-sized work for zero KPI movement and a parity regression risk. Retitle B7 to that scope or close it as won't-fix with the photography reason logged.
