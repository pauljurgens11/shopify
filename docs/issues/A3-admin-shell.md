# A3 — Admin shell: Frame/TopBar/Navigation, login, API client

| | |
|---|---|
| Workstream | A |
| Size | L |
| Depends on | A1 (login endpoint; shell layout can start before it lands) |
| Unblocks | every admin UI issue (A4, B5, B6, C5, C6, D4, F4, G3, G4) |
| Branch | `ws-a/admin-shell` |

## You own
```
apps/admin/src/app/** (login page, /store/[slug] layout + route group)
apps/admin/src/components/shell/**
apps/admin/src/lib/** (new: api-client, hooks, session)
```
Do NOT edit `apps/admin/src/navigation/items/*` (other workstreams' leaf files).

## Context
Only `Providers` (React Query + Polaris `AppProvider`) and a placeholder
`page.tsx` exist. The navigation registry (`src/navigation/index.ts`) is
complete — SPEC §9's exact structure with icons, orders badge, bottom-pinned
Settings — and currently has zero consumers. Admin pages are Client Components
(logged decision — Polaris breaks in Server Components). **This is the KPI
workstream's foundation: the shell is the first thing a Shopify user sees.**

## Build (SPEC §8, §9)
1. **Login page** at `/login`: replicate Shopify's login look with Polaris —
   centered card, "Merchant" wordmark (never the Shopify name/logo), email +
   password, error banner on 401. Posts to api `/auth/login` with
   `credentials: 'include'` and the `x-requested-with` CSRF header.
2. **Route group** `/store/[slug]/…` mirroring `admin.shopify.com/store/{slug}`
   (SPEC §6). Its layout renders the Polaris **Frame**:
   - **TopBar**: dark bar, global search field (Cmd+K opens a search modal —
     stub results are fine), notifications bell, shop avatar menu with shop
     name + logout.
   - **Navigation**: render from `NAVIGATION`/`MAIN_NAV`/`BOTTOM_NAV` in
     `src/navigation/index.ts`; selected state from the pathname; hide items
     the session's permissions lack (Shopify behavior, SPEC §8).
   - Unauthenticated → redirect to `/login`; `/` → redirect to
     `/store/{slug}/` for the session's shop.
3. **API client** (`src/lib/api.ts`): tiny typed fetch wrapper — base URL from
   env, `credentials: 'include'`, CSRF header on mutations, parses the SPEC §5
   error envelope into a typed `ApiError`, re-exports React Query helpers
   (`useApiQuery`, `useApiMutation`) so every workstream consumes the same
   plumbing. Handle 401 by redirecting to `/login`.
4. **Page scaffolding for everyone**: a `PageSkeleton` wrapper (Polaris
   `SkeletonPage`) and a shared `Toast` context, so leaf pages get
   loading/toast behavior for free.
5. Placeholder routes: every nav destination renders a Polaris empty state
   ("coming online") rather than 404 — a dead nav item is a KPI failure, and
   leaf issues will replace them.

## Test plan
- No component tests (SPEC §14 forbids them). Verification is running it:
  `pnpm dev`, log in as `owner@demo.dev` / `password123`, and check — Frame
  renders, nav matches SPEC §9's list and order exactly, search modal opens on
  Cmd+K, logout works, deep-link to `/store/demo/products` while logged out
  bounces to login and back after auth.
- `pnpm verify` green (typecheck is the real gate here).
- The H2 smoke flow (a) "staff login" will run through this — keep stable
  selectors: give the login inputs `name="email"` / `name="password"`.

## Landmines
- Polaris v13 components only, no custom CSS beyond `--p-*` tokens; 20-minute
  escape hatch → plain JSX with tokens + a `DECISIONS.md` line (CLAUDE.md §7).
- Never render the Shopify name or logo — brand is "Merchant".
- Don't invent nav items or reorder them — the registry is the SPEC §9 list.
- Other workstreams import your `src/lib/api.ts`; breaking its signature later
  needs a `DECISIONS.md` line first.
