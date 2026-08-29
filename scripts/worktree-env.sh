#!/usr/bin/env bash
#
# worktree-env.sh — give this worktree its own database and Redis keyspace.
#
# Every worktree in this repo talks to ONE docker compose stack. Sharing a
# database across them is not a tidiness problem, it is a correctness one: a
# migration that is correct on its own branch (`ADD COLUMN ... NOT NULL`, say)
# breaks every other worktree the moment it is applied, and `pnpm db:reset`
# drops the database out from under whoever else is mid-test-run.
#
# So each worktree gets `merchant_<name>` and its own Redis db index. Both are
# free: Postgres databases are catalog entries, not processes, and redis-server
# already allocates all 16 logical dbs.
#
#   pnpm worktree:env            isolate the worktree you are standing in
#   pnpm worktree:env --migrate  ...and migrate + seed it, ready to test
#   pnpm worktree:env --all      isolate every worktree (implies --migrate)
#
set -uo pipefail

GIT_COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
[ -n "$GIT_COMMON" ] || { echo "worktree-env: not inside the merchant repository" >&2; exit 1; }
MAIN=$(cd "$(dirname "$GIT_COMMON")" && pwd)

if [ -t 1 ]; then B=$'\033[1m'; DIM=$'\033[2m'; R=$'\033[0m'; GRN=$'\033[32m'; YEL=$'\033[33m'; RED=$'\033[31m'; CYN=$'\033[36m'
else B=''; DIM=''; R=''; GRN=''; YEL=''; RED=''; CYN=''; fi
step() { printf '\n%s==>%s %s%s%s\n' "$CYN" "$R" "$B" "$*" "$R"; }
ok()   { printf '  %s✓%s %s\n' "$GRN" "$R" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$R" "$*"; }
die()  { printf '%serror:%s %s\n' "$RED" "$R" "$*" >&2; exit 1; }

# Redis exposes 16 logical dbs. 0 is reserved for the main checkout's stack so
# `pnpm stack` never shares a keyspace with a branch.
MAX_SLOT=15

worktree_dirs() { ls -d "$MAIN"/.claude/worktrees/*/ 2>/dev/null | sed 's|/$||'; }

# Postgres identifiers cap at 63 bytes; "merchant_" leaves 54.
db_for() {
  local name; name=$(basename "$1" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_' | cut -c1-54)
  printf 'merchant_%s' "${name%_}"
}

slot_of() { sed -n 's|^REDIS_URL=redis://[^/]*/\([0-9][0-9]*\).*|\1|p' "$1/.env" 2>/dev/null | head -1; }

# Lowest free slot, so a removed worktree's index gets reused rather than
# exhausting the 15 available.
next_slot() {
  local self=$1 taken=" 0 " w s
  for w in $(worktree_dirs); do
    [ "$w" = "$self" ] && continue
    s=$(slot_of "$w"); [ -n "$s" ] && taken="$taken$s "
  done
  local i=1
  while [ "$i" -le "$MAX_SLOT" ]; do
    case "$taken" in *" $i "*) ;; *) printf '%s' "$i"; return 0 ;; esac
    i=$((i + 1))
  done
  die "all $MAX_SLOT Redis slots are taken — archive a finished worktree first"
}

psql_admin() { ( cd "$MAIN" && docker compose exec -T postgres psql -U merchant -d postgres "$@" ) 2>/dev/null; }

set_var() {  # set_var <file> <KEY> <value>
  local file=$1 key=$2 val=$3 tmp
  tmp=$(mktemp)
  if grep -q "^$key=" "$file"; then
    sed "s|^$key=.*|$key=$val|" "$file" > "$tmp"
  else
    cat "$file" > "$tmp"; printf '%s=%s\n' "$key" "$val" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

isolate() {
  local wt=$1 migrate=$2 db slot
  wt=$(cd "$wt" && pwd)
  local label; label=$(basename "$wt")
  # next_slot's die() runs in a subshell, so its failure must be re-checked here -
  # otherwise an empty slot writes a bare REDIS_URL (db 0) and the worktree
  # silently shares main's session keyspace (seen live: two review sessions
  # clobbering each other's admin sessions).
  [ "$wt" = "$MAIN" ] && { db=merchant_main; slot=0; label="main"; } || { db=$(db_for "$wt"); slot=$(slot_of "$wt"); [ -n "$slot" ] || slot=$(next_slot "$wt") || exit 1; }
  [ -n "$slot" ] || die "no Redis slot for $label — refusing to write a shared REDIS_URL"

  step "$label"
  [ -f "$wt/.env" ] || { cp "$MAIN/.env.example" "$wt/.env" && ok "created .env from .env.example"; }

  set_var "$wt/.env" DATABASE_URL "postgresql://merchant:merchant@localhost:5433/${db}?schema=public"
  set_var "$wt/.env" REDIS_URL    "redis://localhost:6379/${slot}"
  ok "database $db  ·  redis db $slot"

  if ! psql_admin -tAc "select 1 from pg_database where datname='$db'" | grep -q 1; then
    ( cd "$MAIN" && docker compose exec -T postgres createdb -U merchant "$db" ) >/dev/null 2>&1 \
      && ok "created database" || die "could not create database $db"
  fi

  if [ "$migrate" = yes ]; then
    if [ ! -d "$wt/node_modules" ]; then
      warn "no node_modules — skipping migrate/seed (run \`pnpm install && pnpm db:setup\` here)"
      return 0
    fi
    if ( cd "$wt" && pnpm db:setup ) >"$wt/.local-dbsetup.log" 2>&1; then
      ok "migrated and seeded"
      rm -f "$wt/.local-dbsetup.log"
    else
      warn "db:setup failed — see $wt/.local-dbsetup.log"
    fi
  fi
}

MIGRATE=no; ALL=no
for a in "$@"; do
  case "$a" in
    --migrate) MIGRATE=yes ;;
    --all)     ALL=yes; MIGRATE=yes ;;
    -h|--help) sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown flag $a" ;;
  esac
done

( cd "$MAIN" && docker compose ps postgres 2>/dev/null | grep -q healthy ) \
  || die "postgres is not running — \`docker compose up -d\` first"

if [ "$ALL" = yes ]; then
  isolate "$MAIN" yes
  for w in $(worktree_dirs); do isolate "$w" yes; done
else
  isolate "$(git rev-parse --show-toplevel)" "$MIGRATE"
fi

printf '\n  %sEach worktree now has its own database and Redis keyspace.%s\n' "$DIM" "$R"
printf '  %sPorts 3000/3001/3002 are still shared on purpose — one dev stack at a time.%s\n' "$DIM" "$R"
