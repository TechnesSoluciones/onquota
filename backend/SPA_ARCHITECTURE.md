# Arquitectura Detallada - Módulo SPA

## 1. DIAGRAMA DE CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTACIÓN                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ SPAListPage  │  │ UploadPage   │  │ StatsPage    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│  ┌──────▼─────────────────▼──────────────────▼─────────┐    │
│  │              React Components                       │    │
│  │  - SPATable    - SPAUploadForm   - SPAStatsCards   │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                    HOOKS LAYER                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ useSPAs    │  │useSPAUpload│  │useSPAStats │          │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘          │
│        │               │               │                  │
│  ┌─────▼───────────────▼───────────────▼──────┐           │
│  │         React Query (Cache)                │           │
│  └─────────────────────┬──────────────────────┘           │
└────────────────────────┼──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                   API CLIENT                              │
│  ┌──────────────────────────────────────────────────┐     │
│  │  spaApi.upload()  spaApi.list()  spaApi.search() │     │
│  └────────────────────┬─────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │ HTTP/JSON
┌─────────────────────────▼─────────────────────────────────┐
│                   FASTAPI ROUTER                          │
│  ┌──────────────────────────────────────────────────┐     │
│  │  POST /upload   GET /   POST /search-discount    │     │
│  └────────────────────┬─────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                   SERVICE LAYER                           │
│  ┌──────────────────────────────────────────────────┐     │
│  │              SPAService                          │     │
│  │  - upload_spa_file()                             │     │
│  │  - process_spa_records()                         │     │
│  │  - calculate_discount()                          │     │
│  │  - search_discount()                             │     │
│  └────────┬──────────────────────┬──────────────────┘     │
│           │                      │                         │
│  ┌────────▼────────┐   ┌────────▼────────┐               │
│  │ExcelParserService│   │ BusinessLogic   │               │
│  └─────────────────┘   └─────────────────┘               │
└─────────────────────────┼─────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                 REPOSITORY LAYER                          │
│  ┌──────────────────────────────────────────────────┐     │
│  │           SPARepository                          │     │
│  │  - bulk_create()                                 │     │
│  │  - find_active_discount()                        │     │
│  │  - list_with_filters()                           │     │
│  │  - get_stats()                                   │     │
│  └────────────────────┬─────────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │ SQLAlchemy
┌─────────────────────────▼─────────────────────────────────┐
│                    DATABASE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    clients   │  │spa_agreements│  │spa_upload_   │    │
│  │              │  │              │  │   logs       │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO DE UPLOAD DE ARCHIVO

