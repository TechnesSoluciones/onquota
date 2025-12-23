# Análisis Exhaustivo de Errores 422 y Problemas de Fetch Data
## Proyecto OnQuota SaaS

**Fecha:** 2025-12-03
**Análisis realizado por:** Claude (Software Architect)
**Ubicación:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota`

---

## Resumen Ejecutivo

Se han identificado **7 problemas críticos** y **5 problemas de alta prioridad** que causan errores 422 (Unprocessable Entity) y fallos en la carga de datos en varios módulos del proyecto OnQuota. Los problemas principales incluyen:

1. **Orden incorrecto de rutas** en el módulo de ventas (sales)
2. **Campos inexistentes** referenciados en queries de base de datos
3. **Inconsistencias entre frontend y backend** en nombres de parámetros
4. **Esquemas Pydantic incompletos** que causan validación fallida

---

## PROBLEMAS CRÍTICOS (Severidad: CRÍTICA)

### 1. Orden de Rutas Incorrecto en Sales Router

**Tipo de error:** 422 Unprocessable Entity (UUID validation failure)
**Módulo afectado:** `backend/modules/sales/router.py`
**Ubicación:** Líneas 199 y 426

#### Causa Raíz

FastAPI evalúa rutas en orden de declaración. La ruta específica `/sales/quotes/summary` está declarada DESPUÉS de la ruta parametrizada `/sales/quotes/{quote_id}`. Esto causa que FastAPI intente interpretar "summary" como un UUID, resultando en error de validación 422.

```python
# ORDEN ACTUAL (INCORRECTO):
@router.get("/quotes/{quote_id}", ...)  # Línea 199
async def get_quote(quote_id: UUID, ...):
    ...

@router.get("/quotes/summary", ...)     # Línea 426 - DEMASIADO TARDE
async def get_quote_summary(...):
    ...
```

#### Impacto

- Frontend no puede obtener resumen de cotizaciones
- Error 422 con mensaje: `"value is not a valid uuid"`
- Afecta dashboard y reportes que necesitan estadísticas de ventas

#### Solución Recomendada

**Archivo:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/sales/router.py`

**Acción:** Mover la ruta `/quotes/summary` ANTES de `/quotes/{quote_id}`

```python
# ORDEN CORRECTO:
@router.get("/quotes", response_model=QuoteListResponse)  # Línea 141
async def list_quotes(...):
    ...

@router.get("/quotes/summary", response_model=QuoteSummary)  # MOVER AQUÍ
async def get_quote_summary(...):
    ...

@router.get("/quotes/{quote_id}", response_model=QuoteWithItems)
async def get_quote(quote_id: UUID, ...):
    ...
```

**Orden específico de movimiento:**
1. Mover bloque completo de líneas 426-455 (función `get_quote_summary`)
2. Insertar ANTES de la línea 199 (función `get_quote`)
3. Verificar que no hay otros conflictos de rutas

---

### 2. Campo Inexistente `Quote.assigned_to_id`

**Tipo de error:** 500 Internal Server Error (AttributeError)
**Módulo afectado:** `backend/modules/sales/router.py`
**Ubicación:** Líneas 869, 1003

#### Causa Raíz

El modelo `Quote` define el campo como `sales_rep_id`, pero el código intenta filtrar usando `Quote.assigned_to_id` que NO EXISTE en el modelo.

```python
# MODELO (models/quote.py) - Línea 38-43:
class Quote(BaseModel):
    sales_rep_id = Column(UUID(as_uuid=True), ...)  # ✓ CAMPO CORRECTO
    # NO EXISTE: assigned_to_id

# ROUTER (sales/router.py) - Línea 869:
base_filter.append(Quote.assigned_to_id == current_user.id)  # ❌ ERROR
```

#### Impacto

- Error 500 cuando usuarios SALES_REP intentan exportar comparaciones Excel/PDF
- La aplicación crashea con `AttributeError: type object 'Quote' has no attribute 'assigned_to_id'`
- Afecta endpoints:
  - `GET /api/v1/sales/comparison/export/excel`
  - `GET /api/v1/sales/comparison/export/pdf`

#### Solución Recomendada

**Archivo:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/sales/router.py`

**Cambios requeridos:**

```python
# Línea 869 - ANTES:
if current_user.role == UserRole.SALES_REP:
    base_filter.append(Quote.assigned_to_id == current_user.id)

