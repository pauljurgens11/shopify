# C6 — Admin: customers + discounts pages

| | |
|---|---|
| Workstream | C |
| Size | L |
| Depends on | A3, C4, C1 |
| Unblocks | H2 flow (c) setup, H3 |
| Branch | `ws-c/customers-discounts-ui` |

## You own
```
apps/admin/src/app/store/[slug]/customers/**
apps/admin/src/app/store/[slug]/discounts/**
apps/api/src/routes/admin/discounts/** + services/discounts/routes glue
apps/admin/src/navigation/items/{customers,discounts}.ts (config only)
```

## Context
C1 shipped the pure engine and the contract; the **discount CRUD routes do
not exist yet — they are part of this issue** (thin persistence over the
contract, `requirePermission('discounts')`, pagination + `?query=`). C4
shipped customers. A3 supplies the shell.

## Build (SPEC §9)
**Layout authority: [PARITY.md](PARITY.md). It overrides your memory of Shopify — read your page's section before writing JSX.**

1. **Customers index**: `IndexTable` — name, email subscription state, orders
   count, amount spent; segment tabs from C4 (`All/New/Returning/Abandoned
   checkouts`); search; pagination.
2. **Customer detail**: header with name + quick stats (amount spent, orders);
   left — last order card + order history list (C4's `/:id/orders`); right —
   customer card (contact, marketing status, default address, note editor,
   tags). Address add/edit modal with default toggle.
3. **Discounts API**: CRUD routes persisting `Discount` rows; validate with
   the contract; unique code per shop → `conflict`; status derives from the
   date window where obvious.
4. **Discounts index**: `IndexTable` — title/code, type ("Amount off order"…),
   status badge (Active/Scheduled/Expired), used count. Create-button split
   menu with the three types (Shopify pattern).
5. **Discount form**: per type — method radio (code vs automatic; code input
   with "Generate" button), value (percentage or fixed with currency prefix),
   appliesTo picker (all / specific collections / specific products — modal
   pickers from B3/B1 lists), minimum requirement radios, usage limits
   checkboxes, active dates (date pickers + optional end). Summary card on
   the right rendering the rules as prose (Shopify's "Type · Details" card).

## Test plan
- Vitest for the discount routes only where behavior exists: unique-code
  conflict; the form's payload round-trips through contract validation
  (one test, not per-field).
- Manual acceptance: create the "WELCOME10" percentage code exactly as H2
  flow (c) needs; verify it appears Active; customers pages render seeded
  data with correct aggregates.
- `pnpm verify` green.

## Landmines
- Fixed-value inputs are dollars-as-strings in the UI, integers on the wire
  (`fromDecimal`) — mirror B5's pattern.
- Status is time-derived at read; don't build a cron to flip statuses.
- No customer email sending, no discount combination matrix UI (C1's stacking
  rules are fixed) — out of scope.
