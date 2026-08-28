# PARITY.md — the shared picture of Shopify

**The KPI is "I can't tell it's not Shopify." Not "inspired by" — identical.**
Eight agents building admin pages from memory produce eight interpretations;
this file is the single memory everyone builds from. Every UI issue links
here. If you know Shopify better than a line below, follow Shopify and fix
the line in the same PR (this file is NOT append-only — it converges).

Scope note: 1:1 parity applies to the **admin** and the **checkout**. The
storefront's *design* is ours (AI builder replaces themes — Deviation #2);
its *behavior* (cart, PDP mechanics, speed) still has to feel like a
first-class Shopify store.

---

## Global chrome (A3)

- TopBar: near-black bar full-width; centered **search field** (placeholder
  "Search", shows `Ctrl K`/`⌘K` hint); right side: notifications bell, then
  store avatar chip (initials square + shop name) opening a menu (shop name
  header, "Log out" at bottom).
- Search modal (Cmd+K): dropdown panel anchored under the **search field**,
  roughly its width — not full-bar-width (corrected against current Shopify
  and Polaris `TopBar.searchResults`, A3); results grouped by type (Products,
  Orders, Customers) with title and subtitle; keyboard navigable; "No results
  for …" when a query matches nothing.
- Left nav, exact order, exact labels:
  `Home · Orders · Products (▸ Collections, Inventory) · Customers ·
  Marketing · Discounts · Analytics · Storefront · Apps` — `Settings` pinned
  at the bottom with a gear icon. Orders shows a grey count badge. Subitems
  reveal on section-active, indented, no icons.
- Content area: max-width ~950px centered for forms; full-width for index
  tables; page header = back arrow (detail pages) + title + primary action
  top-right.
- Contextual save bar: dark full-width bar sliding over the TopBar with
  "Unsaved changes" left, `Discard` / `Save` right. Appears the moment a
  form is dirty. Save shows a spinner in-button.
- Toasts: bottom-center, dark, terse past-tense: "Product saved",
  "Order archived", "Discount created". No exclamation marks.

## Index pages (B5, C5, C6, G4)

Anatomy, top to bottom: page title + top-right primary button ("Add
product", "Create discount") → card containing: tabs row (`All` first) →
filter row (search input stretching left, filter buttons, sort button
right) → IndexTable: checkbox column, thumbnail where natural, first column
bold-ish link, status badges inline → footer pagination ("1-50 of N",
prev/next arrows). Selecting rows swaps the header for a bulk-actions bar.
Empty state: centered illustration-sized card, heading + one sentence +
primary button. **Skeleton page on load, never a spinner-only screen.**

## Detail/form pages

- **Product form (B5)**: left column cards — Title+Description; Media
  (drag-drop grid); Variants (option builder → variant table with
  price/available per row); right column cards — Status (Active/Draft
  select); Publishing ("Online Store" channel row); Product organization
  (Type, Vendor, Collections, Tags). Price fields show `$` prefix.
- **Order detail (C5)**: header `#1001` + date + `Paid`/`Unfulfilled`
  badges; left — fulfillment card (line items with qty × price, "Fulfill
  items" button), payment card (Subtotal/Shipping/Tax rows then bold Total,
  then Paid by customer), Timeline (avatar dots, relative dates, comment
  box "Leave a comment..."); right — Notes, Customer (name links out,
  Contact information, Shipping address, Billing address). Actions top-right:
  `Refund`, `More actions ▾`.
- **Discount form (C6)**: method radio Code/Automatic; code field with
  `Generate` link-button; value type segmented control; "Applies to" radios;
  minimum requirements radios; usage limits checkboxes; combined summary
  card on the right listing the rules as bullets; active dates at bottom.
- **Customer detail (C6)**: header with name + "Customer for N months";
  left — last order card, order list; right — Customer card (email,
  marketing badge), Default address, Tags, Notes.
- **Settings (A4/D4/B6)**: settings index is a two-column grid of icon
  cards. Detail pages are narrow single-column with section cards and the
  save bar. Sidebar-of-settings-links is NOT current Shopify — use the grid.

## Badges — exact wording and tone

| State | Text | Polaris tone |
|---|---|---|
| paid | `Paid` | (default subdued) |
| pending | `Payment pending` | attention/warning |
| refunded / partial | `Refunded` / `Partially refunded` | (default) |
| unfulfilled | `Unfulfilled` | attention (yellow) |
| partially fulfilled | `Partially fulfilled` | attention |
| fulfilled | `Fulfilled` | (default subdued) |
| product active | `Active` | success (green) |
| product draft | `Draft` | info (blue) |
| discount states | `Active` / `Scheduled` / `Expired` | success / attention / default |

## Home & Analytics (G3)

- Home: "Good {morning/afternoon}, {shop name}" heading; onboarding guide
  card with progress ("2 of 4 tasks complete"), collapsible task rows with
  checkmark circles; metric cards row below.
- Analytics: date-range picker top-left (`Today ▾` + compare toggle); grid
  of metric cards each = small label, big number, delta arrow+percent;
  full-width Sales-over-time chart; smaller cards in a 2–3 column masonry
  (Top products, Conversion funnel, Sales by channel, Live view). Numbers
  formatted `$1,234.56`; deltas green up / red down.

## Checkout (E4) — faithful to Shopify checkout, not Polaris

- Clean white page, shop name top-left as logotype, breadcrumb-less.
- Left column order: express placeholder row → `Contact` (email, "Email me
  with news and offers" checkbox) → `Delivery` (Country select first, then
  First/Last name pair, Address, Apartment, City/State/ZIP triple row) →
  shipping methods as bordered radio rows with price right-aligned →
  `Payment` ("All transactions are secure and encrypted" subtext, card
  fields in one bordered group: number w/ brand icon, Expiration `MM / YY`
  + CVC pair, Name on card, billing-address radio) → full-width black
  `Pay now` button.
- Right sidebar (grey background): item rows (thumb with grey qty bubble,
  title + variant, price), discount code input + `Apply` button inline,
  Subtotal/Shipping/Taxes rows, `Total` bold with small `USD` prefix.
- Field errors: red border + red text under field. Decline: red banner atop
  Payment section.
- Thank-you page: left — grey map placeholder card with green check
  "Confirmation #… / Thank you, {first name}!", "Order details" card;
  right — same summary sidebar; `Continue shopping` button.

## Words we never render

`Shopify`, Shopify logos/glyphs, `Powered by …`. Brand string is
**Merchant**. Product/UI copy is otherwise Shopify's own phrasing wherever
this file quotes it.
