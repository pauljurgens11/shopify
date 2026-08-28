#!/usr/bin/env bash
#
# stack.sh — run and survey the local `main` stack.
#
# This project is built by many agents at once, each in its own worktree. This
# script deliberately ignores whichever worktree you invoke it from and always
# drives the MAIN checkout, so there is one canonical "what does main look like
# right now" stack that you can leave running while branches come and go.
#
#   pnpm stack up       bring everything up (infra, deps, db, dev servers)
#   pnpm stack status   where main is, what is healthy, what has been built
#   pnpm stack sync     pull main, reinstall, migrate, reseed, restart
#   pnpm stack watch    keep syncing automatically as PRs land on main
#   pnpm stack logs     tail the dev server log
#   pnpm stack stop     stop the dev servers (leaves docker infra up)
#   pnpm stack down     stop dev servers and docker infra
#   pnpm stack reset    drop + remigrate + reseed the database
#   pnpm stack disk     where the disk is going and what is safe to reclaim
  pnpm stack doctor   check prerequisites without changing anything
#   pnpm stack open     open the admin, storefront and tool UIs in a browser
#
set -uo pipefail

# --- where are we ------------------------------------------------------------
# --git-common-dir points at the ONE real .git for the repo, from any worktree.
GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
if [ -z "$GIT_COMMON" ]; then
  echo "stack: not inside the merchant git repository" >&2
  exit 1
fi
ROOT=$(cd "$(dirname "$GIT_COMMON")" && pwd)
if [ ! -f "$ROOT/package.json" ]; then
  echo "stack: $ROOT does not look like the repo root" >&2
  exit 1
fi

RUN="$ROOT/.local"
LOGS="$RUN/logs"
DEV_LOG="$LOGS/dev.log"
PID_FILE="$RUN/dev.pid"
SYNC_STAMP="$RUN/last-sync-sha"

ADMIN_PORT=3000
API_PORT=3001
SF_PORT=3002

ADMIN_URL="http://admin.lvh.me:$ADMIN_PORT"
API_URL="http://api.lvh.me:$API_PORT"
SF_URL="http://demo.lvh.me:$SF_PORT"

# --- output ------------------------------------------------------------------
if [ -t 1 ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; R=$'\033[0m'
  GRN=$'\033[32m'; YEL=$'\033[33m'; RED=$'\033[31m'; CYN=$'\033[36m'
else
  B=''; DIM=''; R=''; GRN=''; YEL=''; RED=''; CYN=''
fi
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s==>%s %s%s%s\n' "$CYN" "$R" "$B" "$*" "$R"; }
ok()   { printf '  %s✓%s %s\n' "$GRN" "$R" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$R" "$*"; }
bad()  { printf '  %s✗%s %s\n' "$RED" "$R" "$*"; }
die()  { printf '\n%serror:%s %s\n' "$RED" "$R" "$*" >&2; exit 1; }

# --- prerequisites -----------------------------------------------------------

# The repo needs Node 22; macOS boxes very often default to an older Homebrew
# node. Rather than failing with a version error, pick up nvm's copy silently.
use_node() {
  local want have
  want=$(tr -d 'v \n' < "$ROOT/.nvmrc" 2>/dev/null || echo 22)
  have=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
  if [ -n "$have" ] && [ "$have" -ge "$want" ] 2>/dev/null; then return 0; fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
    nvm use "$want" >/dev/null 2>&1 || nvm install "$want" >/dev/null 2>&1 || true
  fi
  have=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
  if [ -z "$have" ] || [ "$have" -lt "$want" ] 2>/dev/null; then
    die "Node >= $want required (found ${have:-none}). Install it, e.g. \`nvm install $want\`."
  fi
}

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "\`$1\` is not installed."; }

docker_ok() { docker info >/dev/null 2>&1; }

# --- process / port helpers --------------------------------------------------

pids_on_port() { lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null || true; }

# Full path a pid is running from (command line or cwd), for attributing a port.
pid_origin() {
  local pid=$1 cmd cwd
  cmd=$(ps -o command= -p "$pid" 2>/dev/null || true)
  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | tail -1)
  printf '%s %s' "$cmd" "$cwd"
}

