# C5 — Admin: orders index, detail, fulfill & refund flows

| | |
|---|---|
| Workstream | C |
| Size | L |
| Depends on | A3, C2, C3 |
| Unblocks | H2 flow (b) |
| Branch | `ws-c/orders-admin-ui` |

## You own
```
apps/admin/src/app/store/[slug]/orders/**
apps/admin/src/navigation/items/orders.ts (badge wiring only)
```

## Context
The orders pages are, with the product form, the most-recognized screens in
Shopify — parity here carries the KPI. A3 supplies shell/API-client/skeletons;
C2/C3 supply everything server-side including `refunds/calculate`.

## Build (SPEC §9)
1. **Index**: `IndexTable` — order number (`#1001`), date, customer, channel
   ("Online Store"), total, payment status badge (Polaris `Badge` with the
   exact Shopify tone mapping: paid=success subtle, pending=attention…),
   fulfillment badge, items count. Tabs All/Unfulfilled/Unpaid/Open/Closed;
   search; date sort; pagination at 50. Nav badge = open-orders count.
2. **Detail** (`…/orders/[id]`): Shopify's three-zone layout —
   - Left: line-item card grouped by fulfillment state with "Fulfill items"
     button; payment card (subtotal/discount/shipping/tax/total rows, paid vs
     due, "Refund" button); **Timeline** card (OrderEvents newest-first with
     comment composer posting to C2's events endpoint).
   - Right: customer card (link to C6 detail), contact, shipping address,
     billing address, tags/note.
   - Header: order number + status badges + Cancel action (confirm modal with
     reason select; disabled-with-tooltip when paid — Shopify's rule).
3. **Fulfill page** (`…/orders/[id]/fulfill`): quantity steppers per line
   (default = remaining), location select, optional tracking number/URL,
   "Fulfill items" primary — then back to detail with toast.
4. **Refund flow** (`…/orders/[id]/refund`): line quantity pickers, restock
   checkbox, shipping refund field, live summary from `refunds/calculate`,
   "Refund $X.XX" button with the amount in the label (Shopify behavior).

## Test plan
- Manual acceptance = H2 flow (b) by hand on seeded data: open order →
  fulfill 1 of 2 items → badges flip to "Partially fulfilled" → refund the
  fulfilled item → financial badge updates, timeline shows all three events.
- Money renders via `format()`; totals on screen match API integers exactly.
- `pnpm verify` green.

## Landmines
- Badge tones/wording must match Shopify ("Paid", "Partially refunded",
  "Unfulfilled") — this is the pixel-parity page reviewers screenshot.
- Refund amounts come from `refunds/calculate` — never recompute client-side.
- No order editing, no duplicate-order, no printing — out of scope; don't
  render the buttons.
