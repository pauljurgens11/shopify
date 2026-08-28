# @merchant/theme-engine

Section registry and React renderers for the AI-built storefront (SPEC §12).
Owner: WS-F.

## Safe by construction

A theme is **data, never code**. Sections receive validated `settings` and the
data the storefront injected — nothing else: no arbitrary HTML, no injected CSS,
no runtime fetches. Every string of HTML goes through `<RichHtml>`, which
sanitizes with an allowlist (`shared/sanitize.ts`). This is what makes it safe
to let a model author a storefront.

## The pipeline

```ts
import { googleFontsHref, renderFooter, renderPage, themeCssVariables } from '@merchant/theme-engine/render';
import { presetThemeDoc } from '@merchant/theme-engine/presets';

const doc = presetThemeDoc('aurora');           // validated ThemeDoc
<link rel="stylesheet" href={googleFontsHref(doc.tokens)} />
<body style={themeCssVariables(doc.tokens)}>    // --theme-* custom properties
  {renderPage(doc, 'product', data)}            // data: SectionDataContext
  {renderFooter(doc, data)}
</body>
```

`SectionDataContext` (`src/context.ts`) is the contract with WS-E: the
storefront resolves the product / collection / cart and the handles the model
referenced, and passes them in. Sections are **Server Components** — no hooks,
no state. Every interactive control (add to cart, quantity stepper, sort,
dismiss) arrives as a **slot** the storefront owns; a missing slot renders
nothing rather than a control that looks live and isn't.

## Adding to a section

All 18 section types from SPEC §12 already exist in `src/sections/`. Fill in the
component; do not edit the registry map in `sections/index.tsx` (CLAUDE.md §3).

New setting → add it to that section's schema in
`@merchant/contracts/theme` **with a `.describe()`**. That description is what
the model reads when it builds a theme, so it is prompt text, not a comment.

Build on `src/shared/`: `SectionShell` (rhythm + max width), `ThemeButton`,
`ProductCard`, `Price`, `RichHtml`, `productGridClass`. One visual language.

## Styling

Tailwind only, driven by CSS custom properties from `themeCssVariables()`.
Never hardcode a colour or a font — a section that does will ignore the shop's
tokens, and `render.test.tsx` fails the build for it.

Two consequences worth knowing:

- **Button style is resolved at token time.** CSS cannot branch on the *value*
  of a custom property, so `themeCssVariables` derives `--theme-button-bg/-fg/
  -border` from `tokens.buttonStyle`. `ThemeButton` just reads them.
- **Column counts must be literal class names.** Tailwind scans source text, so
  `` `lg:grid-cols-${n}` `` produces no CSS. Use `shared/grid.ts`.

> **WS-E:** Tailwind 4 does not scan `node_modules`, so the storefront's
> `globals.css` needs `@source "../../../../packages/theme-engine/src";` or none
> of these classes are emitted.
