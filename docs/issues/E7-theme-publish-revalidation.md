# E7 — theme publish revalidates the storefront cache

| | |
|---|---|
| Workstream | E |
| Size | S |
| Depends on | E2, F3 (both landed) |
| Unblocks | the demo's publish beat reading as instant |
| Branch | `ws-e/publish-revalidation` |

## You own
```
apps/storefront/src/app/api/**        (new revalidation route handler)
apps/api/src/services/themes/versions.ts  (one best-effort ping from publishVersion)
```

## Context
Publish promises "This replaces what shoppers see on your storefront right
now" — and then does not. `publishVersion`
(apps/api/src/services/themes/versions.ts) flips the rows and returns;
nothing invalidates the storefront's cached theme fetch. The storefront
caches the published theme for 60s (`freshness: { revalidate: 60 }` in
apps/storefront/src/lib/shop.ts) behind another `s-maxage=60`
(packages/config/src/constants.ts), so after Publish the live store can
serve the previous theme for up to ~2 minutes. In a demo that reads as
"publish is broken", and the presenter cannot explain a cache to a
prospect. DECISIONS.md line 224 logged this as accepted-for-now and asked
for exactly this: an E-owned revalidation hook the publish route can call.
H2's flow (d) currently works around it with a 90s poll — after this issue
that poll can shrink to seconds.

## Build
1. A route handler in the storefront (e.g. `POST /api/revalidate`),
   Host-resolved like every storefront route, guarded by an HMAC over the
   shopId with `SESSION_SECRET` (same pattern as F3's preview tokens —
   never an unauthenticated cache-buster).
2. Tag the theme/shop fetches (`revalidateTag`) or revalidate the layout
   path; whichever touches less of WS-E's fetch plumbing.
3. `publishVersion` pings it best-effort after commit: a fetch with a
   short timeout, failure logged and swallowed — a down storefront must
   not fail a publish (same rule as services/orders/notify.ts).
4. `s-maxage` on the themed pages can stay; the CDN header is worthless
   locally and short in prod. The 60s data-cache is the one that lies.

## Acceptance
- Publish from the builder; a hard refresh of `{slug}.lvh.me:3002` within
  ~2s shows the new theme.
- Killing the storefront process does not make publish fail or slow down.
- e2e flow (d)'s publish poll can drop from 90s to <10s and stays green.

## Test plan
- Unit: the revalidation route rejects a bad signature and a foreign shop.
- e2e: tighten flow (d)'s poll budget once the hook lands (same PR or a
  follow-up — don't leave the 90s poll masking a regression).
