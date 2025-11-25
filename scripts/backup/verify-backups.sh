#!/bin/bash
set -e

# Backup Verification Script for OnQuota
# Verifies the integrity and accessibility of all backups
# Usage: ./verify-backups.sh

# Configuration
BACKUP_BASE_DIR="/backups"
LOG_FILE="/var/log/backup-verify.log"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Database credentials
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-onquota_db}"
PGUSER="${PGUSER:-onquota_user}"
PGPASSWORD="${PGPASSWORD:-}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# S3 Configuration
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

export PGPASSWORD

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handler
handle_error() {
    local line_number=$1
    log "ERROR: Verification failed at line ${line_number}"
    send_alert "Backup verification failed at line ${line_number}"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Send alert email
send_alert() {
    local message=$1

    if [ -z "${ALERT_EMAIL}" ]; then
        return
    fi

    if ! command -v mail &> /dev/null && ! command -v sendmail &> /dev/null; then
        log "WARNING: Mail command not found. Cannot send alert."
        return
    fi

    echo "OnQuota Backup Verification Alert

Error: ${message}

Time: $(date)
Host: $(hostname)

Please check backup logs at: ${LOG_FILE}
" | mail -s "[ALERT] OnQuota Backup Verification Failed" "${ALERT_EMAIL}"
}

# Verify PostgreSQL backups
verify_postgres_backups() {
    log "Verifying PostgreSQL backups..."

    local postgres_backup_dir="${BACKUP_BASE_DIR}/postgres"
    local verified_count=0
    local failed_count=0

    if [ ! -d "${postgres_backup_dir}" ]; then
        log "WARNING: PostgreSQL backup directory not found: ${postgres_backup_dir}"
        return 1
    fi

    while IFS= read -r backup_file; do
        log "Checking backup: $(basename ${backup_file})"

        # Verify file exists and has content
        if [ ! -f "${backup_file}" ] || [ ! -s "${backup_file}" ]; then
            log "ERROR: Backup file is empty or corrupted: ${backup_file}"
            failed_count=$((failed_count + 1))
            continue
        fi

        # Verify checksum if available
        local checksum_file="${backup_file}.md5"
        if [ -f "${checksum_file}" ]; then
            if md5sum -c "${checksum_file}" > /dev/null 2>&1; then
                log "OK: Checksum verified for $(basename ${backup_file})"
                verified_count=$((verified_count + 1))
            else
                log "ERROR: Checksum verification failed for $(basename ${backup_file})"
                failed_count=$((failed_count + 1))
            fi
        else
            # Try decompressing to verify integrity
            if gunzip -t "${backup_file}" > /dev/null 2>&1; then
                log "OK: Compression integrity verified for $(basename ${backup_file})"
                verified_count=$((verified_count + 1))
            else
                log "ERROR: Compression integrity check failed for $(basename ${backup_file})"
                failed_count=$((failed_count + 1))
            fi
        fi
    done < <(find "${postgres_backup_dir}" -name "*.sql.gz" -type f | sort -r)

    log "PostgreSQL backup verification: ${verified_count} OK, ${failed_count} FAILED"

    if [ ${failed_count} -gt 0 ]; then
        return 1
    fi

    return 0
}

# Verify Redis backups
verify_redis_backups() {
    log "Verifying Redis backups..."

    local redis_backup_dir="${BACKUP_BASE_DIR}/redis"
    local verified_count=0
    local failed_count=0

    if [ ! -d "${redis_backup_dir}" ]; then
        log "WARNING: Redis backup directory not found: ${redis_backup_dir}"
        return 1
    fi

    while IFS= read -r backup_file; do
        log "Checking backup: $(basename ${backup_file})"

        # Verify file exists and has content
        if [ ! -f "${backup_file}" ] || [ ! -s "${backup_file}" ]; then
            log "ERROR: Backup file is empty or corrupted: ${backup_file}"
            failed_count=$((failed_count + 1))
            continue
        fi

        # Verify checksum if available
        local checksum_file="${backup_file}.md5"
        if [ -f "${checksum_file}" ]; then
            if md5sum -c "${checksum_file}" > /dev/null 2>&1; then
                log "OK: Checksum verified for $(basename ${backup_file})"
                verified_count=$((verified_count + 1))
            else
                log "ERROR: Checksum verification failed for $(basename ${backup_file})"
                failed_count=$((failed_count + 1))
            fi
        else
            # Try decompressing to verify integrity
            if gunzip -t "${backup_file}" > /dev/null 2>&1; then
                log "OK: Compression integrity verified for $(basename ${backup_file})"
                verified_count=$((verified_count + 1))
            else
                log "ERROR: Compression integrity check failed for $(basename ${backup_file})"
                failed_count=$((failed_count + 1))
            fi
        fi
    done < <(find "${redis_backup_dir}" -name "*.rdb.gz" -type f | sort -r)

    log "Redis backup verification: ${verified_count} OK, ${failed_count} FAILED"

    if [ ${failed_count} -gt 0 ]; then
        return 1
    fi

    return 0
}

# Verify backup accessibility
verify_backup_accessibility() {
    log "Verifying backup accessibility..."

    # Check local storage
    log "Checking local backup directory permissions..."

    if [ ! -d "${BACKUP_BASE_DIR}" ]; then
        log "ERROR: Backup directory not accessible: ${BACKUP_BASE_DIR}"
        return 1
    fi

    if [ ! -w "${BACKUP_BASE_DIR}" ]; then
        log "ERROR: Backup directory is not writable: ${BACKUP_BASE_DIR}"
        return 1
    fi

    log "OK: Local backup directory is accessible and writable"

    # Check S3 accessibility if configured
    if [ -n "${S3_BUCKET}" ]; then
        log "Checking S3 bucket accessibility..."

        if ! command -v aws &> /dev/null; then
            log "WARNING: AWS CLI not found. Skipping S3 verification."
            return 0
        fi

        if aws s3 ls "s3://${S3_BUCKET}/" --region "${AWS_REGION}" > /dev/null 2>&1; then
            log "OK: S3 bucket is accessible"

            # Check backup files in S3
            local s3_backup_count=$(aws s3api list-objects-v2 \
                --bucket "${S3_BUCKET}" \
                --prefix "postgres-backups/" \
                --region "${AWS_REGION}" \
                --query 'Contents | length(@)' \
                --output text 2>/dev/null || echo "0")

            log "Found ${s3_backup_count} PostgreSQL backups in S3"

            return 0
        else
            log "ERROR: Cannot access S3 bucket: s3://${S3_BUCKET}/"
            return 1
        fi
    fi

    return 0
}

# Get backup statistics
get_backup_statistics() {
    log "Generating backup statistics..."

    local total_size=0
    local postgres_size=0
    local redis_size=0
    local oldest_backup=""
    local newest_backup=""

    # PostgreSQL statistics
    if [ -d "${BACKUP_BASE_DIR}/postgres" ]; then
        postgres_size=$(du -sh "${BACKUP_BASE_DIR}/postgres" 2>/dev/null | awk '{print $1}' || echo "0")
        log "PostgreSQL backups size: ${postgres_size}"

        oldest_backup=$(ls -t "${BACKUP_BASE_DIR}/postgres"/*.sql.gz 2>/dev/null | tail -1 | xargs basename 2>/dev/null)
        newest_backup=$(ls -t "${BACKUP_BASE_DIR}/postgres"/*.sql.gz 2>/dev/null | head -1 | xargs basename 2>/dev/null)

        log "Oldest backup: ${oldest_backup}"
        log "Newest backup: ${newest_backup}"
    fi

    # Redis statistics
    if [ -d "${BACKUP_BASE_DIR}/redis" ]; then
        redis_size=$(du -sh "${BACKUP_BASE_DIR}/redis" 2>/dev/null | awk '{print $1}' || echo "0")
        log "Redis backups size: ${redis_size}"
    fi

    log "Total backup storage used: ${total_size}"
}

# Main verification function
main() {
    log "Starting backup verification process..."
    log "Backup base directory: ${BACKUP_BASE_DIR}"

    local overall_status=0

    # Verify PostgreSQL backups
    if ! verify_postgres_backups; then
        overall_status=1
    fi

    # Verify Redis backups
    if ! verify_redis_backups; then
        overall_status=1
    fi

    # Verify backup accessibility
    if ! verify_backup_accessibility; then
        overall_status=1
    fi

    # Get statistics
    get_backup_statistics

    if [ ${overall_status} -eq 0 ]; then
        log "Backup verification completed successfully"
    else
        log "Backup verification completed with errors"
    fi

    exit ${overall_status}
}

# Run main function
main "$@"