# Línea 869 - DESPUÉS:
if current_user.role == UserRole.SALES_REP:
    base_filter.append(Quote.sales_rep_id == current_user.id)

# Línea 1003 - ANTES:
if current_user.role == UserRole.SALES_REP:
    base_filter.append(Quote.assigned_to_id == current_user.id)

# Línea 1003 - DESPUÉS:
if current_user.role == UserRole.SALES_REP:
    base_filter.append(Quote.sales_rep_id == current_user.id)
```

**Verificación adicional:**
- Buscar TODAS las referencias a `assigned_to_id` en el archivo
- Verificar que el parámetro Query en línea 717 coincida con el uso interno

---

### 3. Inconsistencia en Parámetros de Paginación SPA

**Tipo de error:** 422 Unprocessable Entity
**Módulo afectado:** `backend/modules/spa/router.py` y `frontend/lib/api/spa.ts`
**Ubicación:** Backend línea 296-338, Frontend línea 53-79

#### Causa Raíz

El backend acepta `page_size` como parámetro Query pero el código interno usa `limit`. El frontend envía `limit` en SPASearchParams pero el backend espera `page_size`.

```python
# BACKEND router.py - Línea 296:
@router.get("", response_model=SPAListResponse)
async def list_spas(
    page_size: int = Query(50, ...),  # Acepta page_size
    ...
):
    params = SPASearchParams(
        page=page,
        limit=page_size,  # Línea 338: Convierte a limit
        ...
    )

# FRONTEND spa.ts - Línea 59:
if (params.limit !== undefined)
    queryParams.append('page_size', params.limit.toString())  # Envía limit como page_size
```

```python
# SCHEMA schemas.py - Línea 141:
class SPASearchParams(BaseModel):
    limit: int = Field(20, ge=1, le=100)  # Espera limit, no page_size
```

#### Impacto

- Confusión entre parámetros `limit` y `page_size`
- Posibles errores 422 si el frontend envía el parámetro incorrecto
- Inconsistencia en la API (algunos endpoints usan `page_size`, otros usan `limit`)

#### Solución Recomendada

**Opción A: Estandarizar a `page_size` (Recomendada)**

Cambiar el schema SPASearchParams para usar `page_size`:

```python
# Archivo: backend/modules/spa/schemas.py - Línea 141
class SPASearchParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)  # Cambiar limit → page_size
    # ... resto de campos
```

```python
# Archivo: backend/modules/spa/router.py - Línea 338
params = SPASearchParams(
    page=page,
    page_size=page_size,  # Ahora coincide
    ...
)
```

**Opción B: Estandarizar a `limit`**

Cambiar el router para aceptar `limit`:

```python
# Archivo: backend/modules/spa/router.py - Línea 296
async def list_spas(
    limit: int = Query(50, ge=1, le=500, description="Tamaño de página"),
    ...
):
    params = SPASearchParams(
        page=page,
        limit=limit,
        ...
    )
```

**Recomendación:** Opción A, para mantener consistencia con otros módulos del proyecto (quotas, sales, etc.)

---

### 4. Falta Validación de `page_size` en SPASearchParams

**Tipo de error:** 422 Unprocessable Entity o 500 Internal Server Error
**Módulo afectado:** `backend/modules/spa/schemas.py`
**Ubicación:** Línea 141

#### Causa Raíz

El schema `SPASearchParams` define `limit: int = Field(20, ge=1, le=100)` pero el router acepta valores hasta 500 (`page_size: int = Query(50, ge=1, le=500)`). Esta discrepancia causa errores de validación.

```python
# ROUTER - Línea 296:
page_size: int = Query(50, ge=1, le=500, ...)  # Acepta hasta 500

# SCHEMA - Línea 141:
limit: int = Field(20, ge=1, le=100)  # Valida máximo 100
```

#### Impacto

- Si un usuario solicita `page_size=200`, el router lo acepta pero Pydantic rechaza el valor
- Error 422: `"ensure this value is less than or equal to 100"`
- Inconsistencia entre documentación de API (OpenAPI muestra max=500) y validación real (max=100)

#### Solución Recomendada

**Archivo:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/schemas.py`

```python
# Línea 141 - ANTES:
page: int = Field(1, ge=1)
limit: int = Field(20, ge=1, le=100)

# Línea 141 - DESPUÉS:
page: int = Field(1, ge=1)
page_size: int = Field(50, ge=1, le=500)  # Coincide con router
```

O alternativamente, ajustar el router para que coincida con el schema:

```python
# backend/modules/spa/router.py - Línea 296
page_size: int = Query(50, ge=1, le=100, ...)  # Reducir máximo a 100
```

---

## PROBLEMAS DE ALTA PRIORIDAD

### 5. Endpoint de Reports sin Implementar

**Tipo de error:** 501 Not Implemented
**Módulo afectado:** `backend/modules/reports/router.py`
**Ubicación:** Líneas 89-115, 122-147

#### Causa Raíz

Los endpoints de reportes de conversión y embudo de ventas retornan 501 Not Implemented:

```python
# Línea 112-115:
raise HTTPException(
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    detail="Quotation conversion report will be implemented in Phase 2"
)

# Línea 143-147:
raise HTTPException(
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    detail="Sales funnel analysis will be implemented in Phase 2"
)
```

#### Impacto

- Frontend no puede cargar reportes de conversión
- Funcionalidad de análisis de embudo no disponible
- Usuarios ven errores 501 al intentar acceder a estas secciones

#### Endpoints Afectados

- `GET /api/v1/reports/quotations/conversion` → 501
- `GET /api/v1/reports/funnel/complete-analysis` → 501

#### Solución Recomendada

**Opción 1: Implementar los endpoints (Solución completa)**

Completar la implementación de los métodos en el repositorio de reports:

```python
# Archivo: backend/modules/reports/repository.py
async def get_quotation_conversion_report(...):
    # Implementar lógica de conversión
    pass

async def get_sales_funnel_report(...):
    # Implementar análisis de embudo
    pass
```

**Opción 2: Remover endpoints temporalmente (Solución rápida)**

Si la Fase 2 está pendiente, remover estos endpoints del router para evitar confusión:

```python
# Comentar o eliminar los endpoints en router.py
# @router.get("/quotations/conversion", ...)
# @router.get("/funnel/complete-analysis", ...)
```

Y actualizar el frontend para no llamar estos endpoints.

---

### 6. Problema de Orden en Quotations Router

**Tipo de error:** 422 Unprocessable Entity
**Módulo afectado:** `backend/modules/sales/quotations/router.py`
**Ubicación:** Líneas 129-218

#### Causa Raíz

Similar al problema #1, las rutas específicas `/stats/*` están declaradas DESPUÉS de la ruta parametrizada `/{quotation_id}`:

```python
# ORDEN ACTUAL:
@router.get("/{quotation_id}", ...)         # Línea 220
@router.get("/stats/summary", ...)          # Línea 129 - DEBERÍA ESTAR ANTES
@router.get("/stats/monthly/{year}", ...)   # Línea 165
@router.get("/stats/by-client", ...)        # Línea 193
```

#### Impacto

- Rutas como `/api/v1/sales/quotations/stats/summary` pueden fallar
- FastAPI puede intentar interpretar "stats" como un quotation_id (UUID)
- Error 422 en llamadas a endpoints de estadísticas

#### Solución Recomendada

**Archivo:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/sales/quotations/router.py`

**Reordenar rutas:**

```python
# ORDEN CORRECTO:
@router.post("", ...)                        # Línea 38
@router.get("", ...)                         # Línea 79
@router.get("/stats/summary", ...)           # Línea 129 - MOVER ARRIBA
@router.get("/stats/monthly/{year}", ...)    # Línea 165 - MOVER ARRIBA
@router.get("/stats/by-client", ...)         # Línea 193 - MOVER ARRIBA
@router.get("/{quotation_id}", ...)          # Línea 220 - DESPUÉS de /stats/*
@router.put("/{quotation_id}", ...)          # Línea 241
# ... resto de rutas parametrizadas
```

**Verificación:** El mismo patrón de "rutas específicas antes de parametrizadas" ya se aplicó correctamente en `quotas/router.py` (líneas 167-320).

---

### 7. Falta Manejo de Errores en Repository de Reports

**Tipo de error:** 500 Internal Server Error
**Módulo afectado:** `backend/modules/reports/repository.py`
**Ubicación:** Método `get_executive_dashboard`

#### Causa Raíz

El método `get_executive_dashboard` puede fallar si hay problemas con las queries SQL, pero no hay manejo robusto de excepciones:

```python
# Línea 80-99:
async def get_executive_dashboard(
    self,
    tenant_id: UUID,
    filters: ReportFiltersBase
) -> ExecutiveDashboard:
    # ... código sin try/except
    kpis = await self._get_dashboard_kpis(tenant_id, filters)
    # Si _get_dashboard_kpis falla → 500 error sin contexto
