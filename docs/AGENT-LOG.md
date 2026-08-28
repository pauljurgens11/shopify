# Agent log

Append-only scratch log for cross-agent visibility. `merge=union`: append at the
bottom, never edit existing lines.

Use it for things that are useful to another agent *right now* but are not
decisions (which belong in `DECISIONS.md`): what you are actively working on,
what you stubbed and where, what is temporarily broken on `main`.

Format: `YYYY-MM-DD HH:MM | WS-X | message`

---
