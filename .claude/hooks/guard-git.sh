#!/usr/bin/env bash
#
# PreToolUse(Bash) guard. Closes the two git landmines in CLAUDE.md §9 that the
# git hooks cannot: `git commit` on main (pre-push catches the push, by which
# point the commit is already sitting on the shared branch), and a force-push to
# a branch another agent may have pulled.
#
# Reads the hook payload on stdin, exits 2 with a reason on stderr to block.
set -uo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | python3 -c \
  'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

block() { printf '%s\n' "$1" >&2; exit 2; }

# `git commit` (not `git commit-tree`, not a --help), while HEAD is main.
if printf '%s' "$cmd" | grep -qE '(^|[;&|] *)git +([^;&|]* )?commit( |$)'; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    block "Blocked: you are on '$branch'. CLAUDE.md §4 — every change lands through a PR.

  git checkout -b ws-{x}/short-description

Your staged work survives the branch switch."
  fi
fi

# Force-push. Rewriting a branch another agent has pulled is unrecoverable for them.
if printf '%s' "$cmd" | grep -qE 'git +push\b' \
   && printf '%s' "$cmd" | grep -qE '(--force([^-]|$)|--force-with-lease|[[:space:]]-[a-zA-Z]*f([[:space:]]|$))'; then
  block "Blocked: force-push. CLAUDE.md §4 — never force-push a branch another agent may have pulled.
Land a normal commit on top instead. If you are certain this branch is yours alone, run it yourself."
fi

exit 0
