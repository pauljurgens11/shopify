# Index pages — chrome, tables, bulk actions, empty states

Sources: Products, Orders, Customers, Discounts, Collections indexes. 1054×719 / 1316×898.
Confidence: **medium.** Only one populated table was available (Collections, 1 row), so
column sets, sorting and pagination for Products/Orders/Customers are **not** verified.

## Index chrome, in order

1. Page header — area icon + title, right-aligned actions (see
   [admin-shell.md](admin-shell.md#page-header)).
2. A single card containing everything below.
3. **View tabs row.** On Products: a small `All` pill (the active view) followed by a
   `+` button whose tooltip is `"Create new view"`. Not a full-width tab strip — the
   pills are compact and left-aligned.
   On Collections the view control is instead a combined `All ⌄` selector sitting
   inline at the left of the filter row.
4. **Filter row.** A magnifier + placeholder — `"Search and filter"` on Collections,
   `"Search customers"` on Customers. On Products the search and sort collapse to two
   icon-only buttons at the right of the tabs row (a magnifier-with-filter glyph and a
   sort glyph) while the table is empty.
   Right of the filter input: an icon button for column/view settings.
5. Table, or empty state.
6. Below the card, centred subdued `"Learn more about <resource>"`.

## Table structure (from Collections, populated)

Columns: `☐` (select-all checkbox) · thumbnail · `Title` · `Products` · `Conditions` ·
`S…` (truncated, horizontally scrollable). The table scrolls horizontally inside the
card with a visible scrollbar track at the bottom — the page itself does not scroll
sideways.

Row: checkbox, then a square rounded thumbnail placeholder with a small image glyph when
there is no image, then the title as a **bold, non-underlined link**, then plain cells.

## Bulk actions — this is a real difference

Selecting a row **replaces the table's header row in place**. It is not a floating bar
above the table and not an overlay:

```
☑  1 selected ⌄   [Bulk edit] [Include in sales channel] [Exclude from sales channel] [⋯]      (•—) Show all selected
```

- `1 selected ⌄` is a dropdown (select-all-matching etc.).
- Actions render as small light pill buttons, overflow behind `⋯`.
- Far right: a toggle switch labelled `Show all selected`.

Polaris `IndexTable` with `promotedBulkActions` gives us close to this shape. Check ours
does not render a separate bar that shifts the table down.

## Empty states

Two distinct kinds — using the wrong one is a tell.

### Kind A — full illustrated empty state (Orders, Discounts)

Centred inside the card, generous vertical padding (~250px tall):
illustration → bold heading → one or two lines of subdued body → one primary button.

- **Orders**: heading `"Your orders will show here"`, body `"To get orders and accept
  payments from customers, you need to select a plan. You'll only be charged for your
  plan after your free trial ends."`, button `Select plan`.
  (That body is trial-specific; a real store's copy differs. Use the heading, not the body.)
- **Discounts**: heading `"Manage discounts and promotions"`, body `"Add discount codes
  and automatic discounts that apply at checkout. You can also use discounts with
  compare at prices."` (with `compare at prices` as an inline link), button
  `Create discount`.

### Kind B — split promo empty state (Products)

Left-aligned text block with the illustration set to the **right**, and two buttons:

- Heading `"Add your products"`, body `"Start by stocking your store with products your
  customers will love"`, buttons `⊕ Add product` (primary, dark) and `⇩ Import`.
- Below it, **a second section inside the same card**, separated by a divider:
  heading `"Find products to sell"`, body `"Have dropshipping or print on demand
  products shipped directly from the supplier to your customer, and only pay for what
  you sell."`, button `Discover products to sell`.

### Kind C — filtered/no-match state (Customers)

Small and quiet, no illustration: a magnifier glyph, heading `"No customers match this
segment criteria"`, body `"Try editing the segment to view matching customers"`.
**No button.** This is the state for "the list is fine, your filter matched nothing" —
distinct from "you have none yet".

The Customers index also puts an AI segment box *above* the search bar: a rounded
full-width input with a Sidekick avatar, placeholder `"Describe your segment"`, and a
`⌄` on the right. Out of scope for us.

## Skeletons

The collection detail's product grid renders as grey rounded rectangles in a 4-column
grid — solid neutral blocks with a shorter bar underneath for the caption line. Cards
appear immediately with their heading and filter chrome; only the data region skeletons.
That is the pattern: **chrome first, skeleton only the data**, not a whole-page skeleton.

## Delta vs our build

Not diffed in detail — with an empty source store the column sets we most need to
compare (Products, Orders, Customers) were unavailable. What is safely actionable now:

1. **Empty-state copy and shape.** Match the three kinds above, especially using Kind C
   (quiet, no button) for filtered-to-zero rather than reusing the illustrated state.
   Our tables should never show "Add your first product" when a filter simply matched
   nothing. — *cheap win, high realism*
2. **`Learn more about <resource>` footer link** under every index card. — *cheap win*
3. **Bulk actions in the header row**, not a bar above the table. — *check ours*
4. **Skeleton scope** — chrome renders immediately, only the data region skeletons.
5. Do **not** copy Shopify's illustrations (README.md, "Do not"). Our empty states need
   our own art or none.
