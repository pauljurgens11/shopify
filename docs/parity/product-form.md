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

Diffed against `apps/admin/src/app/store/[slug]/products/_components/product-form.tsx`
at capture time. Ranked by how much each costs us on the KPI.

1. **Price and Inventory belong in the LEFT column as their own cards.** We currently
   fold pricing and stock into `VariantsCard`. Real Shopify shows Price and Inventory as
   top-level left-column cards *above* Variants, and only moves per-variant pricing into
   the variants table once options exist. This is the biggest structural difference on
   the page. — *worth fixing*
2. **Card order.** Ours is Title/Description → Media → Variants. Shopify's is
   Title/Description → Media → Category → Price → Inventory → Shipping → Variants → …
   Even dropping the out-of-scope cards, Price/Inventory/Shipping sit between Media and
   Variants. — *worth fixing*
3. **`Collections` is missing from Product organization.** We render Product type,
   Vendor, Tags. Shopify has Type, Vendor, **Collections**, Tags. We do have collections
   in the product model, so this is a real gap. — *worth fixing*
4. **Page header.** We use `Page backAction={{content:'Products'}}` + `title`. Shopify
   renders an icon + `›` breadcrumb. Polaris `Page` `breadcrumbs`/`backAction` renders an
   arrow button, which is the older look. Low cost, decide in DECISIONS.md. — *cosmetic*
5. **Description is a rich text editor**, ours is `TextField multiline={6}`. We already
   track `descriptionIsRich`, so the data side exists. A full editor is a big lift; a
   cheap 80% is a small formatting toolbar. — *judgement call, log it*
6. **`Search engine listing` card is absent** from our form. Cheap to add and it makes
   the page look complete. — *cheap win*
7. **Publishing card.** Ours prints static subdued text `Online Store`. Shopify shows a
   bold, clickable `All channels` row with a channels icon and a settings glyph in the
   card header. We only have one channel (SPEC.md §2), so keep it non-interactive — but
   match the visual weight rather than using subdued body text. — *cheap win*
8. **Missing: Category, Shipping, Product metafields, Theme template.** Category and
   metafields are explicitly out of scope. Shipping (weight) and Theme template are
   judgement calls — Theme template is near-free given the theme engine exists.
9. **The collapsed-pill pattern** (`Compare-at`, `SKU`, `Barcode`, `Sell when out of
   stock` as pill-buttons that expand) is distinctive current-Shopify and we use nothing
   like it. If we add the Price/Inventory cards, use this pattern — it is what makes
   those cards look right rather than like generic forms.
