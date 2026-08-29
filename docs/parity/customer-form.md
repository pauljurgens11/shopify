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

Compare against `apps/admin/src/app/store/[slug]/customers/`.

1. **First name / Last name must be side by side.** Stacking them is an instant tell.
   Polaris `FormLayout.Group` does exactly this. — *cheap win*
2. **The marketing-consent checkbox + grey footer strip** is most of what makes this
   card look like Shopify's. We support email marketing consent in the model; render at
   least the email checkbox and the footer caution text. SMS/WhatsApp are out of scope —
   omit them rather than disabling them (CLAUDE.md §8). — *worth fixing*
3. **Default address as a bordered `⊕ Add address` row with a trailing chevron**, not a
   set of always-visible address fields. — *worth fixing*
4. **Notes and Tags as separate right-rail cards** with the pencil-edit affordance.
   — *cheap win*
5. `Language` and `Tax details` are out of scope (SPEC.md §2 cuts i18n and tax
   providers). Omit both cards; do not render them disabled.
