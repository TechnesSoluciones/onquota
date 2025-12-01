# Módulo de Reportes - Arquitectura y Diseño

## 1. Visión General

El módulo de reportes proporciona análisis completo del funnel de ventas, desde visitas hasta pagos, con capacidades de proyección y análisis de KPIs.

### Principios de Diseño
- **On-demand calculation**: Reportes calculados en tiempo real para datos siempre actualizados
- **Caching inteligente**: Caché de 5-15 minutos para reportes pesados
- **Async processing**: Jobs en background para reportes complejos (exportación Excel/PDF)
- **Multi-tenant aware**: Todos los reportes aislados por tenant_id
- **Composable**: Componentes reutilizables de visualización

---

## 2. Arquitectura Backend

### 2.1 Estructura de Carpetas

```
backend/
├── modules/
│   └── reports/
│       ├── __init__.py
│       ├── router.py                    # API endpoints
│       ├── repository.py                # Data access layer
│       ├── schemas.py                   # Pydantic schemas
│       ├── services/
│       │   ├── __init__.py
│       │   ├── quotations_reports.py   # Lógica de reportes de cotizaciones
│       │   ├── sales_reports.py        # Lógica de reportes de ventas
│       │   ├── visits_reports.py       # Lógica de reportes de visitas
│       │   ├── expenses_reports.py     # Lógica de reportes de gastos
│       │   ├── clients_reports.py      # Lógica de reportes de clientes
│       │   └── funnel_reports.py       # Análisis de funnel completo
│       └── tasks.py                     # Celery tasks para exports
```

### 2.2 Endpoints API

#### Base Path: `/api/v1/reports`

**Reportes de Cotizaciones:**
```
GET /api/v1/reports/quotations/conversion
GET /api/v1/reports/quotations/win-loss-analysis
GET /api/v1/reports/quotations/by-period
GET /api/v1/reports/quotations/time-to-close
```

**Reportes de Controles de Venta:**
```
GET /api/v1/reports/sales-controls/revenue-by-period
GET /api/v1/reports/sales-controls/by-product-line
GET /api/v1/reports/sales-controls/pipeline-forecast
GET /api/v1/reports/sales-controls/time-metrics
```

**Reportes de Visitas:**
```
GET /api/v1/reports/visits/effectiveness
GET /api/v1/reports/visits/to-revenue
GET /api/v1/reports/visits/roi-analysis
GET /api/v1/reports/visits/by-client
```

**Reportes de Gastos:**
```
GET /api/v1/reports/expenses/by-category
GET /api/v1/reports/expenses/trends
GET /api/v1/reports/expenses/vs-revenue
```

**Reportes de Clientes:**
```
GET /api/v1/reports/clients/top-clients
GET /api/v1/reports/clients/abc-analysis
GET /api/v1/reports/clients/lifetime-value
GET /api/v1/reports/clients/conversion-rates
```

**Funnel y Dashboard:**
```
GET /api/v1/reports/funnel/complete-analysis
GET /api/v1/reports/dashboard/executive
GET /api/v1/reports/dashboard/kpis
```

**Exportación:**
```
POST /api/v1/reports/export/excel
POST /api/v1/reports/export/pdf
GET  /api/v1/reports/export/{job_id}/status
GET  /api/v1/reports/export/{job_id}/download
```

### 2.3 Parámetros Comunes

Todos los endpoints de reportes aceptan:
```python
class ReportFiltersBase(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    client_id: Optional[UUID] = None
    sales_rep_id: Optional[UUID] = None
    product_line_id: Optional[UUID] = None
    currency: Optional[str] = "USD"
    comparison_period: Optional[Literal["previous_period", "previous_year"]] = None
```

### 2.4 Schemas Principales

