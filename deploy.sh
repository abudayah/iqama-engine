#!/bin/bash
# Deploy script for iqama-engine
# Run this on the server: bash deploy.sh

cd /home2/theisbcc/iqama.theisbc.ca/api || exit 1

echo "Pulling latest changes from prod branch..."
git fetch origin prod
git reset --hard origin/prod

echo "Installing dependencies..."
/opt/cpanel/ea-nodejs22/bin/npm install --production

echo "Generating Prisma Client..."
/opt/cpanel/ea-nodejs22/bin/npx prisma generate

echo "Running database migrations..."
/opt/cpanel/ea-nodejs22/bin/npx prisma migrate deploy

echo "Building application..."
/opt/cpanel/ea-nodejs22/bin/npm run build

echo "Restarting application..."
# Find and kill the existing Node process
pkill -f "node dist/main.js" || echo "No existing process found"

# Start the application in the background
nohup /opt/cpanel/ea-nodejs22/bin/npm run start:prod > /dev/null 2>&1 &

echo "API deployment complete!"
echo "Check health: curl https://iqama.theisbc.ca/api/v1/health"
