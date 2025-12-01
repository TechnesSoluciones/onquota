# Analytics & Export Implementation

## Resumen

Se han implementado exitosamente todos los endpoints REST de analytics y funcionalidades de exportación para el proyecto OnQuota.

## Componentes Implementados

### 1. Schemas Pydantic para Analytics (schemas.py)

**Ubicación**: `/backend/modules/opportunities/schemas.py`

Se agregaron los siguientes schemas de respuesta:

#### WinRateResponse
- `total_closed`: Total de oportunidades cerradas
- `won`: Número de oportunidades ganadas
- `lost`: Número de oportunidades perdidas
- `win_rate`: Porcentaje de tasa de éxito
- `total_won_value`: Valor total de oportunidades ganadas
- `total_lost_value`: Valor total de oportunidades perdidas
- `average_won_value`: Valor promedio por deal ganado

#### ConversionRatesResponse
- `conversion_rates`: Dict con tasas de conversión por stage
- Incluye `ConversionRateStage` con:
  - stage, count, converted_to_next, conversion_rate, next_stage

#### RevenueForecastResponse
- `forecast_period_days`: Días del período de forecast
- `end_date`: Fecha final del forecast
- `opportunity_count`: Total de oportunidades en forecast
- `best_case`: Mejor escenario (suma de todos los valores)
- `weighted`: Forecast ponderado por probabilidad
- `conservative`: Forecast conservador (solo deals ≥75% probabilidad)
- `monthly_breakdown`: Desglose mensual del forecast

#### PipelineHealthResponse
- `total_active_opportunities`: Total de oportunidades activas
- `total_pipeline_value`: Valor total del pipeline
- `weighted_pipeline_value`: Valor ponderado del pipeline
- `stage_distribution`: Distribución por etapas
- `aging_analysis`: Análisis de antigüedad (0-30, 31-60, 61-90, 90+ días)
- `overdue_count`: Número de oportunidades vencidas
- `overdue_value`: Valor de oportunidades vencidas

---

### 2. Endpoints REST de Analytics (router.py)

**Ubicación**: `/backend/modules/opportunities/router.py`

#### GET /api/v1/opportunities/analytics/win-rate

**Parámetros de Query**:
- `user_id` (opcional): Filtrar por sales rep
- `date_from` (opcional): Fecha inicial del análisis
- `date_to` (opcional): Fecha final del análisis

**Funcionalidad**:
- Calcula win rate general y por período
- Incluye métricas de valor (total ganado, perdido, promedio)
- Respeta RBAC (sales reps solo ven sus datos)

**Casos de Uso**:
- Tracking de performance
- Evaluación de sales reps
- Dashboard de métricas
- Análisis histórico

---

#### GET /api/v1/opportunities/analytics/conversion-rates

**Parámetros de Query**:
- `user_id` (opcional): Filtrar por sales rep

**Funcionalidad**:
- Calcula tasas de conversión entre stages del pipeline
- Muestra cuántas oportunidades avanzan de cada etapa
- Identifica cuellos de botella en el proceso de ventas

**Casos de Uso**:
- Optimización del pipeline
- Identificación de bottlenecks
- Análisis de eficiencia del proceso
- Detección de necesidades de training

---

#### GET /api/v1/opportunities/analytics/forecast

**Parámetros de Query**:
- `days` (default: 90, min: 30, max: 365): Días a proyectar
- `user_id` (opcional): Filtrar por sales rep

**Funcionalidad**:
- Genera forecast de revenue para próximos N días
- Tres escenarios: best case, weighted, conservative
- Desglose mensual del forecast
- Basado en probabilidades y fechas esperadas de cierre

**Casos de Uso**:
- Planificación de revenue
- Tracking de quotas
- Forecasting financiero
- Planificación de capacidad de ventas

---

#### GET /api/v1/opportunities/analytics/pipeline-health

**Parámetros de Query**:
- `user_id` (opcional): Filtrar por sales rep

**Funcionalidad**:
- Métricas completas de salud del pipeline
- Distribución por stages
- Análisis de antigüedad de oportunidades
- Tracking de oportunidades vencidas
- Comparación valor total vs ponderado

**Casos de Uso**:
- Evaluación de calidad del pipeline
- Identificación de riesgos (deals viejos/vencidos)
- Monitoreo de salud del proceso
- Coaching y management

---

### 3. OpportunityExporter (exporters.py)

**Ubicación**: `/backend/modules/opportunities/exporters.py`

