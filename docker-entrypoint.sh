#!/bin/sh
set -e

# Run Prisma migrations
yarn prisma migrate deploy

# Start the application
exec node dist/main.js
