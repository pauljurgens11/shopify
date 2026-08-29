# Admin shell — top bar, navigation, page header

Source: every page captured. Confidence: **high**.
Owner: workstream A (CLAUDE.md §3 — the shell is A's; leaf nav files are yours).

## Top bar

Full-bleed, **near-black** (not white, not Polaris' older light frame), ~68px tall at
1316px wide, and it spans the full window width *above* the nav — the nav starts below
it, it is not an L-shape.

Left → right:

1. Shopify wordmark + glyph, white, ~24px tall.
2. **Search field, horizontally centred and wide** (~750px at a 1316px viewport, capped).
   Rounded, dark grey fill slightly lighter than the bar, magnifier icon, placeholder
   `"Search"`, and a right-aligned `⌘` `K` chip pair rendered as two small keycaps.
3. Right cluster: a Sidekick (AI) glyph, a bell with a red numeric badge for unseen
   alerts, then a square rounded avatar with the store's initials on a bright green fill,
   followed by the store name in white.

On a store in trial there is also a `View as` pill left of the right cluster.

The centred wide search box is the single most recognisable thing about the current
admin. A left-aligned or narrow search reads as "not Shopify" immediately.

## Navigation

Light grey column (~240–300px), starts below the top bar, full height, `Settings`
pinned at the bottom.

Item rows: icon + label, ~35px tall, generous horizontal padding. The **active item is a
white rounded pill** spanning the column's inner width with a soft shadow — not a
coloured bar, not a tint.

Order, verbatim:

```
Home
Orders
  Drafts                    (sub-item, shown when Orders is active)
Products
  Collections
  Inventory
  Purchase orders
  Transfers
  Gift cards
Customers
  Segments
  Companies
Growth
Discounts
Content
Markets
Finance
Analytics

Sales channels  >           (section header, collapsible)
  Online Store              (row reveals "Edit theme" + "View your online store" on hover)
  Agentic

Apps  >                     (section header)
  ⊕ Add

Settings                    (pinned bottom)
```

Sub-items only appear under the **currently active** top-level item — they are not all
expanded at once. Sub-item rows are indented, unindented icon column, and the parent
shows a small `└` elbow connector when a child is active.

Section headers (`Sales channels`, `Apps`) are bold, smaller, with a `>` disclosure and
no icon.

### What this means for us

Our nav registry (`apps/admin/src/navigation/`) should match the top-level order and,
where we build the feature, the sub-item order. Items behind SPEC.md §2 (Markets,
Finance, Growth, Purchase orders, Transfers, Gift cards, Companies, Agentic) should be
**absent, not disabled** — CLAUDE.md §8: a cut feature's UI element either works or is
not rendered.

## Page header

- Small area icon, then a `›` chevron, then the page title. On index pages the icon +
  title only (`⊘ Products`, `⊟ Orders`, `⊘ Collections`, `☺ Customers`).
- Title is large but not huge — roughly 20px, semibold.
- Actions sit **right-aligned on the title row**:
  - Products index: no actions when empty
  - Orders index: `More actions ⌄`
  - Customers index: `Export` `Import` `Add customer` (primary, dark)
  - Discounts index: `Export` (disabled) `Create discount` (primary, dark)
  - Collections index: `Add collection` (primary, dark)
  - Collection detail: `Duplicate` `View` `More actions ⌄`
- Primary buttons are **dark/near-black with white text**, secondary are light grey
  with a subtle border. There is no blue primary anywhere in the current admin.

## Contextual save bar

See [product-form.md](product-form.md#contextual-save-bar). It covers the centre of the
top bar rather than pushing content down — worth checking our `SaveBar` does the same.

## Footer line

Index pages end with a centred, subdued help link below the card:
`"Learn more about orders"`, `"Learn more about discounts"`, `"Learn more about
customers"`, `"Learn more about collections"`. Cheap detail, adds a lot of realism.

## Delta vs our build

Closed 2026-08-29 (WS-A). `apps/admin/src/components/shell/` and
`apps/admin/src/navigation/` now follow this file:

- **Top bar** — the wordmark rides beside the bag through `TopBar`'s `logoSuffix`
  (`Frame.logo` takes an image src only), and the shortcut hint is two keycaps,
  `⌘`/`K` on a Mac and `Ctrl`/`K` elsewhere.
- **Navigation** — `Sales channels` and `Apps` are real `Navigation.Section`
  headers. The shop's own channel is `Online Store`, not `Storefront`; Deviation
  #2 changes what the page behind it *is*, not what the row is called. `fill`
  moved to the last visible section so the groups stack from the top and
  `Settings` stays pinned at the bottom even for a staff user who cannot see a
  whole section.
- **Page header** — `components/shell/page-breadcrumb.tsx` gained an INDEX mode
  (omit `backUrl`: the icon renders unlinked, with no chevron — `⊘ Products`),
  plus `subtitle` and `titleMetadata`, and is now on **every** admin page rather
  than the three detail pages that had it. Every remaining Polaris `backAction`
  is gone, which closes the follow-up
  [product-form.md](product-form.md#delta-vs-our-build) logged.
- **Footer line** — already shipped as `IndexFooterHelp` in
  `components/shell/index-chrome.tsx` (see
  [index-tables.md](index-tables.md)); nothing to add.
- **Contextual save bar** — verified, no change needed: Polaris paints it at
  `0,0` over the full width of the top bar and the page below does not move.

Deliberately not built, and why:

| On the real page | Why not here |
|---|---|
| Red numeric badge on the bell | nothing in the product generates staff notifications; a hard-coded count is a lie, and inventing a feed is not a shell change |
| Sidekick (AI) glyph, `View as` pill | SPEC §2 — no admin AI assistant, no trial state |
| `Growth`, `Content`, `Markets`, `Finance`, `Drafts`, `Segments`, `Companies`, `Purchase orders`, `Transfers`, `Gift cards`, `Agentic` | SPEC §2, so absent rather than disabled (CLAUDE.md §8). `Marketing` keeps `Growth`'s slot between Customers and Discounts |
| `⊕ Add` row under the `Apps` header | it opens Shopify's app store; our row is `Custom apps`, named for the page it actually opens |
| Customers index `Export` / `Import`, Discounts index disabled `Export` | no endpoint behind either |
| Collection detail `Duplicate` / `View` | not built; see [collection-detail.md](collection-detail.md) |
| 68px bar, ~750px search field | Polaris v13 ships Shopify's own `--pg-top-bar-height` and caps the search column at 30rem. README: the pixels are not the authoritative part, and overriding them means custom CSS (CLAUDE.md §7) |
