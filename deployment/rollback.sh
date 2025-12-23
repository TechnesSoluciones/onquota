#!/bin/bash
# =============================================================================
# OnQuota Production Rollback Script
# =============================================================================
# This script handles rollback to a previous deployment state
#
# Usage:
#   ./deployment/rollback.sh [backup_timestamp]
#
# Example:
#   ./deployment/rollback.sh 20241223_120000
#   ./deployment/rollback.sh  # Interactive selection
# =============================================================================

set -e
set -u

# Configuration
VPS_HOST="46.224.33.191"
VPS_USER="root"
VPS_PATH="/opt/onquota"
BACKUP_DIR="/opt/onquota/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# List available backups
list_backups() {
    log_info "Available backups:"
    ssh ${VPS_USER}@${VPS_HOST} "ls -lht ${BACKUP_DIR}/ | grep backup_ | head -10"
}

# Rollback to specific backup
rollback() {
    local BACKUP_TIMESTAMP=$1

    log_warning "Rolling back to backup: ${BACKUP_TIMESTAMP}"

    ssh ${VPS_USER}@${VPS_HOST} << ENDSSH
        set -e
        cd ${VPS_PATH}

        # Stop current services
        echo "Stopping current services..."
        docker-compose -f docker-compose.production.yml down

        # Restore .env.production
        if [ -f ${BACKUP_DIR}/backup_${BACKUP_TIMESTAMP}_env ]; then
            echo "Restoring environment configuration..."
            cp ${BACKUP_DIR}/backup_${BACKUP_TIMESTAMP}_env .env.production
        fi

        # Restart services with old configuration
        echo "Starting services..."
        docker-compose -f docker-compose.production.yml up -d

        echo "Rollback completed"
ENDSSH

    log_success "Rollback completed successfully"
}

# Main
main() {
    echo "============================================="
    echo "  OnQuota Rollback Utility"
    echo "============================================="
    echo ""

    if [ $# -eq 0 ]; then
        list_backups
        echo ""
        read -p "Enter backup timestamp (or 'cancel' to exit): " BACKUP_TIMESTAMP

        if [ "$BACKUP_TIMESTAMP" = "cancel" ]; then
            log_warning "Rollback cancelled"
            exit 0
        fi
    else
        BACKUP_TIMESTAMP=$1
    fi

    # Confirmation
    read -p "Are you sure you want to rollback to ${BACKUP_TIMESTAMP}? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_warning "Rollback cancelled"
        exit 0
    fi

    rollback "$BACKUP_TIMESTAMP"

    log_success "Application rolled back successfully"
}

main "$@"
