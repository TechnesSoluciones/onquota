# OnQuota - Production Deployment Guide for Hetzner VPS

This guide covers deploying OnQuota on a Hetzner VPS with an external PostgreSQL database server.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Hetzner VPS (App Server)                │
│                                                               │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐   ┌─────────┐ │
│  │  Nginx  │───▶│ Frontend │    │ Backend │   │  Redis  │ │
│  │  (80/   │    │ (Next.js)│    │(FastAPI)│   │ (Cache) │ │
│  │  443)   │    └──────────┘    └─────────┘   └─────────┘ │
│  └────┬────┘                          │                     │
│       │                                │                     │
└───────┼────────────────────────────────┼─────────────────────┘
        │                                │
        │                                ▼
        │                    ┌───────────────────────┐
        │                    │  External PostgreSQL  │
        │                    │    Database Server    │
        │                    │   (Hetzner/Other)     │
        │                    └───────────────────────┘
        │
        ▼
   Internet Users
```

## Prerequisites

### 1. Hetzner VPS Requirements
- **Minimum Specs**: 2 vCPU, 4GB RAM, 40GB SSD
- **Recommended**: 4 vCPU, 8GB RAM, 80GB SSD
- **OS**: Ubuntu 22.04 LTS or 24.04 LTS

### 2. External Database Server
- PostgreSQL 15 or higher
- Network accessible from your VPS
- Credentials ready (username, password, database name)
- Firewall configured to allow connections from VPS IP

### 3. Domain & DNS (Optional but Recommended)
- Domain name pointing to your VPS IP
- SSL certificate (Let's Encrypt recommended)

## Step 1: Prepare VPS

### 1.1 Update System
```bash
ssh root@your-vps-ip

apt update && apt upgrade -y
apt install -y curl git vim ufw
```

### 1.2 Install Docker & Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Enable Docker service
systemctl enable docker
systemctl start docker

# Install Docker Compose
apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 1.3 Configure Firewall
```bash
# Allow SSH (IMPORTANT: Do this first!)
ufw allow OpenSSH

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

### 1.4 Create Non-Root User (Recommended)
```bash
# Create user
adduser deployer
usermod -aG sudo deployer
usermod -aG docker deployer

# Switch to deployer user
su - deployer
```

## Step 2: Prepare External Database

On your PostgreSQL database server:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database for OnQuota
CREATE DATABASE onquota_production;

-- Create user
CREATE USER onquota_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE onquota_production TO onquota_user;

-- Grant schema privileges (PostgreSQL 15+)
\c onquota_production
GRANT ALL ON SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO onquota_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO onquota_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO onquota_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO onquota_user;

