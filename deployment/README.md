# OnQuota Deployment Scripts

This directory contains automated deployment scripts for OnQuota production deployment.

## Scripts Overview

### setup-vps.sh
**Purpose:** Initial VPS configuration (run once)

**What it does:**
- Installs Docker and Docker Compose
- Configures firewall (UFW)
- Creates application directories
- Optimizes system settings
- Installs required utilities

**Usage:**
```bash
./deployment/setup-vps.sh
```

**When to use:** First time setting up the VPS

---

### deploy.sh
**Purpose:** Full production deployment

**What it does:**
- Checks SSH connectivity
- Creates backup of current deployment
- Syncs files to VPS via rsync
- Builds Docker images on VPS
- Starts all services
- Runs health checks
- Shows deployment logs

**Usage:**
```bash
# Standard deployment
./deployment/deploy.sh

# Skip backup (not recommended)
./deployment/deploy.sh --no-backup

# Force without confirmation
./deployment/deploy.sh --force
```

**When to use:**
- First deployment
- Major updates requiring rebuild
- After Docker configuration changes
- After dependency updates

---

### update.sh
**Purpose:** Quick updates without rebuild

**What it does:**
- Syncs code changes to VPS
- Restarts specified services
- Faster than full deployment

**Usage:**
```bash
# Update all services
./deployment/update.sh

# Update specific service
./deployment/update.sh backend
./deployment/update.sh frontend
./deployment/update.sh celery-worker
```

**When to use:**
- Code changes only
- Configuration updates
- Quick patches
- Hot fixes

---

### rollback.sh
**Purpose:** Rollback to previous deployment

**What it does:**
- Lists available backups
- Restores previous configuration
- Restarts services with old config

**Usage:**
```bash
# Interactive selection
./deployment/rollback.sh

# Specific backup
./deployment/rollback.sh 20241223_120000
```

**When to use:**
- Deployment issues
- Critical bugs in new version
- Emergency recovery

---

### health-check.sh
**Purpose:** Comprehensive health verification

**What it does:**
- Checks Docker service
- Verifies container status
- Monitors disk and memory
- Tests database connectivity
- Tests Redis connectivity
- Checks HTTP endpoints
- Scans logs for errors

**Usage:**
```bash
# Standard check
./deployment/health-check.sh

# Detailed output
./deployment/health-check.sh --verbose
```

**When to use:**
- After deployment
- Regular monitoring
- Troubleshooting
- Incident investigation

---

## Deployment Workflow

### First Time Deployment

```bash
# 1. Setup VPS (one time only)
./deployment/setup-vps.sh

# 2. Configure environment
nano .env.production  # Update all values

# 3. Deploy application
./deployment/deploy.sh

# 4. Verify deployment
./deployment/health-check.sh
```

### Regular Updates

```bash
# Code changes only
./deployment/update.sh

# Major updates
./deployment/deploy.sh

# After update verification
./deployment/health-check.sh
```

### Emergency Rollback

```bash
# Rollback to previous version
./deployment/rollback.sh

# Verify rollback
./deployment/health-check.sh --verbose
```

---

## Configuration

All scripts use these configuration values (at the top of each script):

```bash
VPS_HOST="46.224.33.191"
VPS_USER="root"
VPS_PATH="/opt/onquota"
BACKUP_DIR="/opt/onquota/backups"
```

To modify for different environment, edit these values in each script.

---

## Prerequisites

### Local Machine
- SSH access to VPS
- rsync installed
- Bash 4.0+

### VPS
- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- Internet connectivity

---

## Backups

### Automatic Backups

The `deploy.sh` script automatically creates backups before each deployment:

**Backup includes:**
- .env.production file
- Docker Compose configuration state
- Timestamp for identification

**Backup location:** `/opt/onquota/backups/`

**Retention:** Last 5 backups (older ones auto-deleted)

### Manual Backups

To create manual backups:

```bash
ssh root@46.224.33.191 << 'EOF'
BACKUP_DIR="/opt/onquota/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup environment
cp /opt/onquota/.env.production ${BACKUP_DIR}/env_${TIMESTAMP}

# Backup database
pg_dump -h localhost -U onquota_user onquota_db | gzip > ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz

echo "Manual backup created: ${TIMESTAMP}"
EOF
```

---

## Troubleshooting

### Script Fails - SSH Connection

**Error:** Cannot connect to VPS

