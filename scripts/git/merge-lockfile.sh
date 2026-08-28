#!/usr/bin/env bash
# Custom git merge driver for pnpm-lock.yaml.
#
# A lockfile is a projection of every package.json in the workspace, so a textual
# 3-way merge is meaningless: it can produce a file that is syntactically valid
# and semantically wrong. Instead we take OUR side, then regenerate the lockfile
# from the already-merged package.json files.
#
# Invoked by git as: merge-lockfile.sh %A %O %B %P
#   %A = ours (and the file git reads the result back from)
#   %O = base, %B = theirs, %P = the real pathname in the worktree
set -euo pipefail

OURS="$1"; BASE="$2"; THEIRS="$3"; PATHNAME="${4:-pnpm-lock.yaml}"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

# Seed the worktree lockfile with our side so pnpm has a starting point.
cp "$OURS" "$PATHNAME"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "merge-lockfile: pnpm not found; leaving OUR lockfile in place." >&2
  echo "merge-lockfile: run 'pnpm install' before pushing." >&2
  exit 0
fi

echo "merge-lockfile: regenerating $PATHNAME from merged package.json files..." >&2
if pnpm install --lockfile-only --no-frozen-lockfile >/dev/null 2>&1; then
  cp "$PATHNAME" "$OURS"
  echo "merge-lockfile: resolved." >&2
  exit 0
fi

echo "merge-lockfile: pnpm install failed — a package.json merge is probably broken." >&2
echo "merge-lockfile: fix package.json, then run 'pnpm install --lockfile-only'." >&2
exit 1
