# Shop URL in admin views

| | |
|---|---|
| **Session** | `cb13b5ff-e674-4a75-9a1b-df4b1f03fee1` |
| **Started** | 2026-08-30T06:46:49.588Z |
| **Ended** | 2026-08-30T06:48:09.088Z |
| **Working dir** | `~/Downloads/projects/shopify` |
| **Branch** | `main` |
| **Model** | `claude-opus-5` |
| **Claude Code** | 2.1.247 |
| **Archived** | no |

---

### 👤 User

the project is now live and deployed. is there a way to see from the admin views the actual url of your shop?

### 🤖 Claude

I'll look at how the admin exposes the shop's storefront URL.

🔧 **Bash**
```
grep -rn "storefrontUrl\|STOREFRONT_URL\|storefront_url" --include=*.ts --include=*.tsx apps/admin apps/api packages/config | head -50
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
grep -rn "lvh.me\|primaryDomain\|myshopify\|shopDomain" --include=*.ts --include=*.tsx apps/admin | head -40
```

> **↳ result**
> ```
> (eval):1: no matches found: --include=*.ts
> ```

🔧 **Bash**
```
grep -rn "storefrontUrl\|STOREFRONT_URL\|storefrontOrigin" --include='*.ts' --include='*.tsx' apps packages | head -40
```

🔧 **Bash**
```
grep -rn "lvh.me\|primaryDomain\|myshopify\|shopDomain\|View store\|shop.slug" --include='*.ts' --include='*.tsx' apps/admin | head -40
```

