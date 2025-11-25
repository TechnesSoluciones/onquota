# SPA Analytics Module

Módulo completo de **Sales Performance Analysis** para OnQuota. Permite a los usuarios subir archivos Excel/CSV con datos de ventas y obtener análisis automatizado con clasificación ABC, KPIs, descuentos, márgenes, y más.

## Características

### Análisis Automático
- **Clasificación ABC (Pareto)**: Identifica productos/clientes de alto valor (Categoría A: 70% ventas, B: 20%, C: 10%)
- **KPIs Clave**: Total ventas, promedio, mediana, desviación estándar, percentiles
- **Top Performers**: Rankings de productos y clientes más vendidos
- **Análisis de Descuentos**: Total descuentos, promedio, distribución por categoría
- **Análisis de Márgenes**: Margen bruto, porcentaje, productos más/menos rentables
- **Tendencias Mensuales**: Serie temporal con crecimiento mes a mes
- **Insights Automáticos**: Recomendaciones basadas en datos

### Formatos Soportados
- **Excel**: `.xlsx`, `.xls`
- **CSV**: Con detección automática de encoding y separadores

### Columnas Requeridas
- `product` (o variantes: producto, articulo, item)
- `quantity` (o variantes: cantidad, qty, unidades)
- `unit_price` (o variantes: precio, price)

### Columnas Opcionales
- `client` (o variantes: cliente, customer)
- `date` (o variantes: fecha, timestamp)
- `discount` (o variantes: descuento, disc)
- `cost` (o variantes: costo, unit_cost)

## Arquitectura del Módulo

```
backend/modules/analytics/
├── __init__.py              # Exports públicos del módulo
├── models.py                # Modelo Analysis (SQLAlchemy)
├── schemas.py               # Pydantic schemas (request/response)
├── repository.py            # CRUD operations (async)
├── router.py                # FastAPI endpoints
├── parser.py                # ExcelParser - validación y parseo
├── analyzer.py              # SalesAnalyzer - métricas y clasificación
├── tasks.py                 # Celery async tasks
├── exporters.py             # Excel/PDF exporters
└── README.md                # Esta documentación
```

## Base de Datos

### Tabla: `analyses`

```sql
CREATE TABLE analyses (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_type file_type NOT NULL,  -- 'csv' | 'excel'
    status analysis_status NOT NULL,  -- 'pending' | 'processing' | 'completed' | 'failed'
    row_count INTEGER,
    results JSONB,  -- JSON con todos los análisis
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes optimizados
CREATE INDEX ix_analyses_tenant_status ON analyses(tenant_id, status);
CREATE INDEX ix_analyses_tenant_created ON analyses(tenant_id, created_at);
CREATE INDEX ix_analyses_results_gin ON analyses USING GIN(results);
```

### Estructura del JSON `results`

```json
{
  "summary": {
    "total_rows": 1500,
    "total_sales": 250000.50,
    "avg_sale": 166.67,
    "median_sale": 150.00,
    "std_dev": 75.50,
    "min_sale": 50.00,
    "max_sale": 1000.00,
    "percentiles": {
      "p25": 100.00,
      "p50": 150.00,
      "p75": 200.00,
      "p95": 350.00
    }
  },
  "abc_analysis": {
    "by_product": {
      "A": {"count": 20, "percentage": 10.0, "sales": 175000, "sales_pct": 70.0},
      "B": {"count": 40, "percentage": 20.0, "sales": 50000, "sales_pct": 20.0},
      "C": {"count": 140, "percentage": 70.0, "sales": 25000, "sales_pct": 10.0}
    },
    "by_client": { /* similar structure */ }
  },
  "top_products": [
    {
      "name": "Laptop HP ProBook 450",
      "sales": 50000.00,
      "quantity": 60,
      "avg_price": 833.33,
      "category": "A",
      "percentage_of_total": 20.0
    }
  ],
  "top_clients": [ /* similar structure */ ],
  "discount_analysis": {
    "total_discounts": 15000.00,
    "avg_discount_pct": 8.5,
    "discount_by_category": {"A": 5000, "B": 6000, "C": 4000},
    "top_discounted_products": [ /* ... */ ],
    "percentage_with_discount": 35.0
  },
  "margin_analysis": {
    "total_margin": 87500.00,
    "avg_margin_pct": 35.0,
    "margin_by_category": {
      "A": {"total_margin": 70000, "avg_margin_pct": 40.0},
      "B": {"total_margin": 12500, "avg_margin_pct": 25.0},
      "C": {"total_margin": 5000, "avg_margin_pct": 20.0}
    },
    "top_margin_products": [ /* ... */ ],
    "bottom_margin_products": [ /* ... */ ]
  },
  "monthly_trends": [
    {
      "month": "2024-07",
      "sales": 40000.00,
      "quantity": 250,
      "avg_price": 160.00,
      "growth_pct": null
    },
    {
      "month": "2024-08",
      "sales": 45000.00,
      "quantity": 280,
      "avg_price": 160.71,
      "growth_pct": 12.5
    }
  ],
  "insights": [
    "El 10% de productos generan el 70% de ventas (Categoría A)",
    "Descuentos promedio: 8.5%, impacto total: $15,000",
    "Margen promedio: 35%, productos A tienen 40%",
    "Ventas crecieron 12.5% vs mes anterior"
  ]
}
```

## API Endpoints

### POST `/api/v1/analytics/upload`
Subir archivo para análisis.

**Request:**
- `file`: Archivo Excel/CSV (max 50MB)
- `name`: Nombre del análisis (3-100 chars)
- `description`: Descripción opcional

**Response:**
```json
{
  "analysis_id": "uuid",
  "name": "Análisis Q4 2024",
  "file_type": "excel",
  "status": "pending",
  "message": "File uploaded successfully. Analysis is being processed."
}
```

