#!/bin/bash
# =============================================================================
# OnQuota - Production Deployment Script
# =============================================================================
# Usage: ./deploy.sh [command]
# Commands:
#   start    - Start all services
#   stop     - Stop all services
#   restart  - Restart all services
#   logs     - View logs (all services)
#   status   - Show service status
#   build    - Rebuild containers
#   migrate  - Run database migrations
#   backup   - Backup database
#   update   - Pull latest code and redeploy
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_prerequisites() {
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found!"
        print_info "Copy .env.production.example to .env.production and configure it"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed!"
        exit 1
    fi
}

# Commands
cmd_start() {
    print_info "Starting OnQuota services..."
    docker compose -f "$COMPOSE_FILE" up -d
    print_success "Services started successfully!"
    print_info "Run './deploy.sh logs' to view logs"
    print_info "Run './deploy.sh status' to check service status"
}

cmd_stop() {
    print_info "Stopping OnQuota services..."
    docker compose -f "$COMPOSE_FILE" down
    print_success "Services stopped successfully!"
}

cmd_restart() {
    print_info "Restarting OnQuota services..."
    docker compose -f "$COMPOSE_FILE" restart
    print_success "Services restarted successfully!"
}

cmd_logs() {
    SERVICE="${2:-}"
    if [ -z "$SERVICE" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f
    else
        docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
    fi
}

cmd_status() {
    print_info "OnQuota Service Status:"
    docker compose -f "$COMPOSE_FILE" ps
}

cmd_build() {
    print_info "Building Docker containers..."
    docker compose -f "$COMPOSE_FILE" build "$@"
    print_success "Containers built successfully!"
}

cmd_migrate() {
    print_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head
    print_success "Migrations completed successfully!"
}

cmd_backup() {
    print_info "Creating database backup..."

    # Load environment variables
    export $(grep -v '^#' "$ENV_FILE" | xargs)

    # Extract database credentials from DATABASE_URL
    DB_URL="$DATABASE_URL"

    # Create backup directory
    mkdir -p ./backups

    BACKUP_FILE="./backups/onquota_backup_$(date +%Y%m%d_%H%M%S).sql"

    print_warning "Manual backup required. Run:"
    echo "pg_dump -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -F c -f $BACKUP_FILE"

    print_info "Backup would be saved to: $BACKUP_FILE"
}

cmd_update() {
    print_info "Updating OnQuota..."

    # Pull latest code
    print_info "Pulling latest code from git..."
    git pull origin main

    # Build new images
    print_info "Building new Docker images..."
    docker compose -f "$COMPOSE_FILE" build

    # Run migrations
    print_info "Running database migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm backend alembic upgrade head

    # Restart services
    print_info "Restarting services with new images..."
    docker compose -f "$COMPOSE_FILE" up -d

    print_success "Update completed successfully!"
    print_info "Checking service status..."
    sleep 5
    cmd_status
}

cmd_shell() {
    SERVICE="${2:-backend}"
    print_info "Opening shell in $SERVICE container..."
    docker compose -f "$COMPOSE_FILE" exec "$SERVICE" /bin/bash
}

cmd_clean() {
    print_warning "This will remove all stopped containers, unused images, and volumes!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up Docker resources..."
        docker system prune -a --volumes -f
        print_success "Cleanup completed!"
    else
        print_info "Cleanup cancelled"
    fi
}

cmd_health() {
    print_info "Checking service health..."
    echo ""

    # Check backend
    echo -n "Backend API: "
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Unhealthy"
    fi

    # Check frontend
    echo -n "Frontend: "
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Unhealthy"
    fi

    # Check nginx
    echo -n "Nginx: "
    if curl -sf http://localhost > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Unhealthy"
    fi

    # Check redis
    echo -n "Redis: "
    if docker compose -f "$COMPOSE_FILE" exec redis redis-cli ping > /dev/null 2>&1; then
        print_success "Healthy"
    else
        print_error "Unhealthy"
    fi

    echo ""
}

cmd_help() {
    cat << EOF

OnQuota - Production Deployment Script

Usage: ./deploy.sh [command] [options]

Commands:
  start              Start all services
  stop               Stop all services
  restart            Restart all services
  logs [service]     View logs (all services or specific service)
  status             Show service status
  build              Rebuild containers
  migrate            Run database migrations
  backup             Backup database
  update             Pull latest code and redeploy
  shell [service]    Open shell in container (default: backend)
  health             Check health of all services
  clean              Clean up Docker resources
  help               Show this help message

Examples:
  ./deploy.sh start                  # Start all services
  ./deploy.sh logs backend           # View backend logs
  ./deploy.sh logs                   # View all logs
  ./deploy.sh update                 # Update to latest version
  ./deploy.sh shell backend          # Open shell in backend container

EOF
}

# Main
main() {
    check_prerequisites

    COMMAND="${1:-help}"

    case "$COMMAND" in
        start)
            cmd_start "$@"
            ;;
        stop)
            cmd_stop "$@"
            ;;
        restart)
            cmd_restart "$@"
            ;;
        logs)
            cmd_logs "$@"
            ;;
        status)
            cmd_status "$@"
            ;;
        build)
            shift
            cmd_build "$@"
            ;;
        migrate)
            cmd_migrate "$@"
            ;;
        backup)
            cmd_backup "$@"
            ;;
        update)
            cmd_update "$@"
            ;;
        shell)
            cmd_shell "$@"
            ;;
        clean)
            cmd_clean "$@"
            ;;
        health)
            cmd_health "$@"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