# Which checkout does this pid belong to: "main", a worktree name, or "" if it
# is not ours at all. Every worktree lives under $ROOT, so a path match is enough.
pid_worktree() {
  local origin; origin=$(pid_origin "$1")
  case "$origin" in
    *"$ROOT/.claude/worktrees/"*)
      printf '%s' "$origin" | sed -n "s|.*$ROOT/.claude/worktrees/\([^/ ]*\).*|\1|p" | head -1 ;;
    *"$ROOT"*) printf 'main' ;;
    *) printf '' ;;
  esac
}

kill_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null || true
}

# Free 3000/3001/3002. Only ever touches processes belonging to THIS repo (main
# or any of its worktrees) — a stale dev server from a finished agent session is
# the usual squatter. Set MERCHANT_NO_RECLAIM=1 to leave them alone.
reclaim_ports() {
  local port pid wt found=0
  for port in "$ADMIN_PORT" "$API_PORT" "$SF_PORT"; do
    for pid in $(pids_on_port "$port"); do
      wt=$(pid_worktree "$pid")
      if [ -z "$wt" ]; then
        bad "port $port is held by pid $pid, which is not part of this repo — free it yourself"
        continue
      fi
      if [ -n "${MERCHANT_NO_RECLAIM:-}" ]; then
        warn "port $port held by pid $pid (worktree: $wt) — MERCHANT_NO_RECLAIM set, leaving it"
        continue
      fi
      warn "reclaiming port $port from pid $pid (worktree: $wt)"
      kill_tree "$pid"
      found=1
    done
  done
  if [ "$found" = 1 ]; then
    local waited=0
    while [ "$waited" -lt 10 ]; do
      if [ -z "$(pids_on_port "$ADMIN_PORT")$(pids_on_port "$API_PORT")$(pids_on_port "$SF_PORT")" ]; then break; fi
      sleep 1; waited=$((waited + 1))
    done
    for port in "$ADMIN_PORT" "$API_PORT" "$SF_PORT"; do
      for pid in $(pids_on_port "$port"); do
        [ -n "$(pid_worktree "$pid")" ] && kill -9 "$pid" 2>/dev/null || true
      done
    done
  fi
}

# --- database ----------------------------------------------------------------

# Name of the database the root .env currently points at.
db_name() {
  sed -n 's|^DATABASE_URL=.*/\([^/?]*\)?.*|\1|p' "$ROOT/.env" 2>/dev/null | head -1
}

psql_main() {
  ( cd "$ROOT" && docker compose exec -T postgres psql -U merchant -d "$(db_name)" "$@" ) 2>/dev/null
}

# Every worktree in this repo shares one Postgres container, and agents run
# `db:reset` and apply unmerged migrations all day. If main's stack shared that
# database, it would show a schema that is not main's, and Prisma would throw on
# columns main does not know about. So main gets its own database. Opt out with
# MERCHANT_SHARED_DB=1 if you specifically want to see a branch's data.
ensure_isolated_db() {
  local want='merchant_main' current tmp
  if [ -n "${MERCHANT_SHARED_DB:-}" ]; then
    warn "MERCHANT_SHARED_DB set — using the shared '$(db_name)' database, which other worktrees also write to"
    return 0
  fi
  current=$(db_name)
  if [ "$current" != "$want" ]; then
    tmp=$(mktemp)
    sed "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://merchant:merchant@localhost:5433/${want}?schema=public|" \
      "$ROOT/.env" > "$tmp" && mv "$tmp" "$ROOT/.env"
    ok "pointed .env at its own database '$want' (was '$current')"
  else
    ok "using database '$want'"
  fi
  if ! ( cd "$ROOT" && docker compose exec -T postgres psql -U merchant -d postgres -tAc \
         "select 1 from pg_database where datname='$want'" 2>/dev/null ) | grep -q 1; then
    ( cd "$ROOT" && docker compose exec -T postgres createdb -U merchant "$want" ) >/dev/null 2>&1 \
      && ok "created database '$want'" || die "could not create database '$want'"
  fi
}

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time "${2:-5}" "$1" 2>/dev/null || echo 000; }

