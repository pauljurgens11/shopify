# @merchant/admin

Next.js 15 App Router + Polaris 13. **The most important workstream for the KPI**
(SPEC §9): this is a 1:1 reproduction of the Shopify admin, not an homage.

## Rules

- **Polaris components only.** No Tailwind, no CSS files, no styled-components.
  Default `AppProvider` theme, unmodified.
- **Escape hatch:** if a Polaris component fights you for >20 minutes, build the
  element in plain JSX styled with Polaris CSS custom properties (`--p-*`), so
  the pixels stay identical. Log it in `DECISIONS.md` (SPEC §3).
- **Charts:** try `@shopify/polaris-viz` first; Recharts styled with Polaris
  tokens is the sanctioned fallback.
- Every page needs: skeleton while loading, empty state, contextual save bar on
  dirty forms, and a toast on save. A page without those is not done (SPEC §9).
- Index tables use `IndexTable` with bulk actions, filters, tabs, sort; paginate at 50.

## `'use client'` is mandatory

Every file that imports a Polaris component must start with `'use client'`.
Polaris is built on React context, and a Server Component importing it fails the
build with `TypeError: createContext is not a function` — an error that reads
like a dependency problem but is just a missing directive.

Keep Server Components for data fetching and pass plain data down; the page
itself is a Client Component. That matches SPEC §3's "client-heavy admin".

## Navigation

`src/navigation/` is a **complete, pre-built registry**. Add your area's entry by
editing `items/<area>.ts` — never `index.ts`. See CLAUDE.md §3.

## Data

React Query against `apps/api`, with optimistic updates on toggles. Types come
from `@merchant/contracts/*` — never redeclare a response shape here.
