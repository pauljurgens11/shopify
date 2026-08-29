# Home — onboarding variant, fully captured

Source: `admin.shopify.com/store/…` (store root), 1054×719 and 1316×898.
Confidence: **high for this variant** — complete accessibility-tree capture, every card,
every button label and href transcribed. Re-verified after a hard refresh.

**Confidence that this is the Home we should clone: still low.** See below.

## Two variants, and which one we need

Shopify serves Home in (at least) two forms:

- **Onboarding Home** — what this file documents. Setup cards, no dashboard, no page
  header. Served to new/empty stores.
- **Dashboard Home** — metric tiles, charts, date range. Served to established stores.

Our demo store is Aurora Supply Co., seeded with products, orders and customers
(CLAUDE.md §8), so **we need the dashboard variant**.

The account available for capture has exactly one store, it is empty, and it is on a
trial without a plan — and the Orders page states plainly that the store cannot take
orders until a plan is selected. So this store can never reach the state that flips Home
to the dashboard. **A populated Dashboard Home is not obtainable from this account.**
Re-checked with a hard refresh: the onboarding variant is deterministic here, not a
loading artifact.

→ **Build our Home from [dashboard.md](dashboard.md)**, which captures the real dashboard
chrome — date-range picker, comparison period, metric tiles, two-series charts, per-card
empty states — from Analytics, which renders it even with zero data.

This file is complete and accurate for the onboarding case. Use it if we ever render a
genuinely empty tenant; do not use it for the seeded demo.

## Layout

**No page header** — no icon, no title, no action row. Content begins directly under the
top bar. The whole page is centred in a single column, not the usual two-column card grid.

1. **Trial promo pill**, top-right, floating over the content: a dark rounded pill split
   in two — `● Get 3 months for €1/month` and a `Select a plan` link
   (→ `/subscribe/checkout`).
2. **Welcome heading**, centred, two lines, ~32px semibold — a single heading element
   containing `"Welcome to Shopify!"` and `"Where do you want to start?"`.
   The block carries `Close` and `Dismiss` buttons.
3. **AI prompt input**, centred, ~640px, heavily rounded, white with a light border.
   Sidekick avatar left; `Add files and more` (`+`) and `Send` (`↑`) buttons right.
   The placeholder **rotates** — observed values: `"Create a product listing"`,
   `"Generate product images"`, `"Help me get started"`, `"Help me find a business idea"`.
4. **Setup cards** — a `<ul>` rendered as a two-column grid. Each card is itself a
   button (the whole card is clickable), containing: an optional badge or progress line,
   a heading, one or two sentences, an illustration, and a single light action button
   pinned bottom-left. **Every card has its own `Dismiss card` button.**

## Setup cards — complete, in order

| # | Heading | Body | Action | Extra |
|---|---|---|---|---|
| 1 | `Add your first product` | "Start with a title, price, and a photo. You can always add more detail later." | `Add product` → `/products` | |
| 2 | `Choose your store design` | "Pick a theme that fits your brand, then customize from there." | `Choose theme` → `/themes` | |
| 3 | `You're ready to accept payments` | "Review settings to accept more payment methods and add a payout account." | `Review payments` → `/settings/payments` | |
| 4 | `Name your store` | "Customers will see this across your storefront, emails, and checkout." | `Add name` (opens a modal, not a link) | |
| 5 | `Get a custom domain` | "Give your store a branded URL that's easy to find, trust, and remember." | `Set up domain` → `/settings/domains` | badge `Get €15 back` |
| 6 | `Review shipping rates` | "Look over the defaults set up for you based on your location." | `Review rates` → shipping profile | |
| 7 | `Optimize your store in Estonia` | "A personalized setup for your country, markets, payments, and shipping." | `Get started` | progress `0 tasks completed` |
| 8 | `Prepare your store for EU right of withdrawal` | "Set up return and cancellation options for EU orders. `Learn more` about EU right of withdrawal requirements." | `Get started` | progress `0 of 5 tasks completed` |

Cards 7–8 are country-specific (this store is registered in Estonia), which confirms the
whole surface is personalised setup guidance rather than a dashboard.

Progress lines render **above** the heading as a circle glyph plus text. Cards 1–6 have
no progress line.

## Patterns worth stealing, even though we skip this page

- **Every card independently dismissible**, and the welcome block too. Onboarding is
  treated as disposable chrome, not permanent furniture.
- **The whole card is the click target**, with the button as a visual affordance rather
  than the only hit area.
- **Progress as `N tasks completed` / `N of M tasks completed`** above the heading —
  a cheap, legible pattern if we ever build a setup guide.

## Delta vs our build

**None, deliberately.** Diffing our seeded Home against an onboarding page would produce
confident, wrong findings. Our Home is **unverified** against real Shopify.

Nearest verified substitute: [dashboard.md](dashboard.md).

## To close this gap for real

Needs a Shopify store that is past onboarding — a development store with sample data
installed, or any store with order history. Then capture Home and replace this file.
Priority queue in [capture.md](capture.md).