**Solution:**
1. Verify SSH key is configured
2. Test manual SSH: `ssh root@46.224.33.191`
3. Check VPS is running
4. Verify firewall allows SSH (port 22)

### Script Fails - Permission Denied

**Error:** Permission denied when executing script

**Solution:**
```bash
chmod +x deployment/*.sh
```

### Deployment Hangs

**Error:** Script hangs during deployment

**Solution:**
1. Check VPS resources: `ssh root@46.224.33.191 'free -h && df -h'`
2. Review Docker logs: `ssh root@46.224.33.191 'docker logs onquota-backend'`
3. Kill stuck containers: `ssh root@46.224.33.191 'docker-compose -f /opt/onquota/docker-compose.production.yml down'`

### Health Check Fails

**Error:** Health check reports failures

**Solution:**
1. Run verbose check: `./deployment/health-check.sh --verbose`
2. Review specific error messages
3. Check service logs
4. Verify environment configuration

---

## Security Notes

### SSH Access
- Use SSH keys (not passwords)
- Disable root password login
- Configure SSH on non-standard port (optional)

### Script Security
- Scripts don't store passwords
- All credentials in .env.production
- Backups include sensitive data - secure them
- Never commit .env.production to git

### Network Security
- Scripts use SSH (encrypted)
- rsync uses SSH tunnel
- No plain-text credential transmission

---

## Advanced Usage

### Custom Deployment

Modify `deploy.sh` for custom workflows:

```bash
# Example: Run database migrations after deployment
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
  cd /opt/onquota
  docker exec onquota-backend alembic upgrade head
ENDSSH
```

### Multiple Environments

To deploy to staging:

```bash
# Update variables at top of script
VPS_HOST="staging.example.com"
VPS_PATH="/opt/onquota-staging"

# Or use environment variables
export VPS_HOST="staging.example.com"
./deployment/deploy.sh
```

### Parallel Deployments

Deploy to multiple servers:

```bash
# Create wrapper script
for server in server1 server2 server3; do
  VPS_HOST=$server ./deployment/deploy.sh &
done
wait
```

---

## Monitoring

### After Deployment

Always run health check:
```bash
./deployment/health-check.sh --verbose
```

### Continuous Monitoring

Setup cron job for regular health checks:

```bash
# On local machine
# Add to crontab: crontab -e
*/15 * * * * /path/to/deployment/health-check.sh > /var/log/onquota-health.log 2>&1
```

### Alerting

Combine with alerting systems:

```bash
#!/bin/bash
./deployment/health-check.sh
if [ $? -ne 0 ]; then
  # Send alert (email, Slack, etc.)
  echo "Health check failed" | mail -s "OnQuota Alert" admin@example.com
fi
```

---

## Best Practices

1. **Always backup before deployment**
   - Automated in deploy.sh
   - Create manual backups for major changes

2. **Test in staging first**
   - Use separate VPS for staging
   - Test deployment process

3. **Monitor after deployment**
   - Run health check immediately
   - Watch logs for 10-15 minutes
   - Check resource usage

4. **Use version control**
   - Tag releases in git
   - Document changes
   - Keep deployment notes

5. **Keep backups offsite**
   - Download critical backups locally
   - Use backup storage service
   - Test restore procedure

6. **Review logs regularly**
   - Check deployment logs
   - Monitor application logs
   - Set up log aggregation

---

## Quick Reference

### Common Commands

```bash
# Deploy
./deployment/deploy.sh

# Quick update
./deployment/update.sh

# Health check
./deployment/health-check.sh

# Rollback
./deployment/rollback.sh

# VPS access
ssh root@46.224.33.191

# View logs
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'
```

### File Locations

```
Local:
  deployment/          - Scripts directory
  .env.production      - Environment config

VPS:
  /opt/onquota/                - Application root
  /opt/onquota/backups/        - Backup storage
  /opt/onquota/backend/logs/   - Application logs
```

---

## Support

For detailed documentation:
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Complete guide
- [QUICK_START.md](../QUICK_START.md) - Quick start
- [OPERATIONS.md](../OPERATIONS.md) - Operations manual
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) - Checklists

For issues:
1. Review script output
2. Check logs: `./deployment/health-check.sh --verbose`
3. Review troubleshooting section
4. Contact DevOps team

---

**Version:** 1.0.0
**Last Updated:** 2024-12-23