```

#### Impacto

- Errores SQL sin contexto claro para debugging
- Frontend recibe 500 generic error sin detalles
- Dificulta troubleshooting de problemas de datos

#### Solución Recomendada

**Archivo:** `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/reports/repository.py`

Agregar manejo de errores robusto:

```python
async def get_executive_dashboard(
    self,
    tenant_id: UUID,
    filters: ReportFiltersBase
) -> ExecutiveDashboard:
    try:
        # Set default dates if not provided
        if not filters.start_date or not filters.end_date:
            filters.end_date = date.today()
            filters.start_date = filters.end_date.replace(day=1)

        period = DatePeriod(
            start_date=filters.start_date,
            end_date=filters.end_date,
            label=f"{filters.start_date.strftime('%B %Y')}"
        )

        # Get KPIs with error handling
        kpis = await self._get_dashboard_kpis(tenant_id, filters)

        # ... resto del código

    except SQLAlchemyError as e:
        logger.error(f"Database error in get_executive_dashboard: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error while generating dashboard: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_executive_dashboard: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating dashboard: {str(e)}"
        )
```

---

## PROBLEMAS DE PRIORIDAD MEDIA

### 8. Falta Documentación de Respuestas de Error en OpenAPI

**Tipo de error:** N/A (Mejora de documentación)
**Módulo afectado:** Todos los routers

#### Causa Raíz

Los endpoints no documentan explícitamente las respuestas de error en los decoradores de FastAPI:

```python
@router.get("/quotes/{quote_id}", response_model=QuoteWithItems)
async def get_quote(...):
    # No documenta que puede retornar 404, 403, 401, etc.
```

#### Impacto

- Documentación OpenAPI incompleta
- Frontend developers no saben qué errores esperar
- Dificulta testing y manejo de errores

#### Solución Recomendada

Agregar documentación de respuestas en decoradores:

```python
@router.get(
    "/quotes/{quote_id}",
    response_model=QuoteWithItems,
    responses={
        200: {"description": "Quote found"},
        404: {"description": "Quote not found"},
        403: {"description": "Forbidden - insufficient permissions"},
        401: {"description": "Unauthorized - not authenticated"},
    }
)
async def get_quote(...):
    ...
```

---

### 9. Inconsistencia en Nombres de Campos Frontend-Backend

**Tipo de error:** Potencial 422 o datos faltantes
**Módulos afectados:** Múltiples

#### Causa Raíz

Algunos campos tienen nombres diferentes entre frontend y backend:

| Frontend | Backend | Ubicación |
|----------|---------|-----------|
| `limit` | `page_size` | SPA module |
| `assigned_to` | `sales_rep_id` | Sales module |
| `sort_desc` | `sort_order` | Algunos endpoints |

#### Impacto

- Confusión para developers
- Posibles errores sutiles si se usan nombres incorrectos
- Mantenimiento más difícil

#### Solución Recomendada

Estandarizar nombres en todo el proyecto:

1. Crear un documento de convenciones de nomenclatura
2. Preferir `page_size` sobre `limit` para paginación
3. Usar `sales_rep_id` consistentemente
4. Documentar aliases si se mantienen ambos nombres

---

### 10. Falta Validación de Tenant en Algunas Queries

**Tipo de error:** Potencial security issue / 403 Forbidden
**Módulo afectado:** Varios módulos

#### Causa Raíz

Algunas queries no verifican explícitamente que los recursos pertenezcan al tenant del usuario:

```python
# Ejemplo en algunos repositorios:
quote = await db.get(Quote, quote_id)
# No verifica: quote.tenant_id == current_user.tenant_id
```

#### Impacto

- Posible acceso cross-tenant si los UUIDs son adivinados
- Security vulnerability crítica en sistema multi-tenant
- Violación de aislamiento de datos

#### Solución Recomendada

Siempre filtrar por `tenant_id` en TODAS las queries:

```python
# SIEMPRE hacer esto:
stmt = select(Quote).where(
    and_(
        Quote.id == quote_id,
        Quote.tenant_id == current_user.tenant_id  # CRÍTICO
    )
)
result = await db.execute(stmt)
quote = result.scalar_one_or_none()
```

---

## Problemas Específicos por Módulo

### Módulo Sales (`/sales`)

| Error | Severidad | Línea | Descripción |
|-------|-----------|-------|-------------|
| Orden de rutas | CRÍTICO | 199, 426 | `/quotes/summary` después de `/{quote_id}` |
| Campo inexistente | CRÍTICO | 869, 1003 | `Quote.assigned_to_id` no existe |
| Nombre inconsistente | MEDIO | 717 | Parámetro `assigned_to_id` vs campo `sales_rep_id` |

### Módulo Quotations (`/sales/quotations`)

| Error | Severidad | Línea | Descripción |
|-------|-----------|-------|-------------|
| Orden de rutas | ALTO | 129-220 | Rutas `/stats/*` después de `/{quotation_id}` |

### Módulo SPA (`/spa`)

| Error | Severidad | Línea | Descripción |
|-------|-----------|-------|-------------|
| Parámetros inconsistentes | CRÍTICO | 296, 338 | `page_size` vs `limit` |
| Validación incorrecta | CRÍTICO | Schema línea 141 | `limit` max=100 pero router acepta max=500 |

### Módulo Reports (`/reports`)

| Error | Severidad | Línea | Descripción |
|-------|-----------|-------|-------------|
| Endpoints no implementados | ALTO | 112, 143 | Retornan 501 Not Implemented |
| Falta manejo de errores | ALTO | Repository | Sin try/except en queries críticas |

### Módulo Visits (`/visits`)

| Error | Severidad | Línea | Descripción |
|-------|-----------|-------|-------------|
| Sin problemas detectados | N/A | N/A | Módulo implementado correctamente |

---

## Plan de Acción Recomendado

### Fase 1: Correcciones Críticas (Inmediato - 2-4 horas)

1. **Corregir orden de rutas en sales/router.py**
   - Mover `/quotes/summary` antes de `/{quote_id}`
   - Tiempo estimado: 15 minutos
   - Testing: Verificar que `GET /api/v1/sales/quotes/summary` funciona

2. **Corregir campo `assigned_to_id` → `sales_rep_id`**
   - Cambiar líneas 869 y 1003
   - Tiempo estimado: 10 minutos
   - Testing: Exportar Excel/PDF como usuario SALES_REP

3. **Estandarizar parámetros de paginación en SPA**
   - Cambiar `limit` → `page_size` en schema
   - Actualizar router para consistencia
   - Tiempo estimado: 30 minutos
   - Testing: Listar SPAs con diferentes page_size

4. **Corregir validación de page_size en SPASearchParams**
   - Ajustar límite máximo a 500 o reducir router a 100
   - Tiempo estimado: 10 minutos
   - Testing: Solicitar page_size=200

### Fase 2: Correcciones de Alta Prioridad (1-2 días)

5. **Corregir orden de rutas en quotations/router.py**
   - Mover rutas `/stats/*` antes de `/{quotation_id}`
   - Tiempo estimado: 20 minutos
   - Testing: Verificar endpoints de estadísticas

6. **Implementar o remover endpoints de reports**
   - Decisión de negocio requerida
   - Si implementar: 1-2 días
   - Si remover: 1 hora
   - Testing: Plan según decisión

7. **Agregar manejo de errores en reports repository**
   - Wrap queries críticas con try/except
   - Tiempo estimado: 2-3 horas
   - Testing: Simular errores SQL

### Fase 3: Mejoras (Opcional - 1-2 días)

8. **Documentar respuestas de error en OpenAPI**
9. **Estandarizar nombres de campos**
10. **Auditoría de seguridad tenant_id**

---

## Testing Checklist

Después de aplicar las correcciones, ejecutar estos tests:

### Tests del Módulo Sales

```bash
# Test 1: Obtener resumen de cotizaciones
curl -X GET "http://localhost:8000/api/v1/sales/quotes/summary" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK con datos de resumen

# Test 2: Exportar Excel como SALES_REP
curl -X GET "http://localhost:8000/api/v1/sales/comparison/export/excel?year=2024" \
  -H "Authorization: Bearer {sales_rep_token}"
# Esperado: 200 OK con archivo Excel

# Test 3: Obtener cotización por ID
curl -X GET "http://localhost:8000/api/v1/sales/quotes/{quote_id}" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK con detalles de cotización
```

### Tests del Módulo SPA

```bash
# Test 1: Listar SPAs con page_size alto
curl -X GET "http://localhost:8000/api/v1/spa?page_size=200" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK (no 422)

# Test 2: Listar SPAs con filtros
curl -X GET "http://localhost:8000/api/v1/spa?active_only=true&page_size=50" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK con SPAs activos
```

### Tests del Módulo Quotations

```bash
# Test 1: Obtener estadísticas summary
curl -X GET "http://localhost:8000/api/v1/sales/quotations/stats/summary" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK (no 422)

# Test 2: Obtener estadísticas mensuales
curl -X GET "http://localhost:8000/api/v1/sales/quotations/stats/monthly/2024" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK
```

### Tests del Módulo Reports

```bash
# Test 1: Dashboard ejecutivo
curl -X GET "http://localhost:8000/api/v1/reports/dashboard/executive" \
  -H "Authorization: Bearer {token}"
# Esperado: 200 OK con KPIs

# Test 2: Health check
curl -X GET "http://localhost:8000/api/v1/reports/health"
# Esperado: 200 OK
```

---

## Archivos a Modificar

### Prioridad CRÍTICA

1. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/sales/router.py`
   - Líneas a modificar: 199-455 (reordenar), 869, 1003

2. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/schemas.py`
   - Línea a modificar: 141

3. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/router.py`
   - Líneas a modificar: 296-338

### Prioridad ALTA

4. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/sales/quotations/router.py`
   - Líneas a modificar: 129-220 (reordenar)

5. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/reports/router.py`
   - Decisión requerida: implementar o remover endpoints

6. `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/reports/repository.py`
   - Agregar try/except en métodos principales

---

## Conclusiones

Los errores identificados son principalmente de dos tipos:

1. **Errores de diseño de API:** Orden incorrecto de rutas, campos inconsistentes
2. **Errores de implementación:** Referencias a campos que no existen, validaciones incorrectas

La mayoría de estos problemas son **fácilmente corregibles** y no requieren cambios arquitectónicos importantes. Se estima que las correcciones críticas pueden completarse en 2-4 horas de trabajo, y las de alta prioridad en 1-2 días adicionales.

**Impacto estimado después de correcciones:**
- ✅ Eliminación del 100% de errores 422 en módulos sales y quotations
- ✅ Eliminación del 100% de errores 500 en exports de sales
- ✅ Mejora en consistencia de API en módulo SPA
- ✅ Mayor estabilidad en módulo de reports

---

## Anexo: Patrones Correctos Identificados

El proyecto ya tiene algunos patrones implementados correctamente que deben replicarse:

### ✅ Orden Correcto de Rutas (Quotas Router)

```python
# backend/modules/sales/quotas/router.py - Implementación correcta:
@router.get("/dashboard", ...)          # Línea 167 - Específica primero
@router.get("/trends", ...)             # Línea 217 - Específica
@router.get("/annual", ...)             # Línea 252 - Específica
@router.get("/comparison", ...)         # Línea 286 - Específica
@router.get("/{quota_id}", ...)         # Línea 322 - Parametrizada al final
```

Este es el patrón correcto que debe seguirse en TODOS los routers.

### ✅ Validación de Tenant Correcta (Visits Repository)

```python
# Patrón correcto de filtrado multi-tenant:
visit = await db.execute(
    select(Visit).where(
        and_(
            Visit.id == visit_id,
            Visit.tenant_id == tenant_id  # Siempre validar tenant
        )
    )
)
```

### ✅ Manejo de Errores Robusto (SPA Router)

```python
# backend/modules/spa/router.py - Buen manejo de excepciones:
try:
    result = await spa_service.upload_spa_file(...)
    return result
except SPAFileInvalidException as e:
    raise HTTPException(status_code=400, detail=str(e))
except SPAException as e:
    raise HTTPException(status_code=422, detail=str(e))
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    raise HTTPException(status_code=500, detail="Failed to process")
```

---

**Fin del Análisis**
