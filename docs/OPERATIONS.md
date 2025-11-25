# OnQuota Operations Guide

Complete guide for operating, monitoring, and maintaining the OnQuota platform.

## Table of Contents

1. [Monitoring & Dashboards](#monitoring--dashboards)
2. [Backups & Recovery](#backups--recovery)
3. [Health Checks](#health-checks)
4. [Scaling & Performance](#scaling--performance)
5. [Troubleshooting](#troubleshooting)
6. [Disaster Recovery](#disaster-recovery)
7. [Security Operations](#security-operations)
8. [Maintenance Windows](#maintenance-windows)

---

## Monitoring & Dashboards

### Access Monitoring Tools

| Tool | URL | Default Credentials | Purpose |
|------|-----|-------------------|---------|
| Grafana | http://localhost:3001 | admin/admin | Dashboards and visualization |
| Prometheus | http://localhost:9090 | None | Metrics storage and queries |
| AlertManager | http://localhost:9093 | None | Alert routing and management |
| Flower | http://localhost:5555 | None | Celery task monitoring |

### Key Dashboards

1. **Application Dashboard** (`application-dashboard.json`)
   - Request rate (requests/sec)
   - Response times (p50, p95, p99)
   - Error rates (4xx, 5xx)
   - Active users
   - Slowest endpoints

2. **Database Dashboard** (`database-dashboard.json`)
   - Connection pool usage
   - Query duration percentiles
   - Slow queries (>1s)
   - Table and index sizes
   - Replication lag (if applicable)

3. **System Dashboard** (`system-dashboard.json`)
   - CPU usage by host/container
   - Memory utilization
   - Disk I/O and usage
   - Network traffic
   - Container status

4. **Celery Dashboard** (`celery-dashboard.json`)
   - Active workers
   - Task throughput
   - Task failure rate
   - Queue depth
   - Worker memory/CPU usage

### Metric Collection

**Scrape Configuration:**
- FastAPI backend: `/metrics` endpoint (15s interval)
- PostgreSQL: Via postgres_exporter (15s interval)
- Redis: Via redis_exporter (15s interval)
- System: Via node_exporter (15s interval)
- Containers: Via cAdvisor (15s interval)

**Retention Policy:**
- Prometheus: 30 days of raw data
- Grafana: 1 year (aggregated to 1h)

---

## Backups & Recovery

### Automated Backup Schedule

Backups are triggered via cron jobs in the backup container:

```bash
# PostgreSQL backups - Every 6 hours
0 2,8,14,20 * * * /scripts/backup/backup-postgres.sh

# Redis backups - Every 4 hours
0 1,5,9,13,17,21 * * * /scripts/backup/backup-redis.sh

# Backup verification - Daily at 3 AM
0 3 * * * /scripts/backup/verify-backups.sh

# Database maintenance - Weekly Sunday 4 AM
0 4 * * 0 /scripts/backup/database-maintenance.sh
```

### Manual Backup Operations

#### PostgreSQL Backup

**Full backup:**
```bash
docker exec onquota_backup /scripts/backup/backup-postgres.sh
```

**Verify backup:**
```bash
docker exec onquota_backup /scripts/backup/verify-backups.sh
```

**List recent backups:**
```bash
docker exec onquota_backup ls -lh /backups/postgres/ | head -10
```

#### Redis Backup

**Manual backup:**
```bash
docker exec onquota_backup /scripts/backup/backup-redis.sh
```

**List backups:**
```bash
docker exec onquota_backup ls -lh /backups/redis/ | head -10
```

### Restore Operations

#### PostgreSQL Restore

**From local backup:**
```bash
# Validate before restoring
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  /backups/postgres/onquota_backup_20231114_120000.sql.gz \
  --validate-only

# Perform restore (with confirmation)
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  /backups/postgres/onquota_backup_20231114_120000.sql.gz
```

**From S3 backup:**
```bash
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  s3://my-bucket/backups/onquota_backup_20231114_120000.sql.gz \
  --force
```

**Skip confirmation (automated):**
```bash
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  /backups/postgres/onquota_backup_20231114_120000.sql.gz \
  --force \
  --no-backup
```

#### Redis Restore

**From local backup:**
```bash
# Validate backup
docker exec onquota_backup /scripts/restore/restore-redis.sh \
  /backups/redis/onquota_redis_backup_20231114_120000.rdb.gz \
  --validate-only

# Restore database
docker exec onquota_backup /scripts/restore/restore-redis.sh \
  /backups/redis/onquota_redis_backup_20231114_120000.rdb.gz \
  --force \
  --flush-first
```

### Backup Storage

**Local Storage:**
- Location: `/backups/postgres/` and `/backups/redis/`
- Retention: 30 days
- Size monitoring: Check via `df /backups/`

**S3 Backup (Optional):**
- Requires: `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` env vars
- Structure: `s3://bucket/postgres-backups/YYYY/MM/DD/` and `s3://bucket/redis-backups/YYYY/MM/DD/`
- Encryption: AES256 (server-side)

**Backup Integrity:**
- MD5 checksums stored with `.md5` extension
- Verify with: `md5sum -c backup_file.sql.gz.md5`

---

## Health Checks

### Application Health Endpoints

```bash
# Basic health check (pod running)
curl http://localhost:8000/health

# Readiness check (dependencies available)
curl http://localhost:8000/health/ready

# Liveness check (app functioning)
curl http://localhost:8000/health/live
```

### Service Health Commands

**PostgreSQL:**
```bash
docker exec onquota_postgres pg_isready -U onquota_user -d onquota_db
```

**Redis:**
```bash
docker exec onquota_redis redis-cli ping
```

**Backend:**
```bash
docker exec onquota_backend curl -s http://localhost:8000/health | jq .
```

**All services:**
```bash
docker-compose ps
```

### Connection Testing

**Database connection:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db -c "SELECT version();"
```

**Redis connection:**
```bash
docker exec onquota_redis redis-cli INFO stats
```

**Backend connectivity:**
```bash
docker exec onquota_backend curl -s http://postgres:5432 # Should fail with timeout
docker exec onquota_backend redis-cli -h redis ping
```

---

## Scaling & Performance

### Horizontal Scaling

#### Backend Scaling

**Increase worker replicas:**
```bash
docker-compose up -d --scale backend=3
```

**In Kubernetes (future):**
```bash
kubectl scale deployment backend --replicas=3
```

#### Celery Worker Scaling

**Add more workers:**
```bash
docker-compose up -d --scale celery_worker=4
```

**Adjust concurrency:**
```bash
# In docker-compose.yml, modify the command:
command: celery -A core.celery worker --loglevel=info --concurrency=8
```

### Database Optimization

**Run maintenance tasks:**
```bash
# Light maintenance (production-safe)
docker exec onquota_backup \
  MAINTENANCE_LEVEL=light /scripts/backup/database-maintenance.sh

# Standard maintenance (requires brief downtime)
docker exec onquota_backup \
  MAINTENANCE_LEVEL=standard /scripts/backup/database-maintenance.sh

# Heavy maintenance (requires scheduled downtime)
docker exec onquota_backup \
  MAINTENANCE_LEVEL=heavy /scripts/backup/database-maintenance.sh
```

**Check slow queries:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements \
      ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Connection Pool Tuning

**Check current connections:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

**Adjust pool size in backend .env:**
```bash
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40
```

### Memory Management

**Check container memory:**
```bash
docker stats onquota_backend onquota_postgres onquota_redis
```

**Set memory limits (docker-compose.yml):**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

---

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms:** Container exits immediately

**Diagnosis:**
```bash
docker logs onquota_backend
docker logs onquota_postgres
docker-compose ps
```

**Solutions:**
- Check .env file configuration
- Verify port availability: `netstat -an | grep 8000`
- Review disk space: `df -h`
- Check logs for specific errors

#### 2. Database Connection Failures

**Symptoms:** "Cannot connect to database" errors

**Check PostgreSQL:**
```bash
docker exec onquota_postgres pg_isready
docker logs onquota_postgres
```

**Verify connection string:**
```bash
docker exec onquota_backend python -c \
  "from sqlalchemy import create_engine; \
   engine = create_engine('$DATABASE_URL'); \
   engine.connect()"
```

**Check network:**
```bash
docker exec onquota_backend ping postgres
docker network inspect onquota_network
```

**Solution:**
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Or full reset (destructive)
docker-compose down -v
docker-compose up -d postgres
```

#### 3. High Memory Usage

**Symptoms:** OOM killer events, slow performance

**Check memory:**
```bash
docker stats --no-stream
docker exec onquota_postgres \
  psql -U onquota_user -d onquota_db \
  -c "SELECT * FROM pg_stat_activity;"
```

**Solutions:**
- Restart application: `docker-compose restart backend`
- Check for memory leaks in logs
- Reduce connection pool size
- Increase available memory or add swap

#### 4. High CPU Usage

**Symptoms:** Slow requests, CPU at 100%

**Find hot queries:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT query, calls, mean_exec_time, max_exec_time FROM pg_stat_statements \
      WHERE query NOT LIKE '%pg_stat_statements%' \
      ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**
- Run EXPLAIN ANALYZE on slow queries
- Add missing indexes
- Optimize application queries
- Scale horizontally

#### 5. Backup Failures

**Symptoms:** Backup script exits with errors

**Check backup logs:**
```bash
docker exec onquota_backup cat /var/log/backup.log
docker exec onquota_backup cat /var/log/backup-verify.log
```

**Verify storage:**
```bash
docker exec onquota_backup df -h /backups
docker exec onquota_backup ls -lh /backups/postgres/
```

**Test backup:**
```bash
docker exec onquota_backup /scripts/backup/backup-postgres.sh
docker exec onquota_backup /scripts/backup/verify-backups.sh
```

#### 6. Celery Task Queue Buildup

**Symptoms:** Tasks not processing, queue depth increasing

**Check queue depth:**
```bash
# Via Flower UI
open http://localhost:5555

# Via Redis CLI
docker exec onquota_redis redis-cli LLEN celery
```

**Check workers:**
```bash
docker-compose ps | grep celery
docker logs onquota_celery_worker
```

**Restart workers:**
```bash
docker-compose restart celery_worker celery_beat
```

**Flush queue (destructive):**
```bash
docker exec onquota_redis redis-cli FLUSHDB
```

#### 7. Prometheus/Grafana Issues

**Symptoms:** Metrics not showing, empty graphs

**Check Prometheus targets:**
```bash
# Via web UI
open http://localhost:9090/targets

# Check scrape errors
curl http://localhost:9090/api/v1/targets?state=down
```

**Reload Prometheus config:**
```bash
curl -X POST http://localhost:9090/-/reload
```

**Check service metrics endpoint:**
```bash
curl http://localhost:8000/metrics
curl http://localhost:9187/metrics  # postgres-exporter
curl http://localhost:9121/metrics  # redis-exporter
```

### Debug Commands Reference

**Container inspection:**
```bash
docker inspect onquota_backend
docker logs -f --tail=100 onquota_backend
docker exec onquota_backend sh
```

**Network debugging:**
```bash
docker network ls
docker network inspect onquota_network
docker exec onquota_backend nslookup postgres
```

**Resource monitoring:**
```bash
docker stats --no-stream
docker events --since 1h
```

**Database inspection:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db
# Then in psql:
\dt              # List tables
\du              # List users
\l               # List databases
SELECT count(*) FROM table_name;
```

---

## Disaster Recovery

### Recovery Procedures

#### Complete Database Loss

1. **Restore from latest backup:**
```bash
/scripts/restore/restore-postgres.sh /backups/postgres/latest_backup.sql.gz
```

2. **Verify data integrity:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
```

3. **Run application migrations (if needed):**
```bash
docker exec onquota_backend alembic upgrade head
```

#### Complete Redis Loss

1. **Restore from backup:**
```bash
/scripts/restore/restore-redis.sh /backups/redis/latest_backup.rdb.gz --force
```

2. **Verify cache population:**
```bash
docker exec onquota_redis redis-cli DBSIZE
```

3. **Restart dependent services:**
```bash
docker-compose restart backend celery_worker
```

#### Single Container Corruption

**Restart container:**
```bash
docker-compose restart <service-name>
```

**Rebuild from scratch:**
```bash
docker-compose rm -f <service-name>
docker-compose up -d <service-name>
```

### RTO/RPO Targets

| Component | RTO | RPO | Strategy |
|-----------|-----|-----|----------|
| Database | 1 hour | 6 hours | Automated backups every 6 hours |
| Redis Cache | 30 minutes | 4 hours | Automated backups every 4 hours |
| Application | 15 minutes | N/A | Container restart |
| Configuration | 30 minutes | Real-time | Git version control |

---

## Security Operations

### Access Control

**Container access:**
```bash
# Require authentication for sensitive operations
docker exec --user postgres onquota_postgres psql ...
```

**Network isolation:**
```bash
docker network inspect onquota_network
# Verify only necessary containers are connected
```

### Credential Management

**Never commit secrets:**
```bash
# Bad: credentials in code
DATABASE_URL=postgresql://user:password@host/db

# Good: use environment variables
source /etc/onquota/.env.prod
docker-compose up
```

**Environment variables:**
- Store in `/etc/onquota/.env` (not git)
- Rotate credentials regularly
- Use AWS Secrets Manager or HashiCorp Vault for production

### Audit Logging

**Enable PostgreSQL logging:**
```sql
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();
```

**View audit logs:**
```bash
docker exec onquota_postgres tail -f /var/log/postgresql/postgresql.log
```

### Regular Security Tasks

- [ ] Review access logs weekly
- [ ] Rotate secrets monthly
- [ ] Update Docker images weekly
- [ ] Run security scans on push (automated via GitHub Actions)
- [ ] Audit database permissions monthly
- [ ] Review backup encryption status

---

## Maintenance Windows

### Planned Maintenance

**Schedule:** Sunday 2-4 AM UTC (lowest traffic)

**Pre-maintenance:**
```bash
# Notify users
# Create backup
docker exec onquota_backup /scripts/backup/backup-postgres.sh
docker exec onquota_backup /scripts/backup/backup-redis.sh

# Verify backups
docker exec onquota_backup /scripts/backup/verify-backups.sh
```

**During maintenance:**
```bash
# Optional: Enable maintenance mode
export MAINTENANCE_MODE=true
docker-compose up -d backend

# Or stop services
docker-compose down
# Perform operations (upgrades, migrations, etc.)
docker-compose up -d
```

**Post-maintenance:**
```bash
# Run smoke tests
curl http://localhost:8000/health
curl http://localhost:3000/

# Verify data integrity
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM users;"

# Check monitoring
open http://localhost:3001
```

### Database Maintenance

**Weekly (Sunday 4 AM):**
- VACUUM ANALYZE
- Reindex tables
- Check for bloat

**Monthly:**
- CLUSTER tables (if bloat > 20%)
- Analyze query performance
- Review slow query logs

**Commands:**
```bash
# Light maintenance (production-safe)
docker exec onquota_backup \
  MAINTENANCE_LEVEL=light /scripts/backup/database-maintenance.sh

# Heavy maintenance (requires downtime)
docker exec onquota_backup \
  MAINTENANCE_LEVEL=heavy /scripts/backup/database-maintenance.sh
```

---

## Reference

### Important Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service definitions |
| `.env` | Environment variables (not in git) |
| `monitoring/prometheus/prometheus.yml` | Metrics scraping config |
| `monitoring/alertmanager/alertmanager.yml` | Alert routing rules |
| `scripts/backup/*` | Backup and restore scripts |
| `docs/OPERATIONS.md` | This document |

### Useful Commands Quick Reference

```bash
# Status and logs
docker-compose ps
docker-compose logs -f <service>

# Restart services
docker-compose restart
docker-compose restart <service>

# Database access
docker exec onquota_postgres psql -U onquota_user -d onquota_db

# Redis access
docker exec onquota_redis redis-cli

# Backup operations
docker exec onquota_backup /scripts/backup/backup-postgres.sh
docker exec onquota_backup /scripts/restore/restore-postgres.sh <file>

# Monitoring
open http://localhost:3001  # Grafana
open http://localhost:9090  # Prometheus
open http://localhost:9093  # AlertManager
open http://localhost:5555  # Flower

# Check metrics
curl http://localhost:8000/metrics
```

### Support & Escalation

| Issue | Owner | Escalation |
|-------|-------|-----------|
| Application errors | Backend team | DevOps lead |
| Database issues | DBA / DevOps | Infrastructure team |
| Infrastructure | DevOps | Cloud provider support |
| Security incidents | Security team | CISO |

---

**Last Updated:** 2025-11-14
**Version:** 1.0.0
