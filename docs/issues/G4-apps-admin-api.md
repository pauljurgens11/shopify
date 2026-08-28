# G4 — Apps, Admin REST API tokens, webhooks UI

| | |
|---|---|
| Workstream | G |
| Size | L |
| Depends on | A1 (Bearer resolution), A3, G1 |
| Unblocks | H2 (webhook demo beat), H3 |
| Branch | `ws-g/apps-admin-api` |

## You own
```
apps/api/src/routes/admin/apps/**       (manage apps from the admin)
apps/api/src/routes/api/**              (the public Admin REST API)
apps/admin/src/app/store/[slug]/apps/**
apps/admin/src/navigation/items/apps.ts (config only)
packages/contracts/src/apps.ts (additive — add update/revoke contracts, noted gap)
```

## Context
Schema: `App` (name, apiTokenHash, scopes[]), webhook tables (G1 delivers).
A1 resolves `Bearer shpat_…` → shopId for `/api/*`; `newApiToken()` exists in
config. `contracts/apps.ts` lacks update/rotate contracts — add them.
Scopes: reuse the permission areas
(`read_products|write_products|read_orders|…` mapped from
`constants.PERMISSION_AREAS`).

## Build (SPEC §2 app surface, §13)
1. **Apps management API** (`/admin/api/apps`, `requirePermission('apps')`):
   CRUD; on create generate `shpat_…`, store SHA-256 hash, **return the
   plaintext once**; rotate endpoint (new token, old dead); webhook
   subscription CRUD per app (topic from `WEBHOOK_TOPICS`, url, generated
   secret shown once); `GET /:id/deliveries` — G1's delivery log, newest
   first.
2. **Public Admin REST API** (`/api/*`, Bearer + scope checks, the SPEC §8
   40 req/s rate limit keyed per token):
   a read/write **subset** proving the surface — products (list/get/create/
   update), orders (list/get), customers (list/get). Same contracts, same
   pagination, same error envelope as the internal admin API; implement by
   calling the B1/C2/C4 **services**, never by duplicating query logic.
   Insufficient scope → `forbidden`.
3. **Admin UI**:
   - Apps index: list + "Create app" (Shopify's private-app vibe), empty
     state explaining what apps are for.
   - App detail: **token reveal-once card** (copy button, "shown only once"
     banner — Shopify behavior), scopes checkbox grid, webhooks card
     (subscription rows + add modal with topic select/url/secret-once,
     delivery log table with status badges + lastError popover, "Send test
     event" button firing a ping through G1).
4. `app/uninstalled` webhook on app delete (topic exists in constants).

## Test plan (write first)
- Vitest (real Postgres): token auth end-to-end — created token authorizes
  `/api/products`, rotated token kills the old one; scope enforcement
  (read-only token POSTing → forbidden); per-token rate-limit config applies
  (assert the route config, not 80 real requests).
- Manual: create app in UI, copy token, `curl -H "Authorization: Bearer …"
  localhost:3001/api/products` returns seeded products; test event lands in
  G1's echo receiver with valid HMAC and shows "Delivered" in the log.
- `pnpm verify` green.

## Landmines
- Plaintext token/secret exist only in the create/rotate response — the DB
  stores hashes; the UI shows them exactly once (SPEC §8).
- `/api/*` responses must be envelope-identical to `/admin/api/*` — an
  Admin-API consumer is the "Shopify user" of this workstream's KPI.
- No OAuth app-store flows, no app extensions/embeds — private apps only.
