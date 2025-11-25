# OnQuota - Validation Checklist

Complete checklist to validate the observability, backup, and CI/CD implementation.

## Infrastructure Validation

### Docker Compose Services

```bash
# Command to check
docker-compose ps
```

**Expected Output:**
```
NAME                  STATUS              PORTS
onquota_postgres      Up (healthy)        5432
onquota_redis         Up (healthy)        6379
onquota_backend       Up (healthy)        8000
onquota_celery_*      Up                  -
onquota_flower        Up                  5555
onquota_frontend      Up                  3000
onquota_prometheus    Up                  9090
onquota_grafana       Up                  3001
onquota_alertmanager  Up                  9093
onquota_postgres-exporter  Up             9187
onquota_redis-exporter    Up              9121
onquota_node-exporter     Up              9100
onquota_cadvisor         Up               8080
onquota_backup           Up               -
```

**Validation:** [ ] All services running and healthy

---

## Monitoring Stack Validation

### 1. Prometheus

**Check endpoint:**
```bash
curl -s http://localhost:9090/-/healthy
# Expected: plain text "Prometheus is healthy."
```

**Check targets:**
```bash
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
# Expected: 8-9 targets (prometheus, backend, postgres, redis, celery, node-exporter, cadvisor, postgres-exporter, redis-exporter)
```

**Validation Steps:**
```bash
# 1. Verify all targets are UP
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
# All should show "health": "up"

# 2. Test a simple query
curl -s 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result | length'
# Should return data

# 3. Check alert rules loaded
curl -s http://localhost:9090/api/v1/rules?type=alert | jq '.data | length'
# Should show > 0 alert groups
```

**Validation:**
- [ ] Prometheus responding
- [ ] All targets UP
- [ ] Metrics being scraped
- [ ] Alert rules loaded

### 2. Grafana

**Access and verify:**
```bash
# Check health
curl -u admin:admin http://localhost:3001/api/health

# Get datasources
curl -u admin:admin http://localhost:3001/api/datasources | jq '.[] | {name: .name, type: .type}'
# Should show Prometheus datasource
```

**Manual verification:**
- [ ] Grafana accessible at http://localhost:3001
- [ ] Login works (admin/admin)
- [ ] Prometheus datasource configured
- [ ] Dashboards visible:
  - [ ] Application Dashboard
  - [ ] Database Dashboard
  - [ ] System Dashboard
  - [ ] Celery Dashboard

**Dashboard validation:**
```bash
curl -u admin:admin http://localhost:3001/api/dashboards/db/application-dashboard | jq '.dashboard.title'
```

**Validation:**
- [ ] All dashboards loading
- [ ] Metrics visible in panels
- [ ] No "No data" messages

### 3. AlertManager

**Check alerts:**
```bash
# Get active alerts
curl -s http://localhost:9093/api/v1/alerts | jq '.data | length'

# Check routes
curl -s http://localhost:9093/api/v1/alerts/groups | jq '.data | length'
```

**Validation:**
- [ ] AlertManager accessible at http://localhost:9093
- [ ] Configuration loaded
- [ ] Can create test alert (see Operations guide)

### 4. Exporters

**PostgreSQL Exporter:**
```bash
curl -s http://localhost:9187/metrics | grep pg_up
# Expected: pg_up{} 1
```

**Redis Exporter:**
```bash
curl -s http://localhost:9121/metrics | grep redis_up
# Expected: redis_up 1
```

**Node Exporter:**
```bash
curl -s http://localhost:9100/metrics | grep node_cpu_seconds_total | head -1
# Should return metric
```

**cAdvisor:**
```bash
curl -s http://localhost:8080/metrics | grep container_memory_usage_bytes | head -1
# Should return metric
```

**Validation:**
- [ ] PostgreSQL exporter UP
- [ ] Redis exporter UP
- [ ] Node exporter metrics available
- [ ] cAdvisor metrics available

### 5. Flower (Celery Monitoring)

**Access:**
```bash
curl -s http://localhost:5555/ | grep -q "Flower"
# Expected: success (0)
```

