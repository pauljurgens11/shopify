# C7 — Orders index: wire the filter buttons the API already supports

| | |
|---|---|
| Workstream | C |
| Size | S |
| Depends on | C5 |
| Unblocks | — (parity polish) |
| Branch | `ws-c/orders-index-filters` |

## You own
```
apps/admin/src/app/store/[slug]/orders/page.tsx
```

## Context (found in repo review, 2026-08-29)
`apps/admin/src/app/store/[slug]/orders/page.tsx` passes `filters={[]}` to
`IndexFilters`, while `listOrdersQuery` already accepts `financialStatus` and
`fulfillmentStatus` (and PR #84 made the server compose them with AND). Shopify's
orders index has Payment status / Fulfillment status filter pills; ours renders
none. H3 flagged this on 2026-08-28 ("left for you, confirmed and NOT fixed",
item 3) and it is still on main.

## Build
Two `ChoiceList` filters in the `IndexFilters` `filters` prop — Payment status
(pending / paid / partially_refunded / refunded / voided) and Fulfillment
status (unfulfilled / partially_fulfilled / fulfilled) — mapped to the existing
query params, shown as applied-filter pills, cleared via `onClearAll`. Follow
the Polaris IndexFilters pattern exactly; the products index's vendor filter
(B5, landed in PR #66) is the in-repo reference.

## Acceptance
- Filtering Paid + Unfulfilled shows only such orders, composed with the
  active tab and search (AND semantics, already server-side).
- Pills render, clear individually and via Clear all.
- Tabs, search, sort continue to work unchanged.

## Test plan
None beyond `pnpm verify` — §14 forbids per-page UI tests; the server
composition is already covered by C's suite from PR #84.
