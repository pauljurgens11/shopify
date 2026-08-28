# @merchant/theme-engine

Section registry and React renderers for the AI-built storefront (SPEC §12).
Owner: WS-F.

## Safe by construction

A theme is **data, never code**. Sections receive validated `settings` and
nothing else: no arbitrary HTML, no injected CSS, no runtime fetches. Rich text
is sanitized before render. This is what makes it safe to let a model author a
storefront.

## Adding to a section

All 18 section types from SPEC §12 already exist in `src/sections/`. Fill in the
component; do not edit `sections/index.tsx` (CLAUDE.md §3).

New setting → add it to that section's schema in
`@merchant/contracts/theme` **with a `.describe()`**. That description is what
the model reads when it builds a theme, so it is prompt text, not a comment.

## Styling

Tailwind only, driven by CSS custom properties from `themeCssVariables()`.
Never hardcode a colour or a font — a section that does will ignore the shop's
tokens and look wrong on every store but the one you tested.