> **↳ result**
> ```
> apps/admin/next.config.ts:17:    NEXT_PUBLIC_API_URL: process.env.API_URL ?? 'http://api.lvh.me:3001',
> apps/admin/next.config.ts:21:      process.env.STOREFRONT_BASE_DOMAIN ?? 'lvh.me:3002'
> apps/admin/next.config.ts:24:  // The admin is served from admin.lvh.me in dev (CLAUDE.md §1), which Next
> apps/admin/next.config.ts:27:  allowedDevOrigins: ['admin.lvh.me', '*.lvh.me'],
> apps/admin/src/app/page.tsx:20:    router.replace(session ? `/store/${session.shop.slug}` : '/login');
> apps/admin/src/app/store/[slug]/dashboard-home.tsx:191:                  slug={session.shop.slug}
> apps/admin/src/app/login/page.tsx:48:        onSuccess: (session) => router.replace(next ?? `/store/${session.shop.slug}`),
> … [truncated, 2,930 more chars]
> ```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/storefront/preview-url.ts:24:export function storefrontOrigin(shopSlug: string, origin: string = STOREFRONT_ORIGIN): string {
> apps/admin/src/app/store/[slug]/storefront/preview-url.ts:42:  const url = new URL(pathFor(target), storefrontOrigin(target.shopSlug, origin));
> apps/admin/src/app/store/[slug]/storefront/preview-url.test.ts:2:import { previewUrl, storefrontOrigin } from './preview-url.ts';
> apps/admin/src/app/store/[slug]/storefront/preview-url.test.ts:8:    expect(storefrontOrigin('demo', ORIGIN)).toBe('http://demo.lvh.me:3002');
> apps/admin/src/app/store/[slug]/storefront/preview-url.test.ts:32:    expect(storefrontOrigin('demo', 'http://localhost:3002'
> … [truncated, 1,124 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rln "previewUrl\|storefrontOrigin" --include='*.tsx' apps/admin | head -20; echo "---- domains ----"; ls apps/admin/src/app/store/\[slug\]/settings/ 2>/dev/null; echo "---- storefront dir ----"; ls apps/admin/src/app/store/\[slug\]/storefront/
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/storefront/preview-pane.tsx
> apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx
> ---- domains ----
> checkout
> general
> layout.tsx
> notifications
> page.tsx
> payments
> plan
> shipping
> staff
> taxes
> ---- storefront dir ----
> chat-panel.tsx
> layout.tsx
> page.tsx
> preset-picker.tsx
> preview-pane.tsx
> preview-url.test.ts
> preview-url.ts
> publish-modal.tsx
> use-builder.ts
> version-history.tsx
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "STOREFRONT_ORIGIN\|STOREFRONT_BASE_DOMAIN\|shoopify" --include='*.ts' --include='*.tsx' --include='*.sh' --include='*.yml' --include='*.yaml' --include='*.example' --include='*.md' --include='*.conf' . 2>/dev/null | grep -v node_modules | head -40
```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,60p' 'apps/admin/src/app/store/[slug]/settings/general/page.tsx'
```

> **↳ result**
> ```
> 'use client';
> 
> /** Settings → General (SPEC §9). Owner: WS-A. */
> import type { GeneralSettings } from '@merchant/contracts/shops';
> import { BlockStack, Card, FormLayout, Select, Text, TextField } from '@shopify/polaris';
> import { SettingsPage } from '../../../../../components/settings/settings-page.tsx';
> import { useSettingsForm } from '../../../../../components/settings/use-settings-form.ts';
> 
> // The common ones; a full tz database picker is not what this demo is about.
> const TIMEZONES = [
>   'UTC',
>   'America/New_York',
>   'America/Chicago',
>   'America/Denver',
>   'America/Los_Angeles',
>   'Europe/London',
>   'Europe/Berlin',
>   'Asia/Tokyo',
>   'Australia/Sydney',
> ];
> 
> export default function Gen
> … [truncated, 1,326 more chars]
> ```

> **↳ result**
> ```
> .env.example:24:STOREFRONT_BASE_DOMAIN=lvh.me:3002
> docker-compose.prod.yml:39:  STOREFRONT_BASE_DOMAIN: ${BASE_DOMAIN:-localhost}
> docker-compose.prod.yml:269:        STOREFRONT_BASE_DOMAIN: ${BASE_DOMAIN:-localhost}
> .claude/worktrees/ws-b-collections-inventory-ui/.env.example:24:STOREFRONT_BASE_DOMAIN=lvh.me:3002
> .claude/worktrees/ws-b-collections-inventory-ui/packages/config/src/env.ts:32:  STOREFRONT_BASE_DOMAIN: z.string().default('lvh.me:3002'),
> .claude/worktrees/ws-b-collections-inventory-ui/packages/config/src/env.ts:115:  const { STOREFRONT_PROTOCOL, STOREFRONT_BASE_DOMAIN } = env();
> .claude/worktrees/ws-b-collections-inventory-ui/packages/config/src/env.ts:116:  return `${STOREFRONT_
> … [truncated, 7,124 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '1,140p' apps/admin/src/components/shell/admin-top-bar.tsx
```

> **↳ result**
> ```
> 'use client';
> 
> /**
>  * Top bar: search, notifications, store menu (PARITY.md "Global chrome").
>  * Owner: WS-A.
>  *
>  * The search is real, not a placeholder — it fans out to the products, orders
>  * and customers list endpoints and groups what comes back. Groups whose
>  * endpoint has not landed yet simply report nothing (see `lib/search.ts`).
>  */
> import type { SessionResponse } from '@merchant/contracts/auth';
> import { ActionList, Avatar, Box, Card, Icon, InlineStack, Text, TopBar } from '@shopify/polaris';
> import { NotificationIcon } from '@shopify/polaris-icons';
> import { useRouter } from 'next/navigation';
> import { useCallback, useEffect, useMemo, useState } from 'react';
> import { storeHref }
> … [truncated, 4,100 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "CustomDomain" packages/db/prisma/schema.prisma | head; echo "--- nav online store ---"; ls apps/admin/src/navigation/items/; grep -rn "Online Store\|online-store" apps/admin/src/navigation/items/*.ts | head -20
```

> **↳ result**
> ```
> ugrep: warning: packages/db/prisma/schema.prisma: No such file or directory
> --- nav online store ---
> analytics.ts
> apps.ts
> customers.ts
> discounts.ts
> home.ts
> marketing.ts
> orders.ts
> products.ts
> settings.ts
> storefront.ts
> apps/admin/src/navigation/items/storefront.ts:2:// Shopify lists the shop's own channel as `Online Store`, under the bold
> apps/admin/src/navigation/items/storefront.ts:8:  label: 'Online Store',
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat apps/admin/src/navigation/items/storefront.ts; echo "=== general rest ==="; sed -n '60,200p' 'apps/admin/src/app/store/[slug]/settings/general/page.tsx'
```

> **↳ result**
> ```
> import type { NavItem } from '../types.ts';
> // Shopify lists the shop's own channel as `Online Store`, under the bold
> // `Sales channels` header near the bottom of the nav (docs/parity/admin-shell.md).
> // Deviation #2 (SPEC §12) only changes what the page behind it is — the AI
> // builder instead of the theme editor — not what the row is called.
> export const storefront: NavItem = {
>   key: 'storefront',
>   label: 'Online Store',
>   url: '/storefront',
>   icon: 'StoreOnlineIcon',
>   permission: 'builder',
>   section: 'sales-channels',
> };
> === general rest ===
>           </Card>
> 
>           <Card>
>             <BlockStack gap="300">
>               <Text as="h2" variant="headingMd">
>                 Store d
> … [truncated, 988 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '170,215p' 'apps/admin/src/app/store/[slug]/dashboard-home.tsx'; echo "=== preview-url.ts ==="; cat 'apps/admin/src/app/store/[slug]/storefront/preview-url.ts'
```

> **↳ result**
> ```
> }
>                 />
>               </Grid.Cell>
>             </Grid>
> 
>             <Layout>
>               <Layout.Section>
>                 <SalesChart
>                   points={dashboard.salesOverTime}
>                   comparisonPoints={filters.compare ? dashboard.comparisonSalesOverTime : []}
>                   currencyCode={currencyCode}
>                   total={summary.totalSales.amount}
>                   delta={salesDelta}
>                   range={filters.selection.range}
>                   comparisonRange={filters.compare ? filters.comparison : null}
>                 />
>               </Layout.Section>
>               <Layout.Section variant="oneThird">
>                 <SalesBreakdownCard
> … [truncated, 2,352 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -rn "external\|_blank\|ExternalIcon\|ViewIcon" --include='*.tsx' apps/admin/src | grep -v node_modules | head -30
```

> **↳ result**
> ```
> apps/admin/src/app/store/[slug]/orders/_components/line-items-card.tsx:121:                      <Link url={fulfillment.trackingUrl} target="_blank">
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:407:                  external
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:408:                  // `external` alone is not enough: the shell's `PolarisLink`
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:409:                  // spreads Polaris's props AFTER its own `target="_blank"`, so
> apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:412:                  target="_blank"
> apps/admi
> … [truncated, 549 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "previewUrl\|storefrontOrigin\|href\|url" 'apps/admin/src/app/store/[slug]/storefront/preview-pane.tsx' | head -30
```

> **↳ result**
> ```
> 24:import { type PreviewPage, previewUrl } from './preview-url.ts';
> 70:  const src = previewUrl({
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; sed -n '390,420p' 'apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx'; echo "=== seo-card 35-125 ==="; sed -n '35,125p' 'apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx'
```

> **↳ result**
> ```
> collection ? (
>               <InlineStack gap="200" blockAlign="center">
>                 <Button
>                   // The copy carries `baseline.products`, which is empty until
>                   // the members land — duplicating before then would silently
>                   // produce an empty collection.
>                   disabled={collection.type === 'manual' && members.isPending}
>                   onClick={() => setDuplicateTitle(`${collection.title} copy`)}
>                 >
>                   Duplicate
>                 </Button>
>                 <Button
>                   url={previewUrl({
>                     shopSlug: slug,
>                     page: 'collection',
>                     collect
> … [truncated, 3,677 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; ls deploy* 2>/dev/null; find . -maxdepth 2 -name '*.sh' -path '*deploy*' -not -path './node_modules/*' 2>/dev/null | head; grep -rn "BASE_DOMAIN" docker-compose.prod.yml | head -20
```

> **↳ result**
> ```
> caddy
> docker-compose.prod.yml:3:#   BASE_DOMAIN=localhost docker compose -f docker-compose.prod.yml up -d --build
> docker-compose.prod.yml:25:# BASE_DOMAIN means rebuilding it (`--build`). The GHCR images CI pushes are
> docker-compose.prod.yml:37:  API_URL: https://api.${BASE_DOMAIN:-localhost}
> docker-compose.prod.yml:38:  ADMIN_URL: https://admin.${BASE_DOMAIN:-localhost}
> docker-compose.prod.yml:39:  STOREFRONT_BASE_DOMAIN: ${BASE_DOMAIN:-localhost}
> docker-compose.prod.yml:41:  S3_ENDPOINT: https://assets.${BASE_DOMAIN:-localhost}
> docker-compose.prod.yml:42:  S3_PUBLIC_URL: https://assets.${BASE_DOMAIN:-localhost}/merchant-assets
> docker-compose.prod.yml:134:      BASE_DOMAIN: ${BASE_DOMAIN:-l
> … [truncated, 782 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; cat /Users/pauljurgens/.claude/projects/-Users-pauljurgens-Downloads-projects-shopify/memory/live-demo-deployment.md 2>/dev/null | head -40
```

> **↳ result**
> ```
> ---
> name: live-demo-deployment
> description: "The demo is live at shoopify.xyz on a DigitalOcean droplet — coordinates, redeploy flow, and operating rules"
> metadata: 
>   node_type: memory
>   type: project
>   originSessionId: e4dd28ea-36f4-4a94-b520-5870dcd6012c
>   modified: 2026-08-29T15:43:14.466Z
> ---
> 
> Since 2026-08-29 the platform runs live at **https://shoopify.xyz** (bare domain redirects to `admin.shoopify.xyz`; storefront `demo.shoopify.xyz`; API `api.shoopify.xyz`; assets `assets.shoopify.xyz`; wildcard `*.shoopify.xyz` serves signup shops). Demo login: `owner@demo.dev` / `password123`.
> 
> - **Server**: DigitalOcean droplet `merchant-demo`, `root@209.38.235.72` (Ubuntu 24.04, 4 vCPU / 8 GB).
> … [truncated, 1,255 more chars]
> ```

🔧 **Bash**
```
cd /Users/pauljurgens/Downloads/projects/shopify; grep -n "Page\b\|primaryAction\|secondaryActions\|title=" 'apps/admin/src/app/store/[slug]/storefront/page.tsx' | head -20; echo "=== settings index ==="; grep -n "Domains\|domain\|title" 'apps/admin/src/app/store/[slug]/settings/page.tsx' | head -30
```

> **↳ result**
> ```
> 10:import { Banner, Box, Page } from '@shopify/polaris';
> 21:import type { PreviewPage } from './preview-url.ts';
> 34:export default function StorefrontBuilderPage() {
> 46:  const [page, setPage] = useState<PreviewPage>('home');
> 107:      <Page fullWidth>
> 109:      </Page>
> 114:    <Page fullWidth>
> 118:          title="Online Store"
> 119:          subtitle="Describe the storefront you want and watch it build."
> 126:          <Banner tone="critical" title="Theme versions couldn’t be loaded">
> 174:          onPageChange={setPage}
> 226:    </Page>
> === settings index ===
> 28:const CARDS: Array<{ title: string; description: string; href: string; icon: IconSource }> = [
> 30:    title: 'General',
> 36:    titl
> … [truncated, 329 more chars]
> ```

### 🤖 Claude

Looked through the admin. Short answer: **there's no dedicated place** — no Settings → Domains card, and no "View your store" / eye icon next to **Online Store** in the nav, which are the two places real Shopify shows it. The URL only leaks in three spots, none of them labelled as "your store URL":

1. **Product detail → Search engine listing card** — the only place it appears as readable text: `https://demo.shoopify.xyz/products/trail-cap`, plus the same origin as the prefix on the *URL handle* field when you expand the editor ([seo-card.tsx:45](apps/admin/src/app/store/[slug]/products/_components/seo-card.tsx:45)).
2. **Collection detail → "View" button** — opens the live collection page in a new tab, but you only see the URL after it opens ([collection-form.tsx:403](apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx:403)).
3. **Online Store (AI builder) preview** — the iframe points at the real storefront origin, but an iframe hides its URL, so nothing is displayed ([preview-url.ts:8](apps/admin/src/app/store/[slug]/storefront/preview-url.ts:8)).

Otherwise you have to derive it from the admin URL: the slug in `admin.shoopify.xyz/store/**demo**/...` plus the base domain gives you `https://demo.shoopify.xyz`. Signup shops are `https://{slug}.shoopify.xyz`.

The plumbing to fix this is already there — `storefrontOrigin(slug)` is exported and `NEXT_PUBLIC_STOREFRONT_ORIGIN` is set correctly in prod. Want me to add the Shopify-parity surfaces: a preview/eye icon on the Online Store nav row, and the store URL shown in Settings → General (or a Domains card)?