wait_http() {
  local url=$1 label=$2 budget=${3:-180} waited=0 code
  while [ "$waited" -lt "$budget" ]; do
    code=$(http_code "$url" 10)
    case "$code" in
      2*|3*|4*) ok "$label ready ($url)"; return 0 ;;
    esac
    sleep 2; waited=$((waited + 2))
  done
  bad "$label did not come up within ${budget}s ($url) — see \`pnpm stack logs\`"
  return 1
}

dev_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null
}

# --- commands ----------------------------------------------------------------

cmd_doctor() {
  step "Prerequisites"
  use_node; ok "node $(node -v)"
  need_cmd pnpm; ok "pnpm $(pnpm -v)"
  need_cmd docker
  if docker_ok; then ok "docker running"; else bad "docker is installed but not running — start Docker Desktop"; fi
  need_cmd curl; need_cmd lsof

  step "Repository"
  say "  main checkout: $ROOT"
  if [ -f "$ROOT/.env" ]; then ok ".env present"; else warn ".env missing — \`pnpm stack up\` will create it from .env.example"; fi
  if [ -d "$ROOT/node_modules" ]; then ok "dependencies installed"; else warn "dependencies not installed"; fi
  [ -f "$ROOT/.env" ] && say "  database:      $(db_name)"

  step "Ports"
  local port pid wt
  for port in "$ADMIN_PORT" "$API_PORT" "$SF_PORT"; do
    pid=$(pids_on_port "$port" | head -1)
    if [ -z "$pid" ]; then
      ok "$port free"
    else
      wt=$(pid_worktree "$pid")
      if [ -n "$wt" ]; then warn "$port in use by pid $pid (worktree: ${wt}) — reclaimable"
      else bad "$port in use by pid $pid, not part of this repo"; fi
    fi
  done
}

cmd_up() {
  use_node
  need_cmd pnpm; need_cmd docker
  docker_ok || die "Docker is not running. Start Docker Desktop and try again."
  mkdir -p "$LOGS"

  step "Environment"
  cd "$ROOT" || die "cannot enter $ROOT"
  if [ ! -f .env ]; then
    cp .env.example .env
    ok "created .env from .env.example"
  else
    ok ".env present"
  fi
  # A var added to .env.example after you copied it is a confusing runtime crash;
  # surface it here instead.
  local missing
  missing=$(comm -23 \
    <(grep -oE '^[A-Z0-9_]+=' .env.example | sort -u) \
    <(grep -oE '^[A-Z0-9_]+=' .env | sort -u) | tr -d '=' | tr '\n' ' ')
  if [ -n "${missing// /}" ]; then
    warn "your .env is missing vars added since you copied it: $missing"
    warn "append them from .env.example, or delete .env and re-run"
  fi

  step "Infrastructure (postgres, redis, minio, mailpit)"
  # Two calls on purpose: the first runs everything including the one-shot
  # minio-init bucket job, the second waits only on the long-lived services —
  # `--wait` treats a completed one-shot container as a failure.
  if ! docker compose up -d >>"$LOGS/docker.log" 2>&1; then
    bad "docker compose failed — see $LOGS/docker.log"
    exit 1
  fi
  if docker compose up -d --wait postgres redis minio mailpit >>"$LOGS/docker.log" 2>&1; then
    ok "containers healthy"
  else
    bad "containers did not become healthy — see $LOGS/docker.log"
    exit 1
  fi

  step "Dependencies"
  if pnpm install >>"$LOGS/install.log" 2>&1; then
    ok "pnpm install"
  else
    bad "pnpm install failed — see $LOGS/install.log"; exit 1
  fi

  step "Database (generate, migrate, seed)"
  ensure_isolated_db
  if pnpm db:setup >>"$LOGS/db.log" 2>&1; then
    ok "schema migrated and demo data seeded"
  else
    bad "db:setup failed — see $LOGS/db.log"; exit 1
  fi

  step "Dev servers"
  if dev_running; then
    ok "already running (pid $(cat "$PID_FILE")) — restarting to pick up changes"
    cmd_stop >/dev/null
  fi
  reclaim_ports
  : > "$DEV_LOG"
  nohup pnpm dev >>"$DEV_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  ok "started (pid $(cat "$PID_FILE")), logging to $DEV_LOG"

  wait_http "$API_URL/health"  "api"        120
  wait_http "$ADMIN_URL"       "admin"      240
  wait_http "$SF_URL"          "storefront" 240

  git -C "$ROOT" rev-parse HEAD > "$SYNC_STAMP" 2>/dev/null || true
  cmd_urls
}

