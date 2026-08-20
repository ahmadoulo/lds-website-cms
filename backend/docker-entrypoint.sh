#!/bin/sh
set -e

BASELINE=20260101000000_init

fatal_credentials() {
  cat <<'MSG'

[startup] ================================================================
[startup] FATAL: PostgreSQL refused the credentials.
[startup]
[startup] PostgreSQL only reads POSTGRES_PASSWORD when it FIRST creates its
[startup] data directory. On an existing volume the password stored inside the
[startup] database wins, so a new value in .env can never authenticate.
[startup]
[startup] Either put the original password back in .env, or change the one
[startup] stored in the database to match, from the host:
[startup]
[startup]   NEW_PW=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
[startup]   docker compose exec -T postgres psql -U postgres -d lds_db \
[startup]     -c "ALTER USER postgres WITH PASSWORD '$NEW_PW';"
[startup]   docker compose restart backend
[startup] ================================================================

MSG
  exit 1
}

echo "[startup] applying database migrations..."

if output=$(npx prisma migrate deploy 2>&1); then
  echo "$output"
else
  echo "$output"

  case "$output" in
    *P1000*) fatal_credentials ;;
    *P1001*)
      echo "[startup] database unreachable. Retrying on next restart."
      exit 1
      ;;
  esac

  # P3005 and friends: the database already has the tables but no migration
  # history, because it was created by `prisma db push` before migrations
  # existed. Adopt it rather than rebuilding it.
  echo "[startup] no migration history found; adopting the existing schema..."
  npx prisma migrate resolve --applied "$BASELINE"
  npx prisma migrate deploy

  # Recording the baseline does not create anything: a schema pushed before the
  # baseline was written can still be missing its newer columns. This adds them.
  # Without --accept-data-loss, Prisma refuses any destructive change, so an
  # unexpected difference stops the deployment instead of dropping data.
  echo "[startup] reconciling the schema with prisma/schema.prisma..."
  npx prisma db push --skip-generate
fi

echo "[startup] seeding reference data (idempotent)..."
npx prisma db seed

echo "[startup] starting API..."
exec node dist/main.js
