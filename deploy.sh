#!/bin/bash
# Deploy script for iqama-engine
# Run it with a single command on the server:  sh deploy.sh
#
# Safe to invoke with `sh`, `bash`, or `./deploy.sh` — it re-executes itself
# under bash so the bash-only features below always work, even where /bin/sh
# is dash (the cPanel default).

# Re-exec under bash if we were started by a non-bash shell (e.g. `sh deploy.sh`).
if [ -z "$BASH_VERSION" ]; then
  exec bash "$0" "$@"
fi

# Stop on the first error, treat unset vars as errors, fail a pipeline if any
# stage fails. A broken build must never be "deployed".
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────
APP_DIR="/home2/theisbcc/iqama.theisbc.ca/api"
NODE_BIN="/opt/cpanel/ea-nodejs22/bin"
HEALTH_URL="https://iqama.theisbc.ca/api/v1/health"

export PATH="$NODE_BIN:$PATH"

cd "$APP_DIR"

echo "==> Pulling latest changes from main branch..."
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies..."
npm install --ignore-scripts

echo "==> Generating Prisma Client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Seeding initial Adhan configuration (idempotent)..."
npx prisma db seed

echo "==> Building application..."
npm run build

echo ""
echo "==> Verifying build..."
if [ -f "dist/src/schedule-builder/schedule-builder.service.js" ]; then
  echo "✓ Build files exist (last modified: $(date -r dist/src/schedule-builder/schedule-builder.service.js '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo unknown))"
else
  echo "✗ Build files not found!"
  exit 1
fi

echo "==> Restarting application via Passenger..."
mkdir -p tmp
touch tmp/restart.txt
# Best-effort: nudge any lingering process. Never fail the deploy over this.
pkill -f "dist/src/main" || true

echo ""
echo "API deployment complete! Waiting for Passenger to restart..."
sleep 5

if ps aux | grep "dist/src/main" | grep -v grep > /dev/null; then
  echo "✓ API process is running"
else
  echo "… API process not found yet (Passenger may still be starting)"
fi

echo ""
echo "==> Health check:"
# Don't let a transient health-check failure abort the script after a good deploy.
curl -fsS "$HEALTH_URL" || echo "(health check did not return OK — check the app logs)"
echo ""
echo "Done."
