# OnQuota - Deployment Documentation Index

Complete guide to all deployment resources and documentation.

## Quick Navigation

### Getting Started
1. **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** - Start here! Executive summary
2. **[QUICK_START.md](QUICK_START.md)** - 30-minute deployment guide
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Pre-flight checklist

### Detailed Guides
4. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment documentation
5. **[OPERATIONS.md](OPERATIONS.md)** - Daily operations and maintenance
6. **[deployment/README.md](deployment/README.md)** - Deployment scripts guide

---

## Documentation Structure

```
OnQuota/
├── DEPLOYMENT_INDEX.md          ← You are here
├── DEPLOYMENT_SUMMARY.md        ← Executive summary
├── DEPLOYMENT_GUIDE.md          ← Complete guide (comprehensive)
├── QUICK_START.md               ← Fast deployment (30 min)
├── OPERATIONS.md                ← Daily operations
├── DEPLOYMENT_CHECKLIST.md      ← Checklists
│
├── .env.production              ← Production config (SECURE THIS!)
├── docker-compose.production.yml← Production orchestration
│
├── deployment/                  ← Deployment scripts
│   ├── README.md                ← Scripts documentation
│   ├── setup-vps.sh             ← Initial VPS setup
│   ├── deploy.sh                ← Full deployment
│   ├── update.sh                ← Quick updates
│   ├── rollback.sh              ← Rollback deployment
│   └── health-check.sh          ← Health verification
│
├── backend/
│   └── Dockerfile.production    ← Backend container
│
├── frontend/
│   ├── Dockerfile.production    ← Frontend container
│   ├── next.config.js           ← Next.js config (updated)
│   └── app/api/health/route.ts  ← Health endpoint
│
├── caddy/
│   └── Caddyfile                ← Reverse proxy + SSL
│
└── monitoring/
    └── prometheus/
        └── prometheus.yml       ← Metrics collection
```

---

## Choose Your Path

### I want to deploy NOW (30 minutes)
→ Read: [QUICK_START.md](QUICK_START.md)

**Steps:**
1. Setup VPS
2. Configure .env.production
3. Run deploy script
4. Verify deployment
5. Access application

---

### I want to understand everything first
→ Read: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**Contains:**
- Complete architecture overview
- Detailed deployment steps
- Security best practices
- Troubleshooting guide
- Backup and recovery
- Monitoring setup

---

### I need to operate the deployed system
→ Read: [OPERATIONS.md](OPERATIONS.md)

**Contains:**
- Daily operations
- Monitoring procedures
- Maintenance tasks
- Troubleshooting playbook
- Emergency procedures
- Useful commands

---

### I want a checklist to follow
→ Read: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

**Contains:**
- Pre-deployment checklist
- Deployment checklist
- Security checklist
- Post-deployment checklist
- Go-live checklist

---

### I want to understand the deployment scripts
→ Read: [deployment/README.md](deployment/README.md)

**Contains:**
- Script documentation
- Usage examples
- Configuration
- Troubleshooting
- Advanced usage

---

## File Reference

### Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `.env.production` | Production environment variables | **MUST UPDATE** |
| `docker-compose.production.yml` | Service orchestration | Ready |
| `caddy/Caddyfile` | Reverse proxy + SSL config | Ready |
| `monitoring/prometheus/prometheus.yml` | Metrics collection | Ready |
| `backend/Dockerfile.production` | Backend container | Ready |
| `frontend/Dockerfile.production` | Frontend container | Ready |
| `frontend/next.config.js` | Next.js configuration | Updated |

### Deployment Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-vps.sh` | Initial VPS setup | First time only |
| `deploy.sh` | Full deployment | Major updates, first deploy |
| `update.sh` | Quick update | Code changes, minor updates |
| `rollback.sh` | Rollback deployment | Errors, emergencies |
| `health-check.sh` | Health verification | After deployment, monitoring |

### Documentation Files

| File | Audience | Time to Read |
|------|----------|--------------|
| `DEPLOYMENT_SUMMARY.md` | Everyone | 10 min |
| `QUICK_START.md` | Deployers | 5 min + 30 min doing |
| `DEPLOYMENT_GUIDE.md` | DevOps/Admins | 30 min |
| `OPERATIONS.md` | Operators/SRE | 20 min |
| `DEPLOYMENT_CHECKLIST.md` | Deployers | Reference |
| `deployment/README.md` | Script users | 10 min |

---

## Deployment Phases

