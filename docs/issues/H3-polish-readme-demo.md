# H3 — Polish sweep, README, demo script

| | |
|---|---|
| Workstream | H |
| Size | M |
| Depends on | H2 (and most UI issues landed) |
| Unblocks | Definition of Done #1, #3, #4 |
| Branch | `ws-h/polish-readme-demo` (several small PRs welcome — polish rebases badly) |

## You own
```
README.md, docs/DEMO.md
Cross-cutting licence (WORKSTREAMS.md §H): empty states, skeletons, toasts
in ANY app — announce in docs/AGENT-LOG.md before starting the sweep.
```

## Context
This is the "last 25%" pass (SPEC §16). By now the five flows are green;
this issue makes the product feel finished and the repo land well on a clean
machine. The KPI test happens here: **Definition of Done #4 — a Shopify user
screen-shares the admin and nothing looks off.**

## Build (SPEC §17, §18)
1. **Clean-machine quickstart**: on a pristine clone (fresh worktree,
   `docker compose down -v` first), run the 6-line README flow exactly as
   written; fix whatever breaks (this "verified once by workstream H" IS
   Definition of Done #1). Time it; note the minutes in the README.
2. **README**: the 6 quickstart lines at top; demo walkthrough (login →
   admin tour → AI-build → publish → buy with 4242 → order/analytics/webhook
   → refund); the SPEC §17 "Production architecture" section (scale path
   text); the one-line PCI note from SPEC §11.
3. **docs/DEMO.md**: a timed presenter script (what to click, what to say,
   which numbers to point at), including the second-shop signup beat and the
   decline-card beat (`4000…0002`).
4. **Parity audit, then polish sweep** (the licence): walk every admin page
   against its [PARITY.md](PARITY.md) section line by line — wording, badge
   tones, card order, save-bar behavior; fix drift or file it to the owner.
   Then the sweep: visit every page in admin + storefront —
   - every list has a real empty state (no blank tables), every page a
     skeleton, every mutation a toast;
   - dead buttons/links removed (not disabled — removed, per SPEC §5);
   - Marketing nav item's minimal page exists and looks intentional
     (SPEC §9 says render it minimal);
   - page `<title>`s ("Products · Merchant"), favicon, no Shopify string
     anywhere (`rg -i shopify` on app source — package names excluded);
   - console clean of React warnings on the main pages.
5. **Perf pass** (SPEC §10 budget): storefront TTFB < 300ms and LCP < 1.5s
   locally on seeded home — check cache headers actually hit (second load),
   images sized; fix the top offender only, note the numbers.

## Test plan
- `pnpm verify` + `pnpm e2e` green after every sweep PR (the suites are the
  regression net for cross-cutting edits).
- The DEMO.md script executed start-to-finish once without improvisation.

## Landmines
- The cross-cutting licence covers empty states/skeletons/toasts ONLY —
  logic changes still belong to the owning workstream.
- Keep sweep PRs small and frequent; a giant polish PR conflicts with
  everyone (docs/PARALLEL-AGENTS.md §5's PR-size rule exists for you).
- Don't gold-plate: if a page passes the "Shopify user doesn't blink" bar,
  move on.
