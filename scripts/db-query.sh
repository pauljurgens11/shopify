#!/usr/bin/env bash
#
# db-query.sh — read-only SQL against the database THIS checkout points at.
#
#   pnpm db:query "select slug, name from shops"
#   pnpm db:query tables                 # every table + live row count
#   pnpm db:query describe products      # columns, types, indexes, FKs
#   pnpm db:query --csv "select ..."     # csv out, for piping
#
# Why this exists: agents need to look at data constantly ("did the seed run?",
# "what shopId did that order land on?") and the alternative is a throwaway
# Prisma script per question. This is one command with no write path.
#
# Reads is ALL it can do. Postgres itself enforces that via
# default_transaction_read_only — not this script's parsing, which could be
# fooled. INSERT/UPDATE/DELETE/DDL fail at the server:
#   ERROR: cannot execute INSERT in a read-only transaction
# Writes belong in a migration or the app, never here.
#
# Worktree-aware: it resolves the database from the local .env, so main's stack
# (merchant_main) and a worktree's branch database do not get confused for each
# other. Runs psql inside the container, so no host psql is required.
set -uo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "db:query: not inside the merchant repository" >&2; exit 1
}

ENV_FILE="$ROOT/.env"
[ -f "$ENV_FILE" ] || { echo "db:query: no .env — run \`pnpm stack up\` first" >&2; exit 1; }

# Database name out of DATABASE_URL: postgresql://user:pw@host:port/DBNAME?params
DB=$(sed -n 's|^DATABASE_URL=.*://[^/]*/\([^?"'"'"']*\).*|\1|p' "$ENV_FILE" | head -1)
[ -n "$DB" ] || { echo "db:query: could not read a database name from DATABASE_URL" >&2; exit 1; }

FORMAT=()
case "${1:-}" in
  --csv)  FORMAT=(--csv); shift ;;
  --tsv)  FORMAT=(-At -F $'\t'); shift ;;
  --raw)  FORMAT=(-At); shift ;;
esac

run_sql() {
  # -v ON_ERROR_STOP=1 so a failing statement is a non-zero exit, not a warning
  # buried in output that an agent then reports as success.
  docker compose --project-directory "$ROOT" exec -T \
    -e PGOPTIONS='-c default_transaction_read_only=on' \
    postgres psql -U merchant -d "$DB" \
    -v ON_ERROR_STOP=1 -P pager=off ${FORMAT[@]+"${FORMAT[@]}"} "$@"
}

case "${1:-}" in
  ""|-h|--help)
    cat <<HELP
db:query — read-only SQL against the database this checkout points at.

  pnpm db:query "select slug, name from shops"   run SQL
  pnpm db:query tables                           every table + row count
  pnpm db:query describe orders                  columns, indexes, FKs
  pnpm db:query --csv "select ..."               csv out (also --tsv, --raw)

Reads only: Postgres refuses writes on this connection, so a stray INSERT or
DROP errors out instead of touching the demo data. Exit code is non-zero when
the query fails.

database: $DB
HELP
    exit 0
    ;;

  tables)
    # n_live_tup is the planner's estimate — instant, and close enough to answer
    # "did the seed run?". An exact count needs a real query per table.
    run_sql -c "
      select relname as table,
             n_live_tup as rows
        from pg_stat_user_tables
       where schemaname = 'public'
       order by n_live_tup desc, relname;"
    ;;

  describe|d)
    [ -n "${2:-}" ] || { echo "db:query: describe needs a table name" >&2; exit 1; }
    run_sql -c "\\d+ \"$2\""
    ;;

  *)
    run_sql -c "$1"
    ;;
esac
