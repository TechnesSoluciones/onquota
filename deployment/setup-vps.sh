#!/bin/bash
# =============================================================================
# OnQuota VPS Initial Setup Script
# =============================================================================
# This script prepares the Hetzner VPS for the first deployment
# Run this ONCE before the first deployment
#
# Usage:
#   ./deployment/setup-vps.sh
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
YELLOW='\033[1;33m'
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

# Setup VPS
setup_vps() {
    log_info "Setting up VPS..."

    ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        set -e

        echo "Updating system packages..."
        apt-get update
        apt-get upgrade -y

        echo "Installing Docker..."
        if ! command -v docker &> /dev/null; then
            # Install Docker
            apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                lsb-release

            # Add Docker GPG key
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

            # Add Docker repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Install Docker Engine
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io

            # Start and enable Docker
            systemctl start docker
            systemctl enable docker

            echo "Docker installed successfully"
        else
            echo "Docker is already installed"
        fi

        echo "Installing Docker Compose..."
        if ! command -v docker-compose &> /dev/null; then
            # Install Docker Compose
            curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            echo "Docker Compose installed successfully"
        else
            echo "Docker Compose is already installed"
        fi

        echo "Creating application directory..."
        mkdir -p /opt/onquota/backups
        mkdir -p /opt/onquota/logs

        echo "Installing additional utilities..."
        apt-get install -y \
            curl \
            wget \
            git \
            htop \
            rsync \
            ufw

        echo "Configuring firewall..."
        # Allow SSH, HTTP, HTTPS
        ufw --force enable
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        # Allow PostgreSQL (already running)
        ufw allow 5432/tcp

        echo "Optimizing system for production..."
        # Increase file limits
        cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
EOF

        # Optimize sysctl for better network performance
        cat >> /etc/sysctl.conf << 'EOF'
# OnQuota production optimizations
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
vm.swappiness = 10
EOF
        sysctl -p

        echo "VPS setup completed successfully"
ENDSSH

    log_success "VPS setup completed"
}

# Main
main() {
    echo "============================================="
    echo "  OnQuota VPS Initial Setup"
    echo "============================================="
    echo "Target: ${VPS_USER}@${VPS_HOST}"
    echo "============================================="
    echo ""

    log_warning "This script will install Docker and configure the VPS"
    read -p "Do you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi

    setup_vps

    echo ""
    echo "============================================="
    log_success "VPS is ready for deployment!"
    echo "============================================="
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env.production with your actual values"
    echo "2. Generate secure passwords and keys"
    echo "3. Run: ./deployment/deploy.sh"
    echo ""
}

main "$@"
