# Desarrollo Pendiente - OnQuota

**Fecha:** 2025-11-15
**Estado del Proyecto:** 95% Completado
**Versión:** 1.0.0-MVP

---

## 📊 Resumen Ejecutivo

OnQuota tiene **6 de 11 módulos completados al 100%** más toda la infraestructura DevOps y seguridad implementada.

### ✅ Módulos Completados (100%)

1. **Autenticación** - JWT con httpOnly cookies, RBAC, multi-tenant
2. **Gestión de Gastos** - CRUD completo, categorización, reportes
3. **CRM de Clientes** - Gestión completa de clientes, estados, industrias
4. **Ventas y Cotizaciones** - Pipeline de ventas, estados, cálculos automáticos
5. **Dashboard General** - KPIs, agregaciones, gráficos
6. **Transporte** - Vehículos, envíos, combustible, mantenimiento

### ✅ Infraestructura Completada (100%)

- **Seguridad:** XSS eliminado, CSRF protection, Rate limiting
- **Observabilidad:** Prometheus + Grafana + 4 dashboards
- **Backups:** PostgreSQL + Redis automatizados cada 4-6 horas
- **CI/CD:** 3 workflows optimizados con security scanning
- **Testing:** >80% coverage backend, >70% frontend
- **Performance:** Caching Redis, N+1 queries eliminados
- **Health Checks:** PostgreSQL + Redis monitoring

---

## 🔴 Módulos Pendientes (5 módulos)

### 1. 🤖 **OCR Service** - ALTA PRIORIDAD

**Propósito:** Extracción automática de datos de facturas usando OCR.

**Estado:** ❌ 0% - **Agente backend-developer asignado (límite alcanzado)**

#### Backend Pendiente (24-30 horas)

**Archivos a crear:**
```
backend/modules/ocr/
├── __init__.py
├── models.py              # OCRJob model
├── schemas.py             # Pydantic schemas
├── repository.py          # CRUD operations
├── router.py              # 5 endpoints FastAPI
├── processor.py           # ImageProcessor (OpenCV)
├── engine.py              # OCREngine (Tesseract)
└── tasks.py               # Celery async tasks
```

**Endpoints a implementar:**
- `POST /api/v1/ocr/process` - Upload y procesar factura
- `GET /api/v1/ocr/jobs/{job_id}` - Estado del job
- `GET /api/v1/ocr/jobs` - Listar jobs con paginación
- `PUT /api/v1/ocr/jobs/{job_id}/confirm` - Confirmar/editar extracción
- `DELETE /api/v1/ocr/jobs/{job_id}` - Eliminar job

**Funcionalidades clave:**
- Preprocesamiento con OpenCV (denoising, deskew, contrast)
- OCR con Tesseract (idiomas: español + inglés)
- Extracción estructurada: proveedor, monto, fecha, categoría
- Confidence score (objetivo: >85%)
- Procesamiento asíncrono con Celery
- Validación de imágenes (max 10MB, formatos: jpg, png, pdf)

**Dependencias necesarias:**
```
pytesseract==0.3.10
Pillow==10.1.0
opencv-python==4.8.1.78
numpy==1.24.3
```

**Migración Alembic:**
```bash
alembic revision -m "create_ocr_jobs_table"
```

**Tests requeridos:**
- test_image_preprocessing
- test_text_extraction
- test_provider_detection
- test_amount_extraction
- test_date_extraction
- test_category_classification

#### Frontend Pendiente (12-16 horas)

**Archivos a crear:**
```
frontend/
├── types/ocr.ts                    # TypeScript interfaces
├── lib/api/ocr.ts                  # API client
├── hooks/useOCR.ts                 # Custom hook con polling
├── components/ocr/
│   ├── ReceiptUpload.tsx          # Drag & drop con preview
│   ├── OCRJobStatus.tsx           # Badge de status
│   ├── OCRReview.tsx              # Form para editar extracción
│   └── OCRJobList.tsx             # Lista de jobs
└── app/(dashboard)/ocr/
    ├── page.tsx                    # Lista de jobs
    └── [id]/page.tsx               # Review individual
```