```
┌─────────┐
│ Usuario │
└────┬────┘
     │ 1. Selecciona archivo Excel/TSV
     ▼
┌────────────────┐
│ SPAUploadForm  │
└────┬───────────┘
     │ 2. Validación cliente (tipo, tamaño)
     ▼
┌────────────────┐
│ useSPAUpload   │
└────┬───────────┘
     │ 3. POST /api/spa/upload
     │    - file: multipart/form-data
     │    - auto_create_clients: bool
     ▼
┌────────────────────────────────────────────────────┐
│              FastAPI Router                        │
│  POST /spa/upload                                  │
└────┬───────────────────────────────────────────────┘
     │ 4. Llama a SPAService.upload_spa_file()
     ▼
┌─────────────────────────────────────────────────────┐
│                  SPAService                         │
│  ┌──────────────────────────────────────────────┐  │
│  │ upload_spa_file()                            │  │
│  │                                              │  │
│  │  Step 1: Validar archivo                    │  │
│  │  ├─ Tipo (.xls, .xlsx, .tsv)                │  │
│  │  └─ Tamaño (< 10MB)                         │  │
│  │                                              │  │
│  │  Step 2: Parsear archivo                    │  │
│  │  ├─ ExcelParserService.parse_file()         │  │
│  │  ├─ Leer con pandas                         │  │
│  │  ├─ Validar columnas                        │  │
│  │  └─ Parsear cada fila                       │  │
│  │      └─ Retorna (registros_válidos,         │  │
│  │                  errores_parsing)            │  │
│  │                                              │  │
│  │  Step 3: Procesar registros                 │  │
│  │  ├─ process_spa_records()                   │  │
│  │  ├─ Para cada registro válido:              │  │
│  │  │   ├─ Buscar cliente por BPID             │  │
│  │  │   │   └─ find_or_create_client_by_bpid() │  │
│  │  │   ├─ Calcular descuento                  │  │
│  │  │   │   └─ calculate_discount()            │  │
│  │  │   ├─ Validar fechas                      │  │
│  │  │   ├─ Determinar is_active                │  │
│  │  │   └─ Crear objeto SPAAgreement           │  │
│  │  └─ Retorna (spas_creados,                  │  │
│  │              errores_procesamiento)          │  │
│  │                                              │  │
│  │  Step 4: Insertar en batch                  │  │
│  │  └─ SPARepository.bulk_create()             │  │
│  │      └─ INSERT batch de 1000 en 1000        │  │
│  │                                              │  │
│  │  Step 5: Crear log de upload                │  │
│  │  └─ SPAUploadLog                            │  │
│  │      ├─ batch_id                            │  │
│  │      ├─ total_rows                          │  │
│  │      ├─ success_count                       │  │
│  │      ├─ error_count                         │  │
│  │      └─ duration_seconds                    │  │
│  │                                              │  │
│  │  Step 6: Retornar resultado                 │  │
│  │  └─ SPAUploadResult                         │  │
│  │      ├─ success_count                       │  │
│  │      ├─ error_count                         │  │
│  │      └─ errors: List[dict]                  │  │
│  └──────────────────────────────────────────────┘  │
└────┬────────────────────────────────────────────────┘
     │ 5. Commit transaction
     ▼
┌────────────────┐
│   Database     │
│  - spa_agreements: +N registros                     │
│  - spa_upload_logs: +1 registro                     │
│  - clients: +M registros (si auto_create=True)      │
└────┬───────────┘
     │ 6. Retornar resultado
     ▼
┌────────────────┐
│  Frontend      │
│  - Mostrar resumen                                  │
│  - success_count / total_rows                       │
│  - Tabla de errores                                 │
│  - Botón "Upload otro archivo"                      │
└────────────────┘
```

---

## 3. FLUJO DE BÚSQUEDA DE DESCUENTO

