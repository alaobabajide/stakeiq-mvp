#!/bin/bash
set -e

cd backend

echo "==> Node $(node --version)"
echo "==> PORT: ${PORT:-3001}"

if [ -n "$DATABASE_URL" ]; then
  echo "==> Running database migrations..."
  npx prisma db push --accept-data-loss || echo "Warning: prisma db push failed, continuing..."
else
  echo "Warning: DATABASE_URL not set, skipping migrations"
fi

echo "==> Starting StakeIQ API..."
exec node src/app.js
