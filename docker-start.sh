#!/bin/sh
set -e

echo "[startup] Applying database migrations..."
node node_modules/prisma/bin.js migrate deploy \
  --schema packages/db/prisma/schema.prisma

echo "[startup] Migrations done. Starting server..."
exec node apps/hd2-council/server.js
