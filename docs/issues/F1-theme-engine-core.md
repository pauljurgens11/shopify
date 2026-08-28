# F1 — Theme engine core: render pipeline, core sections, presets

| | |
|---|---|
| Workstream | F |
| Size | L |
| Depends on | — (grab immediately) |
| Unblocks | F2, F3, E2, H1 |
| Branch | `ws-f/theme-engine-core` |

## You own
```
packages/theme-engine/** (render.ts, presets/, sections/ for CORE sections,
  shared/ primitives, sanitize)
packages/contracts/src/theme.ts (additive)
```

## Context
The contract (`contracts/theme.ts`) is the strongest file in the repo — 18
section schemas with `.describe()` on every field (that text is the AI's
prompt), `validateThemeDoc` (now also rejecting footer-in-pages). But the
engine is hollow: **all 17 section components are identical empty
placeholders**, `render.ts` only maps tokens → CSS vars
(`--theme-*`, incl. `--theme-button-style`), there are **no presets** (the
`THEME_PRESETS` names `aurora|monochrome|bloom` exist with zero payloads —
the seed, the no-API-key fallback, and flow (d) of the smoke suite are all
blocked on them), and no sanitizer despite the README promising one.

## Build (SPEC §12)
1. **Render pipeline** (`render.ts`):
   `renderPage(themeDoc, page: 'home'|'product'|'collection', data)` → ordered
   `renderSection` calls (registry already works); export a
   `SectionDataContext` type — core sections receive live data (product,
   collection+products, cart) injected by the storefront (E2), marketing
   sections receive only their settings. Also `renderFooter(themeDoc)`.
2. **Shared primitives** (`shared/`): `ThemeButton` (branches on
   `--theme-button-style`: solid/outline/soft), `ProductCard` (image, title,
   price, hover), `SectionShell` (padding/max-width rhythm) — one visual
   language for F2 to reuse.
3. **Core sections**, real Tailwind implementations consuming `--theme-*`
   vars only (no hardcoded colors):
   - `product-detail`: gallery per `galleryLayout`, title/price/compare-at,
     option pickers, qty, add-to-cart (renders E2's client island via a slot
     prop), vendor/sku toggles, related products row.
   - `collection-page`: heading, sort select, responsive grid (settings
     columns), pagination hooks.
   - `cart-page`: line list, qty, remove, subtotal, checkout CTA.
   - `footer` (doc-level): link columns, newsletter row, copyright.
   - `announcement-bar` (small, but part of the header story).
4. **Sanitizer**: `rich-text`/`image-with-text` bodies accept minimal HTML —
   add `sanitize-html` (server-side, allowlist: p/br/strong/em/a/ul/ol/li/h2/
   h3) wired wherever body HTML renders. This closes the README's promise.
5. **Presets** (`presets/index.ts`): THREE complete, `themeDocSchema`-valid
   ThemeDocs — `aurora` (warm, serif headings — the seed default),
   `monochrome` (stark b/w), `bloom` (soft pastel). Each: all three pages
   populated (hero, featured-collection referencing handle
   `featured` — H1 seeds a collection with that handle; coordinate via this
   sentence, it is the contract), realistic copy for "Aurora Supply Co.".
   Export `presetThemeDoc(name)`.

## Test plan (write first)
- `packages/theme-engine` vitest (jsdom or react render-to-string):
  each preset passes `themeDocSchema.parse` + `validateThemeDoc` with zero
  problems (THE regression gate for the AI loop); sanitizer strips
  `<script>`/`onerror` but keeps `<strong>`; `renderPage` renders every
  section type in the aurora preset without throwing (smoke-render, no
  snapshots). Remove `--passWithNoTests` from the package.
- Acceptance: `pnpm --filter @merchant/theme-engine exec vitest run` green;
  `pnpm verify` green.

## Landmines
- Sections are Server Components — no hooks, no state; interactivity comes
  from slotted client islands owned by E2.
- Every color/font/radius through the CSS vars — hardcode one hex and H2
  flow (d) (theme switch visibly changes the storefront) fails.
- Don't invent section types or settings — the contract is the registry;
  additive settings need `.describe()` text (it feeds the AI).
