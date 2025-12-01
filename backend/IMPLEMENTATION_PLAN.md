# Plan de Implementación Detallado - Módulo SPA

## Resumen Ejecutivo

Este documento detalla el plan paso a paso para implementar el módulo completo de Special Pricing Agreements (SPA) en OnQuota.

**Duración estimada**: 3-5 días de desarrollo
**Complejidad**: Media-Alta
**Dependencias**: Sistema de autenticación, módulo de clientes

---

## Fase 1: Preparación de Base de Datos (30-45 min)

### 1.1 Crear Migración

```bash
cd /Users/josegomez/Documents/Code/SaaS/07\ -\ OnQuota/backend

# Crear migración
alembic revision -m "add_spa_module"
```

### 1.2 Editar Migración

El archivo ya está creado en:
```
/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/alembic/versions/add_spa_module.py
```

**Acción**: Revisar el archivo y ajustar `down_revision` al ID de la última migración.

### 1.3 Aplicar Migración

```bash
# Revisar SQL que se ejecutará (dry-run)
alembic upgrade head --sql

# Aplicar migración
alembic upgrade head

# Verificar
alembic current
```

### 1.4 Verificar Estructura

```bash
# Conectar a PostgreSQL
psql -d onquota_db

# Verificar tablas
\dt spa_*

# Verificar estructura
\d spa_agreements
\d spa_upload_logs

# Verificar columna en clients
\d clients

# Verificar índices
\di spa_*
```

### 1.5 Rollback (si es necesario)

```bash
# Revertir migración
alembic downgrade -1

# Verificar
alembic current
```

---

## Fase 2: Backend - Modelos y Schemas (1 hora)

### 2.1 Modelos SQLAlchemy

**Archivos a verificar**:
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/models.py`

**Checklist**:
- [ ] Modelo `SPAAgreement` con todos los campos
- [ ] Modelo `SPAUploadLog` completo
- [ ] Relaciones con `Client`, `User`, `Tenant`
- [ ] Métodos `__repr__` y `to_dict()`

### 2.2 Schemas Pydantic

**Archivos a verificar**:
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/schemas.py`

**Schemas requeridos**:
- [ ] `SPARowData` - Para parsing
- [ ] `SPAAgreementBase`, `SPAAgreementCreate`, `SPAAgreementResponse`
- [ ] `SPAAgreementWithClient` - Con datos de cliente
- [ ] `SPADiscountSearchRequest`, `SPADiscountResponse`, `SPADiscountMatch`
- [ ] `SPAUploadResult` - Resultado de upload
- [ ] `SPASearchParams`, `SPAListResponse`
- [ ] `SPAStatsResponse`
- [ ] `SPAUploadLogResponse`

### 2.3 Testing de Modelos

```bash
# Crear archivo de test
touch /Users/josegomez/Documents/Code/SaaS/07\ -\ OnQuota/backend/tests/spa/test_models.py
```

```python
# tests/spa/test_models.py
import pytest
from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

from modules.spa.models import SPAAgreement, SPAUploadLog
from modules.clients.models import Client
from modules.users.models import User

@pytest.mark.asyncio
async def test_spa_agreement_creation(db_session, test_tenant, test_client, test_user):
    spa = SPAAgreement(
        id=uuid4(),
        tenant_id=test_tenant.id,
        client_id=test_client.id,
        batch_id=uuid4(),
        bpid="12345",
        ship_to_name="Test Customer",
        article_number="ART-001",
        list_price=Decimal("100.00"),
        app_net_price=Decimal("80.00"),
        discount_percent=Decimal("20.00"),
        uom="EA",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 12, 31),
        is_active=True,
        created_by=test_user.id
    )

    db_session.add(spa)
    await db_session.commit()

    assert spa.id is not None
    assert spa.discount_percent == Decimal("20.00")

# Ejecutar tests
pytest tests/spa/test_models.py -v
```

---

## Fase 3: Backend - Repository Layer (1.5 horas)

### 3.1 Implementar Repository

**Archivo**: `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/repository.py`

**Métodos a verificar**:
- [ ] `bulk_create()` - Inserción en batch
- [ ] `find_by_client()` - SPAs de un cliente
- [ ] `find_active_discount()` - Búsqueda de descuento
- [ ] `list_with_filters()` - Lista con paginación
- [ ] `get_with_client()` - Detalle con JOIN
- [ ] `get_stats()` - Estadísticas agregadas
- [ ] `soft_delete()` - Eliminación lógica
- [ ] `get_upload_history()` - Historial de uploads

### 3.2 Testing de Repository

```python
# tests/spa/test_repository.py
import pytest
from modules.spa.repository import SPARepository

@pytest.mark.asyncio
async def test_bulk_create(db_session, sample_spas):
    repo = SPARepository()
    created = await repo.bulk_create(sample_spas, db_session)

    assert len(created) == len(sample_spas)
    assert all(spa.id is not None for spa in created)

@pytest.mark.asyncio
async def test_find_active_discount(db_session, test_spa, test_tenant):
    repo = SPARepository()
    result = await repo.find_active_discount(
        client_id=test_spa.client_id,
        article_number=test_spa.article_number,
        tenant_id=test_tenant.id,
        db=db_session
    )

    assert result is not None
    assert result.id == test_spa.id

# Ejecutar
pytest tests/spa/test_repository.py -v
```

---

## Fase 4: Backend - Service Layer (2 horas)

### 4.1 Implementar Services

**Archivos**:
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/service.py` ✅
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/excel_parser.py` ✅
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/exceptions.py` ✅

### 4.2 Testing de Service

```python
# tests/spa/test_service.py
import pytest
from io import BytesIO
from fastapi import UploadFile
from modules.spa.service import SPAService

@pytest.mark.asyncio
async def test_upload_spa_file(db_session, sample_excel_file, test_user, test_tenant):
    service = SPAService(spa_repo, client_repo)

    upload_file = UploadFile(
        filename="test.xlsx",
        file=BytesIO(sample_excel_file)
    )

    result = await service.upload_spa_file(
        file=upload_file,
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        auto_create_clients=True,
        db=db_session
    )

    assert result.total_rows > 0
    assert result.success_count > 0

# Ejecutar
pytest tests/spa/test_service.py -v
```

### 4.3 Testing de Excel Parser

```python
# tests/spa/test_parser.py
import pytest
import pandas as pd
from modules.spa.excel_parser import ExcelParserService

def test_validate_columns():
    df = pd.DataFrame({
        'BPID': ['12345'],
        'Ship To Name': ['Customer'],
        'Article Number': ['ART-001'],
        'List Price': [100.00],
        'App Net Price': [80.00],
        'Start Date': ['2025-01-01'],
        'End Date': ['2025-12-31']
    })

    result = ExcelParserService.validate_columns(df)
    assert result['valid'] == True
    assert len(result['missing']) == 0

# Ejecutar
pytest tests/spa/test_parser.py -v
```

---

## Fase 5: Backend - API Router (1.5 horas)

### 5.1 Implementar Endpoints

**Archivo**: `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/router.py` ✅

**Endpoints a verificar**:
- [ ] `POST /spa/upload` - Upload archivo
- [ ] `GET /spa` - Lista con filtros
- [ ] `GET /spa/{spa_id}` - Detalle
- [ ] `GET /spa/client/{client_id}` - SPAs de cliente
- [ ] `POST /spa/search-discount` - Búsqueda de descuento
- [ ] `GET /spa/stats` - Estadísticas
- [ ] `GET /spa/export` - Exportar a Excel
- [ ] `DELETE /spa/{spa_id}` - Soft delete
- [ ] `GET /spa/uploads/history` - Historial

### 5.2 Registrar Router en FastAPI

```python
# main.py o app.py
from modules.spa.router import router as spa_router

app.include_router(spa_router, prefix="/api")
```

### 5.3 Testing de API

```bash
# Iniciar servidor
uvicorn main:app --reload --port 8000

# En otra terminal, probar endpoints
curl -X GET http://localhost:8000/api/spa/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Upload test
curl -X POST http://localhost:8000/api/spa/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@sample_spa.xlsx" \
  -F "auto_create_clients=false"
```

```python
# tests/spa/test_api.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_spas(client: AsyncClient, auth_headers):
    response = await client.get("/api/spa", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert 'items' in data
    assert 'total' in data

@pytest.mark.asyncio
async def test_search_discount(client: AsyncClient, auth_headers, test_spa):
    payload = {
        "client_id": str(test_spa.client_id),
        "article_number": test_spa.article_number
    }
    response = await client.post(
        "/api/spa/search-discount",
        json=payload,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data['found'] == True

# Ejecutar
pytest tests/spa/test_api.py -v
```

---

## Fase 6: Backend - Celery Tasks (1 hora)

### 6.1 Configurar Celery Tasks

**Archivo**: `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/modules/spa/tasks.py` ✅

### 6.2 Registrar en Celery Beat

```python
# celery_config.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'update-spa-active-status': {
        'task': 'spa.update_active_status',
        'schedule': crontab(hour=0, minute=0),  # Diario a medianoche
    },
    'notify-expiring-spas': {
        'task': 'spa.notify_expiring_spas',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Lunes 9am
        'kwargs': {'days_before': 30}
    },
    'cleanup-spa-upload-logs': {
        'task': 'spa.cleanup_old_uploads',
        'schedule': crontab(day_of_month=1, hour=2, minute=0),  # Mensual
        'kwargs': {'days_to_keep': 90}
    },
}
```

### 6.3 Testing de Tasks

```bash
# Ejecutar tarea manualmente
celery -A celery_app call spa.update_active_status

# Ver logs
celery -A celery_app worker --loglevel=info
```

---

## Fase 7: Frontend - Infraestructura (2 horas)

### 7.1 Types TypeScript

**Archivo**: `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/types/spa.ts` ✅

### 7.2 API Client

**Archivo**: `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/lib/api/spa.ts` ✅

### 7.3 React Hooks

**Archivos creados**:
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/hooks/spa/useSPAUpload.ts` ✅
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/hooks/spa/useSPAs.ts` ✅
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/hooks/spa/useSPAStats.ts` ✅
- `/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/frontend/hooks/spa/useSPADiscount.ts` ✅

---

## Fase 8: Frontend - Componentes (3 horas)

### 8.1 Componentes Base

**Archivos a crear**:

```typescript
// SPATable.tsx
export function SPATable({
  spas,
  loading,
  onRowClick,
  onDelete
}: SPATableProps) {
  // Tabla con filtros, sorting, paginación
}

// SPASearchBar.tsx
export function SPASearchBar({
  onSearch,
  filters,
  onFilterChange
}: SPASearchBarProps) {
  // Barra de búsqueda con filtros
}

// SPADetailCard.tsx
export function SPADetailCard({
  spa
}: SPADetailCardProps) {
  // Card con detalle completo de SPA
}

// SPAStatusBadge.tsx
export function SPAStatusBadge({
  isActive,
  startDate,
  endDate
}: SPAStatusBadgeProps) {
  // Badge de estado (Active, Expired, Future)
}

// ClientSPAsList.tsx
export function ClientSPAsList({
  clientId,
  activeOnly
}: ClientSPAsListProps) {
  const { data, loading } = useClientSPAs(clientId, activeOnly);

  // Lista de SPAs para mostrar en página de cliente
}

// SPAStatsCards.tsx
export function SPAStatsCards() {
  const { data, loading } = useSPAStats();

  // Cards con estadísticas
}
```

### 8.2 Estructura de Archivos

```
frontend/
├── components/
│   └── spa/
│       ├── SPAUploadForm.tsx ✅
│       ├── SPATable.tsx
│       ├── SPASearchBar.tsx
│       ├── SPADetailCard.tsx
│       ├── SPAStatusBadge.tsx
│       ├── ClientSPAsList.tsx
│       └── SPAStatsCards.tsx
├── hooks/
│   └── spa/
│       ├── useSPAUpload.ts ✅
│       ├── useSPAs.ts ✅
│       ├── useSPAStats.ts ✅
│       └── useSPADiscount.ts ✅
├── lib/
│   └── api/
│       └── spa.ts ✅
└── types/
    └── spa.ts ✅
```

---

## Fase 9: Frontend - Páginas (2 horas)

### 9.1 Páginas a Crear

```typescript
// app/(dashboard)/spa/page.tsx
export default function SPAListPage() {
  const [params, setParams] = useState<SPASearchParams>({
    page: 1,
    page_size: 50
  });
  const { data, loading } = useSPAs(params);

  return (
    <div>
      <SPASearchBar onSearch={setParams} />
      <SPATable spas={data?.items} loading={loading} />
    </div>
  );
}

// app/(dashboard)/spa/upload/page.tsx
export default function SPAUploadPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <SPAUploadForm />
    </div>
  );
}

// app/(dashboard)/spa/[id]/page.tsx
export default function SPADetailPage({ params }: { params: { id: string } }) {
  const { data: spa, loading } = useSPADetail(params.id);

  if (loading) return <LoadingSpinner />;
  if (!spa) return <NotFound />;

  return <SPADetailCard spa={spa} />;
}

// app/(dashboard)/spa/stats/page.tsx
export default function SPAStatsPage() {
  const { data, loading } = useSPAStats();

  return (
    <div>
      <SPAStatsCards />
      {/* Charts, graphs, etc. */}
    </div>
  );
}
```

### 9.2 Rutas a Configurar

```typescript
// navigation.ts
export const navigation = [
  // ...
  {
    name: 'SPAs',
    href: '/spa',
    icon: DocumentTextIcon,
    children: [
      { name: 'All SPAs', href: '/spa' },
      { name: 'Upload', href: '/spa/upload' },
      { name: 'Statistics', href: '/spa/stats' }
    ]
  }
];
```

---

## Fase 10: Testing End-to-End (2 horas)

### 10.1 Checklist de Pruebas Backend

- [ ] **Upload SPA válido**
  - Archivo Excel con 10 registros válidos
  - Verificar que se crean 10 SPAs
  - Verificar log de upload