-- Enable UUID extension (if using UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### Test Database Connection from VPS
```bash
# Install PostgreSQL client
sudo apt install -y postgresql-client

# Test connection
psql -h YOUR_DB_HOST -U onquota_user -d onquota_production

# If successful, you'll see:
# onquota_production=>

# Exit with \q
```

## Step 3: Deploy Application

### 3.1 Clone Repository
```bash
cd /home/deployer
git clone https://github.com/yourusername/onquota.git
cd onquota
```

### 3.2 Configure Environment
```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

**Important values to configure:**

```bash
# Database (YOUR EXTERNAL DATABASE)
DATABASE_URL=postgresql+asyncpg://onquota_user:your_password@db.example.com:5432/onquota_production

# Redis password (generate strong password)
REDIS_PASSWORD=your_strong_redis_password

# Security keys (generate new ones!)
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
TOTP_ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Frontend URL (your domain or IP)
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1

# CORS (your domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 3.3 Configure SSL Certificates

#### Option A: Let's Encrypt (Recommended for domains)
```bash
# Install Certbot
sudo apt install -y certbot

# Stop any running containers
docker compose -f docker-compose.prod.yml down

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx directory
sudo mkdir -p ./nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
sudo chown -R deployer:deployer ./nginx/ssl
```

#### Option B: Self-Signed (For testing with IP)
```bash
mkdir -p ./nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/privkey.pem \
  -out ./nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-vps-ip"
```

### 3.4 Update Nginx Configuration
```bash
# Edit nginx config to use your domain
nano ./nginx/nginx.prod.conf

# Replace server_name _ with your domain:
# server_name yourdomain.com www.yourdomain.com;
```

### 3.5 Run Database Migrations
```bash
# Build backend image first
docker compose -f docker-compose.prod.yml build backend

# Run migrations
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Seed initial data (if needed)
docker compose -f docker-compose.prod.yml run --rm backend python scripts/seed_initial_data.py
```

### 3.6 Start Services
```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

### 3.7 Verify Deployment
```bash
# Check if services are running
docker ps

# Test backend health
curl http://localhost:8000/health

# Test nginx
curl http://localhost

# If using domain with SSL:
curl https://yourdomain.com
```

## Step 4: Post-Deployment

### 4.1 Create Admin User
```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py
```

### 4.2 Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/onquota
```

Add:
```
/home/deployer/onquota/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    sharedscripts
    postrotate
        docker compose -f /home/deployer/onquota/docker-compose.prod.yml exec backend kill -USR1 1
    endscript
}
```

### 4.3 Setup Automatic SSL Renewal (Let's Encrypt)
```bash
# Create renewal script
sudo nano /usr/local/bin/renew-ssl.sh
```

Add:
```bash
#!/bin/bash
certbot renew --pre-hook "docker compose -f /home/deployer/onquota/docker-compose.prod.yml down nginx" \
              --post-hook "docker compose -f /home/deployer/onquota/docker-compose.prod.yml up -d nginx"
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /home/deployer/onquota/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /home/deployer/onquota/nginx/ssl/
chown -R deployer:deployer /home/deployer/onquota/nginx/ssl
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/renew-ssl.sh

# Add to crontab
sudo crontab -e
# Add: 0 3 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

### 4.4 Setup Monitoring (Optional)
```bash
# Access Grafana at: https://yourdomain.com/grafana
# Default: admin / password from .env.production

# Access Flower at: https://yourdomain.com/flower
# Credentials from .env.production
```

## Step 5: Maintenance

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# All services
docker compose -f docker-compose.prod.yml restart

# Specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Run new migrations
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Backup Database
```bash
# From VPS
pg_dump -h YOUR_DB_HOST -U onquota_user -d onquota_production -F c -f backup_$(date +%Y%m%d).dump

# Or create automated backup script
```

### Scale Services
```bash
# Scale celery workers
docker compose -f docker-compose.prod.yml up -d --scale celery_worker=4
```

## Troubleshooting

### Cannot Connect to Database
```bash
# Test connection from VPS
psql -h YOUR_DB_HOST -U onquota_user -d onquota_production

# Check if database server firewall allows VPS IP
# Check DATABASE_URL in .env.production
# Verify database credentials
```

### Backend 500 Errors
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend

# Check database migrations
docker compose -f docker-compose.prod.yml exec backend alembic current
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Frontend Not Loading
```bash
# Check if NEXT_PUBLIC_API_URL is correct
# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx

# Verify frontend container is running
docker ps | grep frontend
```

### SSL Certificate Issues
```bash
# Check certificate files exist
ls -la ./nginx/ssl/

# Verify nginx can read certificates
docker compose -f docker-compose.prod.yml exec nginx ls -la /etc/nginx/ssl/

# Check nginx configuration
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

## Security Checklist

- [ ] Strong passwords for database, Redis, admin users
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] SSL/TLS enabled with valid certificates
- [ ] API docs disabled in production (API_DOCS_URL empty)
- [ ] Regular backups configured
- [ ] Log monitoring setup
- [ ] Rate limiting configured
- [ ] CORS properly configured for your domain
- [ ] Environment variables secured (not in git)
- [ ] Database on separate server with firewall
- [ ] Regular security updates (`apt update && apt upgrade`)

## Performance Optimization

### For 2+ vCPU VPS:
- Increase backend workers: `--workers 4` in docker-compose.prod.yml
- Increase celery workers: `--concurrency=4`
- Adjust PostgreSQL connection pool: `DB_POOL_SIZE=30`

### For 4+ GB RAM:
- Increase Redis maxmemory: `--maxmemory 1gb`
- Enable Redis persistence with RDB snapshots
- Consider adding read replicas for database

## Multi-Project Database Setup

Since you mentioned running multiple projects on the same database server:

```sql
-- On your PostgreSQL server, create databases for each project:

-- Project 1: OnQuota
CREATE DATABASE onquota_production;
CREATE USER onquota_user WITH ENCRYPTED PASSWORD 'password1';
GRANT ALL PRIVILEGES ON DATABASE onquota_production TO onquota_user;

-- Project 2: Another App
CREATE DATABASE anotherapp_production;
CREATE USER anotherapp_user WITH ENCRYPTED PASSWORD 'password2';
GRANT ALL PRIVILEGES ON DATABASE anotherapp_production TO anotherapp_user;

-- Each project will connect to its own database with its own user
-- Ensures complete isolation between projects
```

Each project on your VPS will have its own:
- Docker Compose stack
- Database on shared server (isolated)
- Domain/subdomain
- Nginx configuration

## Support

For issues or questions:
- Check logs first: `docker compose -f docker-compose.prod.yml logs`
- Review this guide
- Check GitHub issues
- Contact support

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
