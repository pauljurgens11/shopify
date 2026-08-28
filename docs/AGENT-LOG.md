# Agent log

Append-only scratch log for cross-agent visibility. `merge=union`: append at the
bottom, never edit existing lines.

Use it for things that are useful to another agent *right now* but are not
decisions (which belong in `DECISIONS.md`): what you are actively working on,
what you stubbed and where, what is temporarily broken on `main`.

Format: `YYYY-MM-DD HH:MM | WS-X | message`

---
2026-08-28 11:35 | WS-A | Branch ruleset 21717783 applied to main: PR required, linear history, `pr-checks` must be green. Direct pushes to main are now rejected server-side, not just by the local pre-push hook. Repo is squash-merge only with auto-merge and branch auto-delete on.
2026-08-28 12:05 | WS-C | CLAIM C1 discounts engine | branch ws-c/discounts-engine
2026-08-28 12:35 | WS-C | DONE C1 discounts engine — applyDiscounts() in apps/api/src/services/discounts/engine.ts is pure and importable now (E3 checkout totals, C6 preview). Contracts additions: DiscountEngineResult, DiscountedLine, DiscountRejectionReason, DiscountAppliesTo, DiscountableLine types. apps/api no longer runs with --passWithNoTests.
2026-08-28 12:05 | WS-D | CLAIM D1 vault (crypto, Luhn, tokenize endpoint) | branch ws-d/vault
2026-08-28 12:50 | WS-D | Fixed a platform bug found by D1's rate-limited route: app.ts errorResponseBuilder returned a plain object, but @fastify/rate-limit THROWS that value — with no statusCode it fell through to 500. It now returns `new ApiError('rate_limited', …)`, so any route with `config.rateLimit` gets a real SPEC-shaped 429. WS-A: one-line change in your file, flagged rather than silently kept.
2026-08-28 12:50 | WS-D | Tenant writes must pass `shopId` in `data` for Prisma's types even under `dbForShop` (the extension overrides it). First one to hit this in B/C/E: that is expected, not a scoping bug.
2026-08-28 13:05 | WS-D | pr-checks.yml had VAULT_MASTER_KEY unquoted — YAML read 64 zeros as the number 0, so CI ran with VAULT_MASTER_KEY="0" and any test that touches env() died. Quoted it. Nothing had read the var in CI before D1, so this was invisible until now.
2026-08-28 13:20 | WS-D | DONE D1 vault | PR #5 — packages/pay/{crypto,vault}.ts + POST /vault/tokenize, 60 unit tests (§14.2). D3/E4 unblocked: tokenizeCard(db, shopId, card) and getCard(db, cardTokenId) (pay-internal, decrypts) in @merchant/pay/vault.
2026-08-28T12:20Z | WS-F | CLAIM F1 theme-engine core | branch ws-f/theme-engine-core
2026-08-28T13:05Z | WS-F | F1 landed. Public API: `@merchant/theme-engine/render` (`renderPage`, `renderFooter`, `themeCssVariables`, `googleFontsHref`), `@merchant/theme-engine/presets` (`presetThemeDoc('aurora'|'monochrome'|'bloom')`, `DEFAULT_PRESET`), `@merchant/theme-engine/shared` (ThemeButton, ProductCard, SectionShell, RichHtml, Price, productGridClass, route helpers). Data contract + client-island slots: `src/context.ts`.
2026-08-28T13:05Z | WS-F | WS-E (E2): Tailwind 4 does not scan `node_modules`, so `apps/storefront/src/app/globals.css` needs `@source "../../../../packages/theme-engine/src";` — without it none of the section classes are emitted and every page renders unstyled. Left for you since globals.css is yours.
2026-08-28T13:05Z | WS-F | WS-H (H1): presets reference exactly one collection handle, `featured` — enforced by `presets.test.ts`. Aurora is the preset to seed as the published theme (`DEFAULT_PRESET`).
2026-08-28T13:05Z | WS-F | WS-F (F2): the 13 marketing sections are still placeholders. Build on `src/shared/` and take `SectionProps<'hero'>` for props; `render.test.tsx` already fails the build on a hardcoded colour in `sections/` or `shared/`.
2026-08-28T13:20Z | WS-F | DONE F1 | PR #7
2026-08-28T09:35Z | WS-D | CLAIM D2 (processor adapters: mock, stripe, maverick) | branch ws-d/adapters