- [ ] **Upload con errores**
  - Archivo con 5 válidos, 5 inválidos
  - Verificar que se procesan 5, se reportan 5 errores

- [ ] **Auto-create clients**
  - Upload con BPID desconocido
  - Verificar que se crea cliente nuevo

- [ ] **Búsqueda de descuento**
  - Buscar descuento activo existente → found=True
  - Buscar descuento inexistente → found=False

- [ ] **Filtros y paginación**
  - Lista con filtro por cliente
  - Lista con filtro active_only
  - Paginación correcta

- [ ] **Soft delete**
  - Eliminar SPA
  - Verificar deleted_at != NULL
  - Verificar que no aparece en lista

- [ ] **Exportar a Excel**
  - Exportar todos
  - Exportar con filtros
  - Verificar contenido del archivo

### 10.2 Checklist de Pruebas Frontend

- [ ] **Upload form**
  - Seleccionar archivo
  - Ver progreso
  - Ver resultado con errores
  - Upload otro archivo

- [ ] **Lista de SPAs**
  - Ver tabla paginada
  - Aplicar filtros
  - Ordenar columnas
  - Click en fila → ir a detalle

- [ ] **Detalle de SPA**
  - Ver toda la información
  - Ver badge de estado
  - Ver info del cliente

- [ ] **Cliente → SPAs**
  - Desde página de cliente, ver SPAs activos
  - Buscar artículo específico
  - Ver descuento aplicable

- [ ] **Estadísticas**
  - Ver cards con métricas
  - Actualización en tiempo real

### 10.3 Pruebas de Performance

```python
# tests/performance/test_spa_bulk.py
import pytest
import time

@pytest.mark.asyncio
async def test_bulk_insert_1000_spas(db_session, sample_spas_1000):
    repo = SPARepository()

    start = time.time()
    created = await repo.bulk_create(sample_spas_1000, db_session)
    duration = time.time() - start

    assert len(created) == 1000
    assert duration < 5.0  # Menos de 5 segundos
```

---

## Fase 11: Documentación (1 hora)

### 11.1 API Documentation

Asegurar que FastAPI genera documentación automática:

```
http://localhost:8000/docs#/SPA
```

### 11.2 README del Módulo

```markdown
# SPA Module

## Overview
Gestión de Special Pricing Agreements con upload masivo y búsqueda de descuentos.

## Features
- Upload Excel/TSV con validación
- Auto-creación de clientes
- Búsqueda de descuentos por cliente/producto
- Gestión de vigencias
- Estadísticas y reporting

## API Endpoints
- POST /api/spa/upload
- GET /api/spa
- ...

## Database Schema
- spa_agreements
- spa_upload_logs

## Usage Examples
...
```

---

## Comandos de Implementación Secuencial

```bash
# 1. Migración
cd /Users/josegomez/Documents/Code/SaaS/07\ -\ OnQuota/backend
alembic upgrade head

# 2. Verificar modelos
python -c "from modules.spa.models import SPAAgreement; print('OK')"

# 3. Tests unitarios
pytest tests/spa/ -v

# 4. Iniciar servidor
uvicorn main:app --reload

# 5. En otra terminal, probar API
curl http://localhost:8000/api/spa/stats

# 6. Frontend - Instalar deps si es necesario
cd frontend
npm install

# 7. Iniciar dev server
npm run dev

# 8. Abrir browser
open http://localhost:3000/spa
```

---

## Rollback Plan

Si algo falla:

```bash
# Backend
alembic downgrade -1  # Revertir migración

# Frontend
git checkout -- frontend/  # Revertir cambios

# Database
psql -d onquota_db
DROP TABLE spa_agreements CASCADE;
DROP TABLE spa_upload_logs CASCADE;
ALTER TABLE clients DROP COLUMN bpid;
```

---

## Métricas de Éxito

- [ ] Migración aplicada sin errores
- [ ] 100% de tests pasando
- [ ] API responde a todos los endpoints
- [ ] Frontend se compila sin errores
- [ ] Upload de archivo funciona end-to-end
- [ ] Búsqueda de descuento retorna resultados
- [ ] Performance: Upload de 1000 registros < 10 segundos

---

## Siguientes Pasos Post-Implementación

1. **Monitoreo**: Configurar alertas para uploads fallidos
2. **Analytics**: Track de uso de búsqueda de descuentos
3. **Optimización**: Índices adicionales según queries reales
4. **Features**: Bulk edit, historial de cambios
5. **Integración**: Conectar con sistema de cotización

---

## Contacto y Soporte

Para dudas o problemas durante la implementación, revisar:
- Logs de backend: `logs/app.log`
- Logs de Celery: `logs/celery.log`
- Console del browser para frontend