cmd_urls() {
  step "Open"
  printf '  %-12s %s%s%s  %s\n' "admin"      "$B" "$ADMIN_URL"           "$R" "${DIM}owner@demo.dev / password123$R"
  printf '  %-12s %s%s%s\n'     "storefront" "$B" "$SF_URL"              "$R"
  printf '  %-12s %s%s%s\n'     "api"        "$B" "$API_URL/health"      "$R"
  printf '  %-12s %s%s%s\n'     "mail"       "$B" "http://localhost:8025" "$R"
  printf '  %-12s %s%s%s  %s\n' "storage"    "$B" "http://localhost:9001" "$R" "${DIM}merchantminio / merchantminio$R"
  printf '\n  %slogs:%s pnpm stack logs    %sstate:%s pnpm stack status    %srefresh:%s pnpm stack sync\n' \
    "$DIM" "$R" "$DIM" "$R" "$DIM" "$R"
}

cmd_open() {
  cmd_urls
  command -v open >/dev/null 2>&1 || return 0
  open "$ADMIN_URL" >/dev/null 2>&1 || true
  open "$SF_URL" >/dev/null 2>&1 || true
}

cmd_stop() {
  local stopped=0
  if dev_running; then
    kill_tree "$(cat "$PID_FILE")"
    stopped=1
  fi
  rm -f "$PID_FILE"
  # Anything still holding a dev port that belongs to this repo goes too, so a
  # crashed turbo run does not block the next `up`.
  reclaim_ports
  if [ "$stopped" = 1 ]; then ok "dev servers stopped"; else ok "no dev servers were running"; fi
}

cmd_down() {
  cmd_stop
  cd "$ROOT" || exit 1
  step "Infrastructure"
  docker compose down >/dev/null 2>&1 && ok "containers stopped" || bad "docker compose down failed"
}

cmd_logs() {
  [ -f "$DEV_LOG" ] || die "no log yet — run \`pnpm stack up\` first"
  tail -n "${LINES_ARG:-80}" -f "$DEV_LOG"
}

cmd_reset() {
  use_node
  cd "$ROOT" || exit 1
  step "Database reset"
  ensure_isolated_db
  pnpm db:reset && ok "database dropped, remigrated and reseeded"
}

