#!/usr/bin/env bash
# Flag pull requests that GitHub cannot merge, so a conflicted PR is loud rather
# than silent. Called by .github/workflows/pr-health.yml; see that file for why.
#
# Exit status is deliberately 0 unless the script itself is broken: one PR that
# cannot be inspected must not fail the run for every other PR.
set -uo pipefail

REPO="${REPO:?}"
LABEL="needs-rebase"
MARKER="<!-- pr-health -->"

# `gh` needs the label to exist before it can apply it; --force makes this idempotent.
gh label create "$LABEL" --repo "$REPO" --color d93f0b \
  --description "GitHub cannot merge this PR — rebase on main (pnpm sync)" --force >/dev/null 2>&1 || true

# Which PRs to look at. A push to main can invalidate any open PR, not just one.
if [ "${EVENT:-}" = "pull_request_target" ] && [ -n "${PR:-}" ]; then
  targets="$PR"
else
  targets=$(gh pr list --repo "$REPO" --state open --base main --limit 100 --json number --jq '.[].number')
fi
[ -n "$targets" ] || { echo "no open pull requests"; exit 0; }

# GitHub computes mergeability asynchronously and answers UNKNOWN until it lands.
# Asking immediately after a push always gets UNKNOWN, so give it a head start.
sleep 15

# MERGEABLE | CONFLICTING | UNKNOWN — retried, because UNKNOWN is "ask again".
mergeability() {
  local pr="$1" state
  for _ in 1 2 3 4 5 6; do
    state=$(gh pr view "$pr" --repo "$REPO" --json mergeable --jq '.mergeable' 2>/dev/null || echo UNKNOWN)
    [ "$state" != "UNKNOWN" ] && { echo "$state"; return; }
    sleep 5
  done
  echo UNKNOWN
}

# One comment per PR, edited in place. A new comment per run would bury the PR.
sticky_comment() {
  local pr="$1" body="$2" id
  id=$(gh api "repos/$REPO/issues/$pr/comments" --paginate \
    --jq "[.[] | select(.body | contains(\"$MARKER\")) | .id] | first" 2>/dev/null)
  if [ -n "$id" ] && [ "$id" != "null" ]; then
    gh api -X PATCH "repos/$REPO/issues/comments/$id" -f body="$body" >/dev/null
  else
    gh api -X POST "repos/$REPO/issues/$pr/comments" -f body="$body" >/dev/null
  fi
}

drop_comment() {
  local pr="$1" id
  id=$(gh api "repos/$REPO/issues/$pr/comments" --paginate \
    --jq "[.[] | select(.body | contains(\"$MARKER\")) | .id] | first" 2>/dev/null)
  [ -n "$id" ] && [ "$id" != "null" ] && gh api -X DELETE "repos/$REPO/issues/comments/$id" >/dev/null 2>&1
  return 0
}

conflict_body() {
  local branch="$1"
  cat <<BODY
$MARKER
### This PR cannot be merged, and CI will not tell you

GitHub cannot build a merge commit for it, so **\`pr-checks\` will never start** —
the PR is not red, it is silent, and auto-merge will wait forever.

Almost always this is \`DECISIONS.md\` / \`docs/AGENT-LOG.md\`: they are
\`merge=union\` in \`.gitattributes\`, which resolves concurrent appends on your
machine but **not** on GitHub, which ignores gitattributes merge drivers.

Fix it in one command, from your worktree on \`$branch\`:

\`\`\`bash
pnpm sync
\`\`\`

That rebases onto \`origin/main\` (your local union driver resolves the log
files), then pushes. Checks start within a minute and auto-merge takes it from
there. If the rebase stops on a real conflict, resolve it and \`pnpm sync\` again.
BODY
}

for pr in $targets; do
  info=$(gh pr view "$pr" --repo "$REPO" --json headRefName,isDraft,labels 2>/dev/null) || continue
  branch=$(echo "$info" | jq -r '.headRefName')
  labelled=$(echo "$info" | jq -r --arg l "$LABEL" '[.labels[].name] | index($l) != null')
  state=$(mergeability "$pr")

  case "$state" in
    CONFLICTING)
      echo "PR #$pr ($branch): CONFLICTING — flagging"
      gh pr edit "$pr" --repo "$REPO" --add-label "$LABEL" >/dev/null 2>&1 || true
      sticky_comment "$pr" "$(conflict_body "$branch")"
      ;;
    MERGEABLE)
      if [ "$labelled" = "true" ]; then
        echo "PR #$pr ($branch): mergeable again — clearing"
        gh pr edit "$pr" --repo "$REPO" --remove-label "$LABEL" >/dev/null 2>&1 || true
        drop_comment "$pr"
      else
        echo "PR #$pr ($branch): mergeable"
      fi
      ;;
    *)
      # Still computing. The next push to main runs this again.
      echo "PR #$pr ($branch): mergeability unknown, leaving alone"
      ;;
  esac
done