**Componentes clave:**
- **ReceiptUpload:** react-dropzone, preview de imagen, validación
- **OCRReview:** Form con React Hook Form + Zod, edición de datos extraídos
- **Polling:** Auto-refresh cada 5s para ver progreso de procesamiento
- **Integration:** Botón "Create Expense" que pre-llena formulario

**Configuración externa necesaria:**
- Tesseract instalado en servidor: `/usr/bin/tesseract`
- O Google Vision API key (alternativa premium)

---

### 2. 📊 **SPA Analytics** - MEDIA PRIORIDAD

**Propósito:** Análisis avanzado de archivos Excel/CSV con métricas comerciales.

**Estado:** ❌ 0% - **Agente data-engineer asignado (límite alcanzado)**

#### Backend Pendiente (20-24 horas)

**Archivos a crear:**
```
backend/modules/analytics/
├── __init__.py
├── models.py              # Analysis model
├── schemas.py             # Pydantic schemas
├── repository.py          # CRUD operations
├── router.py              # 5 endpoints FastAPI
├── parser.py              # ExcelParser (pandas)
├── analyzer.py            # SalesAnalyzer (ABC, KPIs)
├── tasks.py               # Celery async processing
└── exporters.py           # Excel/PDF exporters
```

**Endpoints a implementar:**
- `POST /api/v1/analytics/upload` - Upload CSV/Excel
- `GET /api/v1/analytics/{id}` - Obtener análisis completo
- `GET /api/v1/analytics/{id}/abc` - Clasificación ABC detallada
- `GET /api/v1/analytics/{id}/export?format=excel|pdf` - Exportar
- `GET /api/v1/analytics` - Listar análisis

**Análisis incluidos:**
1. **Summary Stats:** Total ventas, promedio, mediana, std dev
2. **ABC Analysis:** Clasificación Pareto (70-20-10 rule)
3. **Top Performers:** Top 10 productos/clientes
4. **Discount Analysis:** Total descuentos, % promedio, correlaciones
5. **Margin Analysis:** Margen bruto, % por categoría
6. **Monthly Trends:** Serie temporal con crecimiento

**Dependencias necesarias:**
```
pandas==2.1.3
numpy==1.24.3
openpyxl==3.1.2
xlrd==2.0.1
reportlab==4.0.7
matplotlib==3.8.2
scipy==1.11.4
```

**Columnas requeridas en archivo:**
- Obligatorias: `product`, `quantity`, `unit_price`
- Opcionales: `client`, `date`, `discount`, `cost`

**Auto-mapeo de columnas:**
- product → producto, articulo, item, descripcion
- quantity → cantidad, qty, unidades
- unit_price → precio, price, precio_unitario

#### Frontend Pendiente (16-20 horas)

**Archivos a crear:**
```
frontend/
├── types/analytics.ts
├── lib/api/analytics.ts
├── hooks/useAnalytics.ts
├── components/analytics/
│   ├── FileUploadZone.tsx         # Upload con validación
│   ├── AnalysisResults.tsx        # Dashboard principal
│   ├── ABCChart.tsx               # Pie chart (Recharts)
│   ├── TopProductsTable.tsx       # Tabla con sorting
│   ├── DiscountAnalysis.tsx       # Cards + gráficos
│   └── MonthlyTrends.tsx          # Line chart temporal
└── app/(dashboard)/analytics/
    ├── page.tsx                    # Lista de análisis
    ├── upload/page.tsx             # Upload interface
    └── [id]/page.tsx               # Visualización completa
```

**Visualizaciones con Recharts:**
- Pie chart para ABC (colores: verde, amarillo, rojo)
- Bar chart para top products
- Line chart para tendencias mensuales
- Area chart para descuentos acumulados

