# Home — onboarding variant only ⚠️

Source: `admin.shopify.com/store/…` (store root), 1054×719 and 1316×898.
Confidence: **complete for what it is, but it is not the page we need.**

**Building our Home? Read [dashboard.md](dashboard.md) instead.** That file has the real
dashboard chrome — date range, metric tiles, charts, per-card empty states — captured
from Analytics, which renders it even on an empty store.

## Why this is the wrong page

The captured store is brand new, empty and on a trial, so Shopify serves an
**onboarding Home**. An established store gets a dashboard instead. Our demo store is
Aurora Supply Co., seeded with products, orders and customers (CLAUDE.md §8), so
onboarding cards would look broken on it.

Captured in full anyway, because it is a real page and we may want its *pattern* for a
genuinely empty tenant.

## What the onboarding Home looks like

**No page header at all** — no icon, no title, no action row. Content starts directly
below the top bar.

1. Top-right, floating over the content, a dark rounded pill split into two halves:
   `● Get 3 months for €1/month` | `Select a plan`.
2. Centred, two lines, large (~32px) and semibold:
   `"Welcome to Shopify!"` / `"Where do you want to start?"`
3. A centred AI prompt input, ~640px wide, heavily rounded, white with a light border:
   a Sidekick avatar on the left, then a **rotating placeholder** — observed cycling
   through `"Create a product listing"` and `"Generate product images"` — then a `+`
   and a circular submit arrow on the right.
4. A **two-column grid of large setup cards**. Each card: heading, one or two sentences,
   a big illustration, and a single light button pinned bottom-left. Some cards carry a
   progress row *above* the heading — a circle glyph plus `0 tasks completed` or
   `0 of 5 tasks completed`.

Cards in order:

| Heading | Body | Button |
|---|---|---|
| `Add your first product` | "Start with a title, price, and a photo. You can always add more detail later." | `Add product` |
| `Choose your store design` | "Pick a theme that fits your brand, then customize from there." | `Choose theme` |
| `You're ready to accept payments` | *(below fold, not transcribed)* | — |
| `Name your store` | *(below fold, not transcribed)* | — |
| `Get a custom domain` | "Give your store a branded URL that's easy to find, trust, and remember." | `Set up domain` |
| *(shipping card)* | "Look over the defaults set up for you based on your location." | `Review rates` |
| `Optimize your store in Estonia` | "A personalized setup for your country, markets, payments, and shipping." — `0 tasks completed` | `Get started` |
| `Prepare your store for EU right of withdrawal` | "Set up return and cancellation options for EU orders. Learn more about EU right of withdrawal requirements." — `0 of 5 tasks completed` | `Get started` |

The country-specific cards confirm this whole surface is personalised setup guidance,
not a dashboard.

## Delta vs our build

**Not assessed, deliberately.** Diffing our Home against an onboarding page would
produce misleading findings. Our Home is **unverified** against real Shopify until
someone captures a populated dashboard.

Closest available substitute: [dashboard.md](dashboard.md). Build against that, and
treat this file as reference only for the "brand new tenant" case, if we ever render one.

## To close this gap

Recapture Home from a store that has orders — a Shopify development store with sample
data, or any store past onboarding. Then replace this file and drop the warning. See
[README.md](README.md#extending-this-folder).
