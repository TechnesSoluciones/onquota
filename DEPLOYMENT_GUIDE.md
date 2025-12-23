# OnQuota - Deployment Guide

Complete guide for deploying OnQuota to production on Hetzner VPS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment](#post-deployment)
6. [Operations](#operations)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)
10. [Backup and Recovery](#backup-and-recovery)

---

## Prerequisites

### Local Machine Requirements
- SSH access to Hetzner VPS
- rsync installed
- Git
- Basic knowledge of Docker and Docker Compose

### VPS Requirements
- Hetzner VPS (46.224.33.191)
- Ubuntu 20.04+ or Debian 11+
- At least 2GB RAM (4GB recommended)
- 20GB+ disk space
- Root or sudo access

### External Services
- PostgreSQL Database (already configured):
  - Host: 46.224.33.191
  - Port: 5432
  - Database: onquota_db
  - User: onquota_user
  - 36 tables migrated and ready

### Optional
- Domain name (can use IP address initially)
- SSL certificates (Caddy handles this automatically with Let's Encrypt)

---

## Architecture Overview

### Stack Components

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (Port 80/443)                │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Caddy (Reverse      │
            │   Proxy + SSL)        │
            └───────┬───────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  Frontend    │        │  Backend     │
│  (Next.js)   │        │  (FastAPI)   │
│  Port 3000   │        │  Port 8000   │
└──────────────┘        └──────┬───────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐  ┌──────────────┐
        │  Redis   │   │  Celery  │  │  PostgreSQL  │
        │  Cache   │   │  Workers │  │  (External)  │
        └──────────┘   └──────────┘  └──────────────┘
```

### Services

1. **Caddy** - Reverse proxy with automatic SSL
2. **Frontend** - Next.js 14 application
3. **Backend** - FastAPI Python application
4. **Redis** - Cache and message broker
5. **Celery Worker** - Background task processing
6. **Celery Beat** - Scheduled tasks
7. **Flower** - Celery monitoring (optional)
8. **PostgreSQL** - External database (Hetzner)
9. **Prometheus** - Metrics collection (optional)
10. **Grafana** - Monitoring dashboard (optional)

---

## Initial Setup

### Step 1: Prepare VPS

Run the initial setup script to install Docker and configure the VPS:

```bash
./deployment/setup-vps.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Create application directories
- Optimize system settings

### Step 2: Configure Environment Variables

1. Review the production environment file:

```bash
cat .env.production
```

2. Generate secure passwords and keys:

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate TOTP_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate REDIS_PASSWORD
openssl rand -base64 32
```

3. Update `.env.production` with generated values:

```bash
nano .env.production
```

**Critical values to update:**
- `SECRET_KEY` - JWT signing key
- `TOTP_ENCRYPTION_KEY` - 2FA encryption key
- `REDIS_PASSWORD` - Redis authentication
- `FLOWER_PASSWORD` - Flower UI password
- `GRAFANA_ADMIN_PASSWORD` - Grafana dashboard password
- `DOMAIN` - Your domain or IP address
- `CADDY_EMAIL` - Email for SSL certificates

### Step 3: Configure Domain (Optional)

If using a domain name instead of IP:

1. Point your domain DNS to VPS IP:
   ```
   A Record: @ -> 46.224.33.191
   A Record: www -> 46.224.33.191
   ```

2. Update `.env.production`:
   ```bash
   DOMAIN=onquota.yourdomain.com
   NEXT_PUBLIC_API_URL=https://onquota.yourdomain.com/api/v1
   CORS_ORIGINS=https://onquota.yourdomain.com,https://www.onquota.yourdomain.com
   ```

### Step 4: Secure the Environment File

```bash
# Set proper permissions
chmod 600 .env.production

# Verify it's in .gitignore
grep -q ".env.production" .gitignore || echo ".env.production" >> .gitignore
```

---

## Deployment Process

### First Deployment

1. **Deploy to production:**

```bash
./deployment/deploy.sh
```

The script will:
- Check SSH connection
- Create backup
- Sync files to VPS
- Build Docker images
- Start all services
- Run health checks
- Display logs

2. **Verify deployment:**

```bash
./deployment/health-check.sh --verbose
```

### Subsequent Deployments

For future updates:

```bash
# Full deployment with rebuild
./deployment/deploy.sh

# Quick update without rebuild
./deployment/update.sh

# Update specific service
./deployment/update.sh backend
./deployment/update.sh frontend
```

### Build Options

```bash
# Build on VPS (default, recommended)
./deployment/deploy.sh

# Skip backup (not recommended)
./deployment/deploy.sh --no-backup

# Force deployment without confirmation
./deployment/deploy.sh --force
```

---

## Post-Deployment

### Verify Services

1. **Check all containers are running:**

```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml ps'
```

2. **Test endpoints:**

```bash
# Frontend
curl http://46.224.33.191/

# Backend API
curl http://46.224.33.191/api/v1/health

# Health check
./deployment/health-check.sh
```

### Access Application

- **Main Application:** http://46.224.33.191 (or https://yourdomain.com)
- **API Documentation:** Disabled in production (security)
- **Flower (Celery UI):** http://46.224.33.191/flower (if monitoring profile enabled)
- **Grafana:** http://46.224.33.191/grafana (if monitoring profile enabled)

### SSL Certificate

If using a domain, Caddy will automatically:
1. Request SSL certificate from Let's Encrypt
2. Renew certificates automatically
3. Redirect HTTP to HTTPS

First certificate request takes 30-60 seconds.

---

## Operations

### Common Commands

#### View Logs

```bash
# All services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'

# Specific service
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f backend'

# Last 100 lines
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs --tail=100'
```

#### Restart Services

```bash
# All services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'

# Specific service
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart backend'
```

#### Stop/Start Services

```bash
# Stop all
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml down'

# Start all
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d'

# Start with monitoring
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml --profile monitoring up -d'
```

#### Execute Commands in Container

```bash
# Backend shell
ssh root@46.224.33.191 'docker exec -it onquota-backend bash'

# Run migrations
ssh root@46.224.33.191 'docker exec onquota-backend alembic upgrade head'

# Create superuser (example)
ssh root@46.224.33.191 'docker exec -it onquota-backend python -m scripts.create_superuser'
```

#### Database Operations

```bash
# Connect to PostgreSQL
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db'

# Run migrations
ssh root@46.224.33.191 'docker exec onquota-backend alembic upgrade head'

# Backup database
ssh root@46.224.33.191 'pg_dump -h localhost -U onquota_user onquota_db > /opt/onquota/backups/db_backup_$(date +%Y%m%d_%H%M%S).sql'
```

---

## Monitoring

### Enable Monitoring Stack

Start services with monitoring profile:

```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml --profile monitoring up -d'
```

This enables:
- **Flower** - Celery monitoring at `/flower`
- **Prometheus** - Metrics at port 9090 (internal)
- **Grafana** - Dashboards at `/grafana`

### Access Monitoring Tools

1. **Flower (Celery):**
   - URL: http://46.224.33.191/flower
   - Credentials: From `.env.production` (FLOWER_USER/FLOWER_PASSWORD)

2. **Grafana:**
   - URL: http://46.224.33.191/grafana
   - Credentials: From `.env.production` (GRAFANA_ADMIN_USER/GRAFANA_ADMIN_PASSWORD)

### Health Checks

Run comprehensive health checks:

```bash
./deployment/health-check.sh
./deployment/health-check.sh --verbose
```

### Container Metrics

```bash
# Container stats
ssh root@46.224.33.191 'docker stats --no-stream'

# Container resource usage
ssh root@46.224.33.191 'docker-compose -f /opt/onquota/docker-compose.production.yml top'
```

### System Metrics

```bash
# Disk usage
ssh root@46.224.33.191 'df -h'

# Memory usage
ssh root@46.224.33.191 'free -h'

# CPU and processes
ssh root@46.224.33.191 'htop'
```

---

## Troubleshooting

### Service Not Starting

1. **Check logs:**
   ```bash
   ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs backend'
   ```

2. **Check container status:**
   ```bash
   ssh root@46.224.33.191 'docker ps -a | grep onquota'
   ```

3. **Verify environment variables:**
   ```bash
   ssh root@46.224.33.191 'cat /opt/onquota/.env.production'
   ```

### Database Connection Issues

1. **Test PostgreSQL connection:**
   ```bash
   ssh root@46.224.33.191 'psql -h 46.224.33.191 -U onquota_user -d onquota_db -c "SELECT version();"'
   ```

2. **Check DATABASE_URL format:**
   ```
   postgresql+asyncpg://onquota_user:PASSWORD@46.224.33.191:5432/onquota_db
   ```

3. **Verify firewall allows PostgreSQL:**
   ```bash
   ssh root@46.224.33.191 'ufw status | grep 5432'
   ```

### Redis Connection Issues

1. **Test Redis:**
   ```bash
   ssh root@46.224.33.191 'docker exec onquota-redis redis-cli ping'
   ```

2. **Check Redis password:**
   ```bash
   ssh root@46.224.33.191 'docker exec onquota-redis redis-cli -a YOUR_PASSWORD ping'
   ```

### SSL Certificate Issues

1. **Check Caddy logs:**
   ```bash
   ssh root@46.224.33.191 'docker logs onquota-caddy'
   ```

2. **Verify domain DNS:**
   ```bash
   dig yourdomain.com
   nslookup yourdomain.com
   ```

3. **Check port 80/443 are open:**
   ```bash
   ssh root@46.224.33.191 'netstat -tlnp | grep -E ":(80|443)"'
   ```

### Frontend Build Issues

1. **Check build logs:**
   ```bash
   ssh root@46.224.33.191 'docker logs onquota-frontend'
   ```

2. **Verify standalone output:**
   ```bash
   ssh root@46.224.33.191 'docker exec onquota-frontend ls -la .next/standalone'
   ```

### Performance Issues

1. **Check resource usage:**
   ```bash
   ./deployment/health-check.sh --verbose
   ```

2. **Restart specific service:**
   ```bash
   ./deployment/update.sh backend
   ```

3. **Clear Redis cache:**
   ```bash
   ssh root@46.224.33.191 'docker exec onquota-redis redis-cli FLUSHALL'
   ```

---

## Security Best Practices

### Environment Security

1. **Protect .env.production:**
   ```bash
   chmod 600 .env.production
   ```

2. **Never commit secrets:**
   - Verify `.env.production` is in `.gitignore`
   - Use strong, unique passwords
   - Rotate credentials regularly

### Network Security

1. **Firewall configuration:**
   ```bash
   # Only allow necessary ports
   ufw allow 22/tcp   # SSH
   ufw allow 80/tcp   # HTTP
   ufw allow 443/tcp  # HTTPS
   ufw allow 5432/tcp # PostgreSQL
   ufw enable
   ```

2. **SSH hardening:**
   - Use SSH keys instead of passwords
   - Disable root login
   - Change default SSH port

### Application Security

1. **Keep secrets secure:**
   - Strong SECRET_KEY
   - Encrypted TOTP keys
   - Secure database credentials

2. **CORS configuration:**
   - Restrict to your domain only
   - Update CORS_ORIGINS in production

3. **API security:**
   - Disable API docs in production
   - Rate limiting enabled
   - JWT token expiration configured

### Container Security

1. **Non-root users:**
   - All containers run as non-root
   - Defined in Dockerfiles

2. **Resource limits:**
   - Memory limits set for Redis
   - CPU limits can be added if needed

### SSL/TLS

1. **Automatic HTTPS:**
   - Caddy handles SSL automatically
   - Let's Encrypt certificates
   - Auto-renewal enabled

2. **Security headers:**
   - HSTS enabled
   - XSS protection
   - Content Security Policy

---

## Backup and Recovery

### Automated Backups

The deployment script creates automatic backups:

```bash
# Backups are stored in
/opt/onquota/backups/
```

Each backup includes:
- `.env.production` configuration
- Docker Compose state
- Timestamp for easy identification

### Manual Backup

1. **Create full backup:**

```bash
ssh root@46.224.33.191 << 'EOF'
  BACKUP_DIR="/opt/onquota/backups"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)

  # Backup environment
  cp /opt/onquota/.env.production ${BACKUP_DIR}/env_${TIMESTAMP}

  # Backup database
  pg_dump -h localhost -U onquota_user onquota_db > ${BACKUP_DIR}/db_${TIMESTAMP}.sql

  # Backup uploads
  tar -czf ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz /opt/onquota/uploads/

  echo "Backup completed: ${TIMESTAMP}"
EOF
```

2. **List backups:**

```bash
ssh root@46.224.33.191 'ls -lh /opt/onquota/backups/'
```

### Database Backup

```bash
# Export database
ssh root@46.224.33.191 'pg_dump -h 46.224.33.191 -U onquota_user onquota_db > /opt/onquota/backups/db_$(date +%Y%m%d).sql'

# Compress backup
ssh root@46.224.33.191 'gzip /opt/onquota/backups/db_$(date +%Y%m%d).sql'
```

### Restore from Backup

1. **Rollback to previous deployment:**

```bash
./deployment/rollback.sh
```

2. **Restore database:**

```bash
ssh root@46.224.33.191 'psql -h 46.224.33.191 -U onquota_user onquota_db < /opt/onquota/backups/db_TIMESTAMP.sql'
```

3. **Restore uploads:**

```bash
ssh root@46.224.33.191 'tar -xzf /opt/onquota/backups/uploads_TIMESTAMP.tar.gz -C /'
```

### Backup Retention

The deployment script keeps the last 5 backups automatically. To adjust:

```bash
# Keep last 10 backups
ssh root@46.224.33.191 'cd /opt/onquota/backups && ls -t backup_* | tail -n +11 | xargs rm'
```

---

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Check logs for errors
   - Review disk space
   - Verify backups

2. **Monthly:**
   - Update system packages
   - Review security updates
   - Rotate old logs

3. **Quarterly:**
   - Rotate credentials
   - Review access controls
   - Performance optimization

### Update System Packages

```bash
ssh root@46.224.33.191 'apt update && apt upgrade -y'
```

### Clean Docker Resources

```bash
# Remove unused images
ssh root@46.224.33.191 'docker image prune -a -f'

# Remove unused volumes
ssh root@46.224.33.191 'docker volume prune -f'

# Remove unused networks
ssh root@46.224.33.191 'docker network prune -f'
```

### Log Rotation

Docker handles log rotation automatically with the configuration in docker-compose:
- Max size: 10MB
- Max files: 3

---

## Scripts Reference

### Deployment Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-vps.sh` | Initial VPS setup | `./deployment/setup-vps.sh` |
| `deploy.sh` | Full deployment | `./deployment/deploy.sh [options]` |
| `update.sh` | Quick update | `./deployment/update.sh [service]` |
| `rollback.sh` | Rollback deployment | `./deployment/rollback.sh [timestamp]` |
| `health-check.sh` | Health verification | `./deployment/health-check.sh [--verbose]` |

### Script Options

**deploy.sh:**
- `--build-local` - Build images locally (not implemented)
- `--build-remote` - Build on VPS (default)
- `--no-backup` - Skip backup creation
- `--force` - No confirmation prompts

**health-check.sh:**
- `--verbose` - Detailed output

---

## Support and Resources

### Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Caddy](https://caddyserver.com/docs/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/docs)

### Logs Location
- Application logs: `/opt/onquota/backend/logs/`
- Docker logs: `docker logs [container_name]`
- Caddy logs: `/data/access.log` (inside Caddy container)

### Quick Reference

```bash
# SSH to VPS
ssh root@46.224.33.191

# Project directory
cd /opt/onquota

# View all containers
docker-compose -f docker-compose.production.yml ps

# Follow logs
docker-compose -f docker-compose.production.yml logs -f

# Restart everything
docker-compose -f docker-compose.production.yml restart

# Stop everything
docker-compose -f docker-compose.production.yml down

# Start everything
docker-compose -f docker-compose.production.yml up -d
```

---

## Changelog

### Version 1.0.0 (Initial Release)
- Production-ready deployment configuration
- Caddy reverse proxy with automatic SSL
- Multi-stage Docker builds
- Celery background tasks
- Monitoring stack (optional)
- Automated deployment scripts
- Health checks and rollback capability

---

## License

Proprietary - OnQuota © 2024

---

## Contact

For support and questions, contact the development team.
