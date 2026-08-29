# Dashboard chrome — metric tiles, charts, date range

Source: `admin.shopify.com/store/…/analytics`, 1054×719. Confidence: **high for
structure, none for populated data** (store is empty, every value is €0 / `—`).

**Read this instead of [home.md](home.md) when building our Home.** The store we
captured from serves an onboarding Home, so Analytics is the only place the real
dashboard chrome was visible — and it is the same chrome our Home needs: date range
control, metric tiles, charts, per-card empty states.

## Page header

`⊪ Analytics` on the left. Right-aligned: a `⋯` overflow button, `Try targets ⌄`, and
`New exploration` (primary, dark).

## Filter row — three pills, above the content, not inside a card

Small rounded pill buttons, light fill, each with a leading icon and a trailing `⌄`:

```
[📅 Today ⌄]   [📅 Aug 28, 2026 ⌄]   [⇄ EUR € ]
```

1. **Date range** — `Today`
2. **Compare-to period** — the comparison date, `Aug 28, 2026`
3. **Currency** — `EUR €`

The comparison pill is the detail people recognise: Shopify dashboards always show
current-vs-previous, and every metric carries a delta because of it.

## Metric tiles

A single row of four equal tiles, each its own card, no heading above the row:

- Label, small, dark, with a **dotted underline** (it is a tooltip trigger)
- Value, large and semibold, on the next line
- A delta indicator right after the value — `—` when there is nothing to compare

Labels seen: `Gross sales`, `Returning customer…` (truncates rather than wraps),
`Orders fulfilled`, `Orders`. Values `€0`, `—`, `0`, `0`.

Note the tile does **not** repeat the currency in the label, and the value is the only
large text in the tile.

## Chart cards

Below the tiles, a two-column grid — a wide chart card on the left, a breakdown list on
the right, then a three-column row of smaller cards.

**`Total sales over time`** (left, wide):
- Card heading, dotted-underlined like the tile labels
- Below the heading, the headline value repeated large — `€0.00` — with a `—` delta
- Line chart: y-axis labels `€0` `€5` `€10` left-aligned outside the plot, x-axis
  `12 AM` `4 AM` `8 AM` `12 PM` `4 PM` `8 PM`
- Very light horizontal gridlines, no vertical gridlines, no plot border
- **Two series**: the current period as a solid line, the comparison period as a dotted
  line in a lighter tint of the same hue
- Legend centred *below* the chart: a coloured dot then the date, twice
  (`● Aug 29, 2026`  `● Aug 28, 2026`)

**`Total sales breakdown`** (right, narrow): a vertical list of rows, each
`label · value · delta`. Labels are **links** (blue-ish, clickable), values right-aligned
and monospaced-feeling, delta `—`. Rows seen: `Gross sales`, `Discounts`,
`Sales reversals`, `Net sales`, `Shipping charges`, `Return fees`, `Taxes`,
`Total sales`. Alternating rows carry a very light fill.

Further cards: `Total sales by sales channel`, `Average order value over time`,
`Total sales by product`, `Customer cohort analysis` (a triangular heatmap grid, axes
labelled `Months` and `Cohort`), `Sessions by landing page`, `Sessions by social
referrer`, `Total sales by referrer`, `Performance by referring cha…`.

## Per-card empty state

When a card has no data, the **card heading stays** and the body is replaced by a
centred, subdued line:

```
No data for this date range
```

No illustration, no button, no heading change. This is the third empty-state kind and
the one a dashboard uses — do not put an illustrated empty state inside a metric card.

## Delta vs our build

Compare against `apps/admin/src/app/store/[slug]/` Home and `analytics/`.

1. **Date-range + comparison pills above the cards.** Ours needs at minimum a date-range
   control in the header. The *comparison* pill is what drives every delta indicator —
   if we show deltas, we need a comparison period to justify them. — *worth fixing*
2. **Metric tiles: label above, large value below, delta inline.** Dotted-underline the
   label. Four across. — *cheap win*
3. **Two-series chart with a dotted comparison line and a dot legend below.** A single
   solid line reads as "not Shopify". `@shopify/polaris-viz` supports comparison series
   directly (CLAUDE.md §7). — *worth fixing*
4. **`No data for this date range`** as the per-card empty state, keeping the heading.
   — *cheap win*
5. **Breakdown list card** (label / value / delta rows, labels as links) next to the main
   chart. We have the money data to populate a real one. — *worth fixing*
6. Money: every value here is rendered from integer minor units and formatted at the
   render layer only (CLAUDE.md §5). Nothing on this page changes that rule.
