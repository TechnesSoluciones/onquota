#!/bin/bash
# =============================================================================
# OnQuota Production Health Check Script
# =============================================================================
# This script performs comprehensive health checks on the production deployment
#
# Usage:
#   ./deployment/health-check.sh [--verbose]
# =============================================================================

set -u

# Configuration
VPS_HOST="46.224.33.191"
VPS_USER="root"
VPS_PATH="/opt/onquota"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=false

if [ "${1:-}" = "--verbose" ]; then
    VERBOSE=true
fi

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check HTTP endpoint
check_http() {
    local URL=$1
    local NAME=$2

    if curl -f -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200\|301\|302"; then
        log_success "$NAME is responding"
        if [ "$VERBOSE" = true ]; then
            echo "    URL: $URL"
            echo "    Status: $(curl -s -o /dev/null -w "%{http_code}" "$URL")"
        fi
        return 0
    else
        log_error "$NAME is not responding"
        if [ "$VERBOSE" = true ]; then
            echo "    URL: $URL"
            echo "    Status: $(curl -s -o /dev/null -w "%{http_code}" "$URL")"
        fi
        return 1
    fi
}

# Check container status
check_containers() {
    log_info "Checking container status..."

    local OUTPUT=$(ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml ps" 2>/dev/null)

    if echo "$OUTPUT" | grep -q "Up"; then
        log_success "Containers are running"
        if [ "$VERBOSE" = true ]; then
            echo "$OUTPUT"
        fi

        # Count running containers
        local RUNNING=$(echo "$OUTPUT" | grep -c "Up" || true)
        echo "    Running containers: $RUNNING"
    else
        log_error "No containers are running"
        return 1
    fi
}

# Check Docker service
check_docker() {
    log_info "Checking Docker service..."

    if ssh ${VPS_USER}@${VPS_HOST} "systemctl is-active docker" >/dev/null 2>&1; then
        log_success "Docker service is active"
    else
        log_error "Docker service is not active"
        return 1
    fi
}

# Check disk space
check_disk() {
    log_info "Checking disk space..."

    local DISK_USAGE=$(ssh ${VPS_USER}@${VPS_HOST} "df -h / | tail -1 | awk '{print \$5}'" | tr -d '%')

    if [ "$DISK_USAGE" -lt 80 ]; then
        log_success "Disk space is OK (${DISK_USAGE}% used)"
    elif [ "$DISK_USAGE" -lt 90 ]; then
        log_warning "Disk space is getting low (${DISK_USAGE}% used)"
    else
        log_error "Disk space is critical (${DISK_USAGE}% used)"
    fi
}

# Check memory
check_memory() {
    log_info "Checking memory usage..."

    local MEM_INFO=$(ssh ${VPS_USER}@${VPS_HOST} "free -m | grep Mem" 2>/dev/null)
    local MEM_TOTAL=$(echo "$MEM_INFO" | awk '{print $2}')
    local MEM_USED=$(echo "$MEM_INFO" | awk '{print $3}')
    local MEM_PERCENT=$(( MEM_USED * 100 / MEM_TOTAL ))

    if [ "$MEM_PERCENT" -lt 80 ]; then
        log_success "Memory usage is OK (${MEM_PERCENT}%)"
    elif [ "$MEM_PERCENT" -lt 90 ]; then
        log_warning "Memory usage is high (${MEM_PERCENT}%)"
    else
        log_error "Memory usage is critical (${MEM_PERCENT}%)"
    fi

    if [ "$VERBOSE" = true ]; then
        echo "    Total: ${MEM_TOTAL}MB"
        echo "    Used: ${MEM_USED}MB"
    fi
}

# Check database connection
check_database() {
    log_info "Checking database connection..."

    # Try to connect to PostgreSQL from VPS
    if ssh ${VPS_USER}@${VPS_HOST} "docker exec onquota-backend python -c 'from sqlalchemy import create_engine; import os; engine = create_engine(os.getenv(\"DATABASE_URL\")); engine.connect()' 2>/dev/null"; then
        log_success "Database connection is OK"
    else
        log_warning "Database connection check failed (container might not be running)"
    fi
}

# Check Redis
check_redis() {
    log_info "Checking Redis..."

    if ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG"; then
        log_success "Redis is responding"
    else
        log_warning "Redis check failed"
    fi
}

# Check logs for errors
check_logs() {
    log_info "Checking recent logs for errors..."

    local ERROR_COUNT=$(ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml logs --tail=100 2>/dev/null | grep -i 'error\|exception\|fatal' | wc -l" || echo "0")

    if [ "$ERROR_COUNT" -eq 0 ]; then
        log_success "No recent errors in logs"
    elif [ "$ERROR_COUNT" -lt 5 ]; then
        log_warning "Found $ERROR_COUNT error(s) in recent logs"
    else
        log_error "Found $ERROR_COUNT error(s) in recent logs"
    fi
}

# Main health check
main() {
    echo "============================================="
    echo "  OnQuota Health Check"
    echo "============================================="
    echo "Target: ${VPS_HOST}"
    echo "Time: $(date)"
    echo "============================================="
    echo ""

    local FAILURES=0

    # Infrastructure checks
    echo "Infrastructure Checks:"
    check_docker || ((FAILURES++))
    check_disk
    check_memory
    echo ""

    # Container checks
    echo "Container Checks:"
    check_containers || ((FAILURES++))
    echo ""

    # Service checks
    echo "Service Checks:"
    check_redis
    check_database
    echo ""

    # HTTP checks
    echo "HTTP Endpoint Checks:"
    check_http "http://${VPS_HOST}/" "Frontend" || ((FAILURES++))
    check_http "http://${VPS_HOST}/api/v1/health" "Backend API" || true  # Don't count as failure if endpoint doesn't exist
    echo ""

    # Log checks
    echo "Log Checks:"
    check_logs
    echo ""

    # Summary
    echo "============================================="
    if [ $FAILURES -eq 0 ]; then
        log_success "All critical checks passed"
        exit 0
    else
        log_error "$FAILURES critical check(s) failed"
        exit 1
    fi
}

main "$@"
