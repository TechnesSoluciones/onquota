#!/bin/bash
set -e

# Redis Restore Script for OnQuota
# Restores Redis data from a backup RDB file
# Usage: ./restore-redis.sh <backup_file.rdb.gz>

# Configuration
BACKUP_FILE="${1}"
LOG_FILE="/var/log/restore.log"

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
    log "ERROR: Restore failed at line ${line_number}"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Validation function
validate_backup() {
    local backup_file=$1
    local checksum_file="${backup_file}.md5"

    log "Validating Redis backup file: ${backup_file}"

    if [ ! -f "${backup_file}" ]; then
        log "ERROR: Backup file not found: ${backup_file}"
        exit 1
    fi

    if [ ! -s "${backup_file}" ]; then
        log "ERROR: Backup file is empty: ${backup_file}"
        exit 1
    fi

    # Verify checksum if available
    if [ -f "${checksum_file}" ]; then
        log "Verifying checksum..."

        if md5sum -c "${checksum_file}" > /dev/null 2>&1; then
            log "Checksum verification passed"
        else
            log "ERROR: Checksum verification failed"
            exit 1
        fi
    else
        log "WARNING: Checksum file not found: ${checksum_file}"
    fi
}

# Main restore function
main() {
    # Display usage if no argument provided
    if [ -z "${BACKUP_FILE}" ]; then
        cat << EOF
Redis Restore Script for OnQuota

Usage: $0 <backup_file.rdb.gz>

Examples:
  $0 /backups/redis/onquota_redis_backup_20231114_120000.rdb.gz
  $0 s3://my-bucket/backups/onquota_redis_backup_20231114_120000.rdb.gz

Environment Variables:
  REDIS_HOST          Redis host (default: redis)
  REDIS_PORT          Redis port (default: 6379)
  REDIS_PASSWORD      Redis password (optional)

Options:
  --force             Skip confirmation prompt
  --validate-only     Only validate backup, don't restore
  --flush-first       Flush all data before restore

EOF
        exit 1
    fi

    # Parse options
    local force=0
    local validate_only=0
    local flush_first=0

    shift || true
    while [ $# -gt 0 ]; do
        case "$1" in
            --force)
                force=1
                shift
                ;;
            --validate-only)
                validate_only=1
                shift
                ;;
            --flush-first)
                flush_first=1
                shift
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "Starting Redis restore process"
    log "Backup file: ${BACKUP_FILE}"
    log "Target Redis: ${REDIS_HOST}:${REDIS_PORT}"

    # Check if backup file is remote (S3)
    if [[ "${BACKUP_FILE}" == s3://* ]]; then
        log "Downloading backup from S3..."

        if ! command -v aws &> /dev/null; then
            log "ERROR: AWS CLI not found. Cannot download from S3."
            exit 1
        fi

        local tmp_backup="/tmp/redis_restore_$(date +%s).rdb.gz"
        log "Downloading to: ${tmp_backup}"

        if aws s3 cp "${BACKUP_FILE}" "${tmp_backup}"; then
            BACKUP_FILE="${tmp_backup}"
            log "Download completed"
        else
            log "ERROR: Failed to download backup from S3"
            exit 1
        fi
    fi

    # Validate backup file
    validate_backup "${BACKUP_FILE}"

    # If validate-only flag is set, exit here
    if [ ${validate_only} -eq 1 ]; then
        log "Backup validation completed successfully"
        exit 0
    fi

    # Verify Redis connectivity
    log "Checking Redis connectivity..."
    if ! redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} ping > /dev/null 2>&1; then
        log "ERROR: Cannot connect to Redis at ${REDIS_HOST}:${REDIS_PORT}"
        exit 1
    fi

    log "Redis connectivity verified"

    # Ask for confirmation unless --force is used
    if [ ${force} -eq 0 ]; then
        read -p "WARNING: This will restore Redis data from backup. Continue? (yes/no): " confirm

        if [ "${confirm}" != "yes" ]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    # Get Redis config dir
    local redis_config_dir=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} CONFIG GET dir | tail -1)
    log "Redis data directory: ${redis_config_dir}"

    # Flush database if requested
    if [ ${flush_first} -eq 1 ]; then
        log "Flushing all Redis data..."
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} FLUSHALL
        log "Redis data flushed"
    fi

    # Stop Redis from writing
    log "Disabling Redis saves..."
    redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} CONFIG SET save ""

    # Backup current dump.rdb
    log "Backing up current Redis dump..."
    if [ -f "${redis_config_dir}/dump.rdb" ]; then
        cp "${redis_config_dir}/dump.rdb" "${redis_config_dir}/dump.rdb.bak"
        log "Current dump backed up: ${redis_config_dir}/dump.rdb.bak"
    fi

    # Decompress and restore
    log "Restoring Redis database..."
    if gunzip -c "${BACKUP_FILE}" > "${redis_config_dir}/dump.rdb"; then
        log "RDB file restored"

        # Reload the database
        log "Reloading Redis..."
        if redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} DEBUG RELOAD 2>/dev/null; then
            log "Redis reloaded successfully"
        else
            # If DEBUG RELOAD fails, try a graceful restart message
            log "WARNING: Could not reload Redis. Please restart Redis manually or reconnect."
        fi

        # Re-enable saves
        log "Re-enabling Redis saves..."
        redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} CONFIG SET save "900 1 300 10 60 10000"

        # Get database statistics
        local key_count=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} DBSIZE | awk '{print $NF}')
        log "Restore validation: Found ${key_count} keys in Redis"

        log "Redis restore completed successfully"
    else
        log "ERROR: Failed to restore RDB file"

        # Restore backup if restore failed
        if [ -f "${redis_config_dir}/dump.rdb.bak" ]; then
            log "Restoring backup dump..."
            mv "${redis_config_dir}/dump.rdb.bak" "${redis_config_dir}/dump.rdb"
        fi

        exit 1
    fi

    # Clean up temporary file if downloaded from S3
    if [[ "${1}" == s3://* ]] && [ -f "${BACKUP_FILE}" ]; then
        rm -f "${BACKUP_FILE}"
        log "Temporary backup file cleaned up"
    fi
}

# Run main function
main "$@"
