# F2 — Marketing sections (hero, slideshow, testimonials, …)

| | |
|---|---|
| Workstream | F |
| Size | M |
| Depends on | F1 (shared primitives + pipeline) |
| Unblocks | richer AI/preset output; visual quality of every storefront |
| Branch | `ws-f/marketing-sections` |

## You own
```
packages/theme-engine/src/sections/{hero,image-with-text,featured-collection,
product-grid,collection-list,rich-text,image-banner,slideshow,testimonials,
logo-list,newsletter,faq,contact}.tsx
```

## Context
F1 built the pipeline, shared primitives (`ThemeButton`, `ProductCard`,
`SectionShell`), sanitizer, and the core sections. The 13 files above are
still the 21-line placeholders. Every settings schema is already defined in
`contracts/theme.ts` — implement to the schema, don't extend it.

## Build (SPEC §12)
Real, polished Tailwind implementations, all token-driven (`--theme-*`),
responsive (mobile-first), and honoring every setting in their schema:
- `hero`: background/left/right image modes, overlay opacity, height
  variants, up to two `ThemeButton`s.
- `image-with-text` / `image-banner`: image side/alignment options.
- `featured-collection` / `product-grid` / `collection-list`: grids of
  `ProductCard`s / collection cards — these receive resolved data via F1's
  `SectionDataContext` (E2 fetches by the handles in settings); render a
  tasteful skeleton/empty block when a handle resolves to nothing (never
  crash on a stale AI-generated handle).
- `slideshow`: CSS scroll-snap + a tiny client island for autoplay dots
  (the ONE allowed client leaf here — keep it self-contained).
- `rich-text` (sanitized body), `testimonials` (star ratings), `logo-list`,
  `newsletter` (decorative form — no email backend, submit shows an inline
  "Thanks!" state), `faq` (native `<details>` accordion), `contact`
  (mailto/phone links + decorative form, `showForm` honored).

## Test plan (write first)
- Extend F1's smoke-render test: every section type renders with (a) its
  schema **defaults** and (b) a maximal settings fixture, without throwing;
  missing images (null) render layout-stable placeholders.
- Visual acceptance: `pnpm dev`, apply each preset on the seeded shop, walk
  home/product/collection at mobile + desktop widths — no overflow, no
  unthemed color. Screenshot the aurora home page into the PR description.
- `pnpm verify` green.

## Landmines
- Empty/null settings are the norm (AI output) — every optional field needs a
  graceful absent state; `.default()`s in the schema tell you what to expect.
- No external assets/CDNs — images come from settings URLs (picsum/MinIO);
  fonts only via the F1 pipeline's Google Fonts loading.
- Newsletter/contact forms do NOT get backends — decorative per SPEC §2
  (no marketing email). A dead-looking form is fine; a broken submit is not.
