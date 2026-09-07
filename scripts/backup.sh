#!/bin/sh
set -eu

# Backup for the supported single-instance Compose setup. PostgreSQL uses its
# custom dump format; uploaded blobs are archived separately.

command -v docker >/dev/null 2>&1 || {
   echo 'docker is required' >&2
   exit 1
}

backup_root=${CIRCLE_BACKUP_DIR:-"$PWD/backups"}
db_user=${POSTGRES_USER:-circle}
db_name=${POSTGRES_DB:-circle}
stamp=$(date -u +%Y%m%dT%H%M%SZ)

umask 077
mkdir -p "$backup_root"
work_dir=$(mktemp -d "$backup_root/.circle-backup.XXXXXX")
target_dir="$backup_root/$stamp"

cleanup() {
   if [ -d "$work_dir" ]; then
      rm -r "$work_dir"
   fi
}
trap cleanup EXIT INT TERM

echo "Backing up PostgreSQL to $target_dir"
docker compose exec -T db pg_dump \
   --username "$db_user" \
   --dbname "$db_name" \
   --format custom \
   --no-owner \
   --file - > "$work_dir/database.dump"

echo 'Backing up attachments'
docker compose exec -T web tar -czf - -C /app/uploads . > "$work_dir/uploads.tar.gz"

{
   echo "created_at=$stamp"
   echo "database=$db_name"
   echo "database_dump_cksum=$(cksum "$work_dir/database.dump" | awk '{print $1 ":" $2}')"
   echo "uploads_archive_cksum=$(cksum "$work_dir/uploads.tar.gz" | awk '{print $1 ":" $2}')"
} > "$work_dir/manifest.txt"

mv "$work_dir" "$target_dir"
trap - EXIT INT TERM
echo "Backup complete: $target_dir"
