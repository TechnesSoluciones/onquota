# Checklist de Tareas Pendientes - OnQuota

**Versión:** 1.0
**Fecha:** 2025-11-09
**Última Actualización:** 2025-11-09

---

## Leyenda

- 🔴 **Crítico** - Bloquea funcionalidad principal
- 🟠 **Alta** - Importante para el proyecto
- 🟡 **Media** - Puede esperar pero es necesario
- 🟢 **Baja** - Nice to have

---

## 🔴 CRÍTICO - Completar Módulo de Ventas (40% Restante)

**Estimado:** 8-12 horas

### Backend (4-6 horas)

#### Router de Ventas
- [ ] Crear archivo `/backend/modules/sales/router.py`
- [ ] Implementar endpoint `POST /api/v1/sales/quotes` (crear cotización)
  - [ ] Validar que client_id exista
  - [ ] Generar quote_number automático (QUOT-{YYYY}-{NNNN})
  - [ ] Calcular totales de items
  - [ ] Crear quote + items en transacción
- [ ] Implementar endpoint `GET /api/v1/sales/quotes` (listar con filtros)
  - [ ] Filtros: status, client_id, date_from, date_to
  - [ ] Paginación
  - [ ] RBAC: sales_rep solo ve sus cotizaciones
- [ ] Implementar endpoint `GET /api/v1/sales/quotes/{id}` (detalle)
  - [ ] Incluir items relacionados
  - [ ] Incluir datos de client y sales_rep
- [ ] Implementar endpoint `PUT /api/v1/sales/quotes/{id}` (actualizar)
  - [ ] Solo permitir si status = DRAFT
  - [ ] Recalcular totales al editar items
- [ ] Implementar endpoint `DELETE /api/v1/sales/quotes/{id}` (eliminar)
  - [ ] Solo permitir si status = DRAFT
  - [ ] Soft delete
- [ ] Implementar endpoint `PATCH /api/v1/sales/quotes/{id}/status` (cambiar estado)
  - [ ] Validar transiciones válidas (DRAFT → SENT → ACCEPTED/REJECTED/EXPIRED)
- [ ] Implementar endpoint `GET /api/v1/sales/quotes/summary` (estadísticas)
  - [ ] Total por estado
  - [ ] Monto total
  - [ ] Tasa de conversión
- [ ] Implementar endpoint `POST /api/v1/sales/quotes/{id}/items` (agregar item)
  - [ ] Solo si status = DRAFT
  - [ ] Recalcular total de quote
- [ ] Implementar endpoint `GET /api/v1/sales/quotes/{id}/items` (listar items)
- [ ] Implementar endpoint `PUT /api/v1/sales/quotes/{id}/items/{item_id}` (actualizar item)
  - [ ] Recalcular subtotal y total
- [ ] Implementar endpoint `DELETE /api/v1/sales/quotes/{id}/items/{item_id}` (eliminar item)
  - [ ] No permitir si es el último item
  - [ ] Recalcular total
- [ ] Registrar router en `/backend/main.py`
- [ ] Ejecutar migración: `cd backend && alembic upgrade head`
- [ ] Escribir tests en `/backend/tests/test_sales.py`
  - [ ] Test crear cotización válida
  - [ ] Test crear cotización sin items (debe fallar)
  - [ ] Test listar cotizaciones con RBAC
  - [ ] Test actualizar estado
  - [ ] Test eliminar item (no permitir si es el último)
  - [ ] Test cálculo de totales
- [ ] Ejecutar tests: `pytest tests/test_sales.py -v --cov`

### Frontend (4-6 horas)

#### Componentes
- [ ] Crear `/frontend/components/sales/SaleFilters.tsx`
  - [ ] Filtros: status, client, fecha
  - [ ] Botón limpiar filtros
- [ ] Crear `/frontend/components/sales/StatusBadge.tsx`
  - [ ] Badge con colores según estado
  - [ ] Usar constantes de `SALE_STATUS_COLORS`
- [ ] Crear `/frontend/components/sales/QuoteItemsTable.tsx`
  - [ ] Tabla editable de items
  - [ ] Columnas: Producto, Descripción, Cantidad, Precio Unitario, Descuento %, Subtotal
  - [ ] Botones: Agregar fila, Editar, Eliminar
  - [ ] Calcular subtotal automáticamente: `(quantity × unit_price) × (1 - discount/100)`
  - [ ] Mostrar total general al pie
