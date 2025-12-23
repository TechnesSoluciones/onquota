# OnQuota - Deployment Checklist

Complete checklist for production deployment to Hetzner VPS.

## Pre-Deployment Checklist

### Infrastructure

- [ ] VPS provisioned (46.224.33.191)
- [ ] SSH access configured
- [ ] PostgreSQL database running and accessible
- [ ] Database credentials verified
- [ ] Domain DNS configured (optional)
- [ ] Firewall rules reviewed

### Local Setup

- [ ] Project cloned locally
- [ ] All deployment scripts have execute permissions
- [ ] SSH key configured for passwordless access
- [ ] rsync installed
- [ ] Required tools installed (docker, docker-compose)

### Configuration

- [ ] `.env.production` file created from example
- [ ] All placeholder values updated
- [ ] SECRET_KEY generated (32+ characters)
- [ ] TOTP_ENCRYPTION_KEY generated (Fernet key)
- [ ] REDIS_PASSWORD generated (strong password)
- [ ] FLOWER_PASSWORD set
- [ ] GRAFANA_ADMIN_PASSWORD set
- [ ] DOMAIN or IP configured
- [ ] CORS_ORIGINS configured correctly
- [ ] DATABASE_URL verified
- [ ] File permissions set (`chmod 600 .env.production`)
- [ ] File added to .gitignore

## Deployment Checklist

### Initial VPS Setup

- [ ] Run `./deployment/setup-vps.sh`
- [ ] Docker installed successfully
- [ ] Docker Compose installed successfully
- [ ] Firewall configured (ports 22, 80, 443, 5432)
- [ ] System optimizations applied
- [ ] Application directories created

### First Deployment

- [ ] Review docker-compose.production.yml
- [ ] Review Caddyfile configuration
- [ ] Run `./deployment/deploy.sh`
- [ ] Build completed without errors
- [ ] All containers started successfully
- [ ] Health checks passed

### Verification

