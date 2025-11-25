# Plan de Desarrollo OnQuota

**Versión:** 1.0
**Fecha:** 2025-11-09
**Responsable:** Tech Lead OnQuota

---

## Índice

1. [Fase Actual: Completar Módulo de Ventas](#fase-actual-completar-módulo-de-ventas)
2. [Fase 2: Dashboard General](#fase-2-dashboard-general)
3. [Fase 3: Módulo de Transporte](#fase-3-módulo-de-transporte)
4. [Fase 4: Servicio OCR](#fase-4-servicio-ocr)
5. [Fase 5: SPA Analytics](#fase-5-spa-analytics)
6. [Fase 6: Notificaciones](#fase-6-notificaciones)
7. [Fase 7: Account Planner](#fase-7-account-planner)
8. [Timeline y Dependencias](#timeline-y-dependencias)

---

## Fase Actual: Completar Módulo de Ventas

**Estado:** 🟡 60% Completado
**Prioridad:** CRÍTICA
**Tiempo Estimado:** 8-12 horas

### Contexto

El módulo de ventas tiene implementados los modelos, schemas, repository y hooks, pero falta la capa de presentación (backend router y frontend components/pages).

### Tareas Backend (4-6 horas)

#### 1. Crear Router de Ventas
**Archivo:** `/backend/modules/sales/router.py`
**Tiempo estimado:** 3-4 horas

```python
# Estructura del archivo
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from uuid import UUID

router = APIRouter(prefix="/sales", tags=["sales"])

# 11 Endpoints a implementar:

@router.post("/quotes", response_model=QuoteWithItems, status_code=status.HTTP_201_CREATED)
async def create_quote(...)
    """
    Crear nueva cotización
    - Validar que client_id exista
    - Calcular totales automáticamente
    - Generar quote_number (QUOT-{YYYY}-{NNNN})
    - Crear quote + items en transacción
    """

@router.get("/quotes", response_model=QuoteListResponse)
async def list_quotes(...)
    """
    Listar cotizaciones con filtros
    - Filtros: status, client_id, date_from, date_to
    - Paginación
    - RBAC: sales_rep solo ve sus cotizaciones
    """

@router.get("/quotes/{quote_id}", response_model=QuoteWithItems)
async def get_quote(...)
    """
    Obtener detalle de cotización
    - Incluir items
    - Incluir datos de client y sales_rep
    - RBAC: verificar pertenencia
    """

@router.put("/quotes/{quote_id}", response_model=QuoteWithItems)
async def update_quote(...)
    """
    Actualizar cotización
    - Solo si status = DRAFT
    - Recalcular totales
    - Actualizar items (add/update/delete)
    """

@router.delete("/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(...)
    """
    Eliminar cotización (soft delete)
    - Solo si status = DRAFT
    """

@router.patch("/quotes/{quote_id}/status", response_model=QuoteResponse)
async def update_quote_status(...)
    """
    Cambiar estado de cotización
    - Validar transiciones válidas
    - DRAFT → SENT → ACCEPTED/REJECTED/EXPIRED
    """

@router.get("/quotes/summary", response_model=QuoteSummary)
async def get_quote_summary(...)
    """
    Estadísticas de cotizaciones
    - Total por estado
    - Monto total
    - Tasa de conversión
    - Filtros por fecha
    """

@router.post("/quotes/{quote_id}/items", response_model=QuoteItemResponse)
async def add_quote_item(...)
    """
    Agregar item a cotización
    - Solo si status = DRAFT
    - Recalcular total de quote
    """

@router.get("/quotes/{quote_id}/items", response_model=List[QuoteItemResponse])
async def list_quote_items(...)

@router.put("/quotes/{quote_id}/items/{item_id}", response_model=QuoteItemResponse)
async def update_quote_item(...)
    """
    Actualizar item
    - Recalcular subtotal y total de quote
    """

@router.delete("/quotes/{quote_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote_item(...)
    """
    Eliminar item
    - Recalcular total de quote
    - No permitir si es el último item
    """
```

**Validaciones Importantes:**
- Verificar que client_id existe antes de crear quote
- Calcular subtotales: `(quantity × unit_price) × (1 - discount_percent/100)`
- Calcular total: `sum(subtotales de items)`
- Solo permitir edición si status = DRAFT
- Transiciones de estado válidas:
  - DRAFT → SENT
  - SENT → ACCEPTED/REJECTED/EXPIRED
  - No regresar a estados anteriores

**Manejo de Errores:**
- 404: Quote not found
- 403: No autorizado (RBAC)
- 400: Validación fallida
- 409: Estado no permite operación

#### 2. Registrar Router en Main
**Archivo:** `/backend/main.py`
**Tiempo estimado:** 5 minutos

```python
from modules.sales.router import router as sales_router

app.include_router(sales_router, prefix="/api/v1")
```

#### 3. Ejecutar Migración
**Comando:** `alembic upgrade head`
**Tiempo estimado:** 2 minutos

Verificar con:
```bash
psql -U postgres -d onquota -c "\dt"
# Debe mostrar: quotes, quote_items
```

#### 4. Testing Backend
**Tiempo estimado:** 1-2 horas

Crear tests en `/backend/tests/test_sales.py`:
- Test crear cotización válida
- Test crear cotización sin items (debe fallar)
- Test listar cotizaciones (RBAC)
- Test actualizar estado
- Test eliminar item (no permitir si es el último)
- Test cálculo de totales

```bash
pytest tests/test_sales.py -v --cov=modules.sales
```

### Tareas Frontend (4-6 horas)

#### 1. Crear Componentes (3-4 horas)

##### a) SaleFilters.tsx
**Ruta:** `/frontend/components/sales/SaleFilters.tsx`
**Tiempo:** 30 min

```typescript
// Filtros: status, client_id, date_from, date_to
// Patrón: Similar a ExpenseFilters.tsx
```

##### b) StatusBadge.tsx
**Ruta:** `/frontend/components/sales/StatusBadge.tsx`
**Tiempo:** 15 min

```typescript
// Badge con colores según estado
// Patrón: Similar a CategoryBadge.tsx
```

##### c) QuoteItemsTable.tsx
**Ruta:** `/frontend/components/sales/QuoteItemsTable.tsx`
**Tiempo:** 45 min

```typescript
// Tabla editable de items (Create/Edit modal)
// Columnas: Producto, Descripción, Cantidad, Precio, Descuento, Subtotal
// Funcionalidad: Add, Edit, Delete rows
// Calcular subtotal automáticamente
// Mostrar total general al final
```

##### d) CreateSaleModal.tsx
**Ruta:** `/frontend/components/sales/CreateSaleModal.tsx`
**Tiempo:** 1 hora

```typescript
// Formulario con:
// - Select de cliente (autocomplete)
// - Select de moneda
// - Date picker para valid_until
// - Textarea para notes
// - QuoteItemsTable embebido
// Validación con Zod
// useForm de react-hook-form
```

##### e) EditSaleModal.tsx
**Ruta:** `/frontend/components/sales/EditSaleModal.tsx`
**Tiempo:** 1 hora

```typescript
// Similar a CreateSaleModal
// Solo permitir edición si status = DRAFT
// Prellenar datos de quote + items
```

##### f) SaleStats.tsx
**Ruta:** `/frontend/components/sales/SaleStats.tsx`
**Tiempo:** 1 hora

```typescript
// KPI Cards: Total cotizaciones, Por estado, Monto total, Tasa conversión
// Gráficos:
//   - Pie chart: Distribución por estado
//   - Bar chart: Monto por estado
//   - Line chart: Evolución temporal
// Patrón: Similar a ExpenseStats.tsx y ClientStats.tsx
```

#### 2. Crear Páginas (1 hora)

##### a) Lista de Ventas
**Ruta:** `/frontend/app/(dashboard)/sales/page.tsx`
**Tiempo:** 20 min

```typescript
// Header con título + botón "Nueva Cotización"
// Filtros (SaleFilters)
// Tabla con columnas:
//   - Número, Cliente, Fecha, Válido hasta, Estado, Monto, Acciones
// Paginación
// Modal de creación/edición
```

##### b) Detalle de Venta
**Ruta:** `/frontend/app/(dashboard)/sales/[id]/page.tsx`
**Tiempo:** 20 min

```typescript
// Header con botón "Volver"
// Card con info de quote
// Tabla de items
// Sección de notas
// Botones de acción: Editar (si DRAFT), Cambiar Estado
```

##### c) Estadísticas de Ventas
**Ruta:** `/frontend/app/(dashboard)/sales/stats/page.tsx`
**Tiempo:** 20 min

```typescript
// Header con título
// SaleStats component
```

#### 3. Actualizar Sidebar (15 min)

**Archivo:** `/frontend/components/layout/Sidebar.tsx`

```typescript
// Agregar en navigation array:
{
  name: 'Ventas',
  href: '/dashboard/sales',
  icon: TrendingUp,
  children: [
    { name: 'Cotizaciones', href: '/dashboard/sales' },
    { name: 'Estadísticas', href: '/dashboard/sales/stats' },
  ],
},
```

#### 4. Testing Frontend (Opcional - 1 hora)

```bash
# Tests básicos con Jest + React Testing Library
npm test -- sales
```

### Checklist de Completitud

**Backend:**
- [ ] Router creado con 11 endpoints
- [ ] Router registrado en main.py
- [ ] Migración ejecutada exitosamente
- [ ] Tests unitarios pasando
- [ ] Documentación OpenAPI generada

**Frontend:**
- [ ] 6 componentes creados
- [ ] 3 páginas creadas
- [ ] Sidebar actualizado
- [ ] Formularios con validación funcionando
- [ ] Tabla de items dinámica funcionando
- [ ] Gráficos renderizando correctamente

**Integración:**
- [ ] Crear cotización → Backend → Success
- [ ] Listar cotizaciones con filtros → Data correcta
- [ ] Cambiar estado → Actualización exitosa
- [ ] RBAC: Sales rep solo ve sus cotizaciones
- [ ] Paginación funcionando
- [ ] Manejo de errores (toast notifications)

---

## Fase 2: Dashboard General

**Prioridad:** ALTA
**Tiempo Estimado:** 16-20 horas
**Dependencias:** Módulo de Ventas completado

### Objetivo

Crear la página principal (Home) que muestre un resumen ejecutivo de todas las actividades del usuario.

### Tareas Backend (6-8 horas)

#### 1. Crear Módulo Dashboard
**Archivo:** `/backend/modules/dashboard/repository.py`
**Tiempo:** 4-5 horas

```python
class DashboardRepository:
    async def get_overview(self, tenant_id: str, user: User, date_from: date, date_to: date):
        """
        Agregación de datos de múltiples módulos
        """
        return {
            "sales": {
                "total_amount": ...,
                "quotes_count": ...,
                "conversion_rate": ...,
                "by_status": [...]
            },
            "expenses": {
                "total_amount": ...,
                "count": ...,
                "by_category": [...]
            },
            "clients": {
                "total": ...,
                "new_this_month": ...,
                "by_status": [...]
            },
            "activities": {
                "recent": [...]  # Últimas 10 actividades
            }
        }

    async def get_sales_vs_expenses(self, tenant_id: str, user: User, months: int = 6):
        """
        Comparación ventas vs gastos por mes
        """
        return [
            {
                "month": "2025-05",
                "sales": 45000.00,
                "expenses": 12000.00,
                "profit": 33000.00
            },
            ...
        ]

    async def get_top_clients(self, tenant_id: str, user: User, limit: int = 5):
        """
        Top clientes por volumen de ventas
        """
        return [
            {
                "client_name": "Cliente A",
                "total_sales": 125000.00,
                "quotes_count": 15
            },
            ...
        ]
```

**Optimizaciones:**
- Usar agregaciones SQL (SUM, COUNT, GROUP BY)
- Cache con Redis (TTL: 5 minutos)
- Queries paralelos con `asyncio.gather()`

#### 2. Crear Router Dashboard
**Archivo:** `/backend/modules/dashboard/router.py`
**Tiempo:** 2-3 horas

```python
@router.get("/overview")
async def get_dashboard_overview(...)

@router.get("/sales-vs-expenses")
async def get_sales_vs_expenses_chart(...)

@router.get("/top-clients")
async def get_top_clients(...)

@router.get("/recent-activities")
async def get_recent_activities(...)
```

### Tareas Frontend (10-12 horas)

#### 1. KPI Cards Component (2 horas)
**Archivo:** `/frontend/components/dashboard/KPICards.tsx`

5 Cards:
- Total Ventas del Mes
- Gastos del Mes
- Margen (Ventas - Gastos)
- Clientes Activos
- Cotizaciones Pendientes

#### 2. Gráficos (4 horas)

**a) SalesVsExpensesChart.tsx** (2 horas)
- Line chart comparativo (últimos 6 meses)
- Dos líneas: Ventas (verde), Gastos (rojo)
- Área de profit (verde claro)

**b) TopClientsWidget.tsx** (1 hora)
- Bar chart horizontal
- Top 5 clientes

**c) ExpensesByCategoryChart.tsx** (1 hora)
- Donut chart
- Colores por categoría

#### 3. Widgets (4 horas)

**a) RecentActivityWidget.tsx** (2 horas)
- Lista de últimas 10 actividades
- Con iconos según tipo (venta, gasto, cliente)
- Timestamps relativos ("hace 2 horas")

**b) AlertsWidget.tsx** (2 horas)
- Lista de alertas prioritarias:
  - Cotizaciones por vencer
  - Gastos fuera de presupuesto
  - Clientes sin actividad >30 días

#### 4. Página Principal (2 horas)
**Archivo:** `/frontend/app/(dashboard)/dashboard/page.tsx`

Layout:
```
+---------------------------+---------------------------+
|        KPI Cards (5 columnas)                        |
+---------------------------+---------------------------+
| SalesVsExpenses (66%)     | TopClients (33%)         |
+---------------------------+---------------------------+
| ExpensesByCategory (50%)  | RecentActivity (50%)     |
+---------------------------+---------------------------+
| Alerts (100%)                                        |
+-------------------------------------------------------+
```

### Checklist

- [ ] Backend repository con queries optimizadas
- [ ] Backend router con 4 endpoints
- [ ] Cache implementado
- [ ] Frontend: 5 KPI cards
- [ ] Frontend: 3 gráficos
- [ ] Frontend: 2 widgets
- [ ] Página principal responsive
- [ ] Loading states
- [ ] Error handling

---

## Fase 3: Módulo de Transporte

**Prioridad:** MEDIA
**Tiempo Estimado:** 20-24 horas
**Dependencias:** Ninguna

### Objetivo

Gestionar gastos relacionados con vehículos corporativos.

### Modelo de Datos

#### Tabla: vehicles
```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    fuel_type VARCHAR(20) NOT NULL,  -- GASOLINA, DIESEL, ELECTRICO, HIBRIDO
    current_odometer INTEGER NOT NULL DEFAULT 0,
    assigned_to UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, MAINTENANCE, INACTIVE
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_assigned ON vehicles(assigned_to);
```

#### Tabla: fuel_logs
```sql
CREATE TABLE fuel_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    liters NUMERIC(10, 2) NOT NULL,
    price_per_liter NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    odometer INTEGER NOT NULL,
    station VARCHAR(255),
    receipt_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_fuel_logs_tenant ON fuel_logs(tenant_id);
CREATE INDEX idx_fuel_logs_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_logs_date ON fuel_logs(date);
```

#### Tabla: maintenance_logs
```sql
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,  -- PREVENTIVO, CORRECTIVO
    description TEXT NOT NULL,
    cost NUMERIC(12, 2) NOT NULL,
    odometer INTEGER NOT NULL,
    next_maintenance_km INTEGER,
    next_maintenance_date DATE,
    provider VARCHAR(255),
    receipt_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_maintenance_logs_tenant ON maintenance_logs(tenant_id);
CREATE INDEX idx_maintenance_logs_vehicle ON maintenance_logs(vehicle_id);
```

### Backend (12-14 horas)

#### Archivos a Crear:
1. `/backend/models/vehicle.py` (1 hora)
2. `/backend/models/fuel_log.py` (1 hora)
3. `/backend/models/maintenance_log.py` (1 hora)
4. `/backend/schemas/transport.py` (2 horas) - 15+ schemas
5. `/backend/modules/transport/repository.py` (4-5 horas) - 25+ métodos
6. `/backend/modules/transport/router.py` (3-4 horas) - 20+ endpoints
7. `/backend/alembic/versions/005_create_transport_tables.py` (1 hora)

#### Endpoints Principales:

**Vehicles:**
- POST /transport/vehicles
- GET /transport/vehicles
- GET /transport/vehicles/{id}
- PUT /transport/vehicles/{id}
- DELETE /transport/vehicles/{id}
- GET /transport/vehicles/{id}/efficiency (cálculo km/litro)

**Fuel Logs:**
- POST /transport/fuel-logs
- GET /transport/fuel-logs
- GET /transport/fuel-logs/{id}
- PUT /transport/fuel-logs/{id}
- DELETE /transport/fuel-logs/{id}
- GET /transport/fuel-logs/stats (por vehículo, período)

**Maintenance:**
- POST /transport/maintenance
- GET /transport/maintenance
- GET /transport/maintenance/{id}
- PUT /transport/maintenance/{id}
- DELETE /transport/maintenance/{id}
- GET /transport/maintenance/upcoming (próximos mantenimientos)

### Frontend (8-10 horas)

#### Componentes a Crear:
1. VehicleList.tsx
2. CreateVehicleModal.tsx
3. FuelLogList.tsx
4. CreateFuelLogModal.tsx
5. MaintenanceList.tsx
6. CreateMaintenanceModal.tsx
7. VehicleEfficiencyChart.tsx (km/litro histórico)
8. TransportStats.tsx

#### Páginas:
1. /transport/vehicles
2. /transport/vehicles/[id]
3. /transport/fuel-logs
4. /transport/maintenance
5. /transport/stats

### Características Especiales

#### Cálculo de Eficiencia:
```python
async def calculate_efficiency(vehicle_id: UUID, date_from: date, date_to: date):
    """
    km/litro = (odometer_final - odometer_inicial) / total_liters
    """
    logs = get_fuel_logs_in_period(...)

    total_liters = sum(log.liters for log in logs)
    km_traveled = logs[-1].odometer - logs[0].odometer

    efficiency = km_traveled / total_liters if total_liters > 0 else 0

    return {
        "efficiency": round(efficiency, 2),
        "km_traveled": km_traveled,
        "total_liters": total_liters,
        "period": {"from": date_from, "to": date_to}
    }
```

#### Alertas de Mantenimiento:
```python
async def get_maintenance_alerts(vehicle_id: UUID):
    """
    Alertar si:
    - current_odometer >= next_maintenance_km
    - today >= next_maintenance_date
    """
```

---

## Fase 4: Servicio OCR

**Prioridad:** MEDIA
**Tiempo Estimado:** 24-30 horas
**Dependencias:** Celery configurado, Redis activo

### Objetivo

Automatizar la extracción de datos de facturas y recibos usando OCR.

### Arquitectura

```
Usuario → Upload imagen → S3/Local Storage → Celery Task → OCR Processing → Extracción → DB
                                                  ↓
                                            [Tesseract + OpenCV]
                                                  ↓
                                            [NLP + Regex]
                                                  ↓
                                            {provider, amount, date, category, confidence}
```

### Backend (16-20 horas)

#### 1. Configuración de Celery (2 horas)

**Archivo:** `/backend/celery_app.py`

```python
from celery import Celery

celery_app = Celery(
    "onquota",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.task_routes = {
    "modules.ocr.tasks.*": {"queue": "ocr"}
}
```

#### 2. Procesamiento de Imágenes (6-8 horas)

**Archivo:** `/backend/modules/ocr/image_processor.py`

```python
import cv2
import numpy as np
from PIL import Image

class ImageProcessor:
    def preprocess(self, image_path: str) -> np.ndarray:
        """
        1. Convertir a escala de grises
        2. Aplicar threshold
        3. Reducir ruido
        4. Ajustar contraste
        5. Deskew (corregir inclinación)
        """
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return thresh
```

#### 3. OCR Engine (4-6 horas)

**Archivo:** `/backend/modules/ocr/ocr_engine.py`

```python
import pytesseract
from typing import Dict

class OCREngine:
    def extract_text(self, image: np.ndarray) -> str:
        """
        Extraer texto usando Tesseract
        """
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config, lang='spa')
        return text

    def extract_structured_data(self, text: str) -> Dict:
        """
        Usar regex y NLP para extraer:
        - Proveedor (primeras líneas)
        - Monto (patrones: $XX.XX, TOTAL: XX)
        - Fecha (patrones: DD/MM/YYYY, DD-MM-YYYY)
        - Categoría (keywords: COMBUSTIBLE, PEAJE, etc.)
        """
        import re
        from datetime import datetime

        # Buscar monto
        amount_patterns = [
            r'TOTAL[:\s]+\$?\s*([0-9,.]+)',
            r'\$\s*([0-9,.]+)',
        ]
        amount = self._extract_with_patterns(text, amount_patterns)

        # Buscar fecha
        date_patterns = [
            r'(\d{2}[/-]\d{2}[/-]\d{4})',
            r'(\d{4}[/-]\d{2}[/-]\d{2})',
        ]
        date_str = self._extract_with_patterns(text, date_patterns)

        # Buscar proveedor (primeras 3 líneas)
        lines = text.split('\n')
        provider = lines[0] if lines else "Desconocido"

        # Inferir categoría
        category = self._infer_category(text)

        # Calcular confianza
        confidence = self._calculate_confidence(amount, date_str, provider)

        return {
            "provider": provider,
            "amount": float(amount) if amount else None,
            "date": date_str,
            "category": category,
            "confidence": confidence
        }

    def _infer_category(self, text: str) -> str:
        keywords = {
            "COMBUSTIBLE": ["combustible", "gasolina", "diesel", "texaco", "shell", "mobil"],
            "PEAJE": ["peaje", "toll", "autopista"],
            "COMIDA": ["restaurante", "comida", "almuerzo"],
            "ALOJAMIENTO": ["hotel", "hospedaje"],
        }

        text_lower = text.lower()
        for category, words in keywords.items():
            if any(word in text_lower for word in words):
                return category

        return "OTROS"
```

#### 4. Celery Task (2 horas)

**Archivo:** `/backend/modules/ocr/tasks.py`

```python
from celery import Task
from celery_app import celery_app

@celery_app.task(bind=True, max_retries=3)
def process_receipt(self, expense_id: str, image_path: str):
    try:
        # 1. Preprocesar imagen
        processor = ImageProcessor()
        processed_img = processor.preprocess(image_path)

        # 2. Extraer texto
        ocr = OCREngine()
        raw_text = ocr.extract_text(processed_img)

        # 3. Extraer datos estructurados
        data = ocr.extract_structured_data(raw_text)

        # 4. Actualizar expense en DB
        if data['confidence'] >= 0.8:
            # Auto-actualizar
            update_expense(expense_id, data)
        else:
            # Marcar para revisión manual
            flag_for_review(expense_id, data)

        return {"status": "success", "data": data}

    except Exception as exc:
        self.retry(exc=exc, countdown=60)
```

#### 5. Router OCR (2-3 horas)

**Archivo:** `/backend/modules/ocr/router.py`

```python
@router.post("/ocr/process")
async def process_receipt_endpoint(
    file: UploadFile,
    expense_id: UUID,
    background_tasks: BackgroundTasks
):
    """
    Upload imagen → Guardar → Lanzar tarea Celery
    """
    # Guardar archivo
    file_path = save_upload(file)

    # Lanzar tarea en background
    task = process_receipt.delay(str(expense_id), file_path)

    return {
        "task_id": task.id,
        "status": "processing"
    }

@router.get("/ocr/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Consultar estado de tarea Celery
    """
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None
    }
```

### Frontend (8-10 horas)

#### 1. Upload Component (3 horas)

**Archivo:** `/frontend/components/ocr/ReceiptUpload.tsx`

```typescript
// Drag & drop de imágenes
// Preview de imagen
// Progress bar durante procesamiento
// Polling de task status
// Auto-completar formulario con datos extraídos
```

#### 2. Review Component (3 horas)

**Archivo:** `/frontend/components/ocr/OCRReview.tsx`

```typescript
// Mostrar imagen + datos extraídos lado a lado
// Confidence indicator
// Editar campos con bajo confidence
// Aprobar o rechazar
```

#### 3. Integración con Expenses (2 horas)

Actualizar `CreateExpenseModal.tsx`:
- Botón "Upload Factura"
- Abrir ReceiptUpload modal
- Al completar OCR → Prellenar campos del formulario

### Testing OCR (3-4 horas)

#### Dataset de Prueba:
- 20 facturas reales (varias calidades)
- Métricas objetivo:
  - Accuracy monto: >90%
  - Accuracy fecha: >85%
  - Accuracy proveedor: >80%

### Mejoras Futuras:
- Integrar Google Vision API (mayor precisión)
- Machine Learning para clasificación de categorías
- OCR de facturas en múltiples idiomas

---

## Fase 5: SPA Analytics

**Prioridad:** MEDIA
**Tiempo Estimado:** 20-24 horas

### Objetivo

Análisis avanzado de archivos Excel/CSV para calcular métricas comerciales.

### Funcionalidades

1. **Upload de Archivos**
   - Formatos: XLSX, CSV
   - Tamaño máximo: 10 MB
   - Validación de columnas requeridas

2. **Análisis Automático**
   - Identificar columnas: Producto, Cliente, Cantidad, Precio, Descuento
   - Calcular: Margen bruto, Margen neto, Descuento efectivo
   - Clasificación ABC de productos

3. **Visualizaciones**
   - Top productos por margen
   - Análisis de descuentos por cliente
   - Tendencias de ventas (si hay columna fecha)
   - Matriz producto-cliente

4. **Exportación**
   - Generar reporte Excel con análisis
   - Gráficos embebidos

### Backend (12-14 horas)

#### Tecnologías:
- `pandas` para procesamiento de datos
- `openpyxl` para leer/escribir Excel
- `plotly` para gráficos embebidos

#### Archivos a Crear:

**1. `/backend/modules/analytics/parser.py`** (3-4 horas)

```python
import pandas as pd

class ExcelParser:
    def parse(self, file_path: str) -> pd.DataFrame:
        """
        Leer archivo Excel/CSV
        Detectar automáticamente columnas
        """
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        # Normalizar nombres de columnas
        df.columns = [col.strip().lower() for col in df.columns]

        return df

    def validate_columns(self, df: pd.DataFrame) -> List[str]:
        """
        Verificar que existan columnas mínimas
        """
        required = ['producto', 'cantidad', 'precio']
        missing = [col for col in required if col not in df.columns]
        return missing
```

**2. `/backend/modules/analytics/analyzer.py`** (4-5 horas)

```python
class SalesAnalyzer:
    def calculate_metrics(self, df: pd.DataFrame) -> Dict:
        """
        Calcular todas las métricas
        """
        # Calcular subtotal
        df['subtotal'] = df['cantidad'] * df['precio']

        # Calcular descuento efectivo
        if 'descuento' in df.columns:
            df['descuento_efectivo'] = df['subtotal'] * (df['descuento'] / 100)
            df['venta_neta'] = df['subtotal'] - df['descuento_efectivo']
        else:
            df['venta_neta'] = df['subtotal']

        # Análisis ABC (por venta_neta)
        product_sales = df.groupby('producto')['venta_neta'].sum().sort_values(ascending=False)
        cumsum = product_sales.cumsum()
        total = product_sales.sum()

        abc_classification = []
        for product, sales in product_sales.items():
            cumulative_pct = cumsum[product] / total * 100
            if cumulative_pct <= 80:
                category = 'A'
            elif cumulative_pct <= 95:
                category = 'B'
            else:
                category = 'C'

            abc_classification.append({
                "product": product,
                "sales": sales,
                "category": category
            })

        return {
            "total_sales": df['venta_neta'].sum(),
            "total_discount": df['descuento_efectivo'].sum() if 'descuento_efectivo' in df.columns else 0,
            "abc_analysis": abc_classification,
            "top_products": product_sales.head(10).to_dict(),
            "discount_by_client": df.groupby('cliente')['descuento_efectivo'].sum().to_dict() if 'cliente' in df.columns else {}
        }
```

**3. `/backend/modules/analytics/router.py`** (3-4 horas)

```python
@router.post("/analytics/upload")
async def upload_file(file: UploadFile, background_tasks: BackgroundTasks):
    """
    Upload archivo → Procesar en background
    """
    file_path = save_upload(file)
    task = process_analytics.delay(file_path)
    return {"task_id": task.id}

@router.get("/analytics/results/{analysis_id}")
async def get_analysis_results(analysis_id: UUID):
    """
    Obtener resultados del análisis
    """
    return get_analysis_from_db(analysis_id)

@router.get("/analytics/export/{analysis_id}")
async def export_analysis(analysis_id: UUID):
    """
    Generar Excel con análisis
    """
    wb = generate_excel_report(analysis_id)
    return FileResponse(wb, filename="analysis.xlsx")
```

### Frontend (8-10 horas)

#### Componentes:
1. **FileUploadZone.tsx** (2 horas) - Drag & drop
2. **AnalysisResults.tsx** (3 horas) - Mostrar métricas y gráficos
3. **ABCTable.tsx** (2 horas) - Tabla con clasificación ABC
4. **ExportButton.tsx** (1 hora) - Descargar Excel

#### Páginas:
1. `/analytics/upload`
2. `/analytics/results/[id]`

---

## Fase 6: Notificaciones

**Prioridad:** BAJA
**Tiempo Estimado:** 16-20 horas

### Características

1. **Notificaciones In-App**
   - Badge en navbar
   - Dropdown con últimas notificaciones
   - Marcar como leída

2. **Push Notifications** (Web Push API)
   - Solicitar permiso
   - Enviar notificaciones del navegador

3. **Email** (SendGrid / AWS SES)
   - Templates HTML
   - Resumen diario/semanal

### Tipos de Alertas

#### Cotizaciones:
- Cotización por vencer (3 días antes)
- Cotización sin respuesta (>7 días)

#### Mantenimiento:
- Vehículo requiere mantenimiento (según km o fecha)

#### Gastos:
- Gasto excede presupuesto mensual

#### Clientes:
- Cliente inactivo (sin interacción >30 días)

### Backend (10-12 horas)

#### Modelo de Datos:

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,  -- QUOTE_EXPIRING, MAINTENANCE_DUE, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read);
```

#### Celery Beat (Tareas Programadas):

**Archivo:** `/backend/celery_beat.py`

```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'check-expiring-quotes': {
        'task': 'modules.notifications.tasks.check_expiring_quotes',
        'schedule': crontab(hour=9, minute=0),  # Diario a las 9am
    },
    'check-maintenance-due': {
        'task': 'modules.notifications.tasks.check_maintenance_due',
        'schedule': crontab(hour=8, minute=0),
    },
}
```

#### Tasks:

**Archivo:** `/backend/modules/notifications/tasks.py`

```python
@celery_app.task
def check_expiring_quotes():
    """
    Buscar cotizaciones con valid_until en 3 días
    Crear notificación
    """
    from datetime import date, timedelta

    target_date = date.today() + timedelta(days=3)
    quotes = get_quotes_expiring_on(target_date)

    for quote in quotes:
        create_notification(
            user_id=quote.sales_rep_id,
            type="QUOTE_EXPIRING",
            title=f"Cotización {quote.quote_number} por vencer",
            message=f"La cotización para {quote.client.name} vence en 3 días.",
            link=f"/sales/{quote.id}"
        )

        # Opcional: Enviar email
        send_email(quote.sales_rep.email, ...)
```

### Frontend (6-8 horas)

#### Componentes:
1. **NotificationBell.tsx** (2 horas) - Ícono con badge
2. **NotificationDropdown.tsx** (2 horas) - Lista de notificaciones
3. **NotificationItem.tsx** (1 hora)
4. **WebPushManager.tsx** (2 horas) - Gestionar suscripción

#### Hook:
```typescript
// useNotifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Polling cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (id: string) => { ... }

  return { notifications, unreadCount, markAsRead }
}
```

---

## Fase 7: Account Planner

**Prioridad:** BAJA
**Tiempo Estimado:** 16-20 horas

### Objetivo

Herramienta de planificación estratégica de cuentas clave.

### Funcionalidades

1. **Plan de Cuenta**
   - Asociado a un cliente
   - Objetivos SMART
   - Estrategias comerciales
   - Matriz FODA

2. **Seguimiento**
   - Hitos (milestones)
   - Progreso (%)
   - Acciones completadas

3. **Colaboración**
   - Compartir plan con equipo
   - Comentarios

### Modelo de Datos

```sql
CREATE TABLE account_plans (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    objective TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED, CANCELLED
    swot_strengths TEXT,
    swot_weaknesses TEXT,
    swot_opportunities TEXT,
    swot_threats TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE account_plan_milestones (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES account_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Backend (10-12 horas)
- CRUD completo para planes
- CRUD para milestones
- Estadísticas (planes activos, completados, % progreso)

### Frontend (6-8 horas)
- Formulario de creación (wizard multi-paso)
- Vista de plan (con matriz FODA visual)
- Timeline de milestones
- Kanban board (opcional)

---

## Timeline y Dependencias

### Diagrama de Gantt (Estimado)

```
Semana 1:
[████████] Completar Ventas (40% restante)

Semana 2:
[████████████████] Dashboard General

Semana 3-4:
[████████████████████████] Transporte

Semana 5-6:
[██████████████████████████████] OCR Service

Semana 7:
[████████████████████] SPA Analytics

Semana 8:
[████████████████] Notificaciones

Semana 9:
[████████████████] Account Planner
```

### Dependencias Críticas

1. **Ventas → Dashboard**
   - Dashboard necesita datos de ventas

2. **Transporte → OCR**
   - OCR puede procesar facturas de combustible/mantenimiento

3. **Todas las fases → Notificaciones**
   - Notificaciones depende de eventos de todos los módulos

### Recursos Requeridos

#### Infraestructura:
- PostgreSQL 15+ (ya configurado)
- Redis 7+ (para Celery y cache)
- Celery workers (2-3 workers para OCR y analytics)
- S3 o storage local (para facturas e imágenes)

#### Dependencias Nuevas:

```bash
# Backend
pip install celery[redis]==5.3.4
pip install pytesseract==0.3.10
pip install opencv-python==4.8.1
pip install pandas==2.1.3
pip install openpyxl==3.1.2
pip install plotly==5.18.0

# Sistema
apt-get install tesseract-ocr tesseract-ocr-spa
```

#### Servicios Externos:
- SendGrid / AWS SES (email)
- Google Vision API (opcional para OCR)
- S3 o DigitalOcean Spaces (storage)

---

## Próximos Pasos Inmediatos

### Esta Semana:

1. **Lunes-Martes:** Completar backend de Ventas (router + tests)
2. **Miércoles-Jueves:** Completar frontend de Ventas (componentes + páginas)
3. **Viernes:** Testing e integración, deploy a staging

### Próxima Semana:

1. **Lunes-Miércoles:** Dashboard General backend
2. **Jueves-Viernes:** Dashboard General frontend

---

## Métricas de Éxito

### Al Completar Todas las Fases:

**Cobertura de Funcionalidad:**
- ✅ Autenticación y RBAC: 100%
- ✅ Gestión de Gastos: 100%
- ✅ CRM: 100%
- ✅ Ventas: 100%
- ✅ Dashboard: 100%
- ✅ Transporte: 100%
- ✅ OCR: 100%
- ✅ Analytics: 100%
- ✅ Notificaciones: 100%
- ✅ Account Planner: 100%

**KPIs Técnicos:**
- Cobertura de tests: >80%
- API response time: <300ms (P95)
- OCR accuracy: >90%
- Uptime: 99.5%

**KPIs de Negocio:**
- Tiempo de registro de gasto: <2 min (con OCR: <30 seg)
- Tiempo de creación de cotización: <5 min
- Adopción de usuarios: >80% en primer mes

---

**Documento Vivo:** Este plan se actualizará semanalmente según el progreso real.

**Versión:** 1.0
**Próxima Revisión:** 2025-11-16