**Features UX:**
- Upload con validación (max 50MB, formatos: xlsx, xls, csv)
- Progress indicator durante procesamiento
- Preview de primeras 10 filas antes de procesar
- Export buttons (Excel con formato, PDF resumen)
- Insights automáticos legibles

---

### 3. 🎯 **Opportunities** - MEDIA PRIORIDAD

**Propósito:** Pipeline de oportunidades de venta estilo CRM.

**Estado:** ❌ 0% - **Agente backend-developer asignado (límite alcanzado)**

#### Backend Pendiente (12-16 horas)

**Archivos a crear:**
```
backend/modules/opportunities/
├── __init__.py
├── models.py              # Opportunity model
├── schemas.py             # Pydantic schemas
├── repository.py          # CRUD + pipeline stats
└── router.py              # 8 endpoints FastAPI
```

**Modelo Opportunity:**
- `name`, `description`
- `client_id` (FK a clients)
- `assigned_to` (FK a users - sales rep)
- `estimated_value`, `currency`, `probability` (0-100%)
- `expected_close_date`, `actual_close_date`
- `stage` (Enum: LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST)

**Endpoints:**
- `POST /opportunities` - Crear
- `GET /opportunities` - Listar con filtros (stage, assigned_to, client_id)
- `GET /opportunities/{id}` - Detalle
- `PUT /opportunities/{id}` - Actualizar
- `PATCH /opportunities/{id}/stage` - Mover a nuevo stage
- `DELETE /opportunities/{id}` - Soft delete
- `GET /opportunities/pipeline/summary` - Stats del pipeline
- `GET /opportunities/pipeline/board` - Data para Kanban

**Pipeline Summary incluye:**
- Total opportunities por stage
- Total value
- Weighted value (suma de valor × probabilidad)
- Win rate (% CLOSED_WON vs total closed)
- Avg days to close

#### Frontend Pendiente (10-14 horas)

**Archivos a crear:**
```
frontend/
├── types/opportunities.ts
├── lib/api/opportunities.ts
├── hooks/useOpportunities.ts
├── components/opportunities/
│   ├── OpportunityBoard.tsx       # Kanban drag & drop
│   ├── OpportunityCard.tsx        # Card con info clave
│   ├── CreateOpportunityModal.tsx # Form de creación
│   ├── EditOpportunityModal.tsx   # Form de edición
│   └── PipelineStats.tsx          # Métricas del pipeline
└── app/(dashboard)/opportunities/
    ├── page.tsx                    # Board view
    └── [id]/page.tsx               # Detalle
```

**Kanban Board:**
- 6 columnas (una por stage)
- Drag & drop entre stages (react-beautiful-dnd o dnd-kit)
- Card muestra: nombre, cliente, valor, probabilidad, fecha esperada
- Color coding por probabilidad
- Contador de oportunidades y valor total por stage

---

### 4. 🔔 **Notificaciones** - BAJA PRIORIDAD

**Propósito:** Sistema de alertas in-app, push y email.

**Estado:** ❌ 0% - **Agente backend-developer asignado (límite alcanzado)**

#### Backend Pendiente (16-20 horas)

**Archivos a crear:**
```
backend/modules/notifications/
├── __init__.py
├── models.py              # Notification model
├── schemas.py             # Pydantic schemas
├── repository.py          # CRUD operations
├── router.py              # 6 endpoints + SSE stream
├── tasks.py               # Celery scheduled tasks
└── services/
    ├── email.py           # SendGrid integration
    └── push.py            # Web Push API
```

**Modelo Notification:**
- `user_id` (FK)
- `title`, `message`, `type` (INFO, WARNING, SUCCESS, ERROR)
- `action_url` - URL para CTA
- `related_entity_type`, `related_entity_id` - Referencia a quote, expense, etc.
- `is_read`, `read_at`
- `channel` (IN_APP, EMAIL, PUSH)

