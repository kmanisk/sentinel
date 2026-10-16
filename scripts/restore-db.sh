#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Sentinel PostgreSQL Disaster Recovery / Restore Script
# Restores a compressed SQL dump into the running PostgreSQL container.
# ==============================================================================

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>" >&2
    echo "Example: $0 ./backups/sentinel_backup_20261016_231000.sql.gz" >&2
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-sentinel_postgres}"
POSTGRES_USER="${POSTGRES_USER:-sentinel}"
POSTGRES_DB="${POSTGRES_DB:-sentinel_db}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERROR] Backup file '${BACKUP_FILE}' does not exist!" >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] Container '${CONTAINER_NAME}' is not running!" >&2
    exit 1
fi

echo "[WARNING] Restoring will overwrite existing data in '${POSTGRES_DB}'."
read -p "Are you sure you want to proceed? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore aborted."
    exit 0
fi

echo "[INFO] Restoring ${BACKUP_FILE} into ${POSTGRES_DB}..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[OK] Database restored successfully."