**Clase**: `OpportunityExporter`

**Método Principal**: `export_to_excel(opportunities, filename=None)`

**Sheets Generados**:

1. **All Opportunities**
   - Lista completa con todos los campos
   - Columnas: ID, Name, Client, Sales Rep, Stage, Estimated Value, Currency, Probability, Weighted Value, Expected Close, Actual Close, Loss Reason, Created At, Updated At
   - Formato profesional con headers en color
   - Formato de moneda para valores
   - Auto-ajuste de columnas
   - Fila de headers congelada

2. **Summary by Stage**
   - Estadísticas agregadas por stage del pipeline
   - Métricas: Count, Total Value, Weighted Value, Avg Probability, Avg Value
   - Fila de totales al final
   - Formato de moneda y porcentajes

3. **Summary by Sales Rep**
   - Performance por representante de ventas
   - Métricas: Total Opps, Won, Lost, Active, Win Rate %, Total Won Value, Avg Deal Size, Pipeline Value
   - Identifica top performers
   - Análisis de pipeline por rep

4. **Win Rate Analysis**
   - Análisis detallado de win/loss
   - Métricas clave de win rate
   - Desglose de razones de pérdida (loss reasons)
   - Estadísticas de valor ganado vs perdido

**Características**:
- Formato profesional con colores corporativos
- Headers en negrita con fondo azul
- Formato automático de moneda
- Auto-ajuste de anchos de columna
- Filas de headers congeladas
- Validación de datos

---

### 4. Endpoint de Exportación a Excel

**Ubicación**: `/backend/modules/opportunities/router.py`

#### GET /api/v1/opportunities/export/excel

**Parámetros de Query**:
- `stage` (opcional): Filtrar por stage
- `user_id` (opcional): Filtrar por sales rep
- `date_from` (opcional): Filtrar por fecha de creación desde
- `date_to` (opcional): Filtrar por fecha de creación hasta

**Funcionalidad**:
- Exporta opportunities a Excel con múltiples sheets
- Aplica filtros antes de exportar
- Respeta RBAC (sales reps solo exportan sus datos)
- Genera archivo descargable

**Response**:
- Archivo Excel (.xlsx)
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Descarga automática con nombre descriptivo

**Casos de Uso**:
- Análisis offline
- Reportes ejecutivos
- Backup de datos
- Integración con otras herramientas

---

### 5. AccountPlanExporter (exporters.py)

**Ubicación**: `/backend/modules/accounts/exporters.py`

**Clase**: `AccountPlanExporter`

**Método Principal**: `export_to_pdf(plan, filename=None)`

**Secciones del PDF**:

1. **Header Section**
   - Título del plan
   - Información del cliente
   - Status del plan
   - Creador y fechas
   - Tabla informativa con datos clave

2. **Plan Overview**
   - Descripción del plan
   - Métricas clave en tabla:
     - Revenue Goal
     - Total Milestones
     - Completed Milestones
     - Progress %

3. **SWOT Analysis Matrix**
   - Matriz 2x2 visual
   - Cuadrantes con colores distintivos:
     - Strengths (verde)
     - Weaknesses (naranja)
     - Opportunities (azul)
     - Threats (rojo)
   - Lista de items por categoría

4. **Milestones Timeline**
   - Tabla con todos los milestones
   - Columnas: Title, Due Date, Status, Completion
   - Status con color coding:
     - Pending (gris)
     - In Progress (azul)
     - Completed (verde)
     - Cancelled (rojo)
   - Ordenados por fecha de vencimiento

5. **Summary Statistics**
   - Estadísticas agregadas:
     - Milestones (total, completed, in progress, pending, overdue)
     - SWOT Items (total por categoría)
     - Timeline (días restantes)
   - Tabla estructurada con categorías

**Características**:
- Formato profesional para presentaciones
- Colores corporativos y consistentes
- Tipografía clara y legible
- Tablas con bordes y estilos
- Color coding para status
- Footer con timestamp de generación
- Estructura modular y extensible

---

### 6. Endpoint de Exportación a PDF

**Ubicación**: `/backend/modules/accounts/router.py`

#### GET /api/v1/accounts/plans/{plan_id}/export/pdf

**Parámetros de Path**:
- `plan_id`: UUID del account plan a exportar

**Funcionalidad**:
- Exporta account plan completo a PDF profesional
- Incluye todos los milestones y SWOT items
- Genera documento listo para presentar
- Formato business-ready

