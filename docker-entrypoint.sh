#!/bin/sh
set -e

# Apply pending migrations before the server starts.
echo "› prisma migrate deploy"
prisma migrate deploy

exec "$@"
