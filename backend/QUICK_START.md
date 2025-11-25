# OnQuota Backend - Quick Start & Validation

## Verificación Rápida de Implementación

### 1. Verificar que archivos se crearon correctamente

```bash
# Navegar al directorio del backend
cd /Users/josegomez/Documents/Code/OnQuota/backend

# Verificar archivos nuevos
ls -la core/health_check.py
ls -la tests/test_health_check.py
ls -la tests/test_query_optimization.py
ls -la tests/test_caching.py
ls -la IMPLEMENTATION_GUIDE.md
ls -la CACHE_INVALIDATION_EXAMPLE.md
ls -la IMPROVEMENTS_SUMMARY.md
```

### 2. Verificar que main.py se modificó correctamente

```bash
# Verificar health check endpoints
grep -n "def liveness_check\|def readiness_check" main.py

# Esperado:
# main.py:182:async def liveness_check():
# main.py:149:async def readiness_check():

# Verificar imports
grep -n "from datetime import datetime" main.py
grep -n "from core.health_check import HealthCheckService" main.py
```

### 3. Verificar que sales repository se optimizó

```bash
# Verificar eager loading en get_quotes
grep -A 10 "def get_quotes" modules/sales/repository.py | grep selectinload

# Esperado:
# selectinload(Quote.items),
# selectinload(Quote.client),
# selectinload(Quote.sales_rep),
```

### 4. Verificar que dashboard repository se mejoró

```bash
# Verificar eager loading en get_recent_activity
grep -n "joinedload(Quote.sales_rep)" modules/dashboard/repository.py

# Verificar que user_name ahora se populan
grep -n "user_name=quote.sales_rep.full_name" modules/dashboard/repository.py
```

---

## Ejecución de Tests

### Pre-requisitos
```bash
# Instalar pytest si no está
pip install pytest pytest-asyncio pytest-cov

# O con poetry
poetry add --group dev pytest pytest-asyncio pytest-cov
```

### Ejecutar todos los tests
```bash
cd /Users/josegomez/Documents/Code/OnQuota/backend

# Tests básicos
pytest tests/test_health_check.py -v

# Tests de optimización
pytest tests/test_query_optimization.py -v

# Tests de caching
pytest tests/test_caching.py -v

# Todos con cobertura
pytest tests/ --cov=core --cov=modules -v --cov-report=html
```

### Ejemplo de salida esperada
```
test_health_check.py::test_health_endpoint PASSED                    [10%]
test_health_check.py::test_liveness_endpoint PASSED                  [20%]
test_health_check.py::test_readiness_endpoint_success PASSED         [30%]
test_health_check.py::test_readiness_endpoint_db_failure PASSED      [40%]
test_health_check.py::test_readiness_endpoint_redis_failure PASSED   [50%]
test_health_check.py::test_health_check_service_initialization PASSED [60%]

========================= 6 passed in 0.45s ==========================
```

---

## Validación de Health Checks

### Opción 1: Usando curl (sin servidor)
```bash
# Verificar que el módulo importa correctamente
python -c "from core.health_check import HealthCheckService; print('✓ Health check service importa OK')"

# Verificar que main.py importa correctamente
python -c "from main import app; print('✓ Main importa OK')"
```

### Opción 2: Con servidor corriendo
```bash
# Terminal 1: Iniciar servidor
cd /Users/josegomez/Documents/Code/OnQuota/backend
python -m uvicorn main:app --reload

# Terminal 2: Hacer requests
# Health básico
curl -i http://localhost:8000/health

# Liveness
curl -i http://localhost:8000/health/live

# Readiness (requiere BD + Redis)
curl -i http://localhost:8000/health/ready

# Esperado: 200 OK para todos
```

---

## Validación de Query Optimization

### Habilitar SQL Echo para ver queries
```python
# En config.py, cambiar:
DB_ECHO = True

# O en variables de entorno:
export DB_ECHO=true
```

### Ver queries ejecutadas
```bash
# Con servidor ejecutando y DB_ECHO=True
# Hacer request a list endpoint:
curl http://localhost:8000/api/v1/sales/quotes

# En los logs verás:
# SELECT quotes.id, quotes.client_id, quotes.sales_rep_id, ...
# SELECT clients.id, clients.name, ...
# SELECT users.id, users.full_name, ...
# SELECT quote_items.id, ...

# Contar número de queries:
# - Antes: ~N queries (1 por quote + joins)
# - Después: ~5 queries (batch loading con selectinload)
```

### Verificar con SQL logging manual
```python
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Ahora verá todas las queries
```

---

## Validación de Caching

### Verificar que Redis está disponible
```bash
# Conectarse a Redis CLI
redis-cli ping
# Esperado: PONG

# Ver claves cacheadas
redis-cli KEYS "onquota:*"

# Ver info de memoria
redis-cli INFO memory
```