**Validation:**
- [ ] Flower accessible at http://localhost:5555
- [ ] Shows active workers
- [ ] Task stats visible

---

## Backup & Restore Validation

### 1. PostgreSQL Backups

**Manual backup test:**
```bash
docker exec onquota_backup /scripts/backup/backup-postgres.sh
# Should complete without errors
```

**Verify backup file:**
```bash
docker exec onquota_backup ls -lh /backups/postgres/ | head -5
# Should show recent backup files with .sql.gz extension
```

**Check backup integrity:**
```bash
docker exec onquota_backup /scripts/backup/verify-backups.sh
# Should show "Backup verification completed successfully"
```

**Test restore (optional, requires downtime):**
```bash
# Backup current data
docker exec onquota_backup /scripts/backup/backup-postgres.sh

# Restore to verify
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  /backups/postgres/<latest-backup>.sql.gz \
  --validate-only
# Should validate successfully
```

**Validation:**
- [ ] Backup script runs without errors
- [ ] Backup files created with correct format
- [ ] Checksum files generated (.md5)
- [ ] Verification script passes
- [ ] Restore validation succeeds

### 2. Redis Backups

**Manual backup test:**
```bash
docker exec onquota_backup /scripts/backup/backup-redis.sh
# Should complete without errors
```

**Verify backup file:**
```bash
docker exec onquota_backup ls -lh /backups/redis/ | head -5
# Should show recent backup files with .rdb.gz extension
```

**Test restore validation:**
```bash
docker exec onquota_backup /scripts/restore/restore-redis.sh \
  /backups/redis/<latest-backup>.rdb.gz \
  --validate-only
# Should validate successfully
```

**Validation:**
- [ ] Redis backup script runs
- [ ] Backup files created
- [ ] Verification passes
- [ ] Restore validation succeeds

### 3. Backup Database Maintenance

**Run maintenance script:**
```bash
docker exec onquota_backup \
  MAINTENANCE_LEVEL=light /scripts/backup/database-maintenance.sh
# Should complete without errors
```

**Check for slow queries:**
```bash
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000;"
# Should return count (0 is ideal)
```

**Validation:**
- [ ] Maintenance script runs
- [ ] VACUUM ANALYZE completes
- [ ] No errors in logs

### 4. S3 Integration (optional)

**If configured:**
```bash
# Check S3 bucket access
aws s3 ls s3://${S3_BACKUP_BUCKET}/postgres-backups/
# Should list files if backups uploaded

# Verify latest backup in S3
aws s3api list-objects-v2 \
  --bucket ${S3_BACKUP_BUCKET} \
  --prefix "postgres-backups/" \
  --max-items 1
```

**Validation:**
- [ ] S3 bucket accessible
- [ ] Backups uploaded
- [ ] Encryption enabled (AES256)

---

## CI/CD Pipeline Validation

### 1. Backend Pipeline

**Check workflow file:**
```bash
cat .github/workflows/backend.yml | grep "^  - "
# Should show jobs: quality, security, test, build
```

**Expected flow:**
```
Quality Checks → Security Scan → Tests → Docker Build (main only)
   ↓ parallel  ↓ parallel     ↓ parallel  ↓ sequential
   15 min      15 min        30 min      45 min
```

**Manual trigger test:**
```bash
# Push to develop branch and check GitHub Actions
# Expected: Pipeline runs all 4 jobs in sequence/parallel

# Verify caching:
# Second run should be faster (cache hit)
```

**Validation:**
- [ ] Workflow syntax correct
- [ ] All jobs execute
- [ ] Caching working (2nd run faster)
- [ ] Artifacts uploaded
- [ ] Coverage to Codecov

### 2. Frontend Pipeline

**Check workflow:**
```bash
cat .github/workflows/frontend.yml | grep "^jobs:" -A 20
```

**Expected jobs:**
- quality
- security
- test
- build
- docker (main only)
- summary

