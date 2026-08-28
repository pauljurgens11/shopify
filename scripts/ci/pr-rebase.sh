#!/usr/bin/env bash
# Rebase the PRs that pr-health.sh flagged, so the swarm heals itself.
#
# Only touches a branch that has ALREADY been declared finished: auto-merge
# enabled means the agent pushed it and walked away, so rewriting it cannot
# interrupt work in progress. Anything it cannot rebase cleanly it leaves
# exactly as it found it, still labelled, for a human or the owning agent.
#
# Requires a PAT in secrets.AGENT_PAT. Not optional: a push made with the
# built-in GITHUB_TOKEN does not trigger workflows, so the rebased branch would
# be mergeable but would never get the `pr-checks` run the ruleset requires —
# strictly worse than leaving it alone.
set -uo pipefail

REPO="${REPO:?}"
LABEL="needs-rebase"

git config user.name  "merchant-bot"
git config user.email "bot@users.noreply.github.com"
# `merge=union` on the log files is a built-in driver, but the lockfile driver
# has to be installed before a rebase can use it (.gitattributes only names it).
bash scripts/setup-git.sh >/dev/null
# The hooks path setup-git.sh installs is for humans; a bot push must not run it.
git config --local --unset core.hooksPath || true

# Either GitHub says CONFLICTING, or the triage job already labelled it. The
# label matters: mergeability is computed asynchronously and reads UNKNOWN for a
# while after a push, and a strict CONFLICTING filter silently skips exactly the
# PRs that were stuck the longest.
candidates=$(gh pr list --repo "$REPO" --state open --base main --limit 100 \
  --json number,headRefName,isDraft,mergeable,autoMergeRequest,labels \
  --jq ".[] | select(.mergeable == \"CONFLICTING\" or ([.labels[].name] | index(\"$LABEL\") != null))
          | select(.isDraft == false)
          | select(.autoMergeRequest != null)
          | select(.headRefName | startswith(\"ws-\"))
          | \"\(.number) \(.headRefName)\"")

[ -n "$candidates" ] || { echo "nothing to rebase"; exit 0; }

git fetch origin main --quiet

echo "$candidates" | while read -r pr branch; do
  [ -n "${branch:-}" ] || continue
  echo "==> #$pr ($branch)"

  if ! git fetch origin "$branch" --quiet 2>/dev/null; then
    echo "    cannot fetch branch — skipping"
    continue
  fi
  # Guarded: a failed checkout must not fall through to the rebase below, which
  # would then report "conflict" for what was actually a dirty working tree.
  if ! git checkout -B "$branch" "origin/$branch" --quiet; then
    echo "    could not check out branch — skipping"
    git checkout --force main --quiet 2>/dev/null || true
    continue
  fi

  if git merge-base --is-ancestor origin/main HEAD; then
    echo "    already on top of main — nothing to do"
    gh pr edit "$pr" --repo "$REPO" --remove-label "$LABEL" >/dev/null 2>&1 || true
    continue
  fi

  if git rebase origin/main; then
    if git push --force-with-lease origin "$branch"; then
      echo "    rebased and pushed — pr-checks will start now"
      gh pr edit "$pr" --repo "$REPO" --remove-label "$LABEL" >/dev/null 2>&1 || true
      gh pr comment "$pr" --repo "$REPO" \
        --body "Rebased onto \`main\` automatically — the conflict was only in the \`merge=union\` log files. Checks are running." >/dev/null 2>&1 || true
    else
      echo "    push rejected (branch moved under us) — leaving it labelled"
    fi
  else
    # A real conflict in real code. Not ours to guess at.
    git rebase --abort || true
    echo "    conflict is not in the log files — leaving it for the owning agent"
  fi
  git checkout --force main --quiet 2>/dev/null || true
done
