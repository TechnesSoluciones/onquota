#!/bin/bash
set -e

# PostgreSQL Database Maintenance Script for OnQuota
# Performs routine maintenance: VACUUM, ANALYZE, index reindex, etc.
# Usage: ./database-maintenance.sh

# Configuration
LOG_FILE="/var/log/maintenance.log"
MAINTENANCE_LEVEL="${MAINTENANCE_LEVEL:-standard}"

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
    log "ERROR: Maintenance failed at line ${line_number}"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# Execute SQL statement
execute_sql() {
    local sql_command=$1
    local description=$2

    log "Executing: ${description}"

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "${sql_command}" \
        2>&1 | tee -a "${LOG_FILE}"
}

# Get database statistics
get_database_stats() {
    log "Collecting database statistics..."

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows,
            round(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 0
        ORDER BY n_dead_tup DESC;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Light maintenance (safe for production)
light_maintenance() {
    log "Starting LIGHT maintenance (safe for production)..."

    # VACUUM ANALYZE (no FULL)
    execute_sql "VACUUM ANALYZE;" "VACUUM ANALYZE"

    # Reindex concurrent (doesn't lock tables)
    log "Reindexing..."
    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        DO \$\$
        DECLARE
            v_index_name text;
        BEGIN
            FOR v_index_name IN
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                AND indexdef LIKE '%USING btree%'
            LOOP
                EXECUTE 'REINDEX INDEX CONCURRENTLY ' || v_index_name;
            END LOOP;
        END\$\$;
        " 2>&1 | tee -a "${LOG_FILE}"

    log "Light maintenance completed"
}

# Standard maintenance (requires brief downtime)
standard_maintenance() {
    log "Starting STANDARD maintenance (may require brief downtime)..."

    # VACUUM ANALYZE
    execute_sql "VACUUM ANALYZE;" "VACUUM ANALYZE (with statistics)"

    # Reindex
    log "Reindexing..."
    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "REINDEX DATABASE ${PGDATABASE};" 2>&1 | tee -a "${LOG_FILE}"

    # Analyze all tables
    execute_sql "ANALYZE;" "ANALYZE all tables"

    log "Standard maintenance completed"
}

# Heavy maintenance (requires scheduled downtime)
heavy_maintenance() {
    log "Starting HEAVY maintenance (REQUIRES DOWNTIME)..."

    # Full vacuum
    log "Performing full VACUUM..."
    execute_sql "VACUUM FULL ANALYZE;" "VACUUM FULL ANALYZE"

    # Cluster tables (reorganize physically)
    log "Clustering tables..."
    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        DO \$\$
        DECLARE
            v_table_name text;
        BEGIN
            FOR v_table_name IN
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
            LOOP
                EXECUTE 'CLUSTER ' || v_table_name;
            END LOOP;
        END\$\$;
        " 2>&1 | tee -a "${LOG_FILE}"

    # Full reindex
    log "Performing full REINDEX..."
    execute_sql "REINDEX DATABASE ${PGDATABASE};" "REINDEX DATABASE"

    log "Heavy maintenance completed"
}

# Check for table bloat
check_table_bloat() {
    log "Checking for table bloat..."

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as heap_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
            n_live_tup,
            n_dead_tup,
            ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio
        FROM pg_stat_user_tables
        WHERE (n_dead_tup / NULLIF(n_live_tup, 0)::float8 > 0.2)
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Check slow queries
check_slow_queries() {
    log "Checking for slow queries..."

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        SELECT
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            max_exec_time,
            rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 20;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Check unused indexes
check_unused_indexes() {
    log "Checking for unused indexes..."

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        SELECT
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch,
            pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
        ORDER BY pg_relation_size(indexrelid) DESC;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Check connection statistics
check_connections() {
    log "Checking database connections..."

    psql \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --no-password \
        -c "
        SELECT
            datname,
            count(*) as connection_count,
            usename,
            client_addr,
            state
        FROM pg_stat_activity
        GROUP BY datname, usename, client_addr, state
        ORDER BY connection_count DESC;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Main function
main() {
    log "Starting PostgreSQL database maintenance"
    log "Database: ${PGDATABASE}@${PGHOST}:${PGPORT}"
    log "Maintenance level: ${MAINTENANCE_LEVEL}"

    # Verify database connectivity
    if ! pg_isready -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" > /dev/null 2>&1; then
        log "ERROR: Cannot connect to PostgreSQL database"
        exit 1
    fi

    log "Connected to database successfully"

    # Collect statistics before maintenance
    log "=== BEFORE MAINTENANCE STATISTICS ==="
    get_database_stats

    # Perform maintenance based on level
    case "${MAINTENANCE_LEVEL}" in
        light)
            light_maintenance
            ;;
        standard)
            standard_maintenance
            ;;
        heavy)
            heavy_maintenance
            ;;
        *)
            log "ERROR: Unknown maintenance level: ${MAINTENANCE_LEVEL}"
            exit 1
            ;;
    esac

    # Run analysis queries
    log "=== POST-MAINTENANCE ANALYSIS ==="
    check_table_bloat
    check_slow_queries
    check_unused_indexes
    check_connections

    # Collect statistics after maintenance
    log "=== AFTER MAINTENANCE STATISTICS ==="
    get_database_stats

    log "Database maintenance completed successfully"
}

# Run main function
main "$@"
