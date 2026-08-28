#!/usr/bin/env bash
# pnpm sync — put this branch back on top of main and push it.
#
# The one command to run when a PR is labelled `needs-rebase`, or before you open
# one at all. It exists because the failure it fixes is silent: GitHub ignores
# the `merge=union` drivers in .gitattributes, so two agents appending to
# DECISIONS.md make each other's PRs unmergeable, and an unmergeable PR never
# gets a `pr-checks` run to go red. See docs/PARALLEL-AGENTS.md §7.
#
# Locally the union driver DOES apply, which is the whole trick: rebasing here
# resolves those appends automatically, and the pushed branch is clean.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "HEAD" ]; then
  echo "Detached HEAD — check out your branch first." >&2
  exit 1
fi
if [ "$branch" = "main" ]; then
  echo "You are on main. Nothing to sync — cut a ws-* branch first (CLAUDE.md §4)." >&2
  exit 1
fi

if [ -z "$(git config --local --get merge.pnpm-lock.driver || true)" ]; then
  echo "! merge drivers are not installed in this clone — running pnpm setup:git first"
  bash scripts/setup-git.sh >/dev/null
fi

echo "==> fetching origin"
git fetch origin --prune --quiet

base=$(git rev-parse origin/main)
if [ "$(git merge-base HEAD origin/main)" = "$base" ]; then
  echo "    already on top of main ($(git rev-parse --short "$base"))"
else
  echo "==> rebasing $branch onto origin/main ($(git rev-parse --short "$base"))"
  if ! git rebase --autostash origin/main; then
    cat >&2 <<'MSG'

Rebase stopped on a real conflict — the union drivers could not resolve it,
so this is code, not a log file. Resolve it, then:

    git add <files> && git rebase --continue && pnpm sync

To back out entirely: git rebase --abort
MSG
    exit 1
  fi
fi

# Deliberately NOT `@{upstream}`: a branch cut with `git switch -c x origin/main`
# tracks origin/main, which would make an unpushed branch look pushed.
if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  echo
  echo "Not pushed yet. When you are ready:"
  echo "    git push -u origin $branch && gh pr create --fill && gh pr merge --auto --squash --delete-branch"
  exit 0
fi

if [ "$(git rev-parse "origin/$branch")" = "$(git rev-parse HEAD)" ]; then
  echo "    remote already matches — nothing to push"
  exit 0
fi

echo "==> pushing $branch"
# Rebasing rewrote history, so this has to be a force — with a lease, so a push
# made from somewhere else is never silently clobbered.
git push --force-with-lease origin "$branch"

echo
echo "Done. pr-checks starts within a minute; auto-merge lands it from there."
echo "    gh pr checks   # if you want to watch it"
