#!/usr/bin/env bash
# Operator backup of this Compose project's three databases; archives contain sensitive data.
set -eu
umask 077
backup_dir="${1:-backups}"
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
for database in sentinel_control sentinel_ingestion sentinel_inference; do
  file="$backup_dir/${database}_${stamp}.dump"
  docker compose exec -T postgres pg_dump -U postgres --format=custom --no-owner "$database" > "$file"
  test -s "$file"
  docker compose exec -T postgres pg_restore --list < "$file" >/dev/null
  printf 'Verified archive: %s\n' "$file"
done