#### Conversion Report
```python
class QuotationConversionReport(BaseModel):
    """Reporte de conversión de cotizaciones"""
    period: DatePeriod

    # Métricas principales
    total_quotations: int
    total_quoted_amount: Decimal

    won_quotations: int
    won_amount: Decimal
    won_percentage: float

    lost_quotations: int
    lost_amount: Decimal
    lost_percentage: float

    pending_quotations: int
    pending_amount: Decimal

    # Conversión a ventas
    quotations_with_sales_control: int
    sales_controls_amount: Decimal
    conversion_rate: float  # won / (won + lost)

    # Tiempo promedio
    avg_time_to_close_days: Optional[float]

    # Comparación
    comparison: Optional[ComparisonMetrics] = None

    # Desglose por período
    by_month: List[MonthlyConversionMetrics]
```

#### Funnel Analysis
```python
class SalesFunnelReport(BaseModel):
    """Análisis completo del funnel de ventas"""
    period: DatePeriod

    # Stage 1: Visitas
    total_visits: int
    unique_clients_visited: int

    # Stage 2: Cotizaciones generadas
    quotations_from_visits: int
    quotations_amount: Decimal
    visit_to_quotation_rate: float

    # Stage 3: Cotizaciones ganadas
    won_quotations: int
    won_amount: Decimal
    quotation_to_win_rate: float

    # Stage 4: Controles de venta
    sales_controls_created: int
    sales_controls_amount: Decimal

    # Stage 5: Pagados
    paid_sales_controls: int
    paid_amount: Decimal
    win_to_paid_rate: float

    # Métricas de eficiencia
    overall_conversion_rate: float  # visits to paid
    avg_deal_size: Decimal
    avg_sales_cycle_days: float

    # Velocidad del funnel
    avg_visit_to_quotation_days: float
    avg_quotation_to_win_days: float
    avg_win_to_paid_days: float
```

#### Top Clients Report
```python
class TopClientsReport(BaseModel):
    """Top clientes por diferentes métricas"""
    period: DatePeriod

    by_revenue: List[ClientRevenueMetric]
    by_transactions: List[ClientTransactionMetric]
    by_conversion_rate: List[ClientConversionMetric]

    # Análisis ABC
    abc_analysis: ABCAnalysis

class ClientRevenueMetric(BaseModel):
    client_id: UUID
    client_name: str
    total_revenue: Decimal
    total_transactions: int
    avg_transaction_value: Decimal
    percentage_of_total: float

class ABCAnalysis(BaseModel):
    """Curva ABC de clientes"""
    a_clients: List[ClientSegment]  # 80% de ingresos
    b_clients: List[ClientSegment]  # 15% de ingresos
    c_clients: List[ClientSegment]  # 5% de ingresos
```

#### Executive Dashboard
```python
class ExecutiveDashboard(BaseModel):
    """Dashboard ejecutivo con KPIs principales"""
    period: DatePeriod

    # KPIs Principales
    kpis: DashboardKPIs

    # Tendencias
    revenue_trend: List[TrendPoint]
    quotations_trend: List[TrendPoint]
    visits_trend: List[TrendPoint]

    # Top performers
    top_sales_reps: List[SalesRepPerformance]
    top_clients: List[ClientRevenueMetric]
    top_product_lines: List[ProductLineMetric]

    # Alertas
    alerts: List[DashboardAlert]

class DashboardKPIs(BaseModel):
    # Revenue
    total_revenue: Decimal
    revenue_growth: float  # % vs comparison period

    # Quotations
    active_quotations: int
    quotations_value: Decimal
    win_rate: float

    # Pipeline
    pipeline_value: Decimal
    weighted_pipeline: Decimal  # pipeline * probability

    # Activity
    visits_this_period: int
    new_clients: int

    # Efficiency
    avg_sales_cycle_days: float
    conversion_rate: float

    # Expenses
    total_expenses: Decimal
    expense_to_revenue_ratio: float
```

### 2.5 Repository Pattern

```python
class ReportsRepository:
    """Repository para consultas de reportes"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_quotation_conversion(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> QuotationConversionReport:
        """Obtener reporte de conversión de cotizaciones"""
        # Implementación con queries optimizadas
        pass

    async def get_sales_funnel(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase
    ) -> SalesFunnelReport:
        """Obtener análisis completo del funnel"""
        pass

    async def get_top_clients(
        self,
        tenant_id: UUID,
        filters: ReportFiltersBase,
        limit: int = 20
    ) -> TopClientsReport:
        """Obtener top clientes"""
        pass
```

