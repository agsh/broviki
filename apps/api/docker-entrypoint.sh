#!/bin/sh
set -eu

cd /app/apps/api

export CHECKPOINT_DISABLE=1
export PRISMA_HIDE_UPDATE_MESSAGE=1

PRISMA_BIN=/app/node_modules/.bin/prisma
if [ ! -x "$PRISMA_BIN" ]; then
  PRISMA_BIN=/app/apps/api/node_modules/.bin/prisma
fi
if [ ! -x "$PRISMA_BIN" ]; then
  echo "prisma CLI not found" >&2
  exit 1
fi

echo "Applying Prisma migrations…"
"$PRISMA_BIN" migrate deploy

echo "Starting Broviki API on :${PORT:-3001}"
exec node dist/main.js
