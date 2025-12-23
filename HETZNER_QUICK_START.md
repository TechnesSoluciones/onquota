# OnQuota - Hetzner VPS Quick Start Guide

## TL;DR - Deploy in 15 Minutes

This is a condensed quick-start guide for deploying OnQuota on Hetzner VPS with external PostgreSQL.

## Prerequisites Checklist

- [ ] Hetzner VPS running Ubuntu 22.04/24.04 (2+ vCPU, 4+ GB RAM)
- [ ] External PostgreSQL database created
- [ ] Database credentials ready
- [ ] Domain name pointing to VPS (optional)
- [ ] SSH access to VPS

## Step 1: Prepare VPS (5 minutes)

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system and install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git

# Configure firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create deployment user
adduser deployer
usermod -aG sudo,docker deployer
su - deployer
```

## Step 2: Setup Database (2 minutes)

On your PostgreSQL server:

```sql
CREATE DATABASE onquota_production;
CREATE USER onquota_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE onquota_production TO onquota_user;

\c onquota_production
GRANT ALL ON SCHEMA public TO onquota_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Test connection from VPS:
```bash
apt install -y postgresql-client
psql -h YOUR_DB_HOST -U onquota_user -d onquota_production
# Should connect successfully
```

## Step 3: Deploy Application (8 minutes)

```bash
# Clone repository
cd /home/deployer
git clone YOUR_REPO_URL onquota
cd onquota

# Configure environment
cp .env.production.example .env.production
nano .env.production
```

**Minimum required configuration:**

```bash
# Database (CHANGE THESE!)
DATABASE_URL=postgresql+asyncpg://onquota_user:YOUR_PASSWORD@YOUR_DB_HOST:5432/onquota_production

# Redis (generate strong password)
REDIS_PASSWORD=$(openssl rand -hex 32)

# Security (generate these!)
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
TOTP_ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Frontend
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1  # or http://YOUR_VPS_IP/api/v1

# CORS
CORS_ORIGINS=https://yourdomain.com,http://YOUR_VPS_IP
```

**Setup SSL (Choose one):**

For domain with Let's Encrypt:
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo mkdir -p ./nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./nginx/ssl/
sudo chown -R deployer:deployer ./nginx/ssl
```

For IP address (self-signed):
```bash
mkdir -p ./nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/privkey.pem \
  -out ./nginx/ssl/fullchain.pem \
  -subj "/CN=YOUR_VPS_IP"
```

**Update Nginx config:**
```bash
nano ./nginx/nginx.prod.conf
# Change: server_name _;
# To: server_name yourdomain.com;  (or your IP)
```

**Deploy:**
```bash
# Build and start
./deploy.sh build
./deploy.sh migrate
./deploy.sh start

# Check status
./deploy.sh status
./deploy.sh health
```

## Step 4: Verify & Access

Access your application:
- **Frontend**: https://yourdomain.com (or http://YOUR_VPS_IP)
- **API Docs**: https://yourdomain.com/api/v1/docs (disable in production!)
- **Flower**: https://yourdomain.com/flower (optional)
- **Grafana**: https://yourdomain.com/grafana (optional)

Create admin user:
```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/create_admin.py
```

## Common Commands

```bash
# View logs
./deploy.sh logs              # All services
./deploy.sh logs backend      # Specific service

# Restart services
./deploy.sh restart

# Check health
./deploy.sh health

# Update application
./deploy.sh update

# Open shell
./deploy.sh shell backend
```

## Troubleshooting

### Can't connect to database?
```bash
# Test from VPS
psql -h YOUR_DB_HOST -U onquota_user -d onquota_production

# Check DATABASE_URL in .env.production
# Verify firewall on database server allows VPS IP
```

### Backend errors?
```bash
./deploy.sh logs backend
./deploy.sh health

# Check database migrations
docker compose -f docker-compose.prod.yml exec backend alembic current
./deploy.sh migrate
```

### SSL certificate errors?
```bash
# Verify files exist
ls -la ./nginx/ssl/

# Check nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Can't access application?
```bash
# Check firewall
sudo ufw status

# Check services
docker ps
./deploy.sh status

# Check health
curl http://localhost:8000/health
curl http://localhost:3000
curl http://localhost
```

## Multi-Project Setup

For multiple projects on same database server:

```sql
-- Database Server (create separate databases)
CREATE DATABASE project1_production;
CREATE USER project1_user WITH ENCRYPTED PASSWORD 'pass1';
GRANT ALL PRIVILEGES ON DATABASE project1_production TO project1_user;

CREATE DATABASE project2_production;
CREATE USER project2_user WITH ENCRYPTED PASSWORD 'pass2';
GRANT ALL PRIVILEGES ON DATABASE project2_production TO project2_user;
```

Each project gets:
- Own folder: `/home/deployer/project1`, `/home/deployer/project2`
- Own database on shared server
- Own Docker Compose stack
- Own domain/subdomain
- Own ports (change in docker-compose.prod.yml)

## Production Checklist

- [ ] Strong passwords for all services
- [ ] SSL certificate configured
- [ ] Firewall enabled (only 22, 80, 443 open)
- [ ] Database on separate server
- [ ] Regular backups configured
- [ ] Monitoring setup (Grafana/Prometheus)
- [ ] Log rotation enabled
- [ ] API docs disabled in production
- [ ] `.env.production` not in git
- [ ] Domain DNS configured
- [ ] Health checks passing

## Performance Tips

For better performance:
- Increase backend workers: Edit docker-compose.prod.yml `--workers 4`
- Scale celery: `docker compose -f docker-compose.prod.yml up -d --scale celery_worker=4`
- Increase Redis memory: `--maxmemory 1gb` in docker-compose.prod.yml
- Adjust DB pool: `DB_POOL_SIZE=30` in .env.production

## Need Help?

- Check logs: `./deploy.sh logs`
- Check health: `./deploy.sh health`
- Review full guide: `DEPLOYMENT.md`
- Check container status: `docker ps`

## Security Reminders

- Never commit `.env.production` to git ✓
- Use strong passwords ✓
- Keep SSL certificates updated ✓
- Regular system updates: `apt update && apt upgrade`
- Monitor logs regularly
- Backup database regularly
- Restrict API docs in production

## SSL Certificate Auto-Renewal (Let's Encrypt)

```bash
# Create renewal script
sudo nano /usr/local/bin/renew-ssl.sh
```

Add:
```bash
#!/bin/bash
certbot renew --pre-hook "cd /home/deployer/onquota && docker compose -f docker-compose.prod.yml down nginx" \
              --post-hook "cd /home/deployer/onquota && docker compose -f docker-compose.prod.yml up -d nginx"
cp /etc/letsencrypt/live/yourdomain.com/*.pem /home/deployer/onquota/nginx/ssl/
chown -R deployer:deployer /home/deployer/onquota/nginx/ssl
```

```bash
sudo chmod +x /usr/local/bin/renew-ssl.sh
sudo crontab -e
# Add: 0 3 * * * /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

That's it! Your OnQuota application should now be running on your Hetzner VPS connected to your external PostgreSQL database.