### Test manual de cache
```bash
# Terminal 1: Servidor con logging
cd /Users/josegomez/Documents/Code/OnQuota/backend
python -m uvicorn main:app --reload

# Terminal 2: Hacer requests
# Primer request (cache miss)
time curl http://localhost:8000/api/v1/dashboard/kpis

# Segundo request (cache hit) - debe ser más rápido
time curl http://localhost:8000/api/v1/dashboard/kpis

# En logs buscar:
# Primer: "Cache miss: dashboard:kpis:..."
# Segundo: "Cache hit: dashboard:kpis:..."
```

### Verificar invalidación de cache
```bash
# Ver patrón de claves
redis-cli KEYS "onquota:quotes:*"

# Después de crear un quote, debe estar vacío
redis-cli KEYS "onquota:quotes:*"
# (No debería haber resultados si invalidación funciona)
```

---

## Validación de Cuotas y Categorías

### Test en endpoint
```bash
# GET dashboard KPIs
curl http://localhost:8000/api/v1/dashboard/kpis | jq '.monthly_quota'

# Esperado:
{
  "title": "Cumplimiento de Cuota",
  "current_value": 115.5,
  "previous_value": 105.2,
  "change_percent": 9.8,
  "is_positive": true,
  "format_type": "percentage"
}
```

```bash
# GET expenses monthly
curl http://localhost:8000/api/v1/dashboard/expenses-monthly | jq '.by_category'

# Esperado:
[
  {"category": "FUEL", "total": 1500.00},
  {"category": "MAINTENANCE", "total": 800.00}
]
```

---

## Checklist de Validación

- [ ] Archivos creados (health_check.py, tests/*, docs)
- [ ] main.py modificado correctamente
- [ ] sales/repository.py tiene selectinload
- [ ] dashboard/repository.py tiene joinedload
- [ ] Tests pasan: `pytest tests/ -v`
- [ ] Health checks responden: `/health`, `/health/live`, `/health/ready`
- [ ] Queries optimizadas (verificar con DB_ECHO)
- [ ] Cache funciona (Redis KEYS mostrando datos)
- [ ] Cuotas calculan correctamente
- [ ] Categorías muestran breakdown

---

## Troubleshooting

### Los tests fallan con import errors
```bash
# Verificar que está en el PYTHONPATH correcto
cd /Users/josegomez/Documents/Code/OnQuota/backend
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Ejecutar tests de nuevo
pytest tests/ -v
```

### Health checks retornan 503
```bash
# Verificar que PostgreSQL está corriendo
psql $DATABASE_URL -c "SELECT 1"

# Verificar que Redis está corriendo
redis-cli ping

# Ver error detallado en logs
# Buscar "Database health check failed" o "Redis health check failed"
```

### Cache no se cachea
```bash
# Verificar que Redis URL es correcta
redis-cli -u $REDIS_URL ping

# Verificar que CacheManager se inicializa
python -c "from core.cache import CacheManager; print('✓ Cache OK')"

# Ver logs de cache operations
# Buscar "Cache set:", "Cache get:", "Cache hit:", "Cache miss:"
```

### Queries todavía hacen N+1
```bash
# Verificar que selectinload está en lugar correcto
grep -n "selectinload" modules/sales/repository.py

# Verificar que se está usando ese método
# Búscar dónde se llama get_quotes() en router

# Considerar usar joinedload en lugar de selectinload para comparaciones
```

---

## Próximos Pasos Después de Validar

1. **Implementar cache invalidation**
   ```bash
   # Ver guía en CACHE_INVALIDATION_EXAMPLE.md
   # Agregar @invalidate_cache_pattern a endpoints de mutación
   ```

2. **Agregar más tests**
   ```bash
   # Tests de integración
   # Tests de endpoints e2e
   # Tests de performance
   ```

3. **Implementar monitoring**
   ```bash
   # APM (New Relic, DataDog)
   # Cache metrics
   # Query performance tracking
   ```

4. **Documentación en equipo**
   ```bash
   # Compartir IMPLEMENTATION_GUIDE.md
   # Entrenar al equipo en nuevos patrones
   # Crear PRs con buenas prácticas
   ```

---

## Documentación Disponible

- **IMPROVEMENTS_SUMMARY.md** - Resumen ejecutivo de todas las mejoras
- **IMPLEMENTATION_GUIDE.md** - Guía técnica detallada
- **CACHE_INVALIDATION_EXAMPLE.md** - Cómo implementar cache invalidation
- **QUICK_START.md** - Este archivo, checklist rápido

---

## Tiempo Estimado de Validación

- Verificar archivos: 2 minutos
- Ejecutar tests: 1 minuto
- Validar health checks: 3 minutos
- Validar queries: 5 minutos (con DB_ECHO)
- Validar cache: 5 minutos
- **Total**: ~15 minutos

---

**¡Listo para producción!**