- [ ] Crear `/frontend/components/sales/CreateSaleModal.tsx`
  - [ ] Formulario con validación (React Hook Form + Zod)
  - [ ] Select de cliente (autocomplete)
  - [ ] Select de moneda (USD, EUR, COP)
  - [ ] DatePicker para valid_until
  - [ ] Textarea para notes
  - [ ] QuoteItemsTable embebido
  - [ ] Validar: al menos 1 item, valid_until >= hoy
- [ ] Crear `/frontend/components/sales/EditSaleModal.tsx`
  - [ ] Similar a CreateSaleModal
  - [ ] Prellenar datos de quote + items
  - [ ] Solo permitir edición si status = DRAFT (mostrar mensaje si no)
- [ ] Crear `/frontend/components/sales/SaleStats.tsx`
  - [ ] KPI Cards: Total cotizaciones, Por estado, Monto total, Tasa conversión
  - [ ] Gráfico Pie: Distribución por estado
  - [ ] Gráfico Bar: Monto por estado
  - [ ] Gráfico Line: Evolución temporal (últimos 6 meses)

#### Páginas
- [ ] Crear `/frontend/app/(dashboard)/sales/page.tsx`
  - [ ] Header con título + botón "Nueva Cotización"
  - [ ] SaleFilters component
  - [ ] Tabla de cotizaciones:
    - [ ] Columnas: Número, Cliente, Fecha, Válido hasta, Estado, Monto, Acciones
    - [ ] Paginación
    - [ ] Botón "Ver" → navegar a detalle
    - [ ] Botón "Editar" → abrir modal (solo si DRAFT)
    - [ ] Botón "Eliminar" (solo si DRAFT)
  - [ ] Modal de creación/edición
- [ ] Crear `/frontend/app/(dashboard)/sales/[id]/page.tsx`
  - [ ] Header con botón "Volver"
  - [ ] Card con info de quote:
    - [ ] Cliente, Fecha, Válido hasta, Estado, Moneda, Total
  - [ ] Tabla de items (no editable)
  - [ ] Sección de notas
  - [ ] Botones de acción:
    - [ ] Editar (solo si DRAFT)
    - [ ] Cambiar Estado (dropdown con opciones válidas)
    - [ ] Imprimir/Exportar PDF (opcional)
- [ ] Crear `/frontend/app/(dashboard)/sales/stats/page.tsx`
  - [ ] Header con título + filtros de fecha
  - [ ] SaleStats component

#### Sidebar
- [ ] Actualizar `/frontend/components/layout/Sidebar.tsx`
  - [ ] Agregar ítem "Ventas" con ícono TrendingUp
  - [ ] Submenu:
    - [ ] Cotizaciones (`/dashboard/sales`)
    - [ ] Estadísticas (`/dashboard/sales/stats`)

### Testing Integración
- [ ] Crear cotización desde frontend → Backend → Success
- [ ] Listar cotizaciones con filtros → Data correcta
- [ ] Ver detalle de cotización → Datos completos
- [ ] Editar cotización (DRAFT) → Actualización exitosa
- [ ] Intentar editar cotización (SENT) → Error apropiado
- [ ] Cambiar estado DRAFT → SENT → Success
- [ ] Eliminar cotización → Soft delete exitoso
- [ ] RBAC: Sales rep solo ve sus cotizaciones → Verificar
- [ ] Paginación funcionando correctamente

---

## 🟠 ALTA PRIORIDAD - Dashboard General

**Estimado:** 16-20 horas

### Backend (6-8 horas)