```
CONTEXTO: Vendedor creando cotización para cliente

┌─────────┐
│Vendedor │
└────┬────┘
     │ 1. Navega a página de cliente
     │    /clients/[client_id]
     ▼
┌──────────────────┐
│  ClientPage      │
└────┬─────────────┘
     │ 2. Component ClientSPAsList se monta
     ▼
┌──────────────────┐
│ useClientSPAs    │
│ (client_id)      │
└────┬─────────────┘
     │ 3. GET /api/spa/client/{client_id}?active_only=true
     ▼
┌──────────────────────────────────────────┐
│         FastAPI Router                   │
│  GET /spa/client/{client_id}             │
└────┬─────────────────────────────────────┘
     │ 4. SPAService.get_client_spas()
     ▼
┌──────────────────────────────────────────┐
│         SPARepository                    │
│  find_by_client()                        │
│    WHERE client_id = ? AND is_active=True│
└────┬─────────────────────────────────────┘
     │ 5. Retorna List[SPAAgreement]
     ▼
┌──────────────────┐
│  ClientSPAsList  │
│  - Muestra tabla │
│  - Search bar    │
└────┬─────────────┘
     │ 6. Vendedor busca artículo "ART-12345"
     │    (filtro local en cliente)
     ▼
┌──────────────────────────────────────────┐
│  Resultado filtrado:                     │
│  ┌────────────────────────────────────┐  │
│  │ Article: ART-12345                 │  │
│  │ List Price: $100.00                │  │
│  │ SPA Price: $85.00                  │  │
│  │ Discount: 15%                      │  │
│  │ Valid until: 2025-12-31            │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
     │ 7. Vendedor aplica precio en cotización
     ▼
   [FIN]


ALTERNATIVA: Búsqueda directa durante cotización

┌─────────┐
│Vendedor │
└────┬────┘
     │ 1. Agrega producto a cotización
     │    Cliente: ABC Corp (client_id: xxx)
     │    Artículo: ART-12345
     ▼
┌──────────────────┐
│ QuotationForm    │
└────┬─────────────┘
     │ 2. useSPADiscount.searchDiscount()
     ▼
┌──────────────────┐
│ useSPADiscount   │
└────┬─────────────┘
     │ 3. POST /api/spa/search-discount
     │    { client_id: "xxx", article_number: "ART-12345" }
     ▼
┌──────────────────────────────────────────┐
│         FastAPI Router                   │
│  POST /spa/search-discount               │
└────┬─────────────────────────────────────┘
     │ 4. SPAService.search_discount()
     ▼
┌──────────────────────────────────────────┐
│         SPARepository                    │
│  find_active_discount()                  │
│    WHERE client_id = ?                   │
│      AND article_number = ?              │
│      AND is_active = true                │
│      AND deleted_at IS NULL              │
│      AND CURRENT_DATE BETWEEN            │
│          start_date AND end_date         │
│    LIMIT 1                               │
└────┬─────────────────────────────────────┘
     │ 5. Retorna SPAAgreement o None
     ▼
┌──────────────────────────────────────────┐
│  SPADiscountResponse                     │
│  {                                       │
│    found: true,                          │
│    discount: {                           │
│      spa_id: "...",                      │
│      discount_percent: 15.00,            │
│      app_net_price: 85.00,               │
│      list_price: 100.00,                 │
│      valid_until: "2025-12-31"           │
│    }                                     │
│  }                                       │
└────┬─────────────────────────────────────┘
     │ 6. Frontend aplica precio automáticamente
     ▼
┌──────────────────────────────────────────┐
│  QuotationForm                           │
│  ┌────────────────────────────────────┐  │
│  │ Product: ART-12345                 │  │
│  │ List Price: $100.00 (struck)       │  │
│  │ SPA Price: $85.00 ✓                │  │
│  │ You save: $15.00 (15%)             │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 4. MODELO DE DATOS DETALLADO

```
┌─────────────────────────────────────────────────────────┐
│                        tenants                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ id: UUID (PK)                                       │ │
│ │ name: VARCHAR                                       │ │
│ └─────────────────────────────────────────────────────┘ │
└───────────┬─────────────────────────────────────────────┘
            │ (tenant_id)
            │
            ├──────────┐
            │          │
            ▼          ▼
┌───────────────┐  ┌──────────────────────────────────────┐
│    users      │  │            clients                   │
│ ┌───────────┐ │  │ ┌──────────────────────────────────┐ │
│ │id: UUID   │ │  │ │id: UUID (PK)                     │ │
│ └───────────┘ │  │ │tenant_id: UUID (FK)              │ │
└───┬───────────┘  │ │bpid: VARCHAR(50) ← NUEVO         │ │
    │              │ │name: VARCHAR                     │ │
    │              │ │email: VARCHAR                    │ │
    │              │ └──────────────────────────────────┘ │
    │              └───────┬──────────────────────────────┘
    │                      │ (client_id)
    │                      │
    │ (created_by)         │
    │                      │
    └──────────┐           │
               │           │
               ▼           ▼
┌──────────────────────────────────────────────────────────┐
│                   spa_agreements                         │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ IDENTIFICACIÓN                                       │ │
│ │ id: UUID (PK)                                        │ │
│ │ tenant_id: UUID (FK → tenants)                       │ │
│ │ client_id: UUID (FK → clients)                       │ │
│ │ batch_id: UUID (agrupación de upload)                │ │
│ │                                                      │ │
│ │ INFORMACIÓN DEL CLIENTE (denormalizado)             │ │
│ │ bpid: VARCHAR(50) NOT NULL                          │ │
│ │ ship_to_name: VARCHAR(255) NOT NULL                 │ │
│ │                                                      │ │
│ │ INFORMACIÓN DEL PRODUCTO                            │ │
│ │ article_number: VARCHAR(100) NOT NULL               │ │
│ │ article_description: VARCHAR(500)                   │ │
│ │                                                      │ │
│ │ PRICING                                             │ │
│ │ list_price: NUMERIC(18,4) NOT NULL                  │ │
│ │ app_net_price: NUMERIC(18,4) NOT NULL               │ │
│ │ discount_percent: NUMERIC(5,2) NOT NULL (calculado) │ │
│ │ uom: VARCHAR(10) DEFAULT 'EA'                       │ │
│ │                                                      │ │
│ │ VIGENCIA                                            │ │
│ │ start_date: DATE NOT NULL                           │ │
│ │ end_date: DATE NOT NULL                             │ │
│ │ is_active: BOOLEAN (calculado por fecha)            │ │
│ │                                                      │ │
│ │ AUDITORÍA                                           │ │
│ │ created_at: TIMESTAMP WITH TIME ZONE                │ │
│ │ updated_at: TIMESTAMP WITH TIME ZONE                │ │
│ │ deleted_at: TIMESTAMP WITH TIME ZONE (soft delete)  │ │
│ │ created_by: UUID (FK → users)                       │ │
│ │ updated_by: UUID (FK → users)                       │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ÍNDICES:                                                 │
│ - ix_spa_agreements_tenant_id                           │
│ - ix_spa_agreements_client_id                           │
│ - ix_spa_agreements_article_number                      │
│ - ix_spa_agreements_bpid                                │
│ - ix_spa_agreements_active_lookup (tenant, client,      │
│     article, is_active) WHERE deleted_at IS NULL        │
│ - ix_spa_agreements_dates (start_date, end_date)        │
│ - ix_spa_agreements_batch_id                            │
│                                                          │
│ CONSTRAINTS:                                             │
│ - CHECK (list_price >= 0)                               │
│ - CHECK (app_net_price >= 0)                            │
│ - CHECK (discount_percent BETWEEN 0 AND 100)            │
│ - CHECK (end_date >= start_date)                        │
└──────────────────────────────────────────────────────────┘
            │ (batch_id)
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│                 spa_upload_logs                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ id: UUID (PK)                                        │ │
│ │ batch_id: UUID (UNIQUE)                              │ │
│ │ filename: VARCHAR(255)                               │ │
│ │ uploaded_by: UUID (FK → users)                       │ │
│ │ tenant_id: UUID (FK → tenants)                       │ │
│ │                                                      │ │
│ │ ESTADÍSTICAS                                        │ │
│ │ total_rows: INTEGER                                 │ │
│ │ success_count: INTEGER                              │ │
│ │ error_count: INTEGER                                │ │
│ │ duration_seconds: NUMERIC(10,2)                     │ │
│ │                                                      │ │
│ │ ERROR TRACKING                                      │ │
│ │ error_message: TEXT                                 │ │
│ │                                                      │ │
│ │ TIMESTAMP                                           │ │
│ │ created_at: TIMESTAMP WITH TIME ZONE                │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ CONSTRAINTS:                                             │
│ - CHECK (success_count + error_count <= total_rows)     │
└──────────────────────────────────────────────────────────┘
```

---

## 5. QUERIES CRÍTICOS Y PERFORMANCE

### Query 1: Búsqueda de Descuento Activo (más frecuente)

```sql
-- Usado por: POST /api/spa/search-discount
-- Frecuencia: Alta (cada cotización)
-- Target: < 50ms

SELECT *
FROM spa_agreements
WHERE tenant_id = :tenant_id
  AND client_id = :client_id
  AND article_number = :article_number
  AND is_active = true
  AND deleted_at IS NULL
  AND CURRENT_DATE BETWEEN start_date AND end_date
ORDER BY created_at DESC
LIMIT 1;

-- Índice utilizado: ix_spa_agreements_active_lookup
-- Covering index para evitar lookup en tabla
```

### Query 2: SPAs de un Cliente (frecuente)

```sql
-- Usado por: GET /api/spa/client/{client_id}
-- Frecuencia: Media (página de cliente)
-- Target: < 100ms

SELECT *
FROM spa_agreements
WHERE client_id = :client_id
  AND tenant_id = :tenant_id
  AND is_active = true
  AND deleted_at IS NULL
ORDER BY article_number;

-- Índice utilizado: ix_spa_agreements_client_id
```

### Query 3: Lista con Filtros (frecuente)

```sql
-- Usado por: GET /api/spa
-- Frecuencia: Media (página principal)
-- Target: < 200ms

SELECT sa.*, c.name as client_name
FROM spa_agreements sa
JOIN clients c ON sa.client_id = c.id
WHERE sa.tenant_id = :tenant_id
  AND sa.deleted_at IS NULL
  AND (:client_id IS NULL OR sa.client_id = :client_id)
  AND (:article_number IS NULL OR sa.article_number ILIKE :search)
  AND (:active_only = false OR sa.is_active = true)
ORDER BY sa.created_at DESC
LIMIT :page_size OFFSET :offset;

-- Índices utilizados: Multiple según filtros
```

### Query 4: Estadísticas (menos frecuente, cacheable)

```sql
-- Usado por: GET /api/spa/stats
-- Frecuencia: Baja (dashboard)
-- Target: < 500ms
-- Cache: 5 minutos

SELECT
  COUNT(*) as total_spas,
  COUNT(*) FILTER (WHERE is_active = true) as active_spas,
  COUNT(*) FILTER (WHERE end_date < CURRENT_DATE) as expired_spas,
  COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
    as expiring_soon,
  COUNT(DISTINCT client_id) as total_clients_with_spas,
  AVG(discount_percent) as average_discount
FROM spa_agreements
WHERE tenant_id = :tenant_id
  AND deleted_at IS NULL;
```

### Query 5: Update Masivo de is_active (Celery task)

```sql
-- Usado por: Celery task diario
-- Frecuencia: 1x día
-- Target: < 5 segundos

-- Activar SPAs vigentes
UPDATE spa_agreements
SET is_active = true
WHERE start_date <= CURRENT_DATE
  AND end_date >= CURRENT_DATE
  AND is_active = false
  AND deleted_at IS NULL;

-- Desactivar SPAs expirados
UPDATE spa_agreements
SET is_active = false
WHERE (end_date < CURRENT_DATE OR start_date > CURRENT_DATE)
  AND is_active = true
  AND deleted_at IS NULL;
```

---

## 6. DECISIONES DE DISEÑO (ADRs)

### ADR-001: Denormalización de BPID y Ship To Name

**Contexto**: Necesitamos mostrar SPAs con información del cliente sin JOIN constante.

**Decisión**: Almacenar `bpid` y `ship_to_name` tanto en `clients` como en `spa_agreements`.

**Consecuencias**:
- PRO: Queries más rápidas (sin JOIN para mostrar listas)
- PRO: Histórico preservado (si cliente cambia nombre, SPA mantiene valor original)
- CON: Duplicación de datos
- CON: Posible inconsistencia si cliente cambia BPID

**Mitigación**: El BPID no debería cambiar en la práctica (es ID externo del ERP).

---

### ADR-002: Cálculo de discount_percent vs Almacenamiento

**Contexto**: El descuento puede calcularse on-the-fly o almacenarse.

**Decisión**: Almacenar `discount_percent` calculado durante upload.

**Consecuencias**:
- PRO: No requiere cálculo en cada query
- PRO: Facilita agregaciones (AVG, reportes)
- PRO: Evita errores de redondeo inconsistentes
- CON: Dato derivado (puede recalcularse de list_price y app_net_price)

**Fórmula**: `((list_price - app_net_price) / list_price) * 100`

---

### ADR-003: Campo is_active vs Cálculo Dinámico

**Contexto**: Determinar si SPA está vigente puede hacerse por fecha en cada query.

**Decisión**: Almacenar `is_active` y actualizarlo diariamente con Celery task.

**Consecuencias**:
- PRO: Queries más simples y rápidas (WHERE is_active = true)
- PRO: Índice más eficiente
- CON: Requiere tarea programada
- CON: Ventana de hasta 24h de inconsistencia (mitigable con trigger)

**Alternativa considerada**: Computed column con trigger. Rechazada por complejidad.

---

### ADR-004: Soft Delete vs Hard Delete

**Contexto**: Eliminar SPAs puede hacerse físicamente o lógicamente.

**Decisión**: Soft delete con campo `deleted_at`.

**Consecuencias**:
- PRO: Auditoría completa
- PRO: Recuperación posible
- PRO: Histórico de cambios
- CON: Queries deben filtrar `deleted_at IS NULL`
- CON: Índices más grandes

**Implementación**: Índice parcial en active_lookup excluye deleted.

---

### ADR-005: Bulk Insert vs Row-by-Row

**Contexto**: Upload de archivos con miles de registros.

**Decisión**: Usar `bulk_create()` de SQLAlchemy con batches de 1000.

**Consecuencias**:
- PRO: 10-50x más rápido que inserts individuales
- PRO: Menor overhead de transacciones
- CON: Rollback más complejo (batch completo falla)
- CON: Triggers no se ejecutan por fila

**Performance**: 1000 registros en ~2 segundos vs ~30 segundos row-by-row.

---

### ADR-006: Auto-create Clients vs Strict Validation

**Contexto**: Archivos pueden contener BPIDs desconocidos.

**Decisión**: Parámetro `auto_create_clients` opcional, default=False.

**Consecuencias**:
- PRO: Flexibilidad según caso de uso
- PRO: Evita rechazar uploads completos por BPID faltante
- CON: Puede crear clientes "sucios" sin validación
- CON: Usuarios deben entender la opción

**Recomendación**: Usar auto_create=True en primera importación, False después.

---

## 7. PLAN DE TESTING

### Test Pyramid

```
              ┌─────┐
              │ E2E │ (5%)
              └─────┘
            ┌─────────┐
            │   API   │ (15%)
            └─────────┘
          ┌─────────────┐
          │  Service    │ (30%)
          └─────────────┘
        ┌─────────────────┐
        │   Repository    │ (25%)
        └─────────────────┘
      ┌─────────────────────┐
      │   Unit (Parsers)    │ (25%)
      └─────────────────────┘
```

### Casos de Prueba Críticos

**Parser**:
- Archivo válido completo → 100% éxito
- Archivo con columnas faltantes → Error descriptivo
- Archivo con datos inválidos → Errores por fila
- Formatos de fecha varios → Parsing correcto
- Precios negativos → Rechazo

**Service**:
- Upload con auto_create=True → Clientes creados
- Upload con auto_create=False → Error en BPIDs desconocidos
- Cálculo de descuento → Precisión decimal
- Fechas inválidas (end < start) → Rechazo

**Repository**:
- Bulk insert 1000 registros → < 5s
- Find active discount → Correct SPA returned
- Soft delete → deleted_at set, not in queries

**API**:
- Upload sin autenticación → 401
- Upload de otro tenant → No ver SPAs
- Exportar con filtros → Excel correcto

---

## 8. MONITOREO Y OBSERVABILIDAD

### Métricas Clave

```python
# Prometheus metrics
spa_upload_duration_seconds = Histogram('spa_upload_duration_seconds')
spa_upload_errors_total = Counter('spa_upload_errors_total')
spa_discount_search_duration = Histogram('spa_discount_search_duration')
spa_active_count = Gauge('spa_active_count')
```

### Logs Estructurados

```python
logger.info(
    "SPA upload complete",
    extra={
        "batch_id": str(batch_id),
        "tenant_id": str(tenant_id),
        "total_rows": total_rows,
        "success_count": success_count,
        "error_count": error_count,
        "duration_seconds": duration
    }
)
```

### Alertas

- Upload con > 50% errores → Slack notification
- Query de descuento > 200ms → Warning
- Celery task fallido → Email a admins
- SPAs expirando < 7 días → Dashboard destacado

---

## CONCLUSIÓN

Esta arquitectura proporciona:

1. **Escalabilidad**: Batch inserts, índices optimizados
2. **Mantenibilidad**: Capas separadas, dependency injection
3. **Performance**: Queries < 100ms, denormalización estratégica
4. **Auditabilidad**: Soft deletes, upload logs
5. **Flexibilidad**: Auto-create opcional, filtros múltiples
6. **Robustez**: Validación en múltiples capas, manejo de errores

El sistema puede manejar:
- 100,000+ SPAs por tenant
- Uploads de 10,000 registros en < 30 segundos
- Búsquedas de descuento en < 50ms
- Múltiples uploads concurrentes