**Validation:**
- [ ] Quality checks pass
- [ ] Security scan completes
- [ ] Tests pass with coverage
- [ ] Build succeeds
- [ ] Lighthouse report generated

### 3. Docker Pipeline

**Check for security scanning:**
```bash
cat .github/workflows/docker.yml | grep -i "trivy\|hadolint\|snyk"
# Should find security scanning tools
```

**Expected steps:**
1. Trivy vulnerability scan
2. Hadolint Dockerfile linting
3. Build backend
4. Build frontend
5. Docker Compose test
6. Push to registry (main only)

**Validation:**
- [ ] Security scanning configured
- [ ] Trivy SARIF reports generated
- [ ] Hadolint rules applied
- [ ] Docker Compose test runs
- [ ] Images push to registry

### 4. Pipeline Performance

**Measure execution time:**
```bash
# Check last run in GitHub Actions UI
# Should be:
# - Backend: 60-90 min total
# - Frontend: 60-90 min total
# - Docker: 45-60 min total
```

**Verify caching:**
```bash
# Look for cache hits in logs
# Expected: pip cache, npm cache, Docker layers cache
```

**Validation:**
- [ ] Backend pipeline < 90 min
- [ ] Frontend pipeline < 90 min
- [ ] Docker pipeline < 60 min
- [ ] Caching reducing times

---

## Application Health Validation

### 1. Health Endpoints

```bash
# Basic health (pod running)
curl http://localhost:8000/health
# Expected: {"status": "ok"}

# Readiness (dependencies available)
curl http://localhost:8000/health/ready
# Expected: {"status": "ready", "checks": {...}}

# Liveness (app functioning)
curl http://localhost:8000/health/live
# Expected: {"status": "alive"}
```

**Validation:**
- [ ] /health returns 200 OK
- [ ] /health/ready returns dependencies status
- [ ] /health/live returns app status

### 2. Database Connectivity

```bash
# Check connection
docker exec onquota_postgres pg_isready -U onquota_user -d onquota_db
# Expected: accepting connections

# Query test
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
# Should return a number
```

**Validation:**
- [ ] PostgreSQL accepting connections
- [ ] Tables accessible
- [ ] No connection pool exhaustion

### 3. Redis Connectivity

```bash
# Check connection
docker exec onquota_redis redis-cli ping
# Expected: PONG

# Info stats
docker exec onquota_redis redis-cli INFO stats | head -5
# Should show connected clients and processed commands
```

**Validation:**
- [ ] Redis responding
- [ ] Able to set/get keys
- [ ] Memory usage reasonable

### 4. Metrics Endpoint

```bash
# Check metrics endpoint
curl http://localhost:8000/metrics | head -20
# Should show Prometheus metrics

# Check for expected metrics
curl http://localhost:8000/metrics | grep -E "http_requests_total|http_request_duration_seconds" | head
# Should show request metrics
```

**Validation:**
- [ ] Metrics endpoint working
- [ ] HTTP metrics present
- [ ] Custom metrics available

---

## Configuration Validation

### 1. Environment Variables

```bash
# Check .env file exists (should be .gitignored)
ls -la .env
# File should exist and not in git

# Verify required vars
grep -E "^(DATABASE_URL|REDIS_URL|CELERY)" .env
# Should show database and Redis configuration
```

**Validation:**
- [ ] .env file exists
- [ ] .env in .gitignore
- [ ] Database URL configured
- [ ] Redis URL configured
- [ ] Celery broker URL configured

### 2. Docker Compose

```bash
# Validate docker-compose.yml syntax
docker-compose config > /dev/null
# Should complete without errors

# Check for required services
docker-compose config | grep -E "^services:" -A 30 | grep "^\s\w"
# Should list all services
```

**Validation:**
- [ ] docker-compose.yml valid syntax
- [ ] All services defined
- [ ] Volume definitions present
- [ ] Network configuration correct

### 3. Prometheus Configuration

```bash
# Check prometheus.yml syntax
docker exec onquota_prometheus \
  prometheus --config.file=/etc/prometheus/prometheus.yml --dry-run
# Should complete without errors
```