### Phase 1: Preparation (15 minutes)
- [ ] Read [QUICK_START.md](QUICK_START.md)
- [ ] Review [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- [ ] Generate secure passwords
- [ ] Update `.env.production`

### Phase 2: Initial Setup (10 minutes)
- [ ] Run `./deployment/setup-vps.sh`
- [ ] Verify Docker installed
- [ ] Verify firewall configured

### Phase 3: Deployment (15 minutes)
- [ ] Run `./deployment/deploy.sh`
- [ ] Monitor build process
- [ ] Wait for services to start

### Phase 4: Verification (10 minutes)
- [ ] Run `./deployment/health-check.sh`
- [ ] Test application access
- [ ] Review logs
- [ ] Test core functionality

### Phase 5: Post-Deployment (10 minutes)
- [ ] Configure monitoring (optional)
- [ ] Setup domain SSL (if applicable)
- [ ] Create manual backup
- [ ] Document deployment

**Total Time:** ~60 minutes (30 with [QUICK_START.md](QUICK_START.md))

---

## Key Concepts

### Architecture
```
Users → Caddy (SSL) → Frontend/Backend → Redis/PostgreSQL
                          ↓
                      Celery Workers
```

### Services
- **Caddy**: Reverse proxy, automatic SSL
- **Frontend**: Next.js (standalone mode)
- **Backend**: FastAPI + Uvicorn
- **Redis**: Cache + message broker
- **Celery**: Background tasks
- **PostgreSQL**: External database (already configured)

### Deployment Flow
```
Local Machine → rsync → VPS → Docker Build → Deploy → Health Check
```

### Network
- External: Port 80 (HTTP), 443 (HTTPS)
- Internal: Docker network (onquota-network)
- Database: External PostgreSQL (46.224.33.191:5432)

---

## Important Endpoints

### Production URLs
- **Application**: http://46.224.33.191 (or https://yourdomain.com)
- **Health Check**: http://46.224.33.191/health
- **Backend API**: http://46.224.33.191/api/v1/
- **Flower**: http://46.224.33.191/flower (optional)
- **Grafana**: http://46.224.33.191/grafana (optional)

### VPS Access
- **SSH**: `ssh root@46.224.33.191`
- **Project Path**: `/opt/onquota`
- **Backups**: `/opt/onquota/backups`
- **Logs**: `/opt/onquota/backend/logs`

### Database
- **Host**: 46.224.33.191
- **Port**: 5432
- **Database**: onquota_db
- **User**: onquota_user
- **Tables**: 36 (ready)

---

## Common Tasks

### Deploy for First Time
```bash
./deployment/setup-vps.sh     # One time
nano .env.production          # Configure
./deployment/deploy.sh        # Deploy
./deployment/health-check.sh  # Verify
```

### Update Application
```bash
# Quick update (code changes)
./deployment/update.sh

# Full update (dependencies changed)
./deployment/deploy.sh
```

### Check Health
```bash
./deployment/health-check.sh --verbose
```

### View Logs
```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'
```

### Restart Services
```bash
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'
```

### Rollback
```bash
./deployment/rollback.sh
```

---

## Security Checklist

Before deploying, ensure:

- [ ] `.env.production` has strong passwords
- [ ] `SECRET_KEY` is random and unique
- [ ] `TOTP_ENCRYPTION_KEY` is generated properly
- [ ] `REDIS_PASSWORD` is strong
- [ ] All monitoring passwords are strong
- [ ] `.env.production` has permissions 600
- [ ] `.env.production` is in .gitignore
- [ ] Firewall configured (only ports 22, 80, 443, 5432)
- [ ] CORS configured for your domain
- [ ] API docs disabled in production

---

## Monitoring Checklist

After deploying:

- [ ] All containers running
- [ ] Frontend accessible
- [ ] Backend API responding
- [ ] Database connected
- [ ] Redis connected
- [ ] Celery workers processing
- [ ] SSL certificate obtained (if domain)
- [ ] No errors in logs
- [ ] Disk space OK
- [ ] Memory usage OK

---

## Troubleshooting Quick Reference

| Problem | Solution | Documentation |
|---------|----------|---------------|
| Can't SSH to VPS | Check SSH key, verify VPS running | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting) |
| Container won't start | Check logs, verify config | [OPERATIONS.md](OPERATIONS.md#troubleshooting) |
| Database error | Verify DATABASE_URL, test connection | [OPERATIONS.md](OPERATIONS.md#database-issues) |
| SSL not working | Wait 2-3 min, check DNS, check Caddy logs | [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#ssl-certificate-issues) |
| Health check fails | Run verbose mode, check specific failures | [OPERATIONS.md](OPERATIONS.md#health-check-fails) |
| Out of disk space | Clean Docker, remove old logs/backups | [OPERATIONS.md](OPERATIONS.md#out-of-disk-space) |

---

## Support Resources

### Documentation (in order of importance)
1. [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Overview
2. [QUICK_START.md](QUICK_START.md) - Fast deployment
3. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete guide
4. [OPERATIONS.md](OPERATIONS.md) - Daily operations
5. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Checklists
6. [deployment/README.md](deployment/README.md) - Scripts

### Quick Commands
```bash
# Health check
./deployment/health-check.sh

# SSH to VPS
ssh root@46.224.33.191

# View all logs
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'

# Emergency restart
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'
```

---

## Next Steps

### For First-Time Deployers
1. Read [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) (10 min)
2. Follow [QUICK_START.md](QUICK_START.md) (30 min)
3. Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) as reference
4. Review [OPERATIONS.md](OPERATIONS.md) for daily tasks

### For Experienced DevOps
1. Review [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
2. Skim [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
3. Run `./deployment/deploy.sh`
4. Bookmark [OPERATIONS.md](OPERATIONS.md)

### For Ongoing Operations
1. Use [OPERATIONS.md](OPERATIONS.md) as primary reference
2. Run regular health checks
3. Monitor logs
4. Follow maintenance schedule

---

## Version Information

**Created:** 2024-12-23
**Version:** 1.0.0
**Target:** Hetzner VPS (46.224.33.191)
**Status:** Production Ready

---

## Need Help?

1. **Check the docs** - They're comprehensive!
2. **Run health check** - `./deployment/health-check.sh --verbose`
3. **Check logs** - Most issues show up in logs
4. **Review checklist** - Make sure you didn't miss a step
5. **Contact DevOps** - If all else fails

---

**Remember:**
- Start with [QUICK_START.md](QUICK_START.md) for fastest deployment
- Use [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) to ensure nothing is missed
- Refer to [OPERATIONS.md](OPERATIONS.md) for daily operations
- Keep [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) handy for detailed info

**Good luck with your deployment! 🚀**
