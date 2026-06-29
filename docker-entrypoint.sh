#!/bin/sh
set -e

echo "Applying database schema..."
for i in $(seq 1 10); do
  if node scripts/migrate.mjs; then
    break
  fi
  echo "Migration attempt $i failed, retrying in 3s..."
  sleep 3
done

echo "Starting server..."
exec node server.js