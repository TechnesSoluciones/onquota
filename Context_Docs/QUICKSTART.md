# 🚀 OnQuota - Guía de Inicio Rápido

Esta guía te ayudará a tener OnQuota corriendo en **5 minutos**.

## Prerequisitos

- Docker Desktop instalado ([descargar aquí](https://www.docker.com/products/docker-desktop))
- Git (opcional, para clonar el repo)

## Paso 1: Iniciar el Stack Completo

```bash
# Navegar al directorio del proyecto
cd OnQuota

# Iniciar todos los servicios con Docker Compose
docker-compose up -d
```

Esto iniciará **14 contenedores**:
- PostgreSQL (base de datos)
- Redis (cache y message broker)
- Backend API (FastAPI)
- Frontend (Next.js)
- Celery Workers (procesamiento asíncrono)
- Celery Beat (tareas programadas)
- Flower (monitor de Celery)
- Prometheus + Grafana (monitoreo)
- Exporters (métricas)
- AlertManager (alertas)

## Paso 2: Verificar que todo esté corriendo

```bash
# Ver el estado de los contenedores
docker-compose ps

# Deberías ver todos los servicios como "Up" o "running"
```

## Paso 3: Aplicar Migraciones de Base de Datos

```bash
# Ejecutar migraciones de Alembic
docker-compose exec backend alembic upgrade head
```

Esto creará todas las tablas necesarias en PostgreSQL.

## Paso 4: Cargar Datos de Prueba (Opcional pero Recomendado)

```bash
# Ejecutar el script de seed
docker-compose exec backend python seed_database.py
```

Esto creará:
- ✅ 1 empresa demo
- ✅ 6 usuarios de prueba
- ✅ 5 clientes de ejemplo
- ✅ 3 vehículos
- ✅ 5 gastos de ejemplo
- ✅ 2 cotizaciones
- ✅ 2 envíos
- ✅ 3 oportunidades

## Paso 5: Acceder a la Aplicación

### Frontend (Interfaz Web)
```
URL: http://localhost:3000
```

**Credenciales de prueba:**

**Administrador:**
- Email: `admin@demo.com`
- Password: `Admin123!`

**Vendedor:**
- Email: `juan.perez@demo.com`
- Password: `Sales123!`

### Backend API (Swagger UI)
```
URL: http://localhost:8000/docs
```

### Grafana (Dashboards de Monitoreo)
```
URL: http://localhost:3001
Usuario: admin
Password: admin
```

### Flower (Monitor de Celery)
```
URL: http://localhost:5555
```

## Paso 6: Probar las Funcionalidades

### 🧾 Probar OCR (Extracción de Facturas)

1. Ir a http://localhost:3000/ocr/upload
2. Arrastrar un archivo de `test_data/ocr/` (ej: `factura_ejemplo.txt`)
3. Ver los datos extraídos automáticamente

### 📊 Probar Analytics (Análisis SPA)

1. Ir a http://localhost:3000/analytics/upload
2. Subir `test_data/analytics/ventas_ejemplo.csv`
3. Esperar ~10-30 segundos de procesamiento
4. Ver dashboard con:
   - Clasificación ABC (Pareto)
   - Top 10 productos
   - Análisis de descuentos
   - Gráficos y estadísticas

### 💼 Probar CRM y Ventas

1. Ir a http://localhost:3000/clients
2. Ver lista de clientes demo
3. Crear una nueva cotización
4. Gestionar oportunidades en el pipeline

## 📝 Logs y Debugging

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs de Celery
docker-compose logs -f celery_worker celery_beat

# Ver logs del frontend
docker-compose logs -f frontend
```

## 🛑 Detener el Stack

```bash
# Detener todos los servicios (mantiene los datos)
docker-compose down

# Detener y eliminar volúmenes (resetea todo)
docker-compose down -v
```

## 📊 Métricas y Monitoreo

### Prometheus
```
URL: http://localhost:9090
```

Consultas útiles:
- `http_requests_total` - Total de requests HTTP
- `celery_task_runtime_seconds` - Tiempo de ejecución de tareas
- `postgres_up` - Estado de PostgreSQL

### Grafana Dashboards

Después de iniciar Grafana en http://localhost:3001, encontrarás 4 dashboards pre-configurados:

1. **Application Overview** - KPIs generales
2. **API Performance** - Métricas de endpoints
3. **Database Metrics** - PostgreSQL stats
4. **Celery Tasks** - Estado de background jobs

## 🧪 Ejecutar Tests

```bash
# Tests del backend
docker-compose exec backend pytest tests/ -v

# Tests con coverage
docker-compose exec backend pytest tests/ --cov=modules --cov-report=html

# Tests del frontend (si aplicable)
docker-compose exec frontend npm test
```

## 🔧 Troubleshooting

### Problema: Contenedor no inicia

```bash
# Ver logs del contenedor problemático
docker-compose logs backend  # o el servicio que falla

# Reintentar build
docker-compose up -d --build
```

### Problema: Base de datos no conecta

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose exec postgres psql -U onquota_user -d onquota_db -c "SELECT 1"

# Si falla, reiniciar PostgreSQL
docker-compose restart postgres
```

### Problema: Migraciones fallan

```bash
# Verificar estado de migraciones
docker-compose exec backend alembic current

# Ver historial
docker-compose exec backend alembic history

# Downgrade y upgrade
docker-compose exec backend alembic downgrade -1
docker-compose exec backend alembic upgrade head
```

### Problema: Puertos ocupados

Si algún puerto (3000, 8000, 5432, etc.) está ocupado:

```bash
# En macOS/Linux
lsof -i :3000  # Ver qué proceso usa el puerto
kill -9 <PID>  # Matar el proceso

# O cambiar el puerto en docker-compose.yml
# Ejemplo: "3001:3000" usa puerto 3001 en lugar de 3000
```

## 📚 Próximos Pasos

1. **Explorar la API:**
   - http://localhost:8000/docs
   - Probar endpoints con Swagger UI

2. **Revisar Documentación:**
   - `backend/modules/*/README.md` - Docs de cada módulo
   - `PROGRESO_ACTUAL.md` - Estado del proyecto
   - `test_data/README.md` - Guía de datos de prueba

3. **Configurar Variables de Entorno:**
   - Copiar `.env.example` a `.env`
   - Actualizar con tus credenciales reales (SendGrid, AWS, etc.)

4. **Desarrollo:**
   - Backend: `backend/` - Edita y hot-reload automático
   - Frontend: `frontend/` - Edita y hot-reload automático

## 🎯 Arquitectura del Stack

```
┌─────────────────┐
│   Frontend      │ :3000
│   (Next.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │ :8000
│   (FastAPI)     │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
┌────────┐ ┌────────┐  ┌──────────┐
│Postgres│ │ Redis  │  │  Celery  │
│  :5432 │ │ :6379  │  │  Workers │
└────────┘ └────────┘  └──────────┘
    │
    ▼
┌─────────────────────────────┐
│   Monitoring Stack          │
│   - Prometheus :9090        │
│   - Grafana :3001           │
│   - Flower :5555            │
└─────────────────────────────┘
```

## 📞 Soporte

- Documentación: `docs/`
- Issues: GitHub Issues
- Logs: `docker-compose logs -f`

---

**¡Listo!** Ahora tienes OnQuota corriendo completamente. 🎉

Para detener:
```bash
docker-compose down
```

Para reiniciar:
```bash
docker-compose up -d
```