cmd_sync() {
  use_node
  cd "$ROOT" || exit 1

  step "Fetching main"
  local branch before after
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$branch" != "main" ]; then
    die "the main checkout is on branch '$branch', not main. Switch it back (\`git -C $ROOT checkout main\`) — agent work belongs in worktrees."
  fi
  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "the main checkout has uncommitted changes. Commit or discard them before syncing."
  fi
  before=$(git rev-parse HEAD)
  git fetch origin --quiet || die "git fetch failed"
  git merge --ff-only origin/main >/dev/null 2>&1 || die "main has diverged from origin/main — resolve that by hand"
  after=$(git rev-parse HEAD)

  if [ "$before" = "$after" ]; then
    ok "already up to date at $(git log -1 --format='%h %s')"
  else
    ok "updated $(git rev-parse --short "$before") → $(git rev-parse --short "$after")"
    say ""
    git log --format="  ${GRN}+${R} %s ${DIM}(%an, %ar)${R}" "$before..$after"
  fi

  local migrations_before migrations_after
  migrations_before=$(find packages/db/prisma -type d -name '*_ws*' 2>/dev/null | wc -l | tr -d ' ')

  step "Dependencies"
  pnpm install >>"$LOGS/install.log" 2>&1 && ok "pnpm install" || { bad "pnpm install failed — see $LOGS/install.log"; exit 1; }

  step "Database"
  ensure_isolated_db
  migrations_after=$(find packages/db/prisma -type d -name '*_ws*' 2>/dev/null | wc -l | tr -d ' ')
  if pnpm db:setup >>"$LOGS/db.log" 2>&1; then
    if [ "$migrations_after" != "$migrations_before" ]; then
      ok "applied $((migrations_after - migrations_before)) new migration(s) and reseeded"
    else
      ok "schema up to date, demo data reseeded"
    fi
  else
    bad "db:setup failed — see $LOGS/db.log"
    warn "if a migration cannot apply on top of your existing data, run \`pnpm stack reset\`"
    exit 1
  fi

  step "Restarting dev servers"
  cmd_stop >/dev/null
  : > "$DEV_LOG"
  nohup pnpm dev >>"$DEV_LOG" 2>&1 &
  echo $! > "$PID_FILE"
  ok "restarted (pid $(cat "$PID_FILE"))"
  wait_http "$API_URL/health"  "api"        120
  wait_http "$ADMIN_URL"       "admin"      240
  wait_http "$SF_URL"          "storefront" 240
  echo "$after" > "$SYNC_STAMP"
  cmd_urls
}

# Counts of the things the workstreams add, so `status` shows the project
# filling in over the two days rather than just "running / not running".
survey() {
  local admin_pages api_routes sections jobs migrations
  admin_pages=$(find apps/admin/src/app -name 'page.tsx' 2>/dev/null | wc -l | tr -d ' ')
  api_routes=$(find apps/api/src/routes -name '*.ts' ! -name '*.test.ts' 2>/dev/null | wc -l | tr -d ' ')
  sections=$(find packages/theme-engine/src/sections -name '*.tsx' -o -name '*.ts' 2>/dev/null | grep -v index | wc -l | tr -d ' ')
  jobs=$(find apps/worker/src/jobs -name '*.ts' ! -name 'index.ts' ! -name 'types.ts' 2>/dev/null | wc -l | tr -d ' ')
  migrations=$(find packages/db/prisma -type d -name '*_ws*' 2>/dev/null | wc -l | tr -d ' ')
  printf '  %-22s %s\n' "admin pages"      "$admin_pages"
  printf '  %-22s %s\n' "api route files"  "$api_routes"
  printf '  %-22s %s\n' "theme sections"   "$sections   ${DIM}(target ~18)${R}"
  printf '  %-22s %s\n' "worker jobs"      "$jobs"
  printf '  %-22s %s\n' "migrations"       "$migrations"
}