### 2.6 Optimización de Queries

**Estrategias:**
1. **Subqueries con CTEs** para lógica compleja
2. **Índices compuestos** en (tenant_id, date_field, status)
3. **Caché en Redis** para reportes ejecutivos (5-15 min TTL)
4. **Async aggregations** para reportes grandes
5. **Projection fields** - solo campos necesarios

**Ejemplo de Query Optimizada:**
```python
async def get_funnel_metrics(
    self,
    tenant_id: UUID,
    start_date: date,
    end_date: date
) -> FunnelMetrics:
    """Query optimizada con CTEs"""

    query = text("""
        WITH visits_base AS (
            SELECT
                COUNT(*) as total_visits,
                COUNT(DISTINCT client_id) as unique_clients
            FROM visits
            WHERE tenant_id = :tenant_id
              AND visit_date BETWEEN :start_date AND :end_date
              AND deleted_at IS NULL
        ),
        quotations_base AS (
            SELECT
                COUNT(*) as total_quotations,
                SUM(quoted_amount) as total_amount,
                COUNT(CASE WHEN status = 'ganado' THEN 1 END) as won_count,
                SUM(CASE WHEN status = 'ganado' THEN quoted_amount ELSE 0 END) as won_amount
            FROM quotations
            WHERE tenant_id = :tenant_id
              AND quote_date BETWEEN :start_date AND :end_date
              AND deleted_at IS NULL
        ),
        sales_controls_base AS (
            SELECT
                COUNT(*) as total_controls,
                SUM(sales_control_amount) as total_amount,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                SUM(CASE WHEN status = 'paid' THEN sales_control_amount ELSE 0 END) as paid_amount
            FROM sales_controls
            WHERE tenant_id = :tenant_id
              AND po_reception_date BETWEEN :start_date AND :end_date
              AND deleted_at IS NULL
        )
        SELECT * FROM visits_base, quotations_base, sales_controls_base
    """)

    result = await self.db.execute(
        query,
        {
            "tenant_id": tenant_id,
            "start_date": start_date,
            "end_date": end_date
        }
    )
    row = result.first()

    return FunnelMetrics.from_row(row)
```

---

## 3. Arquitectura Frontend

### 3.1 Estructura de Carpetas

```
frontend/
├── app/
│   └── (dashboard)/
│       └── reports/
│           ├── page.tsx                      # Dashboard principal
│           ├── quotations/
│           │   └── page.tsx                  # Reportes de cotizaciones
│           ├── sales/
│           │   └── page.tsx                  # Reportes de ventas
│           ├── visits/
│           │   └── page.tsx                  # Reportes de visitas
│           ├── expenses/
│           │   └── page.tsx                  # Reportes de gastos
│           ├── clients/
│           │   └── page.tsx                  # Análisis de clientes
│           └── funnel/
│               └── page.tsx                  # Análisis de funnel
│
├── components/
│   └── reports/
│       ├── shared/
│       │   ├── ReportFilters.tsx            # Filtros comunes
│       │   ├── DateRangePicker.tsx          # Selector de rango
│       │   ├── MetricCard.tsx               # Tarjeta de métrica
│       │   ├── TrendIndicator.tsx           # Indicador de tendencia
│       │   ├── ExportButton.tsx             # Botón de exportación
│       │   └── ComparisonToggle.tsx         # Toggle comparación
│       │
│       ├── charts/
│       │   ├── RevenueChart.tsx             # Gráfico de ingresos
│       │   ├── FunnelChart.tsx              # Gráfico de funnel
│       │   ├── ConversionChart.tsx          # Gráfico de conversión
│       │   ├── TrendChart.tsx               # Gráfico de tendencias
│       │   ├── PieChart.tsx                 # Gráfico circular
│       │   └── BarChart.tsx                 # Gráfico de barras
│       │
│       ├── quotations/
│       │   ├── ConversionReport.tsx
│       │   ├── WinLossAnalysis.tsx
│       │   └── TimeToCloseChart.tsx
│       │
│       ├── sales/
│       │   ├── RevenueByPeriod.tsx
│       │   ├── ProductLineBreakdown.tsx
│       │   └── PipelineForecast.tsx
│       │
│       ├── visits/
│       │   ├── EffectivenessReport.tsx
│       │   ├── ROIAnalysis.tsx
│       │   └── ClientVisitHistory.tsx
│       │
│       ├── clients/
│       │   ├── TopClientsTable.tsx
│       │   ├── ABCAnalysisChart.tsx
│       │   └── ClientSegmentation.tsx
│       │
│       └── dashboard/
│           ├── ExecutiveDashboard.tsx
│           ├── KPIGrid.tsx
│           └── AlertsPanel.tsx
│
├── hooks/
│   └── useReports.ts                        # Hooks para reportes
│
├── lib/
│   └── api/
│       └── reports.ts                       # API client
│
└── types/
    └── reports.ts                           # TypeScript types
```

