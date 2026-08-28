# F4 — Admin: AI builder (chat + live preview + publish)

| | |
|---|---|
| Workstream | F |
| Size | L |
| Depends on | A3, F3 |
| Unblocks | H2 flow (d) |
| Branch | `ws-f/builder-admin-ui` |

## You own
```
apps/admin/src/app/store/[slug]/storefront/**
apps/admin/src/navigation/items/storefront.ts (config only)
```

## Context
Deviation #2's face: the Lovable-style split screen inside the admin's
"Storefront" nav item (paintbrush icon, already in the registry). F3 supplies
conversation, generation, versions, preview tokens, publish. This page is
half Polaris (chrome) and half product-of-its-own — the SPEC allows the
preview/builder surface to be Tailwind-flavored, but the page frame stays
Polaris so it feels native to the admin.

## Build (SPEC §12)
**Layout authority: [PARITY.md](PARITY.md). It overrides your memory of Shopify — read your page's section before writing JSX.**

1. **Split screen** (full-height page): left ~380px chat panel, right
   preview.
2. **Chat panel**: message history from F3's conversation (user right,
   assistant left, pending state with animated dots while the job runs —
   poll or refetch on interval; keep it simple), input + send. Assistant
   messages that created a version get an inline "View this version" chip.
   **No API key**: render F3's explanation message plus a preset picker card
   (three preset thumbnails, Apply buttons) — the demo path.
3. **Preview pane**: iframe of the storefront with `?preview={signed token}`;
   toolbar above it — device toggle (desktop/mobile widths), page switcher
   (Home / Product / Collection — deep-links a seeded handle), refresh, and
   **Publish** primary button (confirm modal → F3 publish → "Theme
   published" toast → iframe reloads without the preview param).
4. **Version history**: side sheet or footer list — versions with status
   badge, createdByMessage snippet, Restore action (F3 restore → preview
   updates to the new draft).
5. Draft-vs-published indicator near Publish ("Viewing draft · unpublished
   changes") — the state model must be legible or the demo fumbles.

## Test plan
- Manual acceptance = H2 flow (d) by hand: apply the `bloom` preset →
  preview updates → Publish → open the real storefront in a new tab and see
  it changed. With a key configured: send a chat message, watch the pending
  state resolve into a new preview. Restore an old version and publish that.
- `pnpm verify` green; admin build green.

## Landmines
- The iframe URL must use the storefront origin ({slug}.lvh.me:3002) — same
  cookies/cache as real visitors, so what the merchant sees is what ships.
- Don't build streaming tokens or partial-doc previews — job completes, then
  preview refreshes (matches F3's full-doc decision).
- Polling interval ≥1.5s and stop on completion — 20 agents' worth of dev
  servers don't need a busy-loop.
