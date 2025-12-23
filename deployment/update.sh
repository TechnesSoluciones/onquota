#!/bin/bash
# =============================================================================
# OnQuota Production Update Script
# =============================================================================
# Quick update script for minor changes (no full rebuild)
#
# Usage:
#   ./deployment/update.sh [service_name]
#
# Examples:
#   ./deployment/update.sh              # Update all services
#   ./deployment/update.sh backend      # Update only backend
#   ./deployment/update.sh frontend     # Update only frontend
# =============================================================================

set -e
set -u

# Configuration
VPS_HOST="46.224.33.191"
VPS_USER="root"
VPS_PATH="/opt/onquota"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Update specific service
update_service() {
    local SERVICE=${1:-all}

    log_info "Syncing files to VPS..."

    # Sync files
    rsync -avz --delete \
        --exclude '.git' \
        --exclude '.env' \
        --exclude 'node_modules' \
        --exclude '__pycache__' \
        --exclude '.next' \
        --exclude 'venv' \
        . ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

    log_info "Restarting service: $SERVICE"

    if [ "$SERVICE" = "all" ]; then
        ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml restart"
    else
        ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml restart $SERVICE"
    fi

    log_success "Update completed"
}

main() {
    local SERVICE=${1:-all}

    echo "============================================="
    echo "  OnQuota Quick Update"
    echo "============================================="
    echo "Service: $SERVICE"
    echo "============================================="
    echo ""

    update_service "$SERVICE"

    echo ""
    log_success "Service(s) updated successfully"
}

main "$@"