- [ ] Crear módulo Dashboard
  - [ ] Archivo `/backend/modules/dashboard/repository.py`
    - [ ] Método `get_overview(tenant_id, user, date_from, date_to)`
      - [ ] Agregación de ventas (total, count, by_status)
      - [ ] Agregación de gastos (total, count, by_category)
      - [ ] Agregación de clientes (total, new_this_month, by_status)
      - [ ] Actividades recientes (últimas 10)
    - [ ] Método `get_sales_vs_expenses(tenant_id, user, months=6)`
      - [ ] Comparación mes a mes
      - [ ] Calcular profit (ventas - gastos)
    - [ ] Método `get_top_clients(tenant_id, user, limit=5)`
      - [ ] Top clientes por volumen de ventas
    - [ ] Método `get_recent_activities(tenant_id, user, limit=10)`
      - [ ] Merge de actividades de ventas, gastos, clientes
  - [ ] Archivo `/backend/modules/dashboard/router.py`
    - [ ] Endpoint `GET /api/v1/dashboard/overview`
    - [ ] Endpoint `GET /api/v1/dashboard/sales-vs-expenses`
    - [ ] Endpoint `GET /api/v1/dashboard/top-clients`
    - [ ] Endpoint `GET /api/v1/dashboard/recent-activities`
  - [ ] Registrar router en main.py
  - [ ] Implementar cache con Redis (TTL: 5 minutos)
  - [ ] Optimizar queries (usar `asyncio.gather()` para queries paralelos)

### Frontend (10-12 horas)

- [ ] Crear Hook `/frontend/hooks/useDashboard.ts`
  - [ ] Fetch overview data
  - [ ] Loading states
  - [ ] Error handling
- [ ] Crear API client `/frontend/lib/api/dashboard.ts`
  - [ ] Métodos para todos los endpoints
- [ ] Crear componentes:
  - [ ] `/frontend/components/dashboard/KPICards.tsx`
    - [ ] 5 Cards: Ventas del Mes, Gastos del Mes, Margen, Clientes Activos, Cotizaciones Pendientes
    - [ ] Con íconos y tendencias
  - [ ] `/frontend/components/dashboard/SalesVsExpensesChart.tsx`
    - [ ] Line chart comparativo (últimos 6 meses)
    - [ ] Dos líneas: Ventas (verde), Gastos (rojo)
    - [ ] Área de profit
  - [ ] `/frontend/components/dashboard/TopClientsWidget.tsx`
    - [ ] Bar chart horizontal
    - [ ] Top 5 clientes
  - [ ] `/frontend/components/dashboard/ExpensesByCategoryChart.tsx`
    - [ ] Donut chart
    - [ ] Colores por categoría
  - [ ] `/frontend/components/dashboard/RecentActivityWidget.tsx`
    - [ ] Lista de últimas 10 actividades
    - [ ] Con íconos según tipo
    - [ ] Timestamps relativos ("hace 2 horas")
  - [ ] `/frontend/components/dashboard/AlertsWidget.tsx`
    - [ ] Lista de alertas:
      - [ ] Cotizaciones por vencer (próximos 3 días)
      - [ ] Gastos fuera de presupuesto
      - [ ] Clientes sin actividad >30 días
- [ ] Crear página `/frontend/app/(dashboard)/dashboard/page.tsx`
  - [ ] Layout responsive:
    - [ ] KPI Cards (5 columnas)
    - [ ] SalesVsExpenses (66%) | TopClients (33%)
    - [ ] ExpensesByCategory (50%) | RecentActivity (50%)
    - [ ] Alerts (100%)
  - [ ] Loading skeletons
  - [ ] Error boundaries

### Testing
- [ ] Backend: Tests de agregaciones
- [ ] Frontend: Tests de componentes de dashboard
- [ ] Integración: Verificar que datos se muestran correctamente

---

## 🟡 MEDIA PRIORIDAD - Módulo de Transporte

**Estimado:** 20-24 horas

### Backend (12-14 horas)

#### Modelos y Schemas
- [ ] Crear modelo `/backend/models/vehicle.py`
  - [ ] Campos: plate_number, brand, model, year, fuel_type, current_odometer, assigned_to, status
  - [ ] Relación con User (assigned_to)
- [ ] Crear modelo `/backend/models/fuel_log.py`
  - [ ] Campos: vehicle_id, date, liters, price_per_liter, total_amount, odometer, station
  - [ ] Relación con Vehicle (CASCADE delete)
- [ ] Crear modelo `/backend/models/maintenance_log.py`
  - [ ] Campos: vehicle_id, date, type, description, cost, odometer, next_maintenance_km, next_maintenance_date
- [ ] Crear schemas `/backend/schemas/transport.py`
  - [ ] VehicleCreate, VehicleUpdate, VehicleResponse
  - [ ] FuelLogCreate, FuelLogUpdate, FuelLogResponse
  - [ ] MaintenanceLogCreate, MaintenanceLogUpdate, MaintenanceLogResponse
  - [ ] VehicleEfficiency, MaintenanceAlert
  - [ ] TransportStats

