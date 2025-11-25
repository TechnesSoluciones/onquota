#!/bin/bash
set -e

# Redis Backup Script for OnQuota
# Creates Redis RDB snapshots and optionally uploads to S3
# Usage: ./backup-redis.sh

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="onquota_redis_backup_${DATE}.rdb"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
LOG_FILE="/var/log/backup.log"

# S3 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handler
handle_error() {
    local line_number=$1
    log "ERROR: Redis backup failed at line ${line_number}"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Main backup function
main() {
    log "Starting Redis backup..."

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"

    # Verify Redis connectivity
    if ! redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping > /dev/null 2>&1; then
        log "ERROR: Cannot connect to Redis at ${REDIS_HOST}:${REDIS_PORT}"
        exit 1
    fi

    log "Connected to Redis: ${REDIS_HOST}:${REDIS_PORT}"

    # Trigger Redis save operation
    log "Triggering Redis BGSAVE..."
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} BGSAVE

    # Get Redis dump file location
    local redis_dump_file=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} CONFIG GET dir | tail -1)/dump.rdb

    if [ ! -f "${redis_dump_file}" ]; then
        log "ERROR: Redis dump file not found: ${redis_dump_file}"
        exit 1
    fi

    # Wait for Redis background save to complete
    log "Waiting for Redis BGSAVE to complete..."
    sleep 2

    local max_wait=300
    local waited=0
    while [ "${waited}" -lt "${max_wait}" ]; do
        local last_save=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} LASTSAVE)
        local current_time=$(date +%s)

        if [ $((current_time - last_save)) -lt 5 ]; then
            log "Redis BGSAVE completed"
            break
        fi

        sleep 1
        waited=$((waited + 1))
    done

    # Copy Redis dump file
    local backup_path="${BACKUP_DIR}/${FILENAME}"
    log "Copying Redis dump to backup location: ${backup_path}"

    cp "${redis_dump_file}" "${backup_path}"

    # Compress backup
    log "Compressing backup..."
    gzip "${backup_path}"
    backup_path="${backup_path}.gz"

    # Verify backup
    if [ ! -f "${backup_path}" ] || [ ! -s "${backup_path}" ]; then
        log "ERROR: Backup file is empty or doesn't exist: ${backup_path}"
        exit 1
    fi

    local backup_size=$(du -h "${backup_path}" | cut -f1)
    log "Backup successful: ${FILENAME}.gz (${backup_size})"

    # Calculate backup checksum
    local backup_checksum=$(md5sum "${backup_path}" | awk '{print $1}')
    echo "${backup_checksum}" > "${backup_path}.md5"
    log "Backup checksum: ${backup_checksum}"

    # Upload to S3 if configured
    if [ -n "${S3_BUCKET}" ]; then
        upload_to_s3 "${backup_path}"
    fi

    # Clean up old backups
    cleanup_old_backups

    log "Redis backup process completed successfully"
}

# Upload backup to S3
upload_to_s3() {
    local backup_file=$1
    local s3_path="s3://${S3_BUCKET}/redis-backups/$(date +%Y/%m/%d)/"

    log "Uploading backup to S3: ${s3_path}"

    if ! command -v aws &> /dev/null; then
        log "WARNING: AWS CLI not found. Skipping S3 upload."
        return 1
    fi

    if aws s3 cp "${backup_file}" "${s3_path}" \
        --region "${AWS_REGION}" \
        --sse AES256 \
        --metadata "backed-on=$(date -u +%Y-%m-%dT%H:%M:%SZ),hostname=$(hostname)"; then

        log "Successfully uploaded to S3: ${s3_path}$(basename ${backup_file})"

        aws s3 cp "${backup_file}.md5" "${s3_path}" \
            --region "${AWS_REGION}" \
            --metadata "type=checksum"

        return 0
    else
        log "ERROR: Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up Redis backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    # Local cleanup
    if [ -d "${BACKUP_DIR}" ]; then
        while IFS= read -r old_backup; do
            if rm -f "${old_backup}" "${old_backup}.md5" 2>/dev/null; then
                deleted_count=$((deleted_count + 1))
                log "Deleted old backup: $(basename ${old_backup})"
            fi
        done < <(find "${BACKUP_DIR}" -name "*.rdb.gz" -mtime +"${RETENTION_DAYS}" -type f)
    fi

    # S3 cleanup if bucket is configured
    if [ -n "${S3_BUCKET}" ] && command -v aws &> /dev/null; then
        log "Cleaning up S3 Redis backups older than ${RETENTION_DAYS} days..."

        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

        aws s3api list-objects-v2 \
            --bucket "${S3_BUCKET}" \
            --prefix "redis-backups/" \
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
        log "Cleanup completed: removed ${deleted_count} old Redis backup(s)"
    else
        log "No old Redis backups to clean up"
    fi
}

# Run main function
main "$@"