**Endpoints:**
- `GET /notifications` - Listar (filtro: is_read)
- `GET /notifications/unread-count` - Badge counter
- `PATCH /notifications/{id}/read` - Marcar leída
- `POST /notifications/mark-all-read` - Batch update
- `DELETE /notifications/{id}` - Eliminar
- `GET /notifications/stream` - SSE para real-time (opcional)

**Celery Tasks programados:**
```python
# Daily tasks con Celery Beat
- check_expired_quotes() - 9:00 AM
- check_pending_maintenance() - 8:00 AM
- send_weekly_summary() - Lunes 7:00 AM
```

**Email Service (SendGrid):**
- HTML templates con branding
- Unsubscribe link
- Tracking de opens/clicks (opcional)

**Dependencias:**
```
sendgrid==6.11.0
```

#### Frontend Pendiente (8-12 horas)

**Archivos a crear:**
```
frontend/
├── types/notifications.ts
├── lib/api/notifications.ts
├── hooks/useNotifications.ts       # Con SSE subscription
├── components/notifications/
│   ├── NotificationBell.tsx       # Icon con badge
│   ├── NotificationDropdown.tsx   # Popup con lista
│   ├── NotificationItem.tsx       # Item individual
│   └── NotificationCenter.tsx     # Página completa
└── app/(dashboard)/notifications/
    └── page.tsx                    # Centro de notificaciones
```

**Bell Component:**
- Icon con badge animado (número de no leídas)
- Dropdown con últimas 5 notificaciones
- "View all" link
- Mark as read on click

**Real-time updates:**
- SSE connection para recibir notificaciones instantáneas
- Toast notification cuando llega nueva
- Sound alert (opcional, configurable)

---

### 5. 📁 **Account Planner** - BAJA PRIORIDAD

**Propósito:** Planificación estratégica de cuentas clave.

**Estado:** ❌ 0% - No asignado

#### Backend Pendiente (16-20 horas)

**Archivos a crear:**
```
backend/modules/accounts/
├── __init__.py
├── models.py              # AccountPlan, Milestone
├── schemas.py             # Pydantic schemas
├── repository.py          # CRUD operations
└── router.py              # ~11 endpoints
```

**Modelos:**

**AccountPlan:**
- `client_id` (FK)
- `name`, `description`
- `objectives` (Text)
- `swot_strengths`, `swot_weaknesses`, `swot_opportunities`, `swot_threats` (Text)
- `budget`, `timeline`
- `status` (DRAFT, ACTIVE, COMPLETED, ARCHIVED)

**Milestone:**
- `account_plan_id` (FK)
- `name`, `description`
- `due_date`, `completion_date`
- `status` (PENDING, IN_PROGRESS, COMPLETED, DELAYED)
- `responsible_user_id` (FK)

**Endpoints principales:**
- CRUD de account plans
- CRUD de milestones
- GET /accounts/{id}/swot - Análisis SWOT
- GET /accounts/{id}/timeline - Timeline de milestones

#### Frontend Pendiente (12-16 horas)

**Componentes clave:**
- **CreatePlanWizard:** Multi-step form (objetivos → SWOT → timeline → presupuesto)
- **SWOTMatrix:** Grid 2×2 con inputs por cuadrante
- **MilestonesTimeline:** Timeline visual con drag & drop para ajustar fechas
- **AccountOverview:** Dashboard con progress, próximos milestones, alerts

---

## 📦 Dependencias Externas a Configurar

### Servicios que requieren API Keys

1. **OCR (Opcional - mejor accuracy):**
   - Google Vision API: `GOOGLE_VISION_API_KEY`
   - Alternativa gratuita: Tesseract local

2. **Email (Requerido para notificaciones):**
   - SendGrid: `SENDGRID_API_KEY`
   - Alternativa: AWS SES

3. **Storage (Opcional - producción):**
   - AWS S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - Alternativa: MinIO (self-hosted)

### Variables de Entorno a Añadir

