#!/usr/bin/env bash
# One-time local git configuration. EVERY agent runs this before its first commit.
#   pnpm setup:git
#
# Everything here is repo-local (--local), so it cannot leak into other projects.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "==> Installing merge drivers referenced by .gitattributes"
git config --local merge.pnpm-lock.name  "pnpm lockfile: regenerate instead of textual merge"
git config --local merge.pnpm-lock.driver "bash scripts/git/merge-lockfile.sh %A %O %B %P"

echo "==> Enabling rerere (reuse recorded conflict resolutions)"
# With many agents rebasing on a fast-moving main, the SAME conflict shows up
# repeatedly. rerere records how you solved it and replays the resolution.
git config --local rerere.enabled true
git config --local rerere.autoUpdate true

echo "==> Merge/rebase ergonomics"
git config --local pull.rebase true              # linear history, no merge bubbles
git config --local rebase.autoStash true
git config --local rebase.updateRefs true        # keep stacked branches in sync
git config --local merge.conflictStyle zdiff3    # shows the base — far easier to resolve
git config --local branch.autoSetupRebase always
git config --local fetch.prune true
git config --local diff.algorithm histogram
git config --local push.default current

echo "==> Installing hooks (.githooks)"
git config --local core.hooksPath .githooks

echo
echo "Done. Verify with: git config --local --list | grep -E 'rerere|merge|hooks'"
