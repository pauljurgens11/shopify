# Collection detail — `/collections/:id`

Source: `admin.shopify.com/store/…/collections/700477931854` ("Home page" collection),
1054×719. Confidence: **high** for structure; the product grid was still loading, which
is itself a useful capture (see Skeletons).

## Page chrome

Breadcrumb header: collection icon, `›`, title `Home page`.
Right-aligned actions: `Duplicate`, `View`, `More actions ⌄` — all secondary, no primary
button (the page saves through the contextual save bar).

## Left column

1. **Title / description card — no card heading, and the fields are inline-editable
   rather than labelled form inputs.** This is unusual and worth copying:
   - A large square **image drop zone on the left** (~145px), dashed border, upload glyph
     centred.
   - To its right, the collection title rendered as **large heading text** (`Home page`),
     not inside a text input.
   - Below it, subdued placeholder text `"Add description"` acting as a click-to-edit
     affordance.
   - Bottom-right of the card: a channels icon then `3 channels` with a `⌄`.
2. **Collection items** — the heading row is three parts on one line:
   `Collection items` (heading) · a count badge `0` · then subdued helper text
   `"Add conditions or products to populate your collection"`.
   - Below: a small toolbar — three view-mode toggles (grid glyph, list glyph, and a
     columns glyph with the number `4` beside it) on the left, and a filter glyph on the
     right.
   - Below that, an active filter chip: `Status: Active, Draft, Unlisted, and Suspended ×`
     followed by a `Clear all` link.
   - Then the product grid.

## Right rail

1. **Products** — heading `Products` with a sort `⇅` control next to it. Body is a
   bordered group containing two stacked full-width rows:
   `⊕ Add condition` and `⊙ Add products`.
   Below the bordered group, a separate outlined button: `+ Exclude`.
2. A second card containing only a centred `+` — an add-block affordance.

## Skeletons

The product grid rendered as a **4-column grid of skeleton tiles**: a large neutral grey
rounded rectangle for the image, and a shorter grey bar beneath it for the caption.

The important part is the scope: the page header, both cards, the card headings, the
view toggles and the filter chip were all **fully rendered** while only the grid region
was skeletonised. Shopify does not blank the page — chrome first, skeleton the data.

That is the pattern our loading states should follow (CLAUDE.md §7 calls for "skeleton
pages while loading" — read it as skeleton *regions*).

## Delta vs our build

Compare against `apps/admin/src/app/store/[slug]/collections/_components/collection-form.tsx`.

1. **Inline-editable title and description over an image drop zone**, rather than a
   labelled `TextField` stack. This is the single distinctive thing about the page.
   — *worth fixing, but check the 20-minute escape hatch (CLAUDE.md §7) before
   hand-building it*
2. **Count badge + helper text on the `Collection items` heading row.** — *cheap win*
3. **Right rail: `Add condition` / `Add products` as a bordered stacked group**, with
   `Exclude` as a separate outlined button below. We have collection rules
   (`apps/admin/src/lib/collection-rules.ts`), so the condition path exists. — *cheap win*
4. **Skeleton scope** — render chrome immediately, skeleton only the item grid. Check we
   are not blanking the whole page. — *worth checking*
5. Filter chip with `Clear all` on the items list. — *cheap win*
6. `3 channels` and the view-mode toggles are out of scope (SPEC.md §2, single channel).
   Omit rather than disable.