```bash
# .env

# OCR Settings
TESSERACT_PATH=/usr/bin/tesseract
GOOGLE_VISION_API_KEY=your-key-here  # Opcional
OCR_UPLOAD_DIR=uploads/ocr
OCR_MAX_FILE_SIZE=10485760  # 10MB

# Analytics Settings
ANALYTICS_UPLOAD_DIR=uploads/analytics
ANALYTICS_MAX_FILE_SIZE=52428800  # 50MB

# Email Settings
SENDGRID_API_KEY=your-key-here
FROM_EMAIL=noreply@onquota.com

# Storage (Opcional)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET_NAME=onquota-files
AWS_REGION=us-east-1

# Notifications
NOTIFICATION_RETENTION_DAYS=30
```

---

## 🚀 Celery Configuration

### Tasks Asíncronos a Implementar

**Archivos a crear:**
```
backend/celery_app.py          # Celery instance
backend/celery_tasks/
├── __init__.py
├── ocr_tasks.py               # process_ocr_job
├── analytics_tasks.py         # process_analysis
└── notification_tasks.py      # send_notification_email
```

**Celery Beat Schedule:**
```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'check-expired-quotes': {
        'task': 'celery_tasks.notification_tasks.check_expired_quotes',
        'schedule': crontab(hour=9, minute=0),  # Daily 9 AM
    },
    'check-pending-maintenance': {
        'task': 'celery_tasks.notification_tasks.check_pending_maintenance',
        'schedule': crontab(hour=8, minute=0),  # Daily 8 AM
    },
    'send-weekly-summary': {
        'task': 'celery_tasks.notification_tasks.send_weekly_summary',
        'schedule': crontab(day_of_week=1, hour=7, minute=0),  # Mondays 7 AM
    },
}
```

**Docker Compose ya tiene:**
- ✅ celery_worker service
- ✅ celery_beat service
- ✅ flower service (monitoring en puerto 5555)

**Solo falta:** Implementar las tasks en código.

---

## 📈 Estimación de Tiempo Total

| Módulo | Backend | Frontend | Total | Prioridad |
|--------|---------|----------|-------|-----------|
| OCR Service | 24-30h | 12-16h | **36-46h** | 🔴 ALTA |
| SPA Analytics | 20-24h | 16-20h | **36-44h** | 🟡 MEDIA |
| Opportunities | 12-16h | 10-14h | **22-30h** | 🟡 MEDIA |
| Notificaciones | 16-20h | 8-12h | **24-32h** | 🟢 BAJA |
| Account Planner | 16-20h | 12-16h | **28-36h** | 🟢 BAJA |
| Celery Setup | 4-6h | - | **4-6h** | 🔴 ALTA |
| **TOTAL** | **92-116h** | **58-78h** | **150-194h** | - |

**Tiempo total estimado:** 150-194 horas

**Con 1 desarrollador full-time:** 4-5 semanas
**Con 2 desarrolladores:** 2-3 semanas
**Con agentes en paralelo:** 1-2 semanas

---

## 🎯 Plan de Implementación Sugerido

### **Sprint 1 (2 semanas): OCR Service + Celery** 🔴

**Objetivo:** Automatizar entrada de gastos

**Tareas:**
1. Configurar Celery workers y Beat
2. Implementar backend OCR completo
3. Implementar UI de OCR
4. Testing con dataset de facturas
5. Integrar con módulo Expenses

**Valor de negocio:** ALTO - Elimina data entry manual, mejora UX

**Bloqueadores potenciales:**
- Tesseract puede requerir tuning por idioma
- Accuracy depende de calidad de imágenes
- Configuración de Celery en producción

---

### **Sprint 2 (2 semanas): SPA Analytics** 🟡

**Objetivo:** Análisis avanzado de ventas

**Tareas:**
1. Parser robusto de Excel/CSV
2. Implementar análisis ABC
3. UI con gráficos (Recharts)
4. Export a Excel/PDF
5. Testing con datasets grandes

**Valor de negocio:** MEDIO-ALTO - Feature diferenciador vs competencia

**Bloqueadores potenciales:**
- Archivos muy grandes (>50MB) pueden requerir streaming
- Mapeo automático de columnas puede fallar con formatos raros
- Performance con datasets de 100k+ rows

---

### **Sprint 3 (1 semana): Opportunities** 🟡

**Objetivo:** CRM de oportunidades

**Tareas:**
1. Backend completo (8 endpoints)
2. Kanban board con drag & drop
3. Integración con Clients y Sales
4. Pipeline metrics

**Valor de negocio:** MEDIO - Complementa módulo de Ventas

**Bloqueadores potenciales:**
- Drag & drop puede ser complejo (usar librería)
- Cálculo de weighted value requiere lógica correcta

---

### **Sprint 4 (1 semana): Notificaciones** 🟢

**Objetivo:** Engagement y alertas

**Tareas:**
1. Sistema in-app completo
2. Email notifications
3. Celery scheduled tasks
4. SSE para real-time (opcional)

**Valor de negocio:** MEDIO - Mejora retención

**Bloqueadores potenciales:**
- SendGrid API key requerida
- SSE puede complicar deployment
- Email templates requieren diseño

---

### **Sprint 5 (1 semana): Account Planner** 🟢

**Objetivo:** Planificación estratégica

**Tareas:**
1. Backend CRUD
2. SWOT matrix UI
3. Timeline de milestones

**Valor de negocio:** BAJO - Feature premium/avanzado

**Bloqueadores potenciales:**
- UX compleja para planificación
- Puede requerir muchas iteraciones de diseño

---

## ✅ Criterios de Completitud

### Para considerar MVP 100% completo:

- [ ] Todos los 11 módulos implementados y funcionando
- [ ] Coverage de tests >80% en todos los módulos nuevos
- [ ] Documentación actualizada (README, API docs)
- [ ] Migraciones Alembic ejecutadas sin errores
- [ ] Celery workers corriendo y procesando tasks
- [ ] Email service configurado y enviando
- [ ] OCR accuracy >85% en dataset de prueba
- [ ] Analytics procesando archivos de 10k+ rows sin timeout
- [ ] UI responsive en mobile
- [ ] Performance: Todos los endpoints <300ms
- [ ] Zero critical security vulnerabilities
- [ ] Backups funcionando (ya implementado ✅)
- [ ] Monitoring funcionando (ya implementado ✅)

---

## 📚 Documentación Pendiente

Al completar cada módulo, actualizar:

1. **README.md** principal con nuevas features
2. **Context_Docs/ESTADO_MODULOS.md** - Marcar como completado
3. **OpenAPI/Swagger** - Auto-generado por FastAPI ✅
4. **Frontend README** con nuevas páginas
5. **DEPLOYMENT_GUIDE.md** con instrucciones de OCR/Analytics setup
6. **API_DOCUMENTATION.md** con ejemplos de uso

---

## 🎓 Recursos de Aprendizaje

### Para implementar OCR:
- [Tesseract Documentation](https://tesseract-ocr.github.io/)
- [OpenCV Python Tutorials](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [Google Vision API](https://cloud.google.com/vision/docs)

### Para implementar Analytics:
- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [ABC Analysis Methodology](https://en.wikipedia.org/wiki/ABC_analysis)
- [Recharts Documentation](https://recharts.org/)

### Para implementar Notifications:
- [SendGrid Python SDK](https://github.com/sendgrid/sendgrid-python)
- [Celery Beat](https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## 🆘 Soporte y Ayuda

**Cuando regresen los agentes (2pm):**
1. Continuar con implementación de módulos pendientes
2. Resolver bloqueadores específicos
3. Code review de implementaciones
4. Optimizaciones de performance
5. Testing y debugging

**Prioridad inmediata cuando se reseteen:**
1. OCR Service (backend-developer + frontend-developer)
2. Celery Configuration (backend-developer)
3. SPA Analytics (data-engineer + frontend-developer)

---

**Última actualización:** 2025-11-15
**Estado:** Esperando reset de agentes a las 2pm
**Próximo paso:** Implementar OCR Service completo
