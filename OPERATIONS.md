# OnQuota - Operations Playbook

Daily operations, maintenance tasks, and troubleshooting commands.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring](#monitoring)
3. [Maintenance Tasks](#maintenance-tasks)
4. [Troubleshooting](#troubleshooting)
5. [Emergency Procedures](#emergency-procedures)

---

## Daily Operations

### Check System Health

```bash
# Quick health check
./deployment/health-check.sh

# Detailed health check
./deployment/health-check.sh --verbose

# Check running containers
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml ps'

# Check resource usage
ssh root@46.224.33.191 'docker stats --no-stream'
```

### View Logs

```bash
# All services (live tail)
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'

# Specific service
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f backend'
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f frontend'
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f celery-worker'

# Last 100 lines
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs --tail=100'

# Filter for errors
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs | grep -i error'
```

### Restart Services

```bash
# Restart all services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'

# Restart specific service
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart backend'
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart frontend'
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart celery-worker'

# Graceful restart (zero downtime)
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d --no-deps --build backend'
```

---

## Monitoring

### Container Metrics

```bash
# Real-time stats
ssh root@46.224.33.191 'docker stats'

# Single snapshot
ssh root@46.224.33.191 'docker stats --no-stream'

# Specific container
ssh root@46.224.33.191 'docker stats onquota-backend --no-stream'

# Container processes
ssh root@46.224.33.191 'docker top onquota-backend'
```

### System Resources

```bash
# Disk usage
ssh root@46.224.33.191 'df -h'

# Memory usage
ssh root@46.224.33.191 'free -h'

# CPU usage
ssh root@46.224.33.191 'top -bn1 | head -20'

# Running processes
ssh root@46.224.33.191 'ps aux | grep -E "docker|python|node"'
```

### Application Metrics

```bash
# Access Flower (Celery monitoring)
# http://46.224.33.191/flower
# Credentials from .env.production

# Access Grafana (if monitoring enabled)
# http://46.224.33.191/grafana
# Credentials from .env.production

# Check Redis memory
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD INFO memory'

# Check Redis keys
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD DBSIZE'
```

### Database Monitoring

```bash
# Check database size
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "SELECT pg_database_size(current_database())/1024/1024 as size_mb;"'

# Active connections
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "SELECT count(*) FROM pg_stat_activity;"'

# Slow queries
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "SELECT query, state, wait_event FROM pg_stat_activity WHERE state = '\''active'\'';"'

# Table sizes
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'\''.'\''||tablename)) AS size FROM pg_tables WHERE schemaname = '\''public'\'' ORDER BY pg_total_relation_size(schemaname||'\''.'\''||tablename) DESC LIMIT 10;"'
```

### Network Monitoring

```bash
# Active connections
ssh root@46.224.33.191 'netstat -tunlp'

# Check specific ports
ssh root@46.224.33.191 'netstat -tlnp | grep -E ":(80|443|8000|3000|6379|5432)"'

# Firewall status
ssh root@46.224.33.191 'ufw status verbose'

# Docker network
ssh root@46.224.33.191 'docker network ls'
ssh root@46.224.33.191 'docker network inspect onquota-network'
```

---

## Maintenance Tasks

### Update Application

```bash
# Quick update (no rebuild)
./deployment/update.sh

# Full deployment (with rebuild)
./deployment/deploy.sh

# Update specific service
./deployment/update.sh backend
./deployment/update.sh frontend
```

### Database Maintenance

```bash
# Run migrations
ssh root@46.224.33.191 'docker exec onquota-backend alembic upgrade head'

# Create migration
ssh root@46.224.33.191 'docker exec onquota-backend alembic revision --autogenerate -m "description"'

# Rollback migration
ssh root@46.224.33.191 'docker exec onquota-backend alembic downgrade -1'

# Vacuum database
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "VACUUM ANALYZE;"'

# Reindex
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "REINDEX DATABASE onquota_db;"'
```

### Cache Management

```bash
# Clear all cache
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD FLUSHALL'

# Clear specific database
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD FLUSHDB'

# Get cache stats
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD INFO stats'

# List all keys (be careful in production)
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD KEYS "*"'
```

### Log Management

```bash
# Rotate Docker logs (already configured in docker-compose)
# Max size: 10MB, Max files: 3

# View log file sizes
ssh root@46.224.33.191 'du -sh /var/lib/docker/containers/*/*-json.log'

# Clear old logs manually (if needed)
ssh root@46.224.33.191 'truncate -s 0 /opt/onquota/backend/logs/*.log'

# Archive old logs
ssh root@46.224.33.191 'tar -czf /opt/onquota/backups/logs_$(date +%Y%m%d).tar.gz /opt/onquota/backend/logs/*.log'
```

### Docker Cleanup

```bash
# Remove unused images
ssh root@46.224.33.191 'docker image prune -a -f'

# Remove unused volumes
ssh root@46.224.33.191 'docker volume prune -f'

# Remove unused networks
ssh root@46.224.33.191 'docker network prune -f'

# Complete cleanup
ssh root@46.224.33.191 'docker system prune -a -f --volumes'

# Check disk usage by Docker
ssh root@46.224.33.191 'docker system df'
```

### Backup Operations

```bash
# Create manual backup
ssh root@46.224.33.191 << 'EOF'
BACKUP_DIR="/opt/onquota/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup environment
cp /opt/onquota/.env.production ${BACKUP_DIR}/env_${TIMESTAMP}

# Backup database
pg_dump -h localhost -U onquota_user onquota_db | gzip > ${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz

# Backup uploads
tar -czf ${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz /opt/onquota/uploads/

echo "Backup completed: ${TIMESTAMP}"
EOF

# List backups
ssh root@46.224.33.191 'ls -lh /opt/onquota/backups/'

# Download backup to local
scp root@46.224.33.191:/opt/onquota/backups/db_*.sql.gz ./local-backups/

# Restore from backup
./deployment/rollback.sh
```

---

## Troubleshooting

### Container Issues

```bash
# Container won't start
ssh root@46.224.33.191 'docker logs onquota-backend'
ssh root@46.224.33.191 'docker inspect onquota-backend'

# Container keeps restarting
ssh root@46.224.33.191 'docker-compose -f /opt/onquota/docker-compose.production.yml ps'
ssh root@46.224.33.191 'docker logs --tail=100 onquota-backend'

# Container high CPU/Memory
ssh root@46.224.33.191 'docker stats onquota-backend --no-stream'
ssh root@46.224.33.191 'docker top onquota-backend'

# Enter container for debugging
ssh root@46.224.33.191 'docker exec -it onquota-backend bash'
ssh root@46.224.33.191 'docker exec -it onquota-frontend sh'
```

### Database Issues

```bash
# Can't connect to database
ssh root@46.224.33.191 'psql -h 46.224.33.191 -U onquota_user -d onquota_db'

# Check database is running
ssh root@46.224.33.191 'systemctl status postgresql'

# Check PostgreSQL logs
ssh root@46.224.33.191 'tail -100 /var/log/postgresql/postgresql-*.log'

# Test from container
ssh root@46.224.33.191 'docker exec onquota-backend python -c "from sqlalchemy import create_engine; import os; engine = create_engine(os.getenv(\"DATABASE_URL\")); print(engine.connect())"'
```

### Network Issues

```bash
# Can't access application
curl -v http://46.224.33.191/

# Check if ports are open
ssh root@46.224.33.191 'netstat -tlnp | grep -E ":(80|443)"'

# Check firewall
ssh root@46.224.33.191 'ufw status'

# Test internal connectivity
ssh root@46.224.33.191 'docker exec onquota-frontend curl backend:8000/health'
ssh root@46.224.33.191 'docker exec onquota-backend curl frontend:3000/'

# Check DNS (if using domain)
nslookup yourdomain.com
dig yourdomain.com
```

### SSL/HTTPS Issues

```bash
# Check Caddy logs
ssh root@46.224.33.191 'docker logs onquota-caddy'

# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check Let's Encrypt rate limits
# https://letsencrypt.org/docs/rate-limits/

# Force SSL renewal (Caddy does this automatically)
ssh root@46.224.33.191 'docker exec onquota-caddy caddy reload --config /etc/caddy/Caddyfile'
```

### Performance Issues

```bash
# Check slow queries
ssh root@46.224.33.191 'psql -h localhost -U onquota_user -d onquota_db -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = '\''active'\'' AND query_start < NOW() - INTERVAL '\''5 seconds'\'';"'

# Check backend response time
curl -o /dev/null -s -w "Total time: %{time_total}s\n" http://46.224.33.191/api/v1/health

# Check memory usage
ssh root@46.224.33.191 'free -h'

# Check disk I/O
ssh root@46.224.33.191 'iostat -x 1 5'

# Clear cache to free memory
ssh root@46.224.33.191 'sync; echo 3 > /proc/sys/vm/drop_caches'
```

### Application Errors

```bash
# Check backend errors
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs backend | grep -i "error\|exception\|traceback" | tail -50'

# Check frontend errors
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs frontend | grep -i "error\|exception" | tail -50'

# Check Celery errors
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs celery-worker | grep -i "error\|failed" | tail -50'

# Check application logs
ssh root@46.224.33.191 'tail -100 /opt/onquota/backend/logs/app.log'
```

---

## Emergency Procedures

### Complete Service Restart

```bash
# Stop all services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml down'

# Wait a moment
sleep 5

# Start all services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d'

# Verify
./deployment/health-check.sh
```

### Emergency Rollback

```bash
# List available backups
ssh root@46.224.33.191 'ls -lh /opt/onquota/backups/ | grep backup_'

# Rollback to specific backup
./deployment/rollback.sh TIMESTAMP

# Or interactive
./deployment/rollback.sh
```

### Service Down - Quick Fix

```bash
# If backend is down
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d --force-recreate backend'

# If frontend is down
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d --force-recreate frontend'

# If Redis is down
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml up -d --force-recreate redis'
```

### Database Emergency

```bash
# Stop all services accessing database
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml stop backend celery-worker celery-beat'

# Create emergency backup
ssh root@46.224.33.191 'pg_dump -h localhost -U onquota_user onquota_db | gzip > /opt/onquota/backups/emergency_db_$(date +%Y%m%d_%H%M%S).sql.gz'

# Restart services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml start backend celery-worker celery-beat'
```

### Out of Disk Space

```bash
# Check disk usage
ssh root@46.224.33.191 'df -h'

# Clean Docker resources
ssh root@46.224.33.191 'docker system prune -a -f --volumes'

# Remove old logs
ssh root@46.224.33.191 'find /var/log -type f -name "*.log" -mtime +30 -delete'

# Remove old backups (keep last 5)
ssh root@46.224.33.191 'cd /opt/onquota/backups && ls -t backup_* | tail -n +6 | xargs rm -f'

# Archive old database dumps
ssh root@46.224.33.191 'find /opt/onquota/backups -name "*.sql" -mtime +7 -exec gzip {} \;'
```

### High Memory Usage

```bash
# Check what's using memory
ssh root@46.224.33.191 'ps aux --sort=-%mem | head -20'

# Restart heavy services
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart backend celery-worker'

# Clear Redis cache
ssh root@46.224.33.191 'docker exec onquota-redis redis-cli --pass YOUR_PASSWORD FLUSHALL'

# Restart all if needed
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'
```

---

## Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# OnQuota shortcuts
alias onq-ssh='ssh root@46.224.33.191'
alias onq-logs='ssh root@46.224.33.191 "cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f"'
alias onq-ps='ssh root@46.224.33.191 "cd /opt/onquota && docker-compose -f docker-compose.production.yml ps"'
alias onq-restart='ssh root@46.224.33.191 "cd /opt/onquota && docker-compose -f docker-compose.production.yml restart"'
alias onq-health='./deployment/health-check.sh'
alias onq-deploy='./deployment/deploy.sh'
```

---

## Monitoring Checklist

Daily:
- [ ] Check application is accessible
- [ ] Review error logs
- [ ] Check disk space
- [ ] Verify backups exist

Weekly:
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Review Celery task queue
- [ ] Update system packages

Monthly:
- [ ] Rotate credentials
- [ ] Review access logs
- [ ] Performance optimization
- [ ] Security audit

---

For more detailed information, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
