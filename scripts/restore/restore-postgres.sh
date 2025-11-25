#!/bin/bash
set -e

# PostgreSQL Restore Script for OnQuota
# Restores database from a backup file
# Usage: ./restore-postgres.sh <backup_file.sql.gz>

# Configuration
BACKUP_FILE="${1}"
LOG_FILE="/var/log/restore.log"

# Database credentials from environment or defaults
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-onquota_db}"
PGUSER="${PGUSER:-onquota_user}"
PGPASSWORD="${PGPASSWORD:-}"

# Export password for psql
export PGPASSWORD

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

    log "Validating backup file: ${backup_file}"

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
PostgreSQL Restore Script for OnQuota

Usage: $0 <backup_file.sql.gz>

Examples:
  $0 /backups/postgres/onquota_backup_20231114_120000.sql.gz
  $0 s3://my-bucket/backups/onquota_backup_20231114_120000.sql.gz

Environment Variables:
  PGHOST              PostgreSQL host (default: postgres)
  PGPORT              PostgreSQL port (default: 5432)
  PGDATABASE          Database name (default: onquota_db)
  PGUSER              Database user (default: onquota_user)
  PGPASSWORD          Database password

Options:
  --force             Skip confirmation prompt
  --no-backup         Skip creating backup before restore
  --validate-only     Only validate backup, don't restore

EOF
        exit 1
    fi

    # Parse options
    local force=0
    local create_backup=1
    local validate_only=0

    shift || true
    while [ $# -gt 0 ]; do
        case "$1" in
            --force)
                force=1
                shift
                ;;
            --no-backup)
                create_backup=0
                shift
                ;;
            --validate-only)
                validate_only=1
                shift
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "Starting PostgreSQL restore process"
    log "Backup file: ${BACKUP_FILE}"
    log "Target database: ${PGDATABASE}@${PGHOST}:${PGPORT}"

    # Check if backup file is remote (S3)
    if [[ "${BACKUP_FILE}" == s3://* ]]; then
        log "Downloading backup from S3..."

        if ! command -v aws &> /dev/null; then
            log "ERROR: AWS CLI not found. Cannot download from S3."
            exit 1
        fi

        local tmp_backup="/tmp/restore_$(date +%s).sql.gz"
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

    # Verify database connectivity
    log "Checking database connectivity..."
    if ! pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" > /dev/null 2>&1; then
        log "ERROR: Cannot connect to PostgreSQL database at ${PGHOST}:${PGPORT}"
        exit 1
    fi

    log "Database connectivity verified"

    # Ask for confirmation unless --force is used
    if [ ${force} -eq 0 ]; then
        read -p "WARNING: This will DROP and RESTORE the entire database. Continue? (yes/no): " confirm

        if [ "${confirm}" != "yes" ]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    # Create backup before restore if requested
    if [ ${create_backup} -eq 1 ]; then
        log "Creating backup before restore (safety measure)..."

        local pre_restore_backup="/backups/postgres/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
        mkdir -p "$(dirname ${pre_restore_backup})"

        if pg_dump \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${PGDATABASE}" \
            --verbose \
            --no-password \
            --format=plain \
            | gzip > "${pre_restore_backup}"; then

            log "Pre-restore backup created: ${pre_restore_backup}"
        else
            log "WARNING: Failed to create pre-restore backup"
        fi
    fi

    # Drop database
    log "Dropping existing database: ${PGDATABASE}..."
    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d postgres \
        --no-password \
        -c "DROP DATABASE IF EXISTS ${PGDATABASE};" \
        2>&1 | grep -v "NOTICE:" || true

    # Create database
    log "Creating database: ${PGDATABASE}..."
    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d postgres \
        --no-password \
        -c "CREATE DATABASE ${PGDATABASE};" \
        2>&1 | grep -v "NOTICE:" || true

    # Restore data
    log "Restoring database from backup..."
    if gunzip < "${BACKUP_FILE}" | psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password; then

        log "Database restore completed successfully"

        # Get database statistics
        local table_count=$(psql \
            -h "${PGHOST}" \
            -p "${PGPORT}" \
            -U "${PGUSER}" \
            -d "${PGDATABASE}" \
            --no-password \
            -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" \
            -t 2>/dev/null | tr -d ' ')

        log "Restore validation: Found ${table_count} tables in database"

        log "Restore process completed successfully"
    else
        log "ERROR: Restore failed"
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