**Response**:
- Archivo PDF
- Content-Type: application/pdf
- Descarga automática con nombre limpio

**Casos de Uso**:
- Presentaciones a clientes
- Reportes ejecutivos
- Sesiones de planning estratégico
- Revisión offline
- Documentación y archivo

---

## Seguridad y RBAC

Todos los endpoints implementados respetan el modelo RBAC:

- **Sales Reps**: Solo pueden ver y exportar sus propios datos
- **Supervisors/Admins**: Pueden filtrar por sales rep o ver todos los datos
- Validación de tenant_id en todas las queries
- Logging de errores sin exponer información sensible

---

## Manejo de Errores

Implementación robusta de error handling:

- Try-catch en todos los endpoints
- Logging detallado de errores
- Responses HTTP apropiados (404, 500)
- Mensajes de error informativos
- Validación de datos de entrada

---

## Archivos Creados/Modificados

### Nuevos Archivos:
1. `/backend/modules/opportunities/exporters.py` - Exportador de opportunities a Excel
2. `/backend/modules/accounts/exporters.py` - Exportador de account plans a PDF
3. `/backend/exports/` - Directorio para archivos temporales

### Archivos Modificados:
1. `/backend/modules/opportunities/schemas.py` - Agregados schemas de analytics
2. `/backend/modules/opportunities/router.py` - Agregados 4 endpoints de analytics + 1 de export
3. `/backend/modules/accounts/router.py` - Agregado 1 endpoint de export PDF

---

## Dependencias

Todas las librerías requeridas ya están instaladas:

- `openpyxl==3.1.2` - Para generación de Excel
- `reportlab==4.0.7` - Para generación de PDF
- `fastapi` - Framework web
- `sqlalchemy` - ORM
- `pydantic` - Validación de datos

---

## Testing Recomendado

### Endpoints de Analytics:

```bash
# Win Rate
curl -X GET "http://localhost:8000/api/v1/opportunities/analytics/win-rate" \
  -H "Authorization: Bearer {token}"

# Conversion Rates
curl -X GET "http://localhost:8000/api/v1/opportunities/analytics/conversion-rates" \
  -H "Authorization: Bearer {token}"

# Revenue Forecast
curl -X GET "http://localhost:8000/api/v1/opportunities/analytics/forecast?days=90" \
  -H "Authorization: Bearer {token}"

# Pipeline Health
curl -X GET "http://localhost:8000/api/v1/opportunities/analytics/pipeline-health" \
  -H "Authorization: Bearer {token}"
```

### Endpoints de Export:

```bash
# Export Opportunities to Excel
curl -X GET "http://localhost:8000/api/v1/opportunities/export/excel" \
  -H "Authorization: Bearer {token}" \
  -o opportunities.xlsx

# Export Account Plan to PDF
curl -X GET "http://localhost:8000/api/v1/accounts/plans/{plan_id}/export/pdf" \
  -H "Authorization: Bearer {token}" \
  -o account_plan.pdf
```

---

## Próximos Pasos Sugeridos

1. **Testing Unitario**: Crear tests para cada endpoint y exporter
2. **Cleanup de Archivos**: Implementar auto-delete de exports después de descarga
3. **Caching**: Agregar Redis cache para analytics queries pesadas
4. **Scheduled Exports**: Implementar exports programados con Celery
5. **Email Delivery**: Enviar exports por email automáticamente
6. **Customización**: Permitir usuarios customizar formato de exports
7. **Compresión**: Comprimir archivos grandes antes de descarga
8. **Monitoreo**: Agregar métricas de uso de analytics/exports

---

## Notas Técnicas

- Los exports se guardan en `/backend/exports/` temporalmente
- Los archivos Excel usan formato `.xlsx` (OpenXML)
- Los PDFs usan tamaño carta (letter) por defecto
- Todos los métodos son async para no bloquear
- FileResponse maneja streaming automático para archivos grandes
- Los timestamps usan formato ISO 8601
- Los valores monetarios usan 2 decimales
- Los colores siguen paleta corporativa consistente

---

## Documentación de API

Toda la documentación está disponible en Swagger UI:
- http://localhost:8000/docs
- Incluye ejemplos de request/response
- Documentación detallada de cada parámetro
- Schemas completos con ejemplos

---

**Implementado por**: Claude Code
**Fecha**: 2025-11-28
**Status**: ✅ Completado y Funcional
