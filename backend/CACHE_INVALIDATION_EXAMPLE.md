# Cache Invalidation Implementation Guide

## Descripción

Este documento proporciona ejemplos de cómo implementar `@invalidate_cache_pattern` en endpoints de mutación (POST, PUT, DELETE) para invalidar automáticamente el cache cuando los datos cambian.

---

## Patrón General

```python
from core.cache import invalidate_cache_pattern

# Invalidar cache cuando se crean/modifican/eliminan recursos
@router.post("/resource")
@invalidate_cache_pattern("resource:*")  # Invalida TODAS las claves que empiezan con "resource:"
async def create_resource(...):
    ...

@router.put("/resource/{id}")
@invalidate_cache_pattern("resource:*")
async def update_resource(...):
    ...

@router.delete("/resource/{id}")
@invalidate_cache_pattern("resource:*")
async def delete_resource(...):
    ...
```

---

## Ejemplo 1: Sales/Quotes

### Patrón de Cache:
```
Claves cacheadas en dashboard:
- dashboard:kpis:{tenant_id}:{hash}
- quotes:list:{tenant_id}:{hash}
- quotes:summary:{tenant_id}:{hash}
```

### Implementación:

```python
# En /backend/modules/sales/router.py

from core.cache import invalidate_cache_pattern

# CREATE - Invalidar quotes y dashboard KPIs
@router.post("/quotes", response_model=QuoteWithItems, status_code=status.HTTP_201_CREATED)
@invalidate_cache_pattern("quotes:*")  # Invalida todas quotes
@invalidate_cache_pattern("dashboard:*")  # Invalida dashboard (KPIs incluyen quotes)
async def create_quote(
    data: QuoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new quote - invalidates quotes and dashboard cache"""
    repo = SalesRepository(db)

    # ... crear quote ...

    await db.commit()
    return quote


# UPDATE - Invalidar quote específica y dashboard
@router.put("/quotes/{quote_id}", response_model=QuoteWithItems)
@invalidate_cache_pattern("quotes:*")
@invalidate_cache_pattern("dashboard:*")
async def update_quote(
    quote_id: UUID,
    data: QuoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update quote - invalidates quotes and dashboard cache"""
    repo = SalesRepository(db)

    # ... actualizar quote ...

    await db.commit()
    return quote


# DELETE - Invalidar quote y dashboard
@router.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
@invalidate_cache_pattern("quotes:*")
@invalidate_cache_pattern("dashboard:*")
async def delete_quote(
    quote_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete quote - invalidates quotes and dashboard cache"""
    repo = SalesRepository(db)

    # ... eliminar quote ...

    await db.commit()
```

### Patrón Simplificado (múltiples decoradores):
```python
def invalidate_multiple(*patterns):
    """Decorator para invalidar múltiples patrones"""
    def decorator(func):
        for pattern in patterns:
            func = invalidate_cache_pattern(pattern)(func)
        return func
    return decorator

# Uso:
@router.post("/quotes", ...)
@invalidate_multiple("quotes:*", "dashboard:*")
async def create_quote(...):
    ...
```

---

## Ejemplo 2: Expenses

### Patrón de Cache:
```
dashboard:expenses_monthly:{tenant_id}:{hash}
dashboard:kpis:{tenant_id}:{hash}
```

### Implementación:

```python
# En /backend/modules/expenses/router.py

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
@invalidate_cache_pattern("dashboard:expenses_monthly:*")
@invalidate_cache_pattern("dashboard:kpis:*")
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new expense"""
    ...


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
@invalidate_cache_pattern("dashboard:expenses_monthly:*")
@invalidate_cache_pattern("dashboard:kpis:*")
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update expense"""
    ...


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
@invalidate_cache_pattern("dashboard:expenses_monthly:*")
@invalidate_cache_pattern("dashboard:kpis:*")
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete expense"""
    ...
```

---

## Ejemplo 3: Clients

### Patrón de Cache:
```
dashboard:top_clients:{tenant_id}:{hash}
dashboard:kpis:{tenant_id}:{hash}
```

### Implementación:

```python
# En /backend/modules/clients/router.py

@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
@invalidate_cache_pattern("dashboard:top_clients:*")
@invalidate_cache_pattern("dashboard:kpis:*")
async def create_client(...):
    """Create new client"""
    ...


@router.put("/clients/{client_id}", response_model=ClientResponse)
@invalidate_cache_pattern("dashboard:top_clients:*")
async def update_client(...):
    """Update client - only invalidate top clients, not KPIs"""
    ...


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
@invalidate_cache_pattern("dashboard:top_clients:*")
@invalidate_cache_pattern("dashboard:kpis:*")
async def delete_client(...):
    """Delete client"""
    ...
```

---

## Estrategias de Invalidación

### 1. Invalidar Todo (Aggressive)
```python
@invalidate_cache_pattern("*")  # Invalida TODA la caché
async def update_critical_data(...):
    ...
```
**Pro**: Garantiza datos frescos
**Con**: Reduce eficiencia del cache

### 2. Invalidar Específicamente (Selective)
```python
@invalidate_cache_pattern("quotes:*")  # Solo quotes
async def create_quote(...):
    ...
```
**Pro**: Mantiene otros caches intactos
**Con**: Requiere conocer patrones exactos

### 3. Invalidar por Tenant (Tenant-Aware)
```python
@invalidate_cache_pattern("quotes:tenant_{tenant_id}:*")
async def create_quote(tenant_id: UUID, ...):
    ...
```
**Pro**: Aislamiento de datos por tenant
**Con**: Patrón más complejo

### 4. Invalidar Selectivamente (Smart)
```python
async def create_quote(...):
    quote = await repo.create_quote(...)

    # Solo invalidar si es relevante
    if quote.status == SaleStatus.ACCEPTED:
        cache = await get_cache()
        await cache.delete_pattern("dashboard:kpis:*")

    return quote
```
**Pro**: Mínima invalidación
**Con**: Lógica más compleja

---

## Patrones de Clave Recomendados

### Estructura:
```
{resource}:{tenant_id}:{additional_params}:{function_hash}
```

### Ejemplos:
```
quotes:123e4567-e89b-12d3-a456-426614174000:*
expenses:123e4567-e89b-12d3-a456-426614174000:2025:*
clients:123e4567-e89b-12d3-a456-426614174000:top:*
dashboard:kpis:123e4567-e89b-12d3-a456-426614174000:*
```

---

## Testing de Cache Invalidation

### Test Unitario:
```python
import pytest
from unittest.mock import patch, AsyncMock
from core.cache import invalidate_cache_pattern

@pytest.mark.asyncio
async def test_create_quote_invalidates_cache():
    """Test that creating a quote invalidates cache"""
    with patch("core.cache.get_cache") as mock_get_cache:
        mock_cache = AsyncMock()
        mock_get_cache.return_value = mock_cache
        mock_cache.delete_pattern = AsyncMock()

        # Supongamos endpoint con @invalidate_cache_pattern("quotes:*")
        # Al ejecutarse, debe llamar delete_pattern

        # Verificar:
        mock_cache.delete_pattern.assert_called_with("quotes:*")
```

### Test de Integración:
```bash
# 1. Obtener datos (cache miss, se cachea)
curl http://localhost:8000/api/v1/dashboard/kpis
# Time: 500ms

# 2. Obtener datos nuevamente (cache hit)
curl http://localhost:8000/api/v1/dashboard/kpis
# Time: 50ms

# 3. Crear nuevo quote (invalida cache)
curl -X POST http://localhost:8000/api/v1/sales/quotes -d ...
# Cache se invalida

# 4. Obtener datos nuevamente (cache miss, recalcula)
curl http://localhost:8000/api/v1/dashboard/kpis
# Time: 500ms (porque fue recalculado)
```

---

## Monitoring y Debugging

### Verificar patrón se cachea:
```bash
# En Redis CLI
redis-cli
> MONITOR
> # Verá todas las operaciones de cache

# Ver claves cacheadas
redis-cli KEYS "onquota:dashboard:*"
redis-cli KEYS "onquota:quotes:*"
```

### Logging:
```python
# El cache manager ya registra hits/misses en logs
# Buscar en logs:
# "Cache hit: dashboard:kpis:..."
# "Cache miss: dashboard:kpis:..."
# "Invalidated cache pattern: quotes:*"
```

### Verificar tiempo de respuesta:
```bash
# Con timing
time curl http://localhost:8000/api/v1/dashboard/kpis
# real    0m0.500s  (sin cache)
# real    0m0.050s  (con cache)
```

---

## Buenas Prácticas

1. **Invalidar al nivel correcto**
   - CREATE/UPDATE/DELETE: invalidar siempre
   - GET: nunca invalidar
   - PATCH: solo si cambia datos relevantes

2. **Usar patrones amplios pero específicos**
   - ✓ `quotes:*` - amplio pero específico a quotes
   - ✗ `*` - demasiado amplio
   - ✓ `dashboard:kpis:*` - muy específico

3. **Documentar patrones de cache**
   - Comentar qué endpoints cachean qué patrones
   - Mantener lista centralizada de patrones

4. **Monitor cache effectiveness**
   - Medir hit rate
   - Alertar si hit rate cae
   - Ajustar TTLs según necesidad

5. **Usar cache warming**
   - Pre-calcular datos comunes al startup
   - Refrescar datos críticos periódicamente

---

## Próximos Pasos

1. Implementar invalidate_cache_pattern en todos los endpoints de mutación
2. Crear tabla de configuración de TTLs por endpoint
3. Implementar cache warming en lifespan del app
4. Agregar metrics de cache hit rate a monitoring
5. Crear alertas cuando hit rate cae

---

## Referencias

- Cache Manager: `/backend/core/cache.py`
- Health Check: `/backend/core/health_check.py`
- Implementation Guide: `/backend/IMPLEMENTATION_GUIDE.md`
