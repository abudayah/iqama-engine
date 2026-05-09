#!/bin/bash
# Deploy script for iqama-engine
# Run this on the server: bash deploy.sh

# Set PATH to include cPanel Node.js
export PATH="/opt/cpanel/ea-nodejs22/bin:$PATH"

cd /home2/theisbcc/iqama.theisbc.ca/api || exit 1

echo "Pulling latest changes from main branch..."
git fetch origin main
git reset --hard origin/main

echo "Installing dependencies..."
/opt/cpanel/ea-nodejs22/bin/npm install --ignore-scripts

echo "Generating Prisma Client..."
/opt/cpanel/ea-nodejs22/bin/npx prisma generate

echo "Running database migrations..."
/opt/cpanel/ea-nodejs22/bin/npx prisma migrate deploy

echo "Building application..."
/opt/cpanel/ea-nodejs22/bin/npm run build

echo ""
echo "Verifying build..."
if [ -f "dist/src/schedule-builder/schedule-builder.service.js" ]; then
    echo "✓ Build files exist"
    echo "Last modified:"
    ls -l dist/src/schedule-builder/schedule-builder.service.js | awk '{print $6, $7, $8}'
else
    echo "✗ Build files not found!"
    exit 1
fi

echo "Restarting application via Passenger..."
# Create tmp directory if it doesn't exist
mkdir -p tmp

# Touch restart.txt to trigger Passenger restart
touch tmp/restart.txt

# Also try to kill any existing node processes for this app
pkill -f "dist/src/main" || true

echo ""
echo "API deployment complete!"
echo "Waiting for Passenger to restart..."
sleep 5

# Check if the process is running
if ps aux | grep "dist/src/main" | grep -v grep > /dev/null; then
    echo "✓ API process is running"
else
    echo "✗ API process not found (may still be starting)"
fi

echo ""
echo "Health check:"
curl https://iqama.theisbc.ca/api/v1/health
echo ""
