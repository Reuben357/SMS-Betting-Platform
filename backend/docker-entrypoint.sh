#!/bin/sh
set -e
echo "Running database migrations..."
node src/db/migrate.js
echo "Starting server..."
exec node src/index.js
