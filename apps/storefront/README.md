# @merchant/storefront

Next.js 15 App Router + Tailwind CSS 4. Multi-tenant by Host header (SPEC §10).

- **One deployment serves every shop.** The shop is resolved from the Host header
  in `src/lib/tenant.ts`; nothing else may hardcode a shop.
- **Pages render from the published `ThemeVersion`** via `@merchant/theme-engine`.
  Sections are data, never code.
- **Performance budget** (SPEC §10): TTFB < 300ms locally, LCP < 1.5s on the
  seeded demo. Use `next/image`; keep product and collection responses cacheable
  with `STOREFRONT_CACHE_CONTROL` from `@merchant/config/constants`.
- **Checkout** lives at `/checkouts/{token}`. Card fields post the PAN directly
  to `/vault/tokenize`; this app must never receive a card number (SPEC §11).
