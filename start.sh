#!/bin/bash
set -e

echo "==> Running database migrations..."
cd backend
npx prisma db push --accept-data-loss

echo "==> Starting StakeIQ API..."
node src/app.js
