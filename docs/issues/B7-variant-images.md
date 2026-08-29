# B7 — variant images: populate `variantIds`, or the PDP gallery can never swap

| | |
|---|---|
| Workstream | B (form + API), with one read already waiting in E |
| Size | M |
| Depends on | B5 (landed) |
| Unblocks | PDP variant → image swap (PARITY §Motion "instant, client-side") |
| Branch | `ws-b/variant-images` |

## You own
```
apps/admin/src/lib/product-draft.ts
apps/admin/src/app/store/[slug]/products/_components/**   (media card)
apps/api/src/services/catalog/products.ts                 (write passthrough already exists)
apps/storefront/src/components/product-form.tsx           (gallery swap — coordinate with WS-E)
```

## Context (found in repo review, 2026-08-29, contracts sweep)

`productImageSchema.variantIds` is a three-way dead seam:

- **Readers exist and wait**: `services/storefront/products.ts:62`,
  `services/cart/cart.ts:90` and `services/inventory/query.ts:171` all do
  `images.find((i) => i.variantIds.includes(variant.id))` — variant-specific
  imagery on the PDP, in the cart line and in the inventory row.
- **No writer exists**: the admin's `ImageDraft` is `{id?, url, altText}` —
  `product-draft.ts` drops `variantIds` on load and omits it on save. The
  seed writes `[]` for every image.
- **Worse than absent**: the form sends `images` in full on every save and
  the product PUT replaces the image set — so any `variantIds` that ever
  existed (e.g. written via the Admin REST API) are silently erased by the
  next save from the product form.

Net effect: switching Colour on a PDP never changes the picture, cart lines
always show the hero shot — and H4's handoff note ("variant select never
swaps the gallery image; `variant.imageUrl` is read nowhere") is the same
seam seen from the storefront side.

## Build

1. Carry `variantIds` through `ImageDraft` untouched (load → save), so the
   form stops erasing data it does not edit. This alone is the S-sized core.
2. Media card affordance to assign an image to variant option values (Shopify
   does this per variant row's thumbnail; a simple per-image variant
   multi-select is enough at this scale).
3. Seed: give the 2-photo products a per-variant assignment where it reads
   naturally (colour-varying products), so the demo shows the swap.
4. Storefront PDP: swap the gallery image on variant select using
   `variant.imageUrl` (already populated server-side). WS-E owns
   `product-form.tsx` — coordinate or hand off that hop.

## Acceptance
- Saving a product from the admin form leaves existing `variantIds` intact.
- A variant with an assigned image shows it on the PDP when selected, and in
  its cart line.
- `pnpm e2e` stays green.

## Test plan
- `product-draft.test.ts`: a loaded image with `variantIds` survives the
  draft → input round trip byte-identically.
- One storefront/products service assertion: `variantImage()` picks the
  assigned image over `images[0]`.
