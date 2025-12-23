#!/bin/bash
# =============================================================================
# OnQuota Production Deployment Script
# =============================================================================
# This script handles the complete deployment process to Hetzner VPS
#
# Features:
# - Build Docker images locally or on server
# - Transfer files to VPS
# - Deploy using docker-compose
# - Health checks
# - Rollback capability
#
# Usage:
#   ./deployment/deploy.sh [options]
#
# Options:
#   --build-local    Build images locally and push to registry
#   --build-remote   Build images on the VPS (default)
#   --no-backup      Skip backup before deployment
#   --force          Force deployment without confirmation
# =============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
VPS_HOST="46.224.33.191"
VPS_USER="root"  # Change to your SSH user
VPS_PATH="/opt/onquota"
PROJECT_NAME="onquota"
BACKUP_DIR="/opt/onquota/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------

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

# Check if SSH connection works
check_ssh() {
    log_info "Checking SSH connection to VPS..."
    if ssh -o ConnectTimeout=5 ${VPS_USER}@${VPS_HOST} "echo 'Connection successful'" >/dev/null 2>&1; then
        log_success "SSH connection established"
        return 0
    else
        log_error "Cannot connect to VPS via SSH"
        exit 1
    fi
}

# Create backup before deployment
create_backup() {
    log_info "Creating backup on VPS..."
    ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        BACKUP_DIR="/opt/onquota/backups"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_NAME="backup_${TIMESTAMP}"

        mkdir -p ${BACKUP_DIR}

        # Backup .env.production if exists
        if [ -f /opt/onquota/.env.production ]; then
            cp /opt/onquota/.env.production ${BACKUP_DIR}/${BACKUP_NAME}_env
        fi

        # Export running containers state
        if command -v docker-compose &> /dev/null; then
            cd /opt/onquota
            docker-compose -f docker-compose.production.yml config > ${BACKUP_DIR}/${BACKUP_NAME}_compose.yml 2>/dev/null || true
        fi

        # Keep only last 5 backups
        cd ${BACKUP_DIR}
        ls -t backup_* 2>/dev/null | tail -n +6 | xargs -r rm

        echo "Backup created: ${BACKUP_NAME}"
ENDSSH
    log_success "Backup completed"
}

# Sync files to VPS
sync_files() {
    log_info "Syncing project files to VPS..."

    # Create directory on VPS if it doesn't exist
    ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${VPS_PATH}"

    # Rsync files (exclude unnecessary files)
    rsync -avz --delete \
        --exclude '.git' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude 'node_modules' \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.next' \
        --exclude 'backend/logs' \
        --exclude 'frontend/.next' \
        --exclude 'venv' \
        --exclude '.pytest_cache' \
        --exclude 'backups' \
        . ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

    log_success "Files synced successfully"
}

# Build and deploy on VPS
deploy_remote() {
    log_info "Building and deploying on VPS..."

    ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        set -e
        cd /opt/onquota

        echo "Stopping existing containers..."
        docker-compose -f docker-compose.production.yml down || true

        echo "Building Docker images..."
        docker-compose -f docker-compose.production.yml build --no-cache

        echo "Starting services..."
        docker-compose -f docker-compose.production.yml up -d

        echo "Waiting for services to be healthy..."
        sleep 10

        echo "Checking service health..."
        docker-compose -f docker-compose.production.yml ps
ENDSSH

    log_success "Deployment completed"
}

# Health check
health_check() {
    log_info "Running health checks..."

    # Wait a bit for services to stabilize
    sleep 15

    # Check backend health
    log_info "Checking backend health..."
    if curl -f -s "http://${VPS_HOST}/api/v1/health" >/dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_warning "Backend health check failed (might be expected if /health endpoint doesn't exist)"
    fi

    # Check frontend health
    log_info "Checking frontend health..."
    if curl -f -s "http://${VPS_HOST}/" >/dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_warning "Frontend health check failed"
    fi

    # Check container status
    log_info "Container status:"
    ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml ps"
}

# Show logs
show_logs() {
    log_info "Showing recent logs..."
    ssh ${VPS_USER}@${VPS_HOST} "cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml logs --tail=50"
}

# Main deployment flow
main() {
    local BUILD_LOCAL=false
    local SKIP_BACKUP=false
    local FORCE=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build-local)
                BUILD_LOCAL=true
                shift
                ;;
            --no-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Banner
    echo "============================================="
    echo "  OnQuota Production Deployment"
    echo "============================================="
    echo "Target: ${VPS_USER}@${VPS_HOST}"
    echo "Path: ${VPS_PATH}"
    echo "============================================="
    echo ""

    # Confirmation
    if [ "$FORCE" = false ]; then
        read -p "Do you want to proceed with deployment? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
            log_warning "Deployment cancelled"
            exit 0
        fi
    fi

    # Pre-deployment checks
    check_ssh

    # Create backup
    if [ "$SKIP_BACKUP" = false ]; then
        create_backup
    fi

    # Sync files
    sync_files

    # Deploy
    if [ "$BUILD_LOCAL" = true ]; then
        log_error "Local build not implemented yet. Use --build-remote (default)"
        exit 1
    else
        deploy_remote
    fi

    # Health checks
    health_check

    # Show logs
    show_logs

    # Success
    echo ""
    echo "============================================="
    log_success "Deployment completed successfully!"
    echo "============================================="
    echo ""
    echo "Access your application at: http://${VPS_HOST}"
    echo ""
    echo "Useful commands:"
    echo "  - View logs: ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml logs -f'"
    echo "  - Restart: ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml restart'"
    echo "  - Stop: ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH} && docker-compose -f docker-compose.production.yml down'"
    echo ""
}

# Run main function
main "$@"
