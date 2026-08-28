# G3 — Admin: Analytics dashboard + Home

| | |
|---|---|
| Workstream | G |
| Size | L |
| Depends on | A3, G2 |
| Unblocks | H2 (demo walkthrough), H3 |
| Branch | `ws-g/analytics-home-ui` |

## You own
```
apps/admin/src/app/store/[slug]/analytics/**
apps/admin/src/app/store/[slug]/(home)/** (the Home page)
apps/admin/src/navigation/items/{analytics,home}.ts (config only)
```

## Context
G2 supplies overview/series/top-products/funnel/live endpoints. Charts:
**try `@shopify/polaris-viz` first** (exact Shopify look; add it to
`apps/admin` deps); sanctioned fallback is Recharts styled with `--p-*`
tokens (SPEC §3) — if you fall back, one `DECISIONS.md` line. The seed (H1)
gives 60 days of history, so charts must look alive by default.

## Build (SPEC §9, §13)
1. **Analytics page**: Shopify's dashboard grid —
   - Date-range picker (Today / 7d / 30d / 90d presets + comparison toggle).
   - Metric cards: Total sales, Orders, Conversion rate, AOV — value +
     delta% with up/down arrows in Shopify's tone colors.
   - Sales-over-time line/area chart (the hero chart).
   - Conversion funnel card (sessions → … → purchase, dropoff %).
   - Top products list (name, units, revenue).
   - Live view-lite card ("Right now": visitors last 30 min, orders today)
     polling `GET /live` every 30s.
2. **Home page**: Shopify's Home —
   - Greeting header ("Good afternoon, Aurora Supply Co.").
   - Metrics row (today's sales/orders/sessions from G2 overview).
   - **Onboarding guide card** (SPEC §8): checklist from
     `Shop.onboarding` JSON — "Add your first product", "Customize your
     storefront", "Connect a payment processor", "Place a test order" —
     checked automatically from real state (product count, published theme,
     processor config, order count — one cheap aggregate endpoint or reuse
     overview), each linking to the relevant page, with completion progress
     bar. This is the first screen of the demo walkthrough.
3. Skeletons for every card; empty-state variants (a brand-new shop shows
   "No sales yet" gracefully — flow (e) creates one live).

## Test plan
- Manual acceptance on seed: numbers on Analytics match a psql spot-check of
  seeded orders for the same range (do it once, paste the query in the PR);
  range switch updates all cards; new shop (signup) Home shows the
  onboarding guide with only the truthy checkmarks.
- `pnpm verify` green.

## Landmines
- Charts render integer-minor-unit revenue through `format()` — a chart
  showing 129900 instead of $1,299.00 is the classic slip.
- polaris-viz gets 20 minutes to behave (its peer ranges may fight React 19
  like Polaris did — check `pnpm.peerDependencyRules`); then Recharts +
  tokens + DECISIONS line. Do not hand-roll SVG charts.
- No custom date-picker builds — Polaris DatePicker/OptionList patterns.
