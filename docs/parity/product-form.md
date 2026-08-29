# Product form — `/products/new`, `/products/:id`

Source: `admin.shopify.com/store/…/products/new`, 1054×719, light theme.
Confidence: **high** — captured in full, top to bottom, both columns.

This is the highest-traffic page in the demo. Get this one right.

## Page chrome

- Header is a **breadcrumb**, not a back-button + title: a small product (tag) icon,
  a `›` chevron, then `Add product` as the page title. There is no button labelled
  "Products" in the header.
- No primary action in the page header. Saving happens **only** through the contextual
  save bar (see below) and a secondary `Save` button pinned bottom-right of the form.
- Two-column layout, left column roughly 2/3, right rail 1/3. Right rail cards are
  visually narrower and stack with the same gap as the left.

## Contextual save bar

Appears the moment the form is dirty. It **replaces the top bar's centre region**
(search field and account controls are covered), it does not push the page down:

```
[!] Unsaved product                              [ Discard ]  [ Save ]
```

- Left: a circled `!` icon then the text `"Unsaved product"`. On an existing product
  this reads `"Unsaved changes"`.
- Right: `Discard` (plain/tertiary) then `Save` (primary, dark). `Discard` is
  `type="reset"`, `Save` is `type="submit"`.
- Clicking `Discard` on a brand-new product returns to the products index. No
  confirmation modal for an untouched form.

## Left column — card order

Top to bottom. **This order is load-bearing** — it is the main thing that makes the
page read as Shopify.

1. **Title + Description** (one card, no card heading)
   - `Title` — text field, placeholder `"Short sleeve t-shirt"`
   - `Description` — a full rich-text editor, not a textarea. Toolbar row:
     formatting-options dropdown showing `Paragraph`, then Bold / Italic / Underline /
     Color / Alignment / `…` (additional controls) and, right-aligned, `</>` Show HTML.
     The overflow set adds: Link, Insert image, Insert video, Insert table, Bulleted
     list, Numbered list, Outdent, Indent, Clear formatting.
   - A `Generate text` (AI) affordance sits in the description toolbar.
2. **Media** (heading `Media`)
   - Empty state is a dashed-border drop zone with two inline actions,
     `Upload new` and `Select existing`, over the caption
     `"Accepts images, videos, or 3D models"`.
3. **Category** (heading `Category`)
   - Single combobox, placeholder `"Choose a product category"`.
   - Help text: `"Determines tax rates and adds metafields to improve search, filters, and cross-channel sales"`
   - *Out of scope for us* (SPEC.md §2 cuts metafields/tax providers).
4. **Price** (heading `Price`)
   - `Price` field prefixed with the store currency symbol, placeholder `0.00`.
   - Below it a row of **collapsed pill-buttons** that expand into fields when clicked:
     `Compare-at`, `Unit price`, `Charge tax` (showing current value `Yes`),
     `Cost per item`, then a `⌄` chevron to expand all.
5. **Inventory** (heading `Inventory`)
   - Right-aligned in the heading row: label `Inventory tracked` + a toggle switch.
   - A small table: column header `Quantity` (tooltip
     `"Inventory at your store that can be sold."`), one row per location — here
     `Shop location` with a number input.
   - Below, the same collapsed-pill pattern: `SKU`, `Barcode`,
     `Sell when out of stock` (showing `Off`), and a `⌄` chevron.
6. **Shipping** (heading `Shipping`)
   - Heading row right side: label `Physical product` + toggle (on by default).
   - `Package` — combobox, help `"Used for single-item orders containing this product"`,
     value renders as two lines: `Store default` / `Sample box - 22 × 13.7 × 4.2 cm, 0 kg`.
   - `Product weight` — number field + unit select (`kg`).
   - Collapsed pills: `Country of origin`, `HS Code`, `⌄`.
7. **Variants** (heading `Variants`)
   - Empty state is a single inline action with a ⊕ icon:
     `"Add options like size or color"`. That is the whole card.
8. **Product metafields** — heading + `Add definition` button, one pill `+ Disclosures`.
   *Out of scope* (SPEC.md §2).
9. **Search engine listing** — heading + pencil edit icon, body
   `"Add a title and description to see how this product might appear in a search engine listing"`.

Below the last card, a `Save` button floats bottom-right of the column.

## Right rail — card order

1. **Status** — heading `Status`, then a select. Options carry help text:
   - `Active` — "Sell via selected sales channels and markets"
   - `Draft` — "Not visible on selected sales channels or markets"
   - `Unlisted` — "Accessible only by direct link"
2. **Publishing** — heading + a small settings/sliders icon top-right. Body is a single
   row: a channels icon then bold `All channels` (a button, opens a picker).
3. **Product organization** — heading + an `ⓘ` info icon top-right.
   - `Type` — combobox, value `None`, search placeholder `"Search or add product type"`
   - `Vendor` — combobox, value `None`, search placeholder `"Search or add vendor"`
   - `Collections` — a bordered `⊕ Add collections` button, search placeholder
     `"Search or add collections"`
   - `Tags` — a bordered `⊕ Add tags` button, search placeholder `"Search or add tags"`
4. **Theme template** — heading `Theme template`, select, value `Default product`.

Note the right rail has **no card headings above Status** and every card heading is the
small heading size, not the page-title size.

## Delta vs our build

Closed 2026-08-29 (WS-B). `apps/admin/src/app/store/[slug]/products/_components/` now
follows this file top to bottom: breadcrumb header, rich-text Description, Price /
Inventory / Shipping as left-column cards above Variants with the collapsed-pill
pattern, Search engine listing, Collections in Product organization (a real
`collectionIds` on the product API), the `Unsaved product` save bar, and the Save
pinned bottom-right of the column.

What is deliberately still missing, and why — each is a control that could not save
anything (CLAUDE.md §8). Do not "fix" these without adding the column first:

| On the real page | Why not here |
|---|---|
| `Category` | SPEC §2 cuts metafields and tax providers, which is all it drives |
| `Product metafields` | SPEC §2 |
| `Theme template` | one product template exists, so the select has one option |
| Price pills `Unit price`, `Cost per item` | no columns on `ProductVariant` |
| Inventory `Track quantity` switch | needs a per-variant tracking flag honoured by cart, checkout and storefront availability — WS-E code, not a form change |
| Shipping `Package`, `Country of origin`, `HS code` | no columns; customs is out of scope |
| Media `Select existing` | there is no media library to select from |
| `Generate text` in the description toolbar | the AI budget is the theme builder (SPEC §12) |

Two more places we knowingly say something different from the capture, because the
capture's copy would be untrue here: Media's caption is `"Accepts images"` rather than
`"Accepts images, videos, or 3D models"`, and Publishing shows a bold `Online Store`
rather than `All channels`, since one channel exists.

The breadcrumb header is now on this page and NOT on the other detail pages
(orders, customers, collections), which still use Polaris `backAction`. Current
Shopify uses the breadcrumb everywhere, so those pages are the drift — rolling it
out is a follow-up, tracked in DECISIONS.md.
