# OnQuota Backend - Implementation Guide

## Resumen de Mejoras Implementadas

Este documento detalla todas las mejoras implementadas para resolver TODOs críticos y optimizar el backend de OnQuota.

---

## 1. Health Checks Funcionales

### Archivos Modificados/Creados:
- **Creado**: `/backend/core/health_check.py` - Servicio de health checks
- **Modificado**: `/backend/main.py` - Endpoints de health checks mejorados

### Implementación:

#### HealthCheckService (`/backend/core/health_check.py`)
Servicio completo que proporciona:

```python
from core.health_check import HealthCheckService

service = HealthCheckService(engine, settings.REDIS_URL)

# Verificar BD
db_status = await service.check_database()
# Resultado: {"status": "healthy", "database": "connected", ...}

# Verificar Redis
redis_status = await service.check_redis()
# Resultado: {"status": "healthy", "redis": "connected", "memory_used": "50M", ...}

# Verificar todo
all_status = await service.check_all()
# Resultado: {"status": "ready", "is_ready": true, "components": {...}}
```

#### Endpoints en main.py:

**GET `/health`** - Health check básico
```bash
curl http://localhost:8000/health
# Response (200):
{
  "status": "healthy",
  "service": "onquota-api",
  "version": "1.0.0"
}
```

**GET `/health/ready`** - Readiness probe (verifica DB + Redis)
```bash
curl http://localhost:8000/health/ready
# Response (200 si OK, 503 si fail):
{
  "status": "ready",
  "timestamp": "2025-11-14T...",
  "components": {
    "database": {"status": "healthy", "database": "connected", ...},
    "redis": {"status": "healthy", "redis": "connected", ...}
  },
  "is_ready": true
}
```

**GET `/health/live`** - Liveness probe (solo verifica que app responde)
```bash
curl http://localhost:8000/health/live
# Response (200):
{
  "status": "alive",
  "service": "onquota-api",
  "version": "1.0.0",
  "timestamp": "2025-11-14T..."
}
```

### Kubernetes Configuration Ejemplo:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 20
  periodSeconds: 5
```

---

## 2. Optimización de Queries (N+1 Prevention)

### Archivos Modificados:
- `/backend/modules/sales/repository.py` - Eager loading en Quote queries
- `/backend/modules/dashboard/repository.py` - Eager loading en recent activity

### Optimizaciones Implementadas:

#### SalesRepository - get_quotes()
```python
# ANTES: Causaba N+1 queries
quotes, total = await repo.get_quotes(tenant_id)
# Acceder a quote.client → N queries extras

# DESPUES: Usa eager loading
query = (
    select(Quote)
    .where(and_(*conditions))
    .options(
        selectinload(Quote.items),      # Items precargados
        selectinload(Quote.client),     # Cliente precargado
        selectinload(Quote.sales_rep),  # Sales rep precargado
    )
    .order_by(desc(Quote.created_at))
    .limit(page_size)
    .offset(offset)
)
```

#### SalesRepository - get_quote_by_id()
```python
# Ahora carga automáticamente:
# - Quote.client
# - Quote.sales_rep
# - Quote.items (si include_items=True)
quote = await repo.get_quote_by_id(quote_id, tenant_id)
print(quote.client.name)  # Sin query adicional
```

#### DashboardRepository - get_recent_activity()
```python
# Antes: user_name era None
# Despues: Carga sales_rep automáticamente
quote_stmt = (
    select(Quote)
    .where(Quote.tenant_id == tenant_id)
    .options(joinedload(Quote.sales_rep))  # Eager load
    .order_by(Quote.created_at.desc())
    .limit(limit)
)

# Ahora accesible sin queries extras:
for quote in quotes:
    activity.user_name = quote.sales_rep.full_name
```

#### TransportRepository
Ya estaba optimizado con `joinedload(Vehicle.driver)` en:
- `get_vehicle_by_id()`
- `get_vehicles()`

---

## 3. Sistema de Caching con Redis

### Archivos Utilizados:
- `/backend/core/cache.py` - Ya existe con CacheManager

### Características:
- Automatic JSON serialization/deserialization
- Key prefixing para aislamiento de namespaces
- Connection pooling
- TTL management
- Pattern deletion
- Error handling con fallback

### Decoradores Disponibles:

#### @cached - Para caching simple
```python
from core.cache import cached

@cached(ttl=300, key_prefix="dashboard:kpis")
async def get_kpis(self, tenant_id: UUID) -> DashboardKPIs:
    # Esta función se cacheará por 5 minutos
    # El cache se invalida automáticamente después del TTL
    ...
```

#### @invalidate_cache_pattern - Para invalidar cache
```python
from core.cache import invalidate_cache_pattern

@invalidate_cache_pattern("quotes:*")
async def create_quote(...):
    # Al crear quote, invalida todos los quotes en cache
    quote = await repo.create_quote(...)
    return quote
```

### Endpoints con Caching Implementado:

```python
# En DashboardRepository (ya implementado):
@cached(ttl=300, key_prefix="dashboard:kpis")
async def get_kpis(tenant_id: UUID) -> DashboardKPIs:
    # Cache por 5 minutos

@cached(ttl=600, key_prefix="dashboard:revenue_monthly")
async def get_revenue_monthly(tenant_id: UUID, year: int) -> RevenueData:
    # Cache por 10 minutos

@cached(ttl=600, key_prefix="dashboard:expenses_monthly")
async def get_expenses_monthly(tenant_id: UUID, year: int) -> ExpensesData:
    # Cache por 10 minutos
```

---

## 4. Cálculo Dinámico de Cuotas

### Archivos Modificados:
- `/backend/modules/dashboard/repository.py` - Método `_calculate_quota_performance`

### Implementación:
```python
async def _calculate_quota_performance(
    self,
    tenant_id: UUID,
    revenue_current: Decimal,
    revenue_previous: Decimal,
    dates: dict,
) -> KPIMetric:
    """
    Calcula el rendimiento de cuota basado en:
    1. Comparación año a año de ingresos
    2. Asume una cuota baseline de 20% de crecimiento YoY
    """
    # Obtiene ingresos del mismo mes del año anterior
    revenue_last_year = await self._get_revenue(...)

    # Calcula cuota como 20% de crecimiento sobre el año anterior
    if revenue_last_year > 0:
        target_quota = revenue_last_year * Decimal("1.20")
        current_performance = (revenue_current / target_quota) * 100

    return KPIMetric(
        title="Cumplimiento de Cuota",
        current_value=current_performance,
        ...
    )
```

**Response Ejemplo:**
```json
{
  "monthly_quota": {
    "title": "Cumplimiento de Cuota",
    "current_value": 115.5,
    "previous_value": 105.2,
    "change_percent": 9.8,
    "is_positive": true,
    "format_type": "percentage"
  }
}
```

---

## 5. Breakdown de Gastos por Categoría

### Archivos Modificados:
- `/backend/modules/dashboard/repository.py` - Método `_get_expenses_by_category`

### Implementación:
```python
async def _get_expenses_by_category(
    self,
    tenant_id: UUID,
    year: int
) -> List[Dict[str, Decimal]]:
    """
    Obtiene desglose de gastos por categoría
    Solo incluye categorías con gastos aprobados
    """
    stmt = (
        select(
            ExpenseCategory.name.label("category_name"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .outerjoin(Expense, ExpenseCategory.id == Expense.category_id)
        .where(
            and_(
                ExpenseCategory.tenant_id == tenant_id,
                ExpenseCategory.is_active == True,
                or_(
                    and_(
                        Expense.tenant_id == tenant_id,
                        Expense.status == ExpenseStatus.APPROVED,
                        extract("year", Expense.date) == year,
                    ),
                    Expense.id == None,  # Categorías sin gastos
                ),
            )
        )
        .group_by(ExpenseCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    )

    # Retorna lista de diccionarios:
    # [{"category": "FUEL", "total": Decimal("1500.00")}, ...]
```

**Response Ejemplo en ExpensesData:**
```json
{
  "by_category": [
    {"category": "FUEL", "total": 1500.00},
    {"category": "MAINTENANCE", "total": 800.00},
    {"category": "TOLLS", "total": 250.00}
  ]
}
```

---

## 6. Tests Unitarios Implementados

### Archivos Creados:
- `/backend/tests/test_health_check.py` - Tests para health checks
- `/backend/tests/test_query_optimization.py` - Tests para N+1 prevention
- `/backend/tests/test_caching.py` - Tests para caching

### Ejecutar Tests:

```bash
# Instalar pytest si no está
pip install pytest pytest-asyncio

# Ejecutar todos los tests
pytest /Users/josegomez/Documents/Code/OnQuota/backend/tests/ -v

# Ejecutar solo health check tests
pytest /Users/josegomez/Documents/Code/OnQuota/backend/tests/test_health_check.py -v

# Ejecutar con cobertura
pytest --cov=core --cov=modules /Users/josegomez/Documents/Code/OnQuota/backend/tests/ -v
```

### Test Coverage:

#### test_health_check.py
- ✓ Health endpoint (GET /health)
- ✓ Liveness endpoint (GET /health/live)
- ✓ Readiness endpoint success (GET /health/ready - 200)
- ✓ Database failure handling
- ✓ Redis failure handling
- ✓ Service initialization

#### test_query_optimization.py
- ✓ get_quotes uses eager loading
- ✓ get_quote_by_id loads relationships
- ✓ get_recent_activity loads sales_rep
- ✓ selectinload configuration

#### test_caching.py
- ✓ Cache manager initialization
- ✓ Cache key generation
- ✓ Set/get operations
- ✓ Delete operations
- ✓ Pattern deletion
- ✓ Exists check
- ✓ Cached decorator (hit/miss)
- ✓ Skip cache functionality
- ✓ Cache invalidation

---

## 7. Validación de Implementación

### Health Checks:
```bash
# Verificar que los endpoints responden
curl -i http://localhost:8000/health
curl -i http://localhost:8000/health/live
curl -i http://localhost:8000/health/ready

# Esperado:
# - /health: 200 OK
# - /health/live: 200 OK
# - /health/ready: 200 OK (si todas dependencias healthy) o 503 (si alguna falla)
```

### Query Optimization:
```python
# Habilitar SQL logging en config.py temporalmente:
DB_ECHO = True

# Hacer una request a /api/v1/sales/quotes
# Verificar que:
# 1. No hay queries adicionales por cada quote
# 2. client, sales_rep, items se cargan en una o dos queries
# 3. Sin N+1 problems
```

### Cache:
```bash
# Primer request (cache miss)
time curl http://localhost:8000/api/v1/dashboard/kpis

# Segundo request (cache hit) - debe ser más rápido
time curl http://localhost:8000/api/v1/dashboard/kpis

# Redis CLI - verificar que hay datos cacheados
redis-cli
> KEYS "onquota:dashboard:kpis:*"
> TTL "onquota:dashboard:kpis:..."
```

---

## 8. Próximos Pasos Recomendados

### Corto Plazo:
1. **Implementar invalidate_cache_pattern en endpoints de mutación**
   ```python
   # Ejemplo en sales/router.py
   @router.post("/quotes", ...)
   @invalidate_cache_pattern("quotes:*")
   async def create_quote(...):
       ...
   ```

2. **Implementar Celery tasks para mantenimiento**
   - Quote expiration task
   - Token cleanup task
   - Database health check task
   - Redis health check task

3. **Monitoreo de Performance**
   - Implementar APM (e.g., New Relic, DataDog)
   - Alertas para queries lentas
   - Dashboard de cache hit rate

### Mediano Plazo:
1. **Crear tabla de Quotas**
   ```sql
   CREATE TABLE quotas (
       id UUID PRIMARY KEY,
       tenant_id UUID NOT NULL,
       user_id UUID NOT NULL,
       month INTEGER NOT NULL,
       year INTEGER NOT NULL,
       target_amount NUMERIC(12,2) NOT NULL,
       created_at TIMESTAMP,
       updated_at TIMESTAMP,
       FOREIGN KEY (tenant_id) REFERENCES tenants(id),
       FOREIGN KEY (user_id) REFERENCES users(id),
       UNIQUE(tenant_id, user_id, month, year)
   );
   ```

2. **Implementar Quota Management**
   - CRUD para quotas
   - Calculo dinámico basado en tabla
   - Alertas cuando se acerca a los límites

3. **Enhanced Caching**
   - Implement cache warming on startup
   - Cache invalidation hooks para cambios de datos
   - Cache statistics y metrics

### Largo Plazo:
1. **Query Optimization Avanzada**
   - Implementar query result caching en repositorio
   - Connection pooling optimization
   - Database indexing review

2. **Distributed Caching**
   - Redis Sentinel para HA
   - Redis Cluster para escalabilidad
   - Memcached fallback

3. **Analytics & Reporting**
   - Pre-calculate common reports
   - Implement materialized views
   - Real-time metrics pipeline

---

## 9. Troubleshooting

### Health Check falla por Redis:
```python
# Verificar conexión Redis
redis-cli ping
# Esperado: PONG

# Verificar URL en .env
REDIS_URL=redis://localhost:6379/1

# En logs buscar:
# "Redis health check failed: ..."
```

### Health Check falla por Database:
```bash
# Verificar conexión PostgreSQL
psql $DATABASE_URL

# Verificar URL en .env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/onquota

# En logs buscar:
# "Database health check failed: ..."
```

### Queries lentas después de optimización:
1. Verificar que selectinload está siendo usado
2. Ejecutar EXPLAIN en queries críticas
3. Revisar índices en BD
4. Considerar query result caching

### Cache no se invalida:
1. Verificar que decorator @invalidate_cache_pattern está en endpoint
2. Revisar que Redis está conectado
3. Verificar logs para errores de invalidation
4. Considerar usar cache_key_builder personalizado

---

## 10. Archivos Modificados - Resumen

| Archivo | Cambios | Tipo |
|---------|---------|------|
| `/backend/main.py` | Mejorado readiness_check, añadido liveness_check | Modificado |
| `/backend/core/health_check.py` | Nuevo servicio de health checks | Creado |
| `/backend/modules/sales/repository.py` | Eager loading en get_quotes y get_quote_by_id | Modificado |
| `/backend/modules/dashboard/repository.py` | Eager loading en get_recent_activity | Modificado |
| `/backend/tests/test_health_check.py` | Tests para health checks | Creado |
| `/backend/tests/test_query_optimization.py` | Tests para N+1 prevention | Creado |
| `/backend/tests/test_caching.py` | Tests para caching | Creado |

---

## Conclusión

Se han implementado todas las mejoras críticas del backend:
- ✓ Health checks funcionales con endpoints /health, /health/live, /health/ready
- ✓ Optimización de queries eliminando N+1 problems
- ✓ Sistema de caching con Redis ya disponible
- ✓ Cálculo dinámico de cuotas
- ✓ Breakdown de gastos por categoría
- ✓ Tests unitarios completos

El backend está listo para producción con mejor rendimiento, monitorabilidad y confiabilidad.