cmd_status() {
  cd "$ROOT" || exit 1

  step "main"
  local branch behind
  branch=$(git rev-parse --abbrev-ref HEAD)
  git fetch origin --quiet 2>/dev/null || warn "could not reach origin — counts below may be stale"
  printf '  %-22s %s\n' "checkout" "$ROOT"
  printf '  %-22s %s\n' "branch"   "$branch$( [ "$branch" != main ] && printf ' %s(expected main)%s' "$YEL" "$R" )"
  printf '  %-22s %s\n' "head"     "$(git log -1 --format='%h %s %C(reset)' | cat)"
  printf '  %-22s %s\n' "dated"    "$(git log -1 --format='%ar')"
  behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo '?')
  if [ "$behind" = "0" ]; then
    ok "up to date with origin/main"
  else
    warn "$behind commit(s) behind origin/main — run \`pnpm stack sync\`"
    git log --format="    ${DIM}·${R} %s" HEAD..origin/main 2>/dev/null | head -15
  fi

  step "Landed on main"
  git log --format="  %C(auto)%h%C(reset) %s ${DIM}(%ar)${R}" -8 | cat

  step "Built so far"
  survey

  step "Services"
  local port label url pid wt code
  for spec in "admin:$ADMIN_PORT:$ADMIN_URL" "api:$API_PORT:$API_URL/health" "storefront:$SF_PORT:$SF_URL"; do
    label=${spec%%:*}; rest=${spec#*:}; port=${rest%%:*}; url=${rest#*:}
    pid=$(pids_on_port "$port" | head -1)
    if [ -z "$pid" ]; then
      bad "$(printf '%-11s' "$label") not running (:$port)"
      continue
    fi
    wt=$(pid_worktree "$pid")
    code=$(http_code "$url" 8)
    case "$code" in
      2*|3*) ok "$(printf '%-11s' "$label") $url ${DIM}[$code, ${wt:-unknown} checkout]${R}" ;;
      000)   warn "$(printf '%-11s' "$label") listening on :$port but not answering yet ${DIM}[${wt:-unknown} checkout]${R}" ;;
      *)     warn "$(printf '%-11s' "$label") $url ${DIM}[HTTP $code, ${wt:-unknown} checkout]${R}" ;;
    esac
    if [ -n "$wt" ] && [ "$wt" != main ]; then
      warn "  ^ served by worktree '$wt', not main — run \`pnpm stack up\` to take the port back"
    fi
  done

  step "Infrastructure"
  if docker_ok; then
    docker compose ps --format '{{.Service}}\t{{.Status}}' 2>/dev/null | expand -t 14 | sed 's/^/  /' || warn "no containers"
  else
    bad "docker is not running"
  fi

  step "Demo data ($(db_name))"
  local rows
  rows=$(psql_main -tA -F' ' -c "
    select relname,
           (xpath('/row/c/text()',
                  query_to_xml(format('select count(*) as c from public.%I', relname),
                               false, true, '')))[1]::text::bigint as n
      from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
     where ns.nspname = 'public' and c.relkind = 'r'
       and relname not like '\\_prisma%'
     order by n desc, relname;")
  if [ -z "$rows" ]; then
    warn "could not query postgres"
  elif [ -z "$(printf '%s' "$rows" | awk '$2 > 0')" ]; then
    warn "every table is empty — run \`pnpm stack reset\` to reseed"
  else
    printf '%s' "$rows" | awk '$2 > 0' | head -12 | awk '{ printf "  %-24s %s\n", $1, $2 }'
    printf '  %s%s tables seeded, %s still empty%s\n' "$DIM" \
      "$(printf '%s' "$rows" | awk '$2 > 0' | wc -l | tr -d ' ')" \
      "$(printf '%s' "$rows" | awk '$2 == 0' | wc -l | tr -d ' ')" "$R"
  fi

  if dev_running; then
    printf '\n  %sdev servers: pid %s · logs %s%s\n' "$DIM" "$(cat "$PID_FILE")" "$DEV_LOG" "$R"
  fi
}

# Poll origin/main and re-sync whenever something lands. Meant to be left
# running in a terminal for the length of a build day.
cmd_watch() {
  local interval=${1:-120}
  step "Watching origin/main (every ${interval}s) — ctrl-c to stop"
  while true; do
    cd "$ROOT" || exit 1
    git fetch origin --quiet 2>/dev/null || true
    local behind
    behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
    if [ "$behind" -gt 0 ] 2>/dev/null; then
      printf '\n%s[%s]%s %s new commit(s) on main — syncing\n' "$DIM" "$(date +%H:%M:%S)" "$R" "$behind"
      cmd_sync
    else
      printf '%s[%s] up to date at %s%s\r' "$DIM" "$(date +%H:%M:%S)" "$(git rev-parse --short HEAD)" "$R"
    fi
    sleep "$interval"
  done
}

