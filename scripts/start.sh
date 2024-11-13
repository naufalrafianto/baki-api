#!/bin/sh
# scripts/start.sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
yarn prisma migrate deploy

# Start application
echo "Starting application..."
node dist/main.js