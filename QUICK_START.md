# OnQuota - Quick Start Guide

Fast deployment guide to get OnQuota running in production in under 30 minutes.

## Prerequisites Checklist

- [ ] SSH access to VPS (46.224.33.191)
- [ ] PostgreSQL database configured (already done)
- [ ] Domain name (optional, can use IP)

## 5-Step Deployment

### Step 1: Setup VPS (5 minutes)

```bash
# Run initial setup
./deployment/setup-vps.sh
```

This installs Docker, Docker Compose, and configures the VPS.

### Step 2: Configure Environment (10 minutes)

```bash
# Generate secure passwords
python -c "import secrets; print('SECRET_KEY:', secrets.token_urlsafe(32))"
python -c "from cryptography.fernet import Fernet; print('TOTP_KEY:', Fernet.generate_key().decode())"
openssl rand -base64 32  # REDIS_PASSWORD
```

Edit `.env.production` and update:
- `SECRET_KEY` - Copy from above
- `TOTP_ENCRYPTION_KEY` - Copy from above
- `REDIS_PASSWORD` - Copy from above
- `FLOWER_PASSWORD` - Choose a strong password
- `GRAFANA_ADMIN_PASSWORD` - Choose a strong password
- `DOMAIN` - Your domain or keep as IP (46.224.33.191)

**Using IP (no domain):**
```bash
DOMAIN=46.224.33.191
NEXT_PUBLIC_API_URL=http://46.224.33.191/api/v1
CORS_ORIGINS=http://46.224.33.191,https://46.224.33.191
```

**Using domain:**
```bash
DOMAIN=onquota.yourdomain.com
NEXT_PUBLIC_API_URL=https://onquota.yourdomain.com/api/v1
CORS_ORIGINS=https://onquota.yourdomain.com
```

### Step 3: Deploy (10 minutes)

```bash
# Deploy to production
./deployment/deploy.sh
```

The script will:
1. Check SSH connection
2. Create backup
3. Sync files to VPS
4. Build Docker images
5. Start all services
6. Run health checks

### Step 4: Verify (2 minutes)

```bash
# Run health check
./deployment/health-check.sh
```

**Manual verification:**
```bash
# Check frontend
curl http://46.224.33.191/

# Check backend
curl http://46.224.33.191/api/v1/health

# View running containers
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml ps'
```

### Step 5: Access Application (1 minute)

**Using IP:**
- Application: http://46.224.33.191

**Using domain (after DNS propagation):**
- Application: https://yourdomain.com
- Flower (Celery): https://yourdomain.com/flower
- Grafana: https://yourdomain.com/grafana

---

## Common Commands

### View Logs
```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'
```

### Restart Services
```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'
```

### Update Application
```bash
./deployment/update.sh
```

### Rollback
```bash
./deployment/rollback.sh
```

---

## Troubleshooting

### Service not starting?
```bash
# Check logs
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs backend'
```

### Database connection error?
```bash
# Test PostgreSQL
ssh root@46.224.33.191 'psql -h 46.224.33.191 -U onquota_user -d onquota_db -c "SELECT 1"'
```

### SSL not working?
- Wait 2-3 minutes for Let's Encrypt
- Check domain DNS is pointing to VPS
- View Caddy logs: `ssh root@46.224.33.191 'docker logs onquota-caddy'`

---

## Next Steps

1. **Enable Monitoring (Optional):**
   ```bash
   ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml --profile monitoring up -d'
   ```

2. **Setup Backups:**
   - Automated backups run on each deployment
   - Manual backup: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#backup-and-recovery)

3. **Configure Domain SSL:**
   - Point DNS to 46.224.33.191
   - Update .env.production with domain
   - Redeploy: `./deployment/deploy.sh`
   - SSL certificate automatic via Caddy

4. **Review Security:**
   - Change all default passwords
   - Configure firewall
   - Review [Security Best Practices](DEPLOYMENT_GUIDE.md#security-best-practices)

---

## Support

For detailed documentation, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

For troubleshooting, see [Troubleshooting Section](DEPLOYMENT_GUIDE.md#troubleshooting)