# Disk accounting. Ten worktrees at ~840 MB of node_modules each is the single
# largest consumer in this repo, and it is avoidable — see .npmrc.
cmd_disk() {
  local store; store=$HOME/Library/pnpm/store/v3

  step "Volume"
  df -h /System/Volumes/Data 2>/dev/null | tail -1 | awk '{ printf "  %s free of %s (%s used)\n", $4, $2, $5 }'

  step "Worktrees"
  local w nm size linked sample total=0 wasted=0
  for w in "$ROOT" $(ls -d "$ROOT"/.claude/worktrees/*/ 2>/dev/null | sed 's|/$||'); do
    nm="$w/node_modules"
    [ -d "$nm" ] || { printf '  %-34s %s\n' "$(basename "$w")" "${DIM}no node_modules${R}"; continue; }
    size=$(du -sm "$nm" 2>/dev/null | cut -f1)
    total=$((total + size))
    sample=$(find "$nm/.pnpm" -type f -name '*.js' 2>/dev/null | head -1)
    if [ -n "$sample" ] && [ "$(stat -f '%l' "$sample" 2>/dev/null)" -gt 1 ] 2>/dev/null; then
      linked="${GRN}hardlinked${R}"
    else
      linked="${YEL}own copy${R}"; wasted=$((wasted + size))
    fi
    printf '  %-34s %5s MB  %s\n' "$(basename "$w")" "$size" "$linked"
  done
  printf '  %s%s MB across all worktrees; %s MB of that is duplicated%s\n' "$DIM" "$total" "$wasted" "$R"
  [ "$wasted" -gt 500 ] && warn "run \`pnpm install\` in those worktrees to convert them (.npmrc hardlinks now)"

  step "Regenerable caches"
  local caches=0 d
  for d in $(find "$ROOT" "$ROOT"/.claude/worktrees -maxdepth 4 -type d \( -name '.next' -o -name '.turbo' \) 2>/dev/null); do
    caches=$((caches + $(du -sm "$d" 2>/dev/null | cut -f1)))
  done
  printf '  %-34s %5s MB  %s\n' ".next + .turbo" "$caches" "${DIM}safe to delete, rebuilt on demand${R}"
  [ -d "$store" ] && printf '  %-34s %5s MB  %s\n' "pnpm store" "$(du -sm "$store" | cut -f1)" "${DIM}shared; \`pnpm store prune\` trims it${R}"

  step "Docker"
  docker system df 2>/dev/null | sed 's/^/  /' || warn "docker not running"
  printf '\n  %sBuild cache and unused images are reclaimable with:%s\n' "$DIM" "$R"
  printf '    docker builder prune -af\n'
  printf '    docker image prune -a\n'
  printf '  %sNote: this Docker also serves your other projects, and freeing space inside\n  the VM does not always shrink Docker.raw on the host.%s\n' "$DIM" "$R"
}

usage() {
  cat <<'HELP'
stack.sh — run and survey the local `main` stack

  pnpm stack up       bring everything up (infra, deps, db, dev servers)
  pnpm stack status   where main is, what is healthy, what has been built
  pnpm stack sync     pull main, reinstall, migrate, reseed, restart
  pnpm stack watch    keep syncing automatically as PRs land on main
  pnpm stack logs     tail the dev server log
  pnpm stack stop     stop the dev servers (leaves docker infra up)
  pnpm stack down     stop dev servers and docker infra
  pnpm stack reset    drop + remigrate + reseed the database
  pnpm stack doctor   check prerequisites without changing anything
  pnpm stack open     open the admin and storefront in a browser
HELP
}

case "${1:-status}" in
  up)      cmd_up ;;
  status)  cmd_status ;;
  disk)    cmd_disk ;;
  sync)    cmd_sync ;;
  watch)   cmd_watch "${2:-120}" ;;
  logs)    LINES_ARG=${2:-80} cmd_logs ;;
  stop)    cmd_stop ;;
  down)    cmd_down ;;
  reset)   cmd_reset ;;
  doctor)  cmd_doctor ;;
  open)    cmd_open ;;
  urls)    cmd_urls ;;
  -h|--help|help) usage ;;
  *)       echo "stack: unknown command '$1'" >&2; usage; exit 1 ;;
esac
