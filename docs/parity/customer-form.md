# Customer form — `/customers/new`

Source: `admin.shopify.com/store/…/customers/new`, 1054×719. Confidence: **high**.

## Page chrome

Breadcrumb header: person icon, `›`, title `New customer`. No header actions.
Two-column layout, same proportions as the product form.

## Left column

1. **Customer overview** (heading `Customer overview`)
   - `First name` and `Last name` — **side by side, two equal columns**.
   - `Language` — select, value `English [Default]`, help text
     `"This customer will receive notifications in this language."`
   - `Email` — full-width text field.
   - `Phone number` — a country-flag select (narrow, with a `⌄`) followed by the number
     field on the same row.
   - Three checkboxes, all disabled until an email/phone exists:
     - `"Customer agreed to receive marketing emails."`
     - `"Customer agreed to receive SMS marketing text messages."`
     - `"Customer agreed to receive WhatsApp marketing messages."`
   - A **footer strip inside the card**, visually separated with a light grey fill:
     `"You should ask your customers for permission before you subscribe them to your
     marketing emails, SMS, or WhatsApp messages."`
2. **Default address** (heading `Default address`)
   - Subtitle line `"The primary address of this customer"`.
   - Body is a single full-width bordered row acting as a button:
     `⊕ Add address` with a `›` chevron right-aligned.
3. **Tax details** (heading `Tax details`)
   - `VAT number` — text field, help `"Valid VAT numbers apply the reverse charge
     exemption"` with `reverse charge` as an inline link.
   - `Tax settings` — select, value `Collect tax`.

## Right rail

1. **Notes** — heading + pencil edit icon top-right. Body is subdued placeholder text:
   `"Notes are private and won't be shared with the customer."`
2. **Tags** — heading + pencil edit icon top-right, then an empty bordered input.

Both right-rail cards use the **pencil-icon-in-header** pattern rather than an inline
editable field — the card shows a read-only summary and the pencil switches it to edit.

## Delta vs our build

Closed 2026-08-29 (WS-C). `apps/admin/src/app/store/[slug]/customers/new/page.tsx` now
follows this file: breadcrumb header, two columns, first/last name side by side, the
marketing-consent checkbox over the grey caution strip, Default address as one bordered
`⊕ Add address ›` row, and Notes/Tags as pencil-in-header right-rail cards. The
`Unsaved customer` save bar came with the same pass. The pencil pattern was applied to
the customer *detail* page's Notes and Tags too, so the two pages agree.

Deliberately still missing, each because the control could not save anything
(CLAUDE.md §8 — a cut feature is not rendered at all):

| On the real page | Why not here |
|---|---|
| `Language` select | SPEC §2 cuts i18n; there is one locale |
| SMS and WhatsApp consent checkboxes | no SMS/WhatsApp channel, and no columns for the consent |
| `Tax details` card (`VAT number`, `Tax settings`) | SPEC §2 cuts tax providers |

Two knowing differences from the capture. The phone prefix select shows `🇺🇸 +1` rather
than the flag alone — US and CA both dial `+1`, so flag-only gives no way to see what
the field will save. And the `⊕ Add address ›` row is hand-built from Polaris tokens:
`Button` has `fullWidth`/`textAlign` but cannot put a chevron on the trailing edge, and
that chevron is the pattern.
