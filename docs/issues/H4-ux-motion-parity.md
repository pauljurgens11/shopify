# H4 — UX/motion parity audit: animations & interaction polish

| | |
|---|---|
| Workstream | H |
| Size | M |
| Depends on | H3 (and all admin/storefront/checkout UI issues landed) |
| Unblocks | Definition of Done #4 |
| Branch | `ws-h/ux-motion-parity` (several small PRs welcome — polish rebases badly) |

## You own
```
docs/issues/PARITY.md (new "Motion & interaction" section)
Cross-cutting licence (like H3, WORKSTREAMS.md §H): motion, transition and
micro-interaction fixes in ANY app — announce in docs/AGENT-LOG.md before
starting the sweep. Logic changes still belong to the owning workstream.
```

## Context
H3 audits *static* parity — wording, card order, badge tones. This issue
audits how the product **moves**. Shopify's admin feels modern because its
motion is calm, fast and consistent: the save bar slides, toasts rise,
popovers scale in over ~100ms, skeletons swap to content without a jump —
and almost everything else deliberately does NOT animate. A Shopify user
notices wrong motion (janky, slow, bouncy, or missing where expected)
before they notice a wrong label. **The bar is the KPI: NO perceptible
difference. Not "has animations" — has exactly Shopify's animations.**

Polaris v13 ships the correct motion inside its components, driven by the
`--p-motion-*` tokens (durations 0–500ms, `--p-motion-ease*` curves,
keyframes like `--p-motion-keyframes-fade-in`). Most of this issue is
therefore *verifying* Polaris motion survived our composition (nothing
re-mounts that should transition, nothing transitions that Shopify keeps
static), not writing new animation code.

## Build
**Layout/motion authority: [PARITY.md](PARITY.md) — extend it, then enforce it.**

1. **Write the "Motion & interaction" section of PARITY.md first** (this
   file converges — it is not append-only). Document the binding vocabulary,
   at minimum: contextual save bar slides down over the TopBar (and back on
   discard); toasts rise from bottom-center and auto-dismiss; modals fade+
   scale in with an overlay fade; popovers/action menus scale from their
   activator; nav subitems expand on section-active; skeleton → content is a
   swap in place, **zero layout shift**; button spinners replace the label
   in-button without resizing; IndexTable header ↔ bulk-actions bar swap;
   hover states on rows/buttons are instant (no transition); focus rings
   visible on keyboard nav only. Everything not listed does not animate.
2. **Admin sweep** against that section, page by page (same route list as
   H3). Drive it in the browser via `dev-localhost` (CLAUDE.md §1). For
   each page check: dirty-form → save bar animates in; save → in-button
   spinner → toast; open every modal/popover; tab/filter changes don't
   flash a full-page reload; skeletons match the loaded layout (no jump
   when data lands); optimistic toggles feel instant. Fix in place under
   the licence. Any custom element from a 20-min escape hatch animates
   with `--p-motion-*` tokens only — no hand-rolled cubic-beziers.
3. **Storefront + checkout sweep.** Storefront design is ours (Tailwind),
   but it must feel like a first-class Shopify store: cart add gives
   immediate feedback (cart count/drawer update, no full reload), product
   image swap on variant select is instant, hover states on product cards,
   no layout shift as images load (dimensions reserved). Checkout is 1:1
   parity (PARITY.md §Checkout): Shopify checkout is nearly motionless —
   field error states appear instantly, `Pay now` shows an in-button
   processing state, decline banner appears without animation. Remove any
   flourish beyond that.
4. **Interaction hygiene, everywhere:**
   - Animate only `transform`/`opacity` — never `height`/`top`/`margin`
     (jank); anything janky at 4x CPU throttle gets fixed or removed.
   - `prefers-reduced-motion` collapses transitions to instant — Polaris
     handles its own; verify our Tailwind storefront does too.
   - No transition on first paint (pages must not "assemble" on load).
   - Console stays free of React warnings on every swept page.
5. Bigger drift (wrong component, missing skeleton, logic bugs) is filed to
   the owning workstream via `docs/AGENT-LOG.md`, not fixed here.

## Test plan
- No new automated suites (motion tests are forbidden-by-spirit: they're
  the snapshot tests of animation). Acceptance is the sweep executed
  by hand in the browser with the PARITY.md motion section as the
  checklist — every admin route, storefront home/collection/product/cart,
  checkout happy path + decline.
- One pass with reduced motion emulated and one at 4x CPU throttle on the
  three richest pages (product form, order detail, AI builder).
- `pnpm verify` + `pnpm e2e` green after every sweep PR — the suites are
  the regression net proving polish broke no behavior.

## Landmines
- **Over-animation is the KPI-killer, not under-animation.** Shopify's
  admin is calm; a bouncy easing or a 400ms fade reads as "not Shopify"
  instantly. When in doubt: no animation, exactly like Shopify.
- The stack is locked (SPEC §3): **no framer-motion, no GSAP, no new
  deps.** Polaris motion tokens and plain CSS transitions only.
- Polaris-only in admin still holds — do not wrap Polaris components in
  custom animated containers; if a component's motion looks wrong, the bug
  is almost always a re-mount (key churn, conditional unmount) upstream,
  not missing CSS.
- The cross-cutting licence covers motion/transition/interaction polish
  ONLY — same boundary H3 has. Announce in AGENT-LOG before sweeping.
- Keep PRs small and frequent; a giant polish PR conflicts with everyone
  (docs/PARALLEL-AGENTS.md §5).
- Skeleton "fixes" that change layout are drift: the skeleton must match
  the loaded page, not the other way around.