#### Repository
- [ ] Crear `/backend/modules/transport/repository.py`
  - [ ] CRUD para vehicles (5 métodos)
  - [ ] CRUD para fuel_logs (5 métodos)
  - [ ] CRUD para maintenance_logs (5 métodos)
  - [ ] Método `calculate_efficiency(vehicle_id, date_from, date_to)`
  - [ ] Método `get_maintenance_alerts(vehicle_id)`
  - [ ] Método `get_stats(tenant_id, user)`

#### Router
- [ ] Crear `/backend/modules/transport/router.py`
  - [ ] Endpoints para vehicles (6 endpoints)
  - [ ] Endpoints para fuel_logs (6 endpoints)
  - [ ] Endpoints para maintenance (6 endpoints)
  - [ ] Endpoint especial: GET /vehicles/{id}/efficiency
  - [ ] Endpoint especial: GET /maintenance/upcoming
- [ ] Registrar router en main.py

#### Migración
- [ ] Crear migración `005_create_transport_tables.py`
  - [ ] Tabla vehicles
  - [ ] Tabla fuel_logs
  - [ ] Tabla maintenance_logs
  - [ ] Enums: fuel_type, maintenance_type, vehicle_status
  - [ ] Índices apropiados
- [ ] Ejecutar migración

### Frontend (8-10 horas)

- [ ] Crear types `/frontend/types/transport.ts`
- [ ] Crear constants `/frontend/constants/transport.ts`
- [ ] Crear validations `/frontend/lib/validations/transport.ts`
- [ ] Crear API client `/frontend/lib/api/transport.ts`
- [ ] Crear hooks: `useVehicles`, `useFuelLogs`, `useMaintenance`
- [ ] Crear componentes:
  - [ ] VehicleList.tsx
  - [ ] CreateVehicleModal.tsx
  - [ ] FuelLogList.tsx
  - [ ] CreateFuelLogModal.tsx
  - [ ] MaintenanceList.tsx
  - [ ] CreateMaintenanceModal.tsx
  - [ ] VehicleEfficiencyChart.tsx
  - [ ] TransportStats.tsx
- [ ] Crear páginas:
  - [ ] /transport/vehicles
  - [ ] /transport/vehicles/[id] (detalle con tabs: Info, Combustible, Mantenimiento, Eficiencia)
  - [ ] /transport/fuel-logs
  - [ ] /transport/maintenance
  - [ ] /transport/stats
- [ ] Actualizar Sidebar con submenu Transporte

---

## 🟡 MEDIA PRIORIDAD - Servicio OCR

**Estimado:** 24-30 horas

### Infraestructura (2 horas)
- [ ] Configurar Celery en `/backend/celery_app.py`
- [ ] Configurar Redis como broker
- [ ] Crear queue "ocr"
- [ ] Instalar dependencias: `pytesseract`, `opencv-python`, `Pillow`
- [ ] Instalar Tesseract en sistema: `apt-get install tesseract-ocr tesseract-ocr-spa`

### Backend (16-20 horas)

#### Procesamiento de Imágenes
- [ ] Crear `/backend/modules/ocr/image_processor.py`
  - [ ] Método `preprocess(image_path)` - Preprocesamiento con OpenCV
    - [ ] Convertir a escala de grises
    - [ ] Aplicar threshold
    - [ ] Reducir ruido
    - [ ] Ajustar contraste
    - [ ] Deskew (corregir inclinación)
  - [ ] Método `validate_image(image_path)` - Validar calidad

#### OCR Engine
- [ ] Crear `/backend/modules/ocr/ocr_engine.py`
  - [ ] Método `extract_text(image)` - Extraer texto con Tesseract
  - [ ] Método `extract_structured_data(text)` - Parsear datos
    - [ ] Extraer monto (regex: `TOTAL[:\s]+\$?\s*([0-9,.]+)`)
    - [ ] Extraer fecha (regex: varios formatos)
    - [ ] Extraer proveedor (primeras líneas)
    - [ ] Inferir categoría (keywords)
    - [ ] Calcular confidence
  - [ ] Método `_calculate_confidence(data)` - Score de confianza