**Validation:**
- [ ] prometheus.yml syntax valid
- [ ] All scrape configs present
- [ ] Alert rules referenced
- [ ] AlertManager endpoint configured

---

## Disaster Recovery Validation

### 1. Backup Accessibility

```bash
# List available backups
docker exec onquota_backup ls -lh /backups/postgres/
docker exec onquota_backup ls -lh /backups/redis/

# Check backup disk usage
docker exec onquota_backup du -sh /backups/
# Should be reasonable size
```

**Validation:**
- [ ] Backups stored locally
- [ ] Multiple backup versions available
- [ ] Disk space adequate
- [ ] S3 backups available (if configured)

### 2. Restore Validation

```bash
# Test backup file integrity
docker exec onquota_backup /scripts/backup/verify-backups.sh
# Should validate all backups successfully
```

**Validation:**
- [ ] Backup checksum validation passes
- [ ] Recent backups available
- [ ] Restore scripts present and executable

### 3. Recovery Time Objective

**Estimate RTO for each component:**

| Component | Test Command | Expected RTO |
|-----------|--------------|--------------|
| Postgres | restore-postgres.sh | < 1 hour |
| Redis | restore-redis.sh | < 30 min |
| Application | docker-compose restart | < 5 min |
| Full Stack | docker-compose down && up | < 15 min |

---

## Performance Validation

### 1. Response Time

```bash
# Measure backend latency
time curl http://localhost:8000/health
# Should complete in < 100ms

# Load test (optional)
docker exec onquota_backend \
  locust -f /app/tests/locustfile.py \
  --host=http://localhost:8000 \
  --run-time=60 --no-web
```

**Validation:**
- [ ] Health endpoint < 100ms
- [ ] API endpoints < 500ms
- [ ] Database queries < 1 second

### 2. Resource Usage

```bash
# Check container resources
docker stats --no-stream

# Expected reasonable usage:
# - Backend: < 512MB RAM
# - PostgreSQL: < 512MB RAM
# - Redis: < 256MB RAM
# - Prometheus: < 512MB RAM
```

**Validation:**
- [ ] Memory usage under limits
- [ ] CPU not consistently maxed
- [ ] Disk I/O normal

### 3. Database Performance

```bash
# Check slow queries
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000;"
# Should be 0 (no slow queries)

# Check table sizes
docker exec onquota_postgres psql -U onquota_user -d onquota_db \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) \
      FROM pg_tables WHERE schemaname='public' \
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 5;"
```

**Validation:**
- [ ] No slow queries detected
- [ ] Table sizes reasonable
- [ ] Index usage optimal

---

## Final Sign-Off

### Pre-Production Checklist

- [ ] All monitoring services running
- [ ] All dashboards displaying metrics
- [ ] Alerts configured and tested
- [ ] Backup scripts tested successfully
- [ ] Restore procedures validated
- [ ] CI/CD pipelines green
- [ ] Health endpoints responding
- [ ] Application metrics flowing
- [ ] Documentation complete
- [ ] Team trained on operations

### Production Readiness

- [ ] Change management approval obtained
- [ ] Rollback procedure documented
- [ ] Communication plan in place
- [ ] Monitoring actively reviewed
- [ ] On-call rotation established
- [ ] Incident response procedure documented

---

## Quick Test Commands

```bash
# Run all validation in sequence
echo "=== Checking services ===" && docker-compose ps && \
echo "=== Checking Prometheus ===" && curl -s http://localhost:9090/-/healthy && \
echo "=== Checking Grafana ===" && curl -u admin:admin -s http://localhost:3001/api/health && \
echo "=== Checking Backend ===" && curl -s http://localhost:8000/health && \
echo "=== Checking Redis ===" && docker exec onquota_redis redis-cli ping && \
echo "=== Testing Backup ===" && docker exec onquota_backup /scripts/backup/backup-postgres.sh && \
echo "=== All validations passed ==="
```

---

**Last Updated:** 2025-11-14
**Version:** 1.0.0
**Status:** Ready for Validation
