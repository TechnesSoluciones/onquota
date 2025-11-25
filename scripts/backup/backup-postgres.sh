#!/bin/bash
set -e

# PostgreSQL Backup Script for OnQuota
# Performs full database backups with compression and optional S3 upload
# Usage: ./backup-postgres.sh

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="onquota_backup_${DATE}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="/var/log/backup.log"

# S3 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Database credentials from environment or defaults
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-onquota_db}"
PGUSER="${PGUSER:-onquota_user}"
PGPASSWORD="${PGPASSWORD:-}"

# Export password for pg_dump
export PGPASSWORD

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handler
handle_error() {
    local line_number=$1
    log "ERROR: Backup failed at line ${line_number}"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Main backup function
main() {
    log "Starting PostgreSQL backup..."

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"

    # Verify database connectivity
    if ! pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" > /dev/null 2>&1; then
        log "ERROR: Cannot connect to PostgreSQL database at ${PGHOST}:${PGPORT}"
        exit 1
    fi

    log "Connected to database: ${PGDATABASE}@${PGHOST}:${PGPORT}"

    # Create backup
    local backup_path="${BACKUP_DIR}/${FILENAME}"
    log "Creating backup: ${backup_path}"

    pg_dump \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --verbose \
        --no-password \
        --format=plain \
        | gzip > "${backup_path}"

    # Verify backup file exists and has content
    if [ ! -f "${backup_path}" ] || [ ! -s "${backup_path}" ]; then
        log "ERROR: Backup file is empty or doesn't exist: ${backup_path}"
        exit 1
    fi

    local backup_size=$(du -h "${backup_path}" | cut -f1)
    log "Backup successful: ${FILENAME} (${backup_size})"

    # Calculate backup checksum for integrity verification
    local backup_checksum=$(md5sum "${backup_path}" | awk '{print $1}')
    echo "${backup_checksum}" > "${backup_path}.md5"
    log "Backup checksum: ${backup_checksum}"

    # Upload to S3 if configured
    if [ -n "${S3_BUCKET}" ]; then
        upload_to_s3 "${backup_path}"
    fi

    # Clean up old backups
    cleanup_old_backups

    log "Backup process completed successfully"
}

# Upload backup to S3
upload_to_s3() {
    local backup_file=$1
    local s3_path="s3://${S3_BUCKET}/postgres-backups/$(date +%Y/%m/%d)/"

    log "Uploading backup to S3: ${s3_path}"

    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        log "WARNING: AWS CLI not found. Skipping S3 upload."
        return 1
    fi

    # Upload backup file
    if aws s3 cp "${backup_file}" "${s3_path}" \
        --region "${AWS_REGION}" \
        --sse AES256 \
        --metadata "backed-on=$(date -u +%Y-%m-%dT%H:%M:%SZ),hostname=$(hostname)"; then

        log "Successfully uploaded to S3: ${s3_path}$(basename ${backup_file})"

        # Upload checksum file too
        aws s3 cp "${backup_file}.md5" "${s3_path}" \
            --region "${AWS_REGION}" \
            --metadata "type=checksum"

        return 0
    else
        log "ERROR: Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups exceeding retention period
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    # Local cleanup
    if [ -d "${BACKUP_DIR}" ]; then
        while IFS= read -r old_backup; do
            if rm -f "${old_backup}" "${old_backup}.md5" 2>/dev/null; then
                deleted_count=$((deleted_count + 1))
                log "Deleted old backup: $(basename ${old_backup})"
            fi
        done < <(find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -type f)
    fi

    # S3 cleanup if bucket is configured
    if [ -n "${S3_BUCKET}" ] && command -v aws &> /dev/null; then
        log "Cleaning up S3 backups older than ${RETENTION_DAYS} days..."

        # Calculate cutoff date
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

        # List and delete old objects
        aws s3api list-objects-v2 \
            --bucket "${S3_BUCKET}" \
            --prefix "postgres-backups/" \
            --region "${AWS_REGION}" \
            --query "Contents[?LastModified<'${cutoff_date}'].Key" \
            --output text | while read -r object; do

            if [ -n "${object}" ]; then
                if aws s3 rm "s3://${S3_BUCKET}/${object}" --region "${AWS_REGION}"; then
                    deleted_count=$((deleted_count + 1))
                    log "Deleted from S3: ${object}"
                fi
            fi
        done
    fi

    if [ ${deleted_count} -gt 0 ]; then
        log "Cleanup completed: removed ${deleted_count} old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Run main function
main "$@"
