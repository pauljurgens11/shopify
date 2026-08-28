# F3 — Themes API + AI generation job

| | |
|---|---|
| Workstream | F |
| Size | L |
| Depends on | F1, G1 (queue producer; stub if racing) |
| Unblocks | F4, H2 flow (d) |
| Branch | `ws-f/themes-api-ai-job` |

## You own
```
apps/api/src/routes/admin/themes/**
apps/api/src/services/themes/** (if needed)
apps/worker/src/jobs/ai-theme-generate.ts
packages/contracts/src/theme.ts (additive)
```

## Context
Schema: `ThemeVersion` (themeJson JSONB, status draft/published,
createdByMessage), `BuilderConversation` (messages JSONB). F1 gives presets +
validation; G1 gives `enqueue()` + the worker harness (jobs register as leaf
files in `apps/worker/src/jobs/` — the registry pattern; `ai-*.ts` files are
yours per WORKSTREAMS.md). AI: Anthropic API, model **`claude-sonnet-5`**
(SPEC §3 locks it), `ANTHROPIC_API_KEY` optional — **the no-key path must
work flawlessly** (CLAUDE.md §9).

## Build (SPEC §12)
1. **Themes API** (`/admin/api/themes`, `requirePermission('builder')`):
   - `GET /versions` (history list: id, status, createdByMessage, createdAt),
     `POST /versions/:id/publish` (single published version per shop —
     transaction demotes the old one; bust the storefront cache by version),
     `POST /versions/:id/restore` (copy as new draft),
     `POST /presets/:name/apply` (F1 preset → new draft).
   - `GET/POST /conversation` — message list + append; POST with a user
     message enqueues the AI job and returns the pending message id.
   - `GET /preview-token?versionId=` → short-lived HMAC-signed token
     (`SESSION_SECRET`) that E1's `?preview=` accepts.
2. **AI job** (`ai-theme-generate.ts`):
   - Prompt assembly: system = ThemeDoc JSON schema (zod → JSON Schema) +
     section catalog with the `.describe()` docs + hard rules (real handles
     only, complete doc output); context = current ThemeDoc + shop's actual
     products/collections (handles + titles via the tenant client) +
     conversation tail.
   - **Tool-use call**: force a `set_theme` tool whose input schema is the
     ThemeDoc (full doc, not a patch — logged SPEC decision). Validate with
     `themeDocSchema` + `validateThemeDoc`; on failure retry ONCE with the
     validation errors appended; on second failure write an apologetic
     assistant message (SPEC behavior) — never a throwing job.
   - Success → new draft `ThemeVersion` + assistant message summarizing the
     changes ("Made the hero full-height and warmed the palette").
   - **No API key** → job (or the API, synchronously — simpler) responds:
     assistant message explaining the key is missing + pointing at presets.
     Presets remain fully applicable — the demo never breaks.
3. **Onboarding hook** (small): on shop signup, apply the `aurora` preset as
   the initial published theme (call it from A1's signup service via an
   exported function — coordinate additively through contracts/config, or
   land a tiny follow-up PR touching the signup service with WS-A's blessing
   in `docs/AGENT-LOG.md`).

## Test plan (write first)
- Vitest: prompt assembly includes real handles from a seeded shop and
  excludes drafts; validation-failure path retries once then apologizes
  (fake the model with an injected `generate` function — inject, don't
  network-mock); publish flips exactly one version to published; preview
  token roundtrip verifies + expires. The Anthropic call itself is NOT
  unit-tested (forbidden mock-heavy glue) — the injected boundary is.
- Manual: with a real key, "make it feel like a Kyoto coffee shop" produces a
  valid new draft; without a key, chat explains and presets still apply.
- `pnpm verify` green.

## Landmines
- Model id is `claude-sonnet-5` — exactly, from config/env; don't "upgrade".
- Full-doc generation, one retry, then apologize — no patch formats, no
  agentic loops (logged decision).
- Preview tokens must not leak drafts to the public storefront — signed,
  short-lived, version-specific.