- [ ] Frontend accessible (http://YOUR_IP/)
- [ ] Backend API responding (http://YOUR_IP/api/v1/health)
- [ ] SSL certificate obtained (if using domain)
- [ ] HTTPS redirect working (if using domain)
- [ ] No errors in logs
- [ ] All containers running: `docker-compose ps`
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Celery workers processing tasks

### Post-Deployment

- [ ] Run health check: `./deployment/health-check.sh`
- [ ] Test user registration
- [ ] Test user login
- [ ] Test core functionality
- [ ] Verify email notifications (if configured)
- [ ] Check Celery tasks in Flower
- [ ] Review resource usage
- [ ] Create first manual backup

## Security Checklist

### Credentials

- [ ] All default passwords changed
- [ ] Strong passwords used (16+ characters)
- [ ] SECRET_KEY is unique and random
- [ ] Database password is strong
- [ ] Redis password is strong
- [ ] Flower password is strong
- [ ] Grafana password is strong
- [ ] No credentials in git repository
- [ ] .env.production in .gitignore

### Network Security

- [ ] Firewall enabled and configured
- [ ] Only necessary ports open (22, 80, 443, 5432)
- [ ] SSH key authentication enabled
- [ ] SSH password authentication disabled (recommended)
- [ ] PostgreSQL only accessible from VPS
- [ ] Redis only accessible internally
- [ ] Services bound to localhost where appropriate

### Application Security

- [ ] CORS properly configured
- [ ] API docs disabled in production
- [ ] Debug mode disabled
- [ ] HTTPS enforced (if using domain)
- [ ] Security headers enabled (via Caddy)
- [ ] HSTS enabled
- [ ] Content Security Policy configured
- [ ] Rate limiting enabled

### Container Security

- [ ] All containers run as non-root users
- [ ] Resource limits configured
- [ ] Health checks enabled
- [ ] Restart policies set
- [ ] Log rotation configured
- [ ] Secrets not in Dockerfiles

## Monitoring Checklist

### Basic Monitoring

- [ ] Container health checks configured
- [ ] Docker logs configured and rotating
- [ ] Application logs directory created
- [ ] Disk space monitoring setup
- [ ] Memory usage monitored

### Optional Monitoring Stack

- [ ] Prometheus enabled (optional)
- [ ] Grafana enabled (optional)
- [ ] Flower enabled for Celery
- [ ] Metrics endpoints accessible
- [ ] Dashboards configured

## Backup Checklist

### Automated Backups

- [ ] Deployment script creates backups
- [ ] Backup directory exists: `/opt/onquota/backups/`
- [ ] Backup retention configured (last 5)
- [ ] .env.production backed up on each deployment

### Manual Backups

- [ ] Database backup tested
- [ ] Uploads backup tested
- [ ] Configuration backup tested
- [ ] Backup restoration tested
- [ ] Backup download to local tested

### Backup Schedule

- [ ] Daily database backups configured (optional)
- [ ] Weekly full system backups (optional)
- [ ] Offsite backup storage configured (optional)
- [ ] Backup monitoring/alerting (optional)

## Maintenance Checklist

### Regular Tasks

- [ ] Daily: Check application accessibility
- [ ] Daily: Review error logs
- [ ] Daily: Check disk space
- [ ] Weekly: Review performance metrics
- [ ] Weekly: Update system packages
- [ ] Monthly: Rotate credentials
- [ ] Monthly: Review security settings
- [ ] Quarterly: Performance optimization

### Documentation

- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] OPERATIONS.md reviewed
- [ ] QUICK_START.md reviewed
- [ ] Team trained on deployment process
- [ ] Incident response plan documented
- [ ] Contact information documented

## Testing Checklist

### Smoke Tests

- [ ] Homepage loads
- [ ] User can register
- [ ] User can login
- [ ] User can logout
- [ ] API endpoints respond
- [ ] Database queries work
- [ ] File uploads work
- [ ] Celery tasks process

### Integration Tests

- [ ] Frontend-Backend communication
- [ ] Authentication flow
- [ ] Authorization checks
- [ ] Database transactions
- [ ] Cache functionality
- [ ] Background tasks
- [ ] Email notifications (if configured)

### Performance Tests

- [ ] Page load times acceptable
- [ ] API response times acceptable
- [ ] Database query performance
- [ ] Resource usage within limits
- [ ] Concurrent users handling

### Security Tests

- [ ] HTTPS working (if domain)
- [ ] CORS configured correctly
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection

## Rollback Checklist

### Preparation

- [ ] Backup created before deployment
- [ ] Backup timestamp noted
- [ ] Rollback script tested
- [ ] Team aware of rollback procedure

### Rollback Execution

- [ ] Stop current services
- [ ] Restore .env.production from backup
- [ ] Restore database (if needed)
- [ ] Restart services
- [ ] Verify rollback successful
- [ ] Document incident

## Troubleshooting Checklist

### Container Issues

- [ ] Check container logs: `docker logs [container]`
- [ ] Check container status: `docker ps -a`
- [ ] Verify environment variables
- [ ] Check resource constraints
- [ ] Review health check configuration

### Database Issues

- [ ] Test database connection
- [ ] Check database credentials
- [ ] Verify network connectivity
- [ ] Review PostgreSQL logs
- [ ] Check disk space

### Network Issues

- [ ] Test port accessibility
- [ ] Check firewall rules
- [ ] Verify DNS resolution (if domain)
- [ ] Test internal connectivity
- [ ] Review Caddy logs

### Performance Issues

- [ ] Check resource usage (CPU, memory, disk)
- [ ] Review slow queries
- [ ] Clear cache
- [ ] Restart services
- [ ] Scale resources if needed

## Go-Live Checklist

### Final Verification

- [ ] All previous checklists completed
- [ ] Production URL accessible
- [ ] SSL certificate valid (if domain)
- [ ] All features working
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Backups working
- [ ] Monitoring active
- [ ] Documentation complete
- [ ] Team briefed

### Communication

- [ ] Stakeholders notified
- [ ] Users notified (if applicable)
- [ ] Support team ready
- [ ] Monitoring team ready
- [ ] Escalation path defined

### Post-Launch

- [ ] Monitor for first 24 hours
- [ ] Review logs daily for first week
- [ ] Collect user feedback
- [ ] Performance monitoring
- [ ] Incident response ready
- [ ] Document lessons learned

---

## Emergency Contacts

```
DevOps Lead: [Name/Contact]
Database Admin: [Name/Contact]
Security Team: [Name/Contact]
VPS Provider: Hetzner Support
```

## Important URLs

```
Production URL: http://46.224.33.191 (or https://yourdomain.com)
Flower: http://46.224.33.191/flower
Grafana: http://46.224.33.191/grafana
Repository: [Git URL]
Documentation: /DEPLOYMENT_GUIDE.md
```

## Quick Commands

```bash
# SSH to VPS
ssh root@46.224.33.191

# View logs
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml logs -f'

# Restart all
ssh root@46.224.33.191 'cd /opt/onquota && docker-compose -f docker-compose.production.yml restart'

# Health check
./deployment/health-check.sh

# Rollback
./deployment/rollback.sh
```

---

**Last Updated:** 2024-12-23
**Deployment Version:** 1.0.0
**Reviewed By:** _____________
**Approved By:** _____________