#### Celery Tasks
- [ ] Crear `/backend/modules/ocr/tasks.py`
  - [ ] Task `process_receipt(expense_id, image_path)`
    - [ ] Preprocesar imagen
    - [ ] Extraer texto
    - [ ] Extraer datos estructurados
    - [ ] Si confidence >= 0.8: auto-actualizar
    - [ ] Si confidence < 0.8: marcar para revisión
    - [ ] Retry logic (max 3 intentos)

#### Router
- [ ] Crear `/backend/modules/ocr/router.py`
  - [ ] Endpoint `POST /ocr/process` (upload + lanzar tarea)
  - [ ] Endpoint `GET /ocr/status/{task_id}` (consultar estado)
  - [ ] Endpoint `GET /ocr/result/{task_id}` (obtener resultado)
- [ ] Registrar router en main.py

### Frontend (8-10 horas)

- [ ] Crear `/frontend/components/ocr/ReceiptUpload.tsx`
  - [ ] Drag & drop de imágenes
  - [ ] Preview de imagen
  - [ ] Progress bar durante procesamiento
  - [ ] Polling de task status (cada 2 segundos)
- [ ] Crear `/frontend/components/ocr/OCRReview.tsx`
  - [ ] Mostrar imagen + datos extraídos lado a lado
  - [ ] Confidence indicator
  - [ ] Editar campos con bajo confidence
  - [ ] Botones: Aprobar, Rechazar
- [ ] Actualizar `CreateExpenseModal.tsx`
  - [ ] Botón "Upload Factura" (con ícono de cámara)
  - [ ] Al completar OCR → Prellenar campos del formulario
  - [ ] Mantener imagen para referencia

### Testing
- [ ] Dataset de prueba: 20 facturas reales
- [ ] Métricas:
  - [ ] Accuracy monto: >90%
  - [ ] Accuracy fecha: >85%
  - [ ] Accuracy proveedor: >80%
- [ ] Tests unitarios de procesamiento
- [ ] Tests de integración con Celery

---

## 🟡 MEDIA PRIORIDAD - SPA Analytics

**Estimado:** 20-24 horas

### Backend (12-14 horas)

- [ ] Crear `/backend/modules/analytics/parser.py`
  - [ ] Método `parse(file_path)` - Leer Excel/CSV con pandas
  - [ ] Método `validate_columns(df)` - Verificar columnas requeridas
  - [ ] Método `normalize_columns(df)` - Normalizar nombres
- [ ] Crear `/backend/modules/analytics/analyzer.py`
  - [ ] Método `calculate_metrics(df)` - Calcular todas las métricas
    - [ ] Subtotales
    - [ ] Descuento efectivo
    - [ ] Venta neta
  - [ ] Método `abc_analysis(df)` - Clasificación ABC de productos
  - [ ] Método `discount_analysis(df)` - Análisis de descuentos por cliente
  - [ ] Método `trend_analysis(df)` - Tendencias temporales (si hay fecha)
- [ ] Crear modelo `/backend/models/analysis.py` para guardar resultados
- [ ] Crear schemas `/backend/schemas/analytics.py`
- [ ] Crear `/backend/modules/analytics/repository.py` (CRUD de análisis)
- [ ] Crear `/backend/modules/analytics/router.py`
  - [ ] Endpoint `POST /analytics/upload` (upload + procesar en background)
  - [ ] Endpoint `GET /analytics/results/{id}` (obtener resultados)
  - [ ] Endpoint `GET /analytics/export/{id}` (generar Excel con análisis)
  - [ ] Endpoint `GET /analytics/list` (listar análisis previos)
- [ ] Crear Celery task `process_analytics(file_path)`
- [ ] Registrar router en main.py

### Frontend (8-10 horas)

- [ ] Crear types y constants
- [ ] Crear API client `/frontend/lib/api/analytics.ts`
- [ ] Crear hook `useAnalytics`
- [ ] Crear componentes:
  - [ ] FileUploadZone.tsx (drag & drop)
  - [ ] AnalysisResults.tsx (mostrar métricas y gráficos)
  - [ ] ABCTable.tsx (tabla con clasificación ABC)
  - [ ] DiscountAnalysisChart.tsx
  - [ ] TrendChart.tsx
  - [ ] ExportButton.tsx
- [ ] Crear páginas:
  - [ ] /analytics/upload
  - [ ] /analytics/results/[id]
  - [ ] /analytics/list (historial)
- [ ] Actualizar Sidebar

---

## 🟢 BAJA PRIORIDAD - Sistema de Notificaciones

**Estimado:** 16-20 horas

### Backend (10-12 horas)

- [ ] Crear modelo `/backend/models/notification.py`
  - [ ] Campos: user_id, type, title, message, link, read, created_at
- [ ] Crear schemas `/backend/schemas/notification.py`
- [ ] Crear `/backend/modules/notifications/repository.py` (CRUD)
- [ ] Crear `/backend/modules/notifications/router.py`
  - [ ] Endpoint `GET /notifications` (listar)
  - [ ] Endpoint `PATCH /notifications/{id}/read` (marcar como leída)
  - [ ] Endpoint `POST /notifications/mark-all-read` (marcar todas)
  - [ ] Endpoint `DELETE /notifications/{id}` (eliminar)
- [ ] Configurar Celery Beat en `/backend/celery_beat.py`
  - [ ] Tarea: `check_expiring_quotes` (diario 9am)
  - [ ] Tarea: `check_maintenance_due` (diario 8am)
  - [ ] Tarea: `check_inactive_clients` (semanal)
- [ ] Crear `/backend/modules/notifications/tasks.py`
  - [ ] Task `check_expiring_quotes()` - Buscar cotizaciones por vencer (3 días)
  - [ ] Task `check_maintenance_due()` - Verificar mantenimientos pendientes
  - [ ] Task `check_inactive_clients()` - Clientes sin actividad >30 días
  - [ ] Task `send_email(to, subject, body)` - Enviar email (opcional)
- [ ] Migración para tabla notifications

### Frontend (6-8 horas)

- [ ] Crear hook `useNotifications`
  - [ ] Polling cada 30 segundos
  - [ ] Contar no leídas
  - [ ] Métodos: markAsRead, markAllAsRead
- [ ] Crear componentes:
  - [ ] NotificationBell.tsx (ícono con badge en navbar)
  - [ ] NotificationDropdown.tsx (lista de notificaciones)
  - [ ] NotificationItem.tsx
  - [ ] WebPushManager.tsx (gestionar suscripción Push)
- [ ] Integrar NotificationBell en Header/Navbar
- [ ] Agregar página `/notifications` (lista completa)

---

## 🟢 BAJA PRIORIDAD - Account Planner

**Estimado:** 16-20 horas

### Backend (10-12 horas)

- [ ] Crear modelos:
  - [ ] `/backend/models/account_plan.py`
    - [ ] Campos: client_id, title, objective, start_date, end_date, status, SWOT
  - [ ] `/backend/models/account_plan_milestone.py`
    - [ ] Campos: plan_id, title, description, due_date, completed
- [ ] Crear schemas `/backend/schemas/account_plan.py`
- [ ] Crear `/backend/modules/account_plans/repository.py`
  - [ ] CRUD para planes
  - [ ] CRUD para milestones
  - [ ] Método `get_plan_with_milestones(plan_id)`
  - [ ] Método `calculate_progress(plan_id)` - % de milestones completados
- [ ] Crear `/backend/modules/account_plans/router.py`
  - [ ] Endpoints CRUD para planes
  - [ ] Endpoints CRUD para milestones
  - [ ] Endpoint `GET /account-plans/{id}/progress`
- [ ] Migración para tablas
- [ ] Registrar router en main.py

### Frontend (6-8 horas)

- [ ] Crear types, constants, validations
- [ ] Crear API client
- [ ] Crear hook `useAccountPlans`
- [ ] Crear componentes:
  - [ ] CreatePlanWizard.tsx (wizard multi-paso)
    - [ ] Paso 1: Información básica
    - [ ] Paso 2: Objetivos SMART
    - [ ] Paso 3: Análisis FODA
    - [ ] Paso 4: Milestones
  - [ ] PlanDetailView.tsx
  - [ ] SWOTMatrix.tsx (matriz visual)
  - [ ] MilestonesTimeline.tsx
  - [ ] ProgressIndicator.tsx
- [ ] Crear páginas:
  - [ ] /account-plans (lista)
  - [ ] /account-plans/[id] (detalle)
  - [ ] /account-plans/new (crear)
- [ ] Actualizar Sidebar

---

## Infraestructura y DevOps

