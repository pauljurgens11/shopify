#!/usr/bin/env bash
# Redeploy the live demo from latest main. Runs ON the deploy server, from the
# repo checkout (any directory). Idempotent — safe to re-run at any time; a
# failed run leaves the previous containers serving until the new build is up.
#
#   bash deploy/redeploy.sh            # deploy origin/main
#   bash deploy/redeploy.sh --no-pull  # rebuild whatever is checked out
#
# What it does: hard-reset the checkout to origin/main (the server clone is
# disposable and never hand-edited; .env is untracked and survives), rebuild
# the four app images, `up` the stack, then wait for every service to report
# healthy and probe the public URLs. Exits non-zero with the failing service's
# logs if anything doesn't come up.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

COMPOSE="docker compose -f docker-compose.prod.yml --profile mail"

if [ "${1:-}" != "--no-pull" ]; then
  git fetch origin main
  git reset --hard origin/main >/dev/null
fi
echo "==> deploying $(git log --oneline -1)"

# --build is required every time: the admin bakes its public API URL into the
# browser bundle at image build time (see DEPLOY.md §3).
$COMPOSE up -d --build --remove-orphans

echo "==> waiting for services to be healthy"
for i in $(seq 1 60); do
  # Docker prints "(health: starting)", "(unhealthy)", or "Restarting (…)" —
  # matching bare "starting" covers all three (and "Restarting" contains it).
  BAD=$($COMPOSE ps --format '{{.Service}} {{.Status}}' \
    | awk '/starting|unhealthy/ {print $1}' | tr '\n' ' ')
  if [ -z "$BAD" ]; then break; fi
  [ "$i" -eq 60 ] && {
    echo "!! not healthy after 5 min: $BAD" >&2
    for s in $BAD; do echo "--- logs: $s ---"; $COMPOSE logs --tail 30 "$s"; done
    exit 1
  }
  sleep 5
done
$COMPOSE ps --format '   {{.Service}}: {{.Status}}'

BASE_DOMAIN=$(grep -E '^BASE_DOMAIN=' .env | cut -d= -f2)
echo "==> probing public URLs (BASE_DOMAIN=${BASE_DOMAIN})"
FAIL=0
for url in "https://api.${BASE_DOMAIN}/health" "https://admin.${BASE_DOMAIN}" "https://demo.${BASE_DOMAIN}"; do
  CODE=$(curl -ks -o /dev/null -w '%{http_code}' --max-time 30 "$url" || echo 000)
  echo "   ${url} -> ${CODE}"
  case "$CODE" in 2*|3*) ;; *) FAIL=1 ;; esac
done
[ "$FAIL" -eq 0 ] || { echo "!! a public URL is not answering" >&2; exit 1; }

echo "==> redeploy OK: $(git log --oneline -1)"
