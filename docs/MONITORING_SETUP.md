# OnQuota Monitoring Setup Guide

Complete guide for configuring and managing the Prometheus + Grafana monitoring stack.

## Overview

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage (30-day retention)
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notification
- **Exporters**: Metrics exporters for PostgreSQL, Redis, Node, cAdvisor
- **Flower**: Celery task monitoring

## Quick Start

### Access Monitoring Tools

```bash
# Grafana (main dashboards)
open http://localhost:3001
# Default credentials: admin/admin

# Prometheus (raw metrics & queries)
open http://localhost:9090

# AlertManager (alert management)
open http://localhost:9093

# Flower (Celery monitoring)
open http://localhost:5555
```

## Configuration Files

### Prometheus Configuration

**Location:** `monitoring/prometheus/prometheus.yml`

**Key components:**
- Global settings (scrape interval, evaluation interval)
- Scrape configs for each job
- Alert manager endpoints
- Rule file locations

**Modify scrape interval:**
```yaml
global:
  scrape_interval: 15s    # Change as needed
  evaluation_interval: 15s
```

**Add new scrape job:**
```yaml
scrape_configs:
  - job_name: 'custom-service'
    static_configs:
      - targets: ['localhost:9999']
```

**Reload Prometheus config (no downtime):**
```bash
curl -X POST http://localhost:9090/-/reload
```

### Alert Rules

**Location:** `monitoring/prometheus/alerts/`

**Files:**
- `application.yml` - FastAPI and application-level alerts
- `infrastructure.yml` - Database, system, and infrastructure alerts
- `celery.yml` - Celery worker and task alerts

**Alert structure:**
```yaml
groups:
  - name: my_alerts
    interval: 30s
    rules:
      - alert: AlertName
        expr: prometheus_query > threshold
        for: duration
        labels:
          severity: critical
        annotations:
          summary: "Alert summary"
          description: "Alert details"
          runbook: "https://docs.example.com/runbooks/..."
```

**Reload alert rules:**
```bash
curl -X POST http://localhost:9090/-/reload
```

### AlertManager Configuration

**Location:** `monitoring/alertmanager/alertmanager.yml`

**Configuration sections:**

1. **Global settings:**
```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'your-webhook-url'  # Optional
```

2. **Routing rules:**
```yaml
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
```

3. **Receivers (notification destinations):**
```yaml
receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://backend:8000/api/v1/webhooks/alerts'

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@example.com'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
```

**Reload AlertManager config:**
```bash
curl -X POST http://localhost:9093/-/reload
```

## Exporters

### PostgreSQL Exporter

**Metrics endpoint:** http://localhost:9187/metrics

**Key metrics:**
- `pg_stat_database_numbackends` - Active connections
- `pg_stat_user_tables_n_live_tup` - Row counts
- `pg_stat_statements_*` - Query performance

**Verify connection:**
```bash
curl http://localhost:9187/metrics | grep pg_up
```

### Redis Exporter

**Metrics endpoint:** http://localhost:9121/metrics

**Key metrics:**
- `redis_memory_used_bytes` - Memory usage
- `redis_connected_clients` - Active connections
- `redis_keyspace_keys_total` - Key count

**Verify connection:**
```bash
curl http://localhost:9121/metrics | grep redis_up
```

### Node Exporter

**Metrics endpoint:** http://localhost:9100/metrics

**Key metrics:**
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Available memory
- `node_filesystem_avail_bytes` - Disk space

### cAdvisor

**Metrics endpoint:** http://localhost:8080/metrics

**Key metrics:**
- `container_cpu_usage_seconds_total` - Container CPU
- `container_memory_usage_bytes` - Container memory
- `container_network_receive_bytes` - Network I/O

## Grafana Dashboards

### Dashboard Locations

All dashboards are auto-provisioned from `monitoring/grafana/provisioning/dashboards/json/`:

- `application-dashboard.json` - App performance metrics
- `database-dashboard.json` - PostgreSQL metrics
- `system-dashboard.json` - System and container metrics
- `celery-dashboard.json` - Celery task monitoring

### Create Custom Dashboard

1. **Via Grafana UI:**
   - Open Grafana (http://localhost:3001)
   - Go to Dashboards > New Dashboard
   - Add panels with PromQL queries
   - Save dashboard

2. **Export and version control:**
```bash
# Export from UI: Dashboard settings > JSON Model
# Save to: monitoring/grafana/provisioning/dashboards/json/custom.json

# Then update dashboard provisioning:
# monitoring/grafana/provisioning/dashboards/dashboards.yml
```

### Common Grafana Queries (PromQL)

**Request rate (requests/sec):**
```promql
rate(http_requests_total[5m])
```

**Error rate (%):**
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

**Response time p95:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Database connections:**
```promql
pg_stat_database_numbackends
```

**Redis memory usage (%):**
```promql
(redis_memory_used_bytes / redis_memory_max_bytes) * 100
```

**CPU usage (%):**
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Disk usage (%):**
```promql
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```

## Alerting Rules

### SLO Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | 1% | 5% |
| Response Time P95 | 1s | 5s |
| Database Connections | 70% | 90% |
| CPU Usage | 70% | 85% |
| Memory Usage | 75% | 90% |
| Disk Usage | 75% | 90% |
| Redis Memory | 80% | 95% |

### Alert Testing

**Test alert firing:**
```bash
# In Prometheus UI, create temp alert
# http://localhost:9090/alerts

# Example: Check if query returns data
curl 'http://localhost:9090/api/v1/query?query=up'
```

**Verify AlertManager routing:**
```bash
# Check AlertManager status
curl http://localhost:9093/api/v1/alerts

# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '{
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "TestAlert",
          "severity": "critical"
        },
        "annotations": {
          "summary": "This is a test alert"
        }
      }
    ]
  }'
```

## Troubleshooting

### Metrics Not Showing in Prometheus

**Check target status:**
```bash
curl http://localhost:9090/api/v1/targets
# Look for: "health": "up" or "down"
```

**View scrape errors:**
```bash
curl http://localhost:9090/api/v1/targets?state=down | jq
```

**Debug exporter connectivity:**
```bash
# From Prometheus container
docker exec onquota_prometheus wget -O - http://postgres-exporter:9187/metrics | head

# Check network
docker network inspect onquota_network | grep Name
```

### Alerts Not Firing

**Check AlertManager:**
```bash
curl http://localhost:9093/api/v1/rules
```

**Verify rule syntax:**
```bash
# Prometheus UI
http://localhost:9090/graph
# Try your PromQL query
```

**Check alert evaluation:**
```bash
curl 'http://localhost:9090/api/v1/rules?type=alert'
```

### Grafana Dashboard Empty

**Check data source:**
1. Settings > Data Sources > Prometheus
2. Test connection
3. Verify Prometheus is accessible

**Verify metrics exist:**
```bash
# In Prometheus UI, query the metric
rate(http_requests_total[5m])
```

**Check dashboard JSON:**
- Ensure panel targets reference correct metrics
- Verify datasource name matches

### High Cardinality Issues

**Identify high cardinality metrics:**
```bash
# Prometheus TSDB stats
curl http://localhost:9090/api/v1/label/__name__/values | wc -l
```

**Reduce cardinality:**
- Use metric relabeling to drop high-cardinality labels
- Adjust scrape intervals
- Remove unnecessary exporters

## Performance Optimization

### Prometheus Storage

**Current settings:**
- Retention: 30 days
- Scrape interval: 15 seconds
- Storage: Time-series database (TSDB)

**Optimize retention:**
```yaml
# In docker-compose.yml
command:
  - '--storage.tsdb.retention.time=15d'  # Reduce to 15 days
  - '--storage.tsdb.retention.size=10GB'  # Or size-based
```

**Optimize scrape interval:**
```yaml
# In prometheus.yml - increase for less critical jobs
global:
  scrape_interval: 30s  # Reduce from 15s

# Or per-job:
scrape_configs:
  - job_name: 'low-priority'
    scrape_interval: 60s
```

### Grafana Performance

**Optimize dashboards:**
- Reduce query complexity
- Use longer time ranges (1h, 1d instead of 5m)
- Set appropriate panel refresh rates
- Use alerting instead of real-time monitoring

**Enable caching:**
```yaml
# In grafana environment vars
GF_INSTALL_PLUGINS=grafana-piechart-panel
GF_SECURITY_ADMIN_PASSWORD=your-password
```

## Backup & Disaster Recovery

### Backup Monitoring Configuration

**Backup Prometheus config:**
```bash
docker exec onquota_prometheus tar czf /tmp/prometheus-config.tar.gz \
  /etc/prometheus/
docker cp onquota_prometheus:/tmp/prometheus-config.tar.gz ./
```

**Backup Grafana dashboards:**
```bash
docker exec onquota_grafana tar czf /tmp/grafana-dashboards.tar.gz \
  /var/lib/grafana/
docker cp onquota_grafana:/tmp/grafana-dashboards.tar.gz ./
```

### Restore Configuration

**Restore Prometheus:**
```bash
docker cp prometheus-config.tar.gz onquota_prometheus:/tmp/
docker exec onquota_prometheus tar xzf /tmp/prometheus-config.tar.gz -C /
docker-compose restart prometheus
```

**Restore Grafana:**
```bash
docker cp grafana-dashboards.tar.gz onquota_grafana:/tmp/
docker exec onquota_grafana tar xzf /tmp/grafana-dashboards.tar.gz -C /
docker-compose restart grafana
```

## Advanced Configuration

### Custom Metrics from Application

**Expose custom metrics from FastAPI:**
```python
from prometheus_client import Counter, Histogram

custom_requests = Counter('custom_requests_total', 'Total requests')
request_duration = Histogram('custom_request_duration_seconds', 'Request duration')

@app.get('/api/endpoint')
async def my_endpoint():
    custom_requests.inc()
    # ... do work ...
    return response
```

### Service Discovery (Advanced)

**DNS-based service discovery:**
```yaml
scrape_configs:
  - job_name: 'kubernetes'
    dns_sd_configs:
      - names: ['_prometheus._tcp.example.com']
```

### Recording Rules

**Pre-compute expensive queries:**
```yaml
groups:
  - name: recording_rules
    interval: 15s
    rules:
      - record: job:request_rate:5m
        expr: sum(rate(http_requests_total[5m])) by (job)
```

## Integration with External Systems

### Send Alerts to Slack

**Configure in AlertManager:**
```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

### Send Alerts to Email

**Configure SMTP:**
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'
  smtp_from: 'alerts@example.com'

receivers:
  - name: 'email'
    email_configs:
      - to: 'oncall@example.com'
```

### Webhook Integration

**Send to custom backend:**
```yaml
receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'http://backend:8000/api/v1/webhooks/alerts'
        send_resolved: true
```

---

## Reference

### Useful PromQL Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `rate()` | Per-second rate | `rate(requests_total[5m])` |
| `increase()` | Total increase | `increase(errors_total[1h])` |
| `histogram_quantile()` | Percentile | `histogram_quantile(0.95, duration_bucket)` |
| `sum()` | Sum metrics | `sum(memory_usage_bytes)` |
| `avg()` | Average | `avg(cpu_usage)` |
| `topk()` | Top N | `topk(5, memory_usage_bytes)` |

### Documentation Links

- [Prometheus Docs](https://prometheus.io/docs/)
- [PromQL Docs](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Docs](https://grafana.com/docs/)
- [AlertManager Docs](https://prometheus.io/docs/alerting/alertmanager/)

---

**Last Updated:** 2025-11-14
**Version:** 1.0.0