### Setup Inicial
- [ ] Configurar variables de entorno de producción
- [ ] Configurar SSL/TLS (Let's Encrypt)
- [ ] Configurar CORS apropiadamente
- [ ] Configurar rate limiting (100 req/min por usuario)

### Monitoreo
- [ ] Configurar logs estructurados (JSON)
- [ ] Implementar health check endpoints
- [ ] Configurar alertas de errores (Sentry o similar)
- [ ] Configurar métricas de performance (Prometheus + Grafana)

### Backup y Seguridad
- [ ] Automatizar backup diario de PostgreSQL
- [ ] Configurar retention policy (30 días)
- [ ] Implementar encriptación en reposo para datos sensibles
- [ ] Configurar firewall y security groups

### CI/CD
- [ ] Crear workflow de GitHub Actions
  - [ ] Linting (backend: ruff, frontend: eslint)
  - [ ] Type checking (backend: mypy)
  - [ ] Tests (backend: pytest, frontend: jest)
  - [ ] Build
  - [ ] Deploy a staging
- [ ] Configurar deploy automático a producción (en main branch)

---

## Testing y Calidad de Código

### Backend
- [ ] Alcanzar >80% coverage en tests
- [ ] Implementar tests de integración
- [ ] Implementar tests de carga (Locust o k6)
  - [ ] Objetivo: 100 req/s sin degradación
- [ ] Configurar pre-commit hooks (ruff, mypy)

### Frontend
- [ ] Alcanzar >70% coverage en tests de componentes
- [ ] Tests E2E con Playwright
  - [ ] Happy path: Crear gasto, crear cliente, crear cotización
  - [ ] Login/Logout flow
- [ ] Lighthouse audit: >90 en performance

---

## Documentación

### API
- [ ] Documentar todos los endpoints en OpenAPI/Swagger
- [ ] Agregar ejemplos de request/response
- [ ] Documentar códigos de error

### Usuario
- [ ] Crear guía de usuario (PDF)
- [ ] Crear videos tutoriales (opcional)
- [ ] FAQ

### Técnica
- [ ] Completar README.md con setup instructions
- [ ] Documentar variables de entorno
- [ ] Crear diagrama de arquitectura (actualizado)
- [ ] Documentar proceso de deploy

---

## Mejoras y Optimizaciones

### Performance
- [ ] Implementar cache en endpoints de lectura frecuente (Redis, TTL: 5 min)
- [ ] Optimizar queries N+1 con `joinedload()`
- [ ] Implementar lazy loading de componentes en frontend
- [ ] Implementar paginación infinita en listas largas

### UX
- [ ] Agregar dark mode (opcional)
- [ ] Implementar búsqueda global (cmd+k)
- [ ] Agregar shortcuts de teclado
- [ ] Mejorar mensajes de error (más descriptivos)
- [ ] Agregar loading skeletons en todas las páginas

### Seguridad
- [ ] Implementar rate limiting por endpoint
- [ ] Agregar CAPTCHA en registro/login
- [ ] Implementar 2FA (opcional)
- [ ] Auditoría de seguridad con OWASP ZAP

---

## Roadmap de Releases

### v1.0 (MVP) - Semana 1-2
- ✅ Autenticación
- ✅ Gastos
- ✅ Clientes
- 🔴 Ventas (40% pendiente)
- 🟠 Dashboard General

### v1.1 - Semana 3-4
- 🟡 Transporte
- 🟡 OCR básico

### v1.2 - Semana 5-6
- 🟡 SPA Analytics
- 🟢 Notificaciones

### v2.0 - Semana 7+
- 🟢 Account Planner
- Integraciones con ERPs
- Mobile app (React Native)

---

## Notas Importantes

### Antes de Deploy a Producción:
1. Ejecutar todas las migraciones
2. Crear usuario admin inicial
3. Verificar que todos los tests pasen
4. Hacer backup de base de datos
5. Verificar variables de entorno
6. Ejecutar health checks

### Priorización Dinámica:
Este checklist debe ajustarse según:
- Feedback de usuarios
- Métricas de uso
- Bugs críticos encontrados

### Convenciones:
- Commits en español
- Mensajes descriptivos
- PR reviews obligatorios
- No push directo a main

---

**Última Actualización:** 2025-11-09
**Responsable:** OnQuota Development Team

**Tracking:** Marcar items completados con ✅ y actualizar esta fecha
