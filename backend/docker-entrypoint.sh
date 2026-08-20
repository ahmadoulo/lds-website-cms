#!/bin/sh
set -e

echo "[startup] applying database migrations..."

# `migrate deploy` is the safe production path: it only applies committed
# migration files and never drops data.
if ! npx prisma migrate deploy; then
  echo "[startup] migrate deploy failed."
  # A database created by an earlier `prisma db push` already has the tables but
  # no _prisma_migrations history. Mark the baseline as applied, then retry.
  echo "[startup] attempting to baseline an existing schema..."
  npx prisma migrate resolve --applied 20260101000000_init
  npx prisma migrate deploy
fi

echo "[startup] seeding reference data (idempotent)..."
npx prisma db seed

echo "[startup] starting API..."
exec node dist/main.js
