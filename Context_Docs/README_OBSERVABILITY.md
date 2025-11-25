# OnQuota - Observabilidad, Backups y CI/CD

Guía de inicio rápido para la infraestructura completamente implementada de observabilidad, backups automatizados y pipeline CI/CD seguro.

## Inicio Rápido

### 1. Ver el Estado del Sistema

```bash
# Verificar todos los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f backend
```

### 2. Acceder al Monitoreo

| Herramienta | URL | Usuario | Contraseña |
|------------|-----|--------|-----------|
| Grafana | http://localhost:3001 | admin | admin |
| Prometheus | http://localhost:9090 | - | - |
| AlertManager | http://localhost:9093 | - | - |
| Flower (Celery) | http://localhost:5555 | - | - |

### 3. Crear Backup Manual

```bash
# PostgreSQL
docker exec onquota_backup /scripts/backup/backup-postgres.sh

# Redis
docker exec onquota_backup /scripts/backup/backup-redis.sh

# Verificar integridad
docker exec onquota_backup /scripts/backup/verify-backups.sh
```

### 4. Ver Pipelines CI/CD

```bash
# GitHub Actions
git push  # Trigger pipeline

# Ver estado
open https://github.com/your-org/OnQuota/actions
```

---

## Documentación Completa

### Documentos Principales

1. **[OPERATIONS.md](docs/OPERATIONS.md)** - Guía Operacional Completa
   - Acceso a herramientas
   - Procedimientos de backup/restore
   - Health checks
   - Troubleshooting detallado
   - Disaster recovery
   - RTO/RPO objetivos

2. **[MONITORING_SETUP.md](docs/MONITORING_SETUP.md)** - Configuración de Monitoreo
   - Prometheus, Grafana, AlertManager
   - Exporters y métricas
   - Dashboards custom
   - PromQL queries
   - Integración con Slack/email

