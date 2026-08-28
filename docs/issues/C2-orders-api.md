# C2 — Orders API: create, list, detail, timeline, cancel

| | |
|---|---|
| Workstream | C |
| Size | L |
| Depends on | A1 |
| Unblocks | C3, C5, E3, G2, H1 |
| Branch | `ws-c/orders-api` |

## You own
```
apps/api/src/routes/admin/orders/**
apps/api/src/services/orders/**
packages/contracts/src/orders.ts (additive)
```

## Context
Schema (`orders.prisma`) is complete: Order (denormalized Money-int totals,
financial/fulfillment statuses, address JSON snapshots), OrderLineItem
(snapshot columns: title, variantTitle, sku, price), Fulfillment, Refund,
OrderEvent (timeline), OrderSequence (per-shop counter behind `orderNumber`).
Contract `orders.ts` is complete with index-tab definitions. E3 (checkout
complete) is the main producer — it will call your `createOrder` service; the
admin UI (C5) is the main consumer.

## Build (SPEC §7, §9)
1. **`createOrder` service** (`services/orders/create.ts`) — THE entry point
   E3 imports. Input: customer/email, line snapshot data, addresses, totals
   (already computed by C1/E3 — this service records, it does not price),
   discountCodes, shippingLine. In one transaction: claim next `orderNumber`
   (atomic `OrderSequence` update starting at `ORDER_NUMBER_START` = 1001),
   insert order + line items, write `OrderEvent` "Order placed", increment
   discount `usedCount`. Returns the order. Also emits `orders/create`
   webhook + purchase analytics event via the G1 helper when present (stub
   otherwise — one `DECISIONS.md` line).
2. **Routes** under `/admin/api/orders`, `requirePermission('orders')`:
   - `GET /` — cursor pagination, tabs (All/Unfulfilled/Unpaid/Open/Closed →
     status filters per contract), `?query=` (order number, email, customer
     name), sort by date/total.
   - `GET /:id` — full detail: lines, fulfillments, refunds, events, customer,
     payment summary (join `Payment` rows by orderId — read-only here).
   - `POST /:id/cancel` — sets cancelledAt/cancelReason, financialStatus
     `voided` if unpaid (paid orders must be refunded first via C3 —
     Shopify's rule; reject with `conflict` otherwise), restocks via B4's
     adjust service (`reason: 'restocked'`), timeline event, `orders/cancelled`
     webhook.
   - `POST /:id/events` — add a note-type timeline entry (order comments).
3. **Timeline discipline**: every mutation writes an `OrderEvent`
   (`type`, human `message`, `actor`) — C5 renders these verbatim.

## Test plan (write first)
- Vitest (real Postgres): two concurrent `createOrder` calls get distinct
  sequential orderNumbers (the classic race — `Promise.all`, assert 1001/1002);
  cancel of a paid order → `conflict`; cancel restocks exactly the ordered
  quantities; timeline grows with each mutation.
- Acceptance: suite green; `pnpm verify` green.

## Landmines
- Line items are **snapshots** — copy title/sku/price at creation; never join
  live product data into an existing order.
- Totals arrive computed — do not re-derive them here, and never with floats.
- `orderNumber` is display identity; ULID `ord_…` remains the real id
  everywhere (URLs, FKs).
- Draft orders are cut unless time allows (SPEC §2) — do not scaffold them.
