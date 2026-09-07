#!/bin/sh
set -eu

# Destructive by design and deliberately guarded. Restore only into the
# supported Compose deployment, during a maintenance window.

backup_dir=${1:-}
if [ -z "$backup_dir" ] || \
   [ ! -f "$backup_dir/database.dump" ] || \
   [ ! -f "$backup_dir/uploads.tar.gz" ] || \
   [ ! -f "$backup_dir/manifest.txt" ]; then
   echo 'usage: CONFIRM_RESTORE=restore-circle sh scripts/restore.sh <backup-directory>' >&2
   exit 1
fi
if [ "${CONFIRM_RESTORE:-}" != 'restore-circle' ]; then
   echo 'restore refused: set CONFIRM_RESTORE=restore-circle after verifying the target' >&2
   exit 1
fi

command -v docker >/dev/null 2>&1 || {
   echo 'docker is required' >&2
   exit 1
}

db_user=${POSTGRES_USER:-circle}
db_name=${POSTGRES_DB:-circle}

checksum() {
   cksum "$1" | awk '{print $1 ":" $2}'
}
expected_database=$(sed -n 's/^database_dump_cksum=//p' "$backup_dir/manifest.txt")
expected_uploads=$(sed -n 's/^uploads_archive_cksum=//p' "$backup_dir/manifest.txt")
if [ "$(checksum "$backup_dir/database.dump")" != "$expected_database" ] || \
   [ "$(checksum "$backup_dir/uploads.tar.gz")" != "$expected_uploads" ]; then
   echo 'restore refused: backup checksum validation failed' >&2
   exit 1
fi

echo "Restoring $backup_dir into Compose database '$db_name'"
docker compose stop web
restart_web() {
   docker compose up -d web
}
trap restart_web EXIT INT TERM

docker compose exec -T db dropdb --force --if-exists --username "$db_user" "$db_name"
docker compose exec -T db createdb --username "$db_user" "$db_name"
docker compose exec -T db pg_restore \
   --username "$db_user" \
   --dbname "$db_name" \
   --no-owner \
   --exit-on-error < "$backup_dir/database.dump"

echo 'Replacing attachment volume contents'
docker compose run --rm --no-deps -T --entrypoint sh web \
   -c "find /app/uploads -mindepth 1 -maxdepth 1 -exec rm -rf -- '{}' ';'; tar -xzf - -C /app/uploads" \
   < "$backup_dir/uploads.tar.gz"

restart_web
trap - EXIT INT TERM
echo 'Restore complete; verify /api/health and an attachment download.'