3. **[IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Resumen de Implementación
   - Qué se implementó
   - Archivos creados
   - Configuración requerida
   - Próximos pasos

4. **[VALIDATION_CHECKLIST.md](docs/VALIDATION_CHECKLIST.md)** - Checklist de Validación
   - Validación de infraestructura
   - Validación de monitoreo
   - Validación de backups
   - Validación de CI/CD
   - Health checks

---

## Características Implementadas

### Observabilidad 360°

**Monitoreo Completo:**
- Prometheus: Recolección de métricas (30 días retention)
- Grafana: Dashboards visualización (4 dashboards pre-configurados)
- AlertManager: Enrutamiento de alertas
- Flower: Monitoreo de tareas Celery

**Exporters:**
- PostgreSQL: Conexiones, queries, tabla sizes
- Redis: Memoria, clientes, comandos
- Node: CPU, memoria, disco, I/O
- cAdvisor: Métricas de contenedores

**Alertas:**
- Application: Error rate, latency, request rate
- Infrastructure: DB connections, CPU/memory, disk space
- Celery: Worker status, task failures, queue depth

### Backups Automatizados

**PostgreSQL:**
- Frecuencia: Cada 6 horas (02:00, 08:00, 14:00, 20:00)
- Compresión: gzip
- Integridad: MD5 checksum
- Retención: 30 días
- S3: Optional upload

**Redis:**
- Frecuencia: Cada 4 horas
- Formato: RDB snapshot
- Verificación: Compression integrity
- S3: Optional upload

**Mantenimiento:**
- Verification: Diaria 3:00 AM
- Database maintenance: Semanal domingo 4:00 AM
- VACUUM/ANALYZE/REINDEX automático

**Scripts Incluidos:**
- `backup-postgres.sh` - Backup PostgreSQL
- `backup-redis.sh` - Backup Redis
- `restore-postgres.sh` - Restaurar PostgreSQL
- `restore-redis.sh` - Restaurar Redis
- `verify-backups.sh` - Verificar integridad
- `database-maintenance.sh` - Mantenimiento

### CI/CD Pipeline Optimizado

**Backend Pipeline:**
- Quality: Ruff, Black, isort, MyPy
- Security: Safety, Bandit, Semgrep
- Tests: pytest con 80% coverage
- Docker: Build y push a GHCR

**Frontend Pipeline:**
- Quality: ESLint, Prettier, TypeScript
- Security: npm audit, license check
- Tests: Jest con coverage
- Build: Next.js build + Lighthouse
- Docker: Build y push a GHCR

**Docker Pipeline:**
- Security: Trivy (vulnerability scan), Hadolint
- Build: Backend + Frontend
- Test: Docker Compose test
- Push: Registry solo en main

**Optimizaciones:**
- Concurrencia: Cancela runs obsoletas
- Caching: pip, npm, Docker layers
- Paralelización: Jobs independientes en paralelo
- Total time: 60-90 min (vs 300+ min sequencial)

---

## Estructura de Directorios

```
OnQuota/
├── .github/workflows/
│   ├── backend.yml              # Backend CI pipeline
│   ├── frontend.yml             # Frontend CI pipeline
│   └── docker.yml               # Docker build con seguridad
│
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml       # Configuración scrape
│   │   └── alerts/              # Reglas de alertas
│   ├── alertmanager/
│   │   └── alertmanager.yml     # Enrutamiento
│   └── grafana/
│       └── provisioning/        # Dashboards y datasources
│
├── scripts/
│   ├── backup/
│   │   ├── backup-postgres.sh
│   │   ├── backup-redis.sh
│   │   ├── verify-backups.sh
│   │   ├── database-maintenance.sh
│   │   └── crontab.txt
│   └── restore/
│       ├── restore-postgres.sh
│       └── restore-redis.sh
│
└── docs/
    ├── OPERATIONS.md
    ├── MONITORING_SETUP.md
    ├── IMPLEMENTATION_SUMMARY.md
    ├── VALIDATION_CHECKLIST.md
    └── README_OBSERVABILITY.md (este archivo)
```

---

## Cambios a `.env`

Agregar las siguientes variables (copy de `.env.example` si no existen):

```bash
# Opcional: AWS S3 para backups
S3_BACKUP_BUCKET=my-bucket-name
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1

# Grafana - CAMBIAR DEL DEFAULT
GRAFANA_ADMIN_PASSWORD=your-secure-password

# Opcional: Notificaciones
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_SERVICE_KEY=your-service-key
ALERT_EMAIL=oncall@example.com
```

---

## Flujos de Trabajo Comunes

### Monitorear el Sistema

```bash
# Abrir Grafana
open http://localhost:3001

# Ver dashboard de aplicación (request rate, latency, errors)
# Ver dashboard de base de datos (conexiones, queries)
# Ver dashboard de sistema (CPU, memoria, disco)
# Ver dashboard de Celery (workers, tasks)
```

### Crear Backup Manual

```bash
# PostgreSQL
docker exec onquota_backup /scripts/backup/backup-postgres.sh

# Redis
docker exec onquota_backup /scripts/backup/backup-redis.sh

# Verificar que todo está bien
docker exec onquota_backup /scripts/backup/verify-backups.sh
```

### Restaurar desde Backup

```bash
# Restaurar PostgreSQL
docker exec onquota_backup /scripts/restore/restore-postgres.sh \
  /backups/postgres/onquota_backup_YYYYMMDD_HHMMSS.sql.gz

# Restaurar Redis
docker exec onquota_backup /scripts/restore/restore-redis.sh \
  /backups/redis/onquota_redis_backup_YYYYMMDD_HHMMSS.rdb.gz \
  --force --flush-first
```

### Desplegar Cambios

```bash
# Push a main triggera todo el pipeline
git push origin main

# Ver estado en GitHub Actions
open https://github.com/your-org/OnQuota/actions

# Pipeline automáticamente:
# 1. Ejecuta tests
# 2. Scanea seguridad
# 3. Builds Docker images
# 4. Push a registry
```

### Troubleshoot Problemas

```bash
# Ver logs
docker-compose logs <service>

# Ver métricas en Prometheus
open http://localhost:9090

# Ejecutar comando en contenedor
docker exec <container> <command>

# Ver alert status
open http://localhost:9093
```

---

## Métricas Clave a Monitorear

### Application
- Request rate (requests/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Active users

### Database
- Connection pool usage (%)
- Query duration (ms)
- Slow queries (> 1s)
- Disk usage

### System
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network I/O

### Celery
- Active workers
- Tasks queued
- Task failure rate
- Worker memory/CPU

---

## Alertas Configuradas

### Críticas (Acción inmediata)
- Servicio DOWN
- Error rate > 5%
- Base de datos DOWN
- Redis DOWN
- Disk space < 10%

### Warning (Revisar en próximas horas)
- Error rate > 1%
- Latency p95 > 1s
- Connection pool > 80%
- CPU > 80%
- Memory > 85%
- Celery workers 0

### Info (Monitorear)
- High request rate
- Long-running tasks
- Table bloat detected

---

## SLO/SLI Targets

| Métrica | Target | Alertar si |
|---------|--------|-----------|
| Availability | 99.9% | < 99.9% |
| Error Rate | < 0.1% | > 1% |
| Latency P95 | < 200ms | > 1s |
| Latency P99 | < 500ms | > 5s |
| Backup Success | 100% | < 100% |
| RTO | < 1 hour | Breach detected |
| RPO | < 6 hours | Breach detected |

---

## Soporte & Recursos

### Documentación
- Ver [OPERATIONS.md](docs/OPERATIONS.md) para guía completa
- Ver [MONITORING_SETUP.md](docs/MONITORING_SETUP.md) para monitoreo
- Ver [VALIDATION_CHECKLIST.md](docs/VALIDATION_CHECKLIST.md) para validación

### Comandos Rápidos
```bash
# Estado de servicios
docker-compose ps

# Logs en tiempo real
docker-compose logs -f <service>

# Salud de aplicación
curl http://localhost:8000/health

# Métricas
curl http://localhost:8000/metrics

# Base de datos
docker exec onquota_postgres psql -U onquota_user -d onquota_db

# Redis
docker exec onquota_redis redis-cli

# Backup manual
docker exec onquota_backup /scripts/backup/backup-postgres.sh
```

### Escalamiento Rápido
```bash
# Agregar más workers backend
docker-compose up -d --scale backend=3

# Agregar más workers Celery
docker-compose up -d --scale celery_worker=4

# Ver recursos
docker stats --no-stream
```

---

## Próximos Pasos Recomendados

### Seguridad
- [ ] Cambiar credenciales default de Grafana
- [ ] Habilitar HTTPS para dashboards
- [ ] Configurar OAuth en Grafana
- [ ] Implementar IP whitelist

### Escalabilidad
- [ ] Prometheus en modo HA
- [ ] Agregar Loki para logs centralizados
- [ ] Setup de replicación de base de datos
- [ ] Configurar auto-scaling

### Notificaciones
- [ ] Integrar con Slack
- [ ] Setup PagerDuty para on-call
- [ ] Configurar escalonamiento de alertas
- [ ] Webhook custom para integraciones

### Testing
- [ ] Load testing con Locust
- [ ] Disaster recovery drills
- [ ] Backup restoration tests
- [ ] Failover scenarios

---

## FAQ

**P: ¿Con qué frecuencia se hacen backups?**
R: PostgreSQL cada 6 horas, Redis cada 4 horas. Ver `scripts/backup/crontab.txt` para schedule completo.

**P: ¿Dónde se almacenan los backups?**
R: Localmente en `/backups/` (volumen Docker) y opcionalmente en S3 si `S3_BACKUP_BUCKET` está configurado.

**P: ¿Cuánto tiempo tarda restaurar?**
R: PostgreSQL < 1 hora, Redis < 30 minutos, depende del tamaño de los datos.

**P: ¿Qué pasa si un pipeline falla?**
R: Puedes re-trigger manualmente en GitHub Actions o hacer push nuevamente.

**P: ¿Cómo escalar horizontalmente?**
R: Usar `docker-compose up -d --scale <service>=<number>` o Kubernetes en producción.

**P: ¿Se pueden cambiar los thresholds de alertas?**
R: Sí, editar `monitoring/prometheus/alerts/` y hacer reload con `curl -X POST http://localhost:9090/-/reload`

---

## Contacto & Escalación

| Tema | Responsable | Escalación |
|------|-------------|-----------|
| Application errors | Backend team | DevOps lead |
| Database issues | DBA / DevOps | Infrastructure team |
| Infrastructure | DevOps | Cloud provider |
| Security incidents | Security team | CISO |

---

## Histórico de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2025-11-14 | Implementación inicial completa |

---

**Última actualización:** 2025-11-14
**Status:** Listo para producción
**Versión:** 1.0.0
