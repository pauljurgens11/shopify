# H1 — Seed: the full Aurora Supply Co. demo dataset

| | |
|---|---|
| Workstream | H |
| Size | L |
| Depends on | F1 (aurora preset). Schema-only otherwise — do NOT wait for B/C/D services |
| Unblocks | H2, every UI issue's manual acceptance, G3's charts |
| Branch | `ws-h/seed-demo-data` |

## You own
```
packages/db/prisma/seed/**
```

## Context
**The seed is the demo** (SPEC §7). Today it creates one shop + owner and
stops. Every workstream's acceptance testing and all five smoke flows run on
what you write here. Write rows directly with Prisma (`dbAdmin` is
sanctioned in seed); where a service encodes invariants you must honor them
by hand: inventory changes get `InventoryAdjustment` rows, orders get
`OrderEvent` timelines, order numbers consume `OrderSequence`.
Money: **integers only, including here** (CLAUDE.md §9 bans float money in
seeds explicitly).

## Build (SPEC §7 seed list, exactly)
Deterministic (seeded RNG — no `Math.random()` without a fixed seed) and
idempotent (`pnpm db:reset` re-runs it):
1. Shop `demo` / "Aurora Supply Co." (apparel), owner `owner@demo.dev` /
   `password123` (argon2id), a second staff user with partial permissions
   (shows the permissions feature).
2. **2 locations** ("Downtown Store", "Warehouse") with addresses.
3. **~30 products**, apparel-real: names ("Alpine Merino Crewneck"),
   descriptions, vendors, tags, 2–3 options/variants where natural (sizes,
   colors), prices $18–$220 in clean retail points ($68.00, $124.00), images
   from picsum with **stable seeds** (`https://picsum.photos/seed/{handle}-{n}/1200/1500`),
   inventory levels across both locations + matching `received` adjustments.
4. **4 collections**: one MUST have handle `featured` (F1's presets
   reference it), one smart (rule: tag `new`), two manual with positions.
5. **25 customers** with addresses; a few with `passwordHash` (E5 login:
   `jane@example.com` / `password123`), varied acceptsMarketing/tags.
6. **40 orders across 60 days**, weighted toward recent days (charts trend
   up): mixed statuses — most paid+fulfilled (with Fulfillment rows +
   `sold` adjustments), some unfulfilled, 2 partially refunded (Refund +
   PaymentRefund + adjustment), 2 cancelled; every order: correct integer
   totals that actually sum (subtotal − discounts + shipping + tax = total),
   line-item snapshots, timeline OrderEvents, a `Payment` row (mock
   processor, captured) and matching purchase `AnalyticsEvent`.
7. **3 discounts**: `WELCOME10` (10% off order, active — H2 flow (c) uses
   it), an automatic free-shipping over $150, an expired code (shows the
   Expired badge).
8. **Mock processor connected**: `ProcessorConfig` (mock, encrypted dummy
   creds via pay's credentials helper) + one 100% `RoutingRule`.
9. **Published theme**: aurora preset as a published `ThemeVersion` + a
   short `BuilderConversation` history.
10. **Analytics**: browsing events (page/product views, add-to-carts,
    begin_checkouts) over the 60 days at believable ratios
    (sessions ≈ 30×orders) + `AnalyticsRollupDaily` backfill for closed days
    so G3 renders instantly without waiting a rollup cycle.

## Test plan
- The seed IS acceptance: `pnpm db:reset` from scratch, then walk: admin
  login shows populated Home/Orders/Products/Analytics; storefront renders
  themed home with products; `pnpm --filter @merchant/db exec vitest run`
  still green.
- Add one invariant test (`prisma/seed/seed.test.ts`, runs against seeded
  DB): every order's stored totals sum correctly; every InventoryLevel has
  matching adjustment history; counts match SPEC (≥30 products, 40 orders…).
- `pnpm verify` green.

## Landmines
- Coordinate model additions from other PRs: `git pull` right before you
  start and rebase often — the seed touches every domain and is the likeliest
  file to race. Keep it modular (`seed/{catalog,orders,…}.ts`) so rebases
  stay small.
- Order timestamps: `createdAt` spread over 60 days (Prisma allows setting
  it) — analytics charts are the consumer; all UTC.
- No floats, no lorem ipsum, no "Test Product 1" — a Shopify reviewer reads
  these names in the demo.