### 3.2 Librería de Gráficos Recomendada

**Recharts** - Razones:
- React native, componentes declarativos
- Responsive out of the box
- Buen soporte TypeScript
- Personalización flexible
- Lightweight

**Instalación:**
```bash
npm install recharts
npm install @types/recharts --save-dev
```

### 3.3 Hooks Pattern

```typescript
// hooks/useReports.ts

export const useQuotationConversion = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', 'quotations', 'conversion', filters],
    queryFn: () => reportsApi.getQuotationConversion(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useSalesFunnel = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', 'funnel', filters],
    queryFn: () => reportsApi.getSalesFunnel(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export const useTopClients = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', 'clients', 'top', filters],
    queryFn: () => reportsApi.getTopClients(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useExportReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ExportRequest) => reportsApi.exportReport(data),
    onSuccess: (job) => {
      toast.success('Export iniciado. Te notificaremos cuando esté listo.')
      // Poll for job status
      pollJobStatus(job.id)
    },
  })
}
```

### 3.4 Componente Ejemplo - KPI Card

```typescript
// components/reports/shared/MetricCard.tsx

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  format?: 'currency' | 'percentage' | 'number'
  loading?: boolean
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  icon,
  format = 'number',
  loading = false
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(val))
    }
    if (format === 'percentage') {
      return `${Number(val).toFixed(2)}%`
    }
    return val.toLocaleString()
  }

  if (loading) {
    return <Skeleton className="h-32" />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center text-sm mt-1",
            trend === 'up' && "text-green-600",
            trend === 'down' && "text-red-600",
            trend === 'neutral' && "text-gray-600"
          )}>
            <TrendIndicator value={change} trend={trend} />
            <span className="ml-1">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 3.5 Export Functionality

```typescript
// components/reports/shared/ExportButton.tsx

