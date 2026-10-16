#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Sentinel PostgreSQL Automated Backup Script
# Creates a compressed, timestamped SQL dump of the Sentinel database.
# ==============================================================================

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER_NAME="${CONTAINER_NAME:-sentinel_postgres}"
POSTGRES_USER="${POSTGRES_USER:-sentinel}"
POSTGRES_DB="${POSTGRES_DB:-sentinel_db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sentinel_backup_${TIMESTAMP}.sql.gz"

echo "[INFO] [$(date +'%Y-%m-%d %H:%M:%S')] Starting Sentinel database backup..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] Container '${CONTAINER_NAME}' is not running!" >&2
    exit 1
fi

docker exec -t "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip -9 > "$BACKUP_FILE"

FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[INFO] Backup successfully created: ${BACKUP_FILE} (${FILE_SIZE})"

# Prune backups older than retention days
echo "[INFO] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "sentinel_backup_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "[INFO] Backup job completed."