### GET `/api/v1/analytics/analyses/{analysis_id}`
Obtener análisis completo con resultados.

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "name": "Análisis Q4 2024",
  "description": "Ventas del último trimestre",
  "file_path": "/uploads/analytics/tenant-id/file.xlsx",
  "file_type": "excel",
  "status": "completed",
  "row_count": 1500,
  "results": { /* JSON completo */ },
  "error_message": null,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:05:00Z"
}
```

### GET `/api/v1/analytics/analyses`
Listar análisis con paginación.

**Query Params:**
- `status`: Filtrar por status (pending, processing, completed, failed)
- `page`: Número de página (default: 1)
- `page_size`: Items por página (default: 20, max: 100)

**Response:**
```json
{
  "items": [ /* AnalysisListItem[] */ ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "total_pages": 3
}
```

### GET `/api/v1/analytics/analyses/{analysis_id}/abc`
Obtener clasificación ABC detallada.

**Query Params:**
- `by`: Tipo de clasificación (`product` | `client`)

**Response:**
```json
{
  "analysis_id": "uuid",
  "analysis_name": "Análisis Q4",
  "by": "product",
  "categories": {
    "A": { /* stats */ },
    "B": { /* stats */ },
    "C": { /* stats */ }
  },
  "items": [ /* all items with categories */ ],
  "total_items": 200,
  "created_at": "2024-01-15T10:00:00Z"
}
```

### GET `/api/v1/analytics/analyses/{analysis_id}/export`
Exportar resultados a Excel o PDF.

**Query Params:**
- `format`: Formato de exportación (`excel` | `pdf`)

**Response:** FileResponse (archivo descargable)

### PATCH `/api/v1/analytics/analyses/{analysis_id}`
Actualizar metadata del análisis.

**Request:**
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción"
}
```

### DELETE `/api/v1/analytics/analyses/{analysis_id}`
Eliminar análisis (soft delete).

**Response:** 204 No Content

### GET `/api/v1/analytics/dashboard/stats`
Obtener estadísticas para dashboard.

**Response:**
```json
{
  "status_counts": {
    "pending": 5,
    "processing": 2,
    "completed": 45,
    "failed": 3
  },
  "recent_analyses": [ /* últimos 5 */ ],
  "total_rows_processed": 50000,
  "total_sales_analyzed": 5000000.00
}
```

## Procesamiento Asíncrono

### Celery Tasks

#### `process_analysis(analysis_id, file_path)`
Procesa análisis en background:
1. Valida archivo
2. Parsea con pandas
3. Ejecuta análisis completo
4. Guarda resultados en DB
5. Actualiza status

**Retry:** Máximo 3 intentos con 120s de delay

#### `cleanup_old_analysis_files(days_old=30)`
Limpia archivos eliminados hace más de 30 días.

#### `reprocess_failed_analysis(analysis_id)`
Reintenta procesamiento de análisis fallidos.

## Exportadores

### ExcelExporter
Genera Excel con múltiples hojas:
- **Summary**: Estadísticas generales y metadata
- **ABC - Products**: Clasificación ABC por producto
- **ABC - Clients**: Clasificación ABC por cliente
- **Top Products**: Top 20 productos
- **Top Clients**: Top 20 clientes
- **Discount Analysis**: Análisis de descuentos
- **Margin Analysis**: Análisis de márgenes
- **Monthly Trends**: Serie temporal
- **Insights**: Insights automáticos

**Formato:**
- Headers en negrita con fondo azul
- Categorías ABC con colores (A: verde, B: amarillo, C: rojo)
- Números formateados (moneda, porcentaje)
- Auto-width en columnas

### PDFExporter
Genera PDF resumen ejecutivo:
- Metadata del análisis
- KPIs principales en tabla
- Clasificación ABC con colores
- Top 10 productos
- Insights bullets
- Formato print-ready

## Tests

### Archivos de Test
- `tests/unit/test_analytics.py`: Tests unitarios completos
- `tests/fixtures/test_sales_data.csv`: Dataset de prueba (100 filas)
- `tests/fixtures/generate_test_data.py`: Generador de datos sintéticos

### Ejecutar Tests
```bash
# Todos los tests de analytics
pytest tests/unit/test_analytics.py -v

# Con coverage
pytest tests/unit/test_analytics.py --cov=modules.analytics --cov-report=html

# Solo tests de parser
pytest tests/unit/test_analytics.py::TestExcelParser -v

# Solo tests de analyzer
pytest tests/unit/test_analytics.py::TestSalesAnalyzer -v
```

### Coverage Esperado
- `parser.py`: >90%
- `analyzer.py`: >85%
- `repository.py`: >90%
- `exporters.py`: >70%
- **Total módulo**: >80%

## Uso

### 1. Subir archivo
```python
import httpx

files = {"file": open("sales_data.xlsx", "rb")}
data = {
    "name": "Análisis Q4 2024",
    "description": "Ventas del último trimestre"
}

response = httpx.post(
    "http://localhost:8000/api/v1/analytics/upload",
    files=files,
    data=data,
    cookies={"access_token": token}
)

analysis = response.json()
print(f"Analysis ID: {analysis['analysis_id']}")
```

### 2. Polling de status
```python
import time

analysis_id = "uuid-from-upload"

while True:
    response = httpx.get(
        f"http://localhost:8000/api/v1/analytics/analyses/{analysis_id}",
        cookies={"access_token": token}
    )

    analysis = response.json()
    status = analysis["status"]

    if status == "completed":
        print("Analysis completed!")
        print(f"Total sales: ${analysis['results']['summary']['total_sales']}")
        break
    elif status == "failed":
        print(f"Analysis failed: {analysis['error_message']}")
        break
    else:
        print(f"Status: {status}, waiting...")
        time.sleep(5)
```

### 3. Obtener clasificación ABC
```python
response = httpx.get(
    f"http://localhost:8000/api/v1/analytics/analyses/{analysis_id}/abc",
    params={"by": "product"},
    cookies={"access_token": token}
)

abc = response.json()
for category in ["A", "B", "C"]:
    stats = abc["categories"][category]
    print(f"Category {category}: {stats['count']} items, {stats['sales_pct']}% of sales")
```

### 4. Exportar a Excel
```python
response = httpx.get(
    f"http://localhost:8000/api/v1/analytics/analyses/{analysis_id}/export",
    params={"format": "excel"},
    cookies={"access_token": token}
)

with open("analysis_report.xlsx", "wb") as f:
    f.write(response.content)
```

## Migración

### Aplicar migración
```bash
cd backend
alembic upgrade head
```

### Rollback
```bash
alembic downgrade -1
```

## Dependencias

### Nuevas dependencias añadidas
- `xlrd==2.0.1`: Lectura de archivos Excel antiguos (.xls)
- `matplotlib==3.8.2`: Visualización de datos
- `seaborn==0.13.0`: Visualización estadística
- `scipy==1.11.4`: Funciones científicas
- `reportlab==4.0.7`: Generación de PDFs

### Ya incluidas
- `pandas==2.1.3`
- `numpy==1.26.2`
- `openpyxl==3.1.2`

## Configuración

### Variables de entorno
```bash
# Celery (ya configurado)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Uploads
UPLOAD_DIR=uploads/analytics  # Creado automáticamente
MAX_FILE_SIZE=52428800  # 50MB
```

### Límites
- Tamaño máximo de archivo: 50MB
- Rate limit upload: 10 archivos/minuto por usuario
- Máximo filas recomendadas: 100,000
- Timeout procesamiento: 10 minutos

## Seguridad

### Multi-tenancy
- ✅ Todos los queries filtran por `tenant_id`
- ✅ Archivos aislados por tenant: `/uploads/analytics/{tenant_id}/`
- ✅ Exports aislados: `/exports/analytics/{tenant_id}/`

### Validación
- ✅ Validación de tipos de archivo (extensión y mime-type)
- ✅ Límite de tamaño de archivo (50MB)
- ✅ Validación de columnas requeridas
- ✅ Sanitización de nombres de archivo
- ✅ Protección contra path traversal

### Rate Limiting
- Upload: 10 req/min por usuario
- Endpoints de consulta: Sin límite (ya autenticados)

## Performance

### Optimizaciones
- ✅ Procesamiento asíncrono con Celery
- ✅ Índices GIN en JSONB para queries rápidos
- ✅ Índices compuestos (tenant_id, status)
- ✅ Paginación en listados
- ✅ Chunking para archivos grandes (parser)
- ✅ Cálculos vectorizados con pandas/numpy

### Benchmarks
- Archivo 10k filas: ~5s procesamiento
- Archivo 50k filas: ~20s procesamiento
- Archivo 100k filas: ~45s procesamiento
- Query results: <100ms (con índices)

## Troubleshooting

### Error: "Module 'pandas' not found"
```bash
pip install -r requirements.txt
```

### Error: "No module named 'openpyxl'"
```bash
pip install openpyxl xlrd
```

### Error: "Celery task failed"
Verificar logs:
```bash
celery -A core.celery.celery_app worker --loglevel=info
```

### Archivo no procesa
1. Verificar logs en Celery worker
2. Revisar formato del archivo (columnas requeridas)
3. Verificar tamaño (<50MB)
4. Intentar reprocess: `reprocess_failed_analysis.delay(analysis_id)`

## Roadmap

### Futuras mejoras
- [ ] Soporte para archivos Parquet
- [ ] Integración con S3 para archivos grandes
- [ ] Gráficos interactivos con Plotly
- [ ] Comparación entre múltiples análisis
- [ ] Alertas automáticas (ej: productos con bajo margen)
- [ ] API para análisis en tiempo real (streaming)
- [ ] ML predictions (forecasting de ventas)

## Contribuir

Para añadir nuevos tipos de análisis:

1. Actualizar `SalesAnalyzer` con nuevo método
2. Añadir resultado al `generate_full_report()`
3. Actualizar schemas si es necesario
4. Añadir tests en `test_analytics.py`
5. Documentar en README

## Licencia

Parte del proyecto OnQuota - Uso interno