export function ExportButton({ reportType, filters }: ExportButtonProps) {
  const exportReport = useExportReport()
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel')

  const handleExport = async () => {
    await exportReport.mutateAsync({
      report_type: reportType,
      format,
      filters
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => {
          setFormat('excel')
          handleExport()
        }}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          setFormat('pdf')
          handleExport()
        }}>
          <FilePdf className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## 4. Performance y Optimización

### 4.1 Indexación Recomendada

```sql
-- Índices para reportes de cotizaciones
CREATE INDEX idx_quotations_reports ON quotations(tenant_id, quote_date DESC, status)
WHERE deleted_at IS NULL;

-- Índices para reportes de ventas
CREATE INDEX idx_sales_controls_reports ON sales_controls(tenant_id, po_reception_date DESC, status)
WHERE deleted_at IS NULL;

-- Índices para reportes de visitas
CREATE INDEX idx_visits_reports ON visits(tenant_id, visit_date DESC, client_id)
WHERE deleted_at IS NULL;

-- Índices para funnel analysis
CREATE INDEX idx_quotations_sales_link ON quotations(tenant_id, id, status)
WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_quotation_link ON sales_controls(tenant_id, quotation_id)
WHERE quotation_id IS NOT NULL AND deleted_at IS NULL;

-- Índice para análisis de clientes
CREATE INDEX idx_sales_controls_client ON sales_controls(tenant_id, client_id, status, sales_control_amount)
WHERE deleted_at IS NULL;
```

### 4.2 Caching Strategy

**Redis Cache para:**
- Dashboard ejecutivo: 5 min TTL
- Top clients: 10 min TTL
- Funnel analysis: 5 min TTL
- Reportes históricos (> 1 mes): 1 hora TTL

**Cache Key Pattern:**
```python
cache_key = f"report:{report_type}:{tenant_id}:{hash(filters)}"
```

### 4.3 Background Jobs para Exports

```python
# backend/modules/reports/tasks.py

from celery import shared_task
from modules.reports.exporters import ExcelExporter, PDFExporter

@shared_task
def export_report_to_excel(
    tenant_id: str,
    report_type: str,
    filters: dict,
    user_id: str
):
    """Export report to Excel in background"""
    exporter = ExcelExporter()
    file_path = exporter.generate(
        tenant_id=tenant_id,
        report_type=report_type,
        filters=filters
    )

    # Notify user via email or notification
    notify_export_complete(user_id, file_path)

    return file_path

@shared_task
def export_report_to_pdf(
    tenant_id: str,
    report_type: str,
    filters: dict,
    user_id: str
):
    """Export report to PDF in background"""
    exporter = PDFExporter()
    file_path = exporter.generate(
        tenant_id=tenant_id,
        report_type=report_type,
        filters=filters
    )

    notify_export_complete(user_id, file_path)

    return file_path
```

---

## 5. Plan de Implementación por Fases

### Fase 1: Fundamentos (Semana 1-2)
1. Crear estructura base del módulo backend
2. Implementar schemas y modelos de respuesta
3. Crear endpoints básicos de dashboard ejecutivo
4. Implementar KPIs principales
5. Crear componentes base del frontend (MetricCard, TrendIndicator)
6. Implementar DateRangePicker y filtros básicos

**Entregables:**
- Dashboard ejecutivo funcional con KPIs principales
- Sistema de filtros por fecha

### Fase 2: Reportes Core (Semana 3-4)
1. Implementar reporte de conversión de cotizaciones
2. Implementar análisis de funnel completo
3. Implementar top clientes
4. Crear gráficos con Recharts
5. Implementar caché en Redis

**Entregables:**
- 3 reportes principales funcionando
- Visualizaciones con gráficos interactivos
- Sistema de caché implementado

### Fase 3: Reportes Avanzados (Semana 5-6)
1. Reportes de visitas y efectividad
2. Análisis de gastos
3. Proyecciones y forecasting
4. ROI analysis
5. Análisis ABC de clientes

**Entregables:**
- Todos los reportes principales implementados
- Sistema de proyecciones

### Fase 4: Exportación y Optimización (Semana 7-8)
1. Implementar exportación a Excel
2. Implementar exportación a PDF
3. Implementar jobs en background con Celery
4. Optimizar queries lentas
5. Implementar índices recomendados
6. Testing de performance

**Entregables:**
- Sistema de exportación completo
- Performance optimizada
- Tests implementados

### Fase 5: Features Avanzados (Semana 9-10)
1. Reportes comparativos (período vs período)
2. Alertas automáticas en KPIs
3. Reportes programados (scheduled)
4. Custom report builder (opcional)
5. Mobile responsive improvements

**Entregables:**
- Features avanzados implementados
- Documentación completa

---

## 6. Librerías y Dependencias

### Backend
```bash
# Excel generation
pip install openpyxl

# PDF generation
pip install reportlab
pip install weasyprint  # Alternative with HTML/CSS support

# Redis caching
pip install redis
pip install hiredis  # C parser for better performance
```

### Frontend
```bash
# Charts
npm install recharts

# Export/Download
npm install file-saver
npm install @types/file-saver

# Date handling
npm install date-fns

# PDF viewer (for preview)
npm install react-pdf
```

---

## 7. Security Considerations

### Access Control
```python
# Decorator para verificar permisos de reportes
def require_report_access(report_type: str):
    def decorator(func):
        async def wrapper(*args, current_user: User, **kwargs):
            # Verificar si el usuario tiene acceso al reporte
            if not has_report_permission(current_user, report_type):
                raise HTTPException(
                    status_code=403,
                    detail="No tienes permiso para acceder a este reporte"
                )
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

@router.get("/executive-dashboard")
@require_report_access("executive_dashboard")
async def get_executive_dashboard(...):
    pass
```

### Data Isolation
- Todos los queries SIEMPRE incluyen `tenant_id` en WHERE clause
- Validar que el usuario pertenece al tenant solicitado
- No permitir cross-tenant data access

### Rate Limiting
```python
# Limitar requests a reportes pesados
from slowapi import Limiter

limiter = Limiter(key_func=get_remote_address)

@router.get("/funnel/complete-analysis")
@limiter.limit("10/minute")
async def get_funnel_analysis(...):
    pass
```

---

## 8. Testing Strategy

### Unit Tests
```python
# test_quotations_reports.py

async def test_quotation_conversion_calculation():
    # Given: cotizaciones con diferentes estados
    # When: se calcula el reporte de conversión
    # Then: las métricas son correctas
    pass

async def test_funnel_metrics_accuracy():
    # Given: datos completos de funnel
    # When: se calculan las métricas
    # Then: los porcentajes y valores son correctos
    pass
```

### Integration Tests
```python
# test_reports_api.py

async def test_get_executive_dashboard_endpoint():
    # Given: usuario autenticado
    # When: se solicita el dashboard
    # Then: se retorna la estructura correcta
    pass
```

### Performance Tests
```python
# test_reports_performance.py

async def test_funnel_query_performance():
    # Given: 10000+ registros
    # When: se ejecuta el query de funnel
    # Then: el tiempo de respuesta < 2 segundos
    pass
```

---

## 9. Extensibilidad

### Agregar Nuevo Reporte

1. **Crear schema en `schemas.py`:**
```python
class NewReportResponse(BaseModel):
    # definir estructura
    pass
```

2. **Agregar método en repository:**
```python
async def get_new_report(self, tenant_id: UUID, filters: ReportFiltersBase):
    # implementar query
    pass
```

3. **Agregar endpoint en router:**
```python
@router.get("/new-report")
async def get_new_report(...):
    pass
```

4. **Crear componente frontend:**
```typescript
export function NewReport({ filters }: NewReportProps) {
  const { data, isLoading } = useNewReport(filters)
  // renderizar
}
```

### Sistema de Templates (Futuro)

Permitir a usuarios crear reportes configurables:
- Seleccionar métricas a mostrar
- Configurar filtros por defecto
- Guardar configuraciones de reporte
- Compartir reportes con equipo

---

## 10. Monitoring y Observabilidad

### Logging
```python
import structlog

logger = structlog.get_logger(__name__)

async def get_funnel_analysis(...):
    logger.info(
        "funnel_analysis_requested",
        tenant_id=str(tenant_id),
        date_range=f"{filters.start_date} to {filters.end_date}"
    )

    # ejecutar query

    logger.info(
        "funnel_analysis_completed",
        execution_time_ms=execution_time,
        records_processed=record_count
    )
```

### Metrics
- Tiempo de respuesta por tipo de reporte
- Tasa de errores
- Uso de caché (hit rate)
- Reportes más solicitados

### Alertas
- Queries > 5 segundos
- Error rate > 1%
- Cache hit rate < 80%

---

## Resumen

Este diseño proporciona:

✅ **Escalable**: Queries optimizadas, caché, async processing
✅ **Mantenible**: Clean architecture, repository pattern, separation of concerns
✅ **Extensible**: Fácil agregar nuevos reportes
✅ **Performante**: Índices, caché, background jobs
✅ **Seguro**: Multi-tenant aware, access control, rate limiting
✅ **User-friendly**: Visualizaciones claras, exportación, comparaciones

**Próximos Pasos Inmediatos:**
1. Revisar y aprobar arquitectura
2. Crear estructura base de carpetas
3. Implementar Fase 1 (Fundamentos)
4. Iterar basado en feedback
