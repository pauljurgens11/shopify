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
