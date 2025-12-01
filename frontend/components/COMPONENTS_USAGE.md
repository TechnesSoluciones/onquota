# Frontend Components - Usage Guide

Este documento proporciona ejemplos de uso para los componentes frontend implementados en OnQuota.

## Componentes de Visits

### 1. VisitsMap

Mapa interactivo de Google Maps que muestra las visitas con markers de colores según el estado.

**Ubicación**: `/frontend/components/visits/VisitsMap.tsx`

**Características**:
- Markers con colores según estado (SCHEDULED=azul, IN_PROGRESS=amarillo, COMPLETED=verde, CANCELLED=rojo)
- InfoWindow con detalles de la visita al hacer clic
- Centrado automático basado en las ubicaciones de las visitas
- Legend para interpretar los colores
- Botón de navegación a Google Maps
- Manejo de estados de carga y error

**Ejemplo de uso**:
```tsx
import { VisitsMap } from '@/components/visits'
import { Visit } from '@/types/visits'

function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([])

  const handleVisitClick = (visit: Visit) => {
    console.log('Visit clicked:', visit)
    // Abrir modal de detalles, etc.
  }

  return (
    <div className="h-[600px]">
      <VisitsMap
        visits={visits}
        center={{ lat: 19.4326, lng: -99.1332 }} // Opcional
        zoom={12} // Opcional
        onVisitClick={handleVisitClick}
      />
    </div>
  )
}
```

**Props**:
- `visits: Visit[]` - Array de visitas a mostrar
- `center?: { lat: number; lng: number }` - Centro del mapa (opcional, se calcula automáticamente)
- `zoom?: number` - Nivel de zoom inicial (default: 12)
- `onVisitClick?: (visit: Visit) => void` - Callback al hacer clic en una visita

**Requisitos**:
- Variable de entorno `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` configurada
- Librería `@react-google-maps/api` instalada

---

### 2. TodayVisitsList

Lista optimizada mobile-first de las visitas programadas para el día actual con filtros y acciones rápidas.

**Ubicación**: `/frontend/components/visits/TodayVisitsList.tsx`

**Características**:
- Filtrado por estado (All, Scheduled, In Progress, Completed, Cancelled)
- Tarjetas con información clave: cliente, hora, dirección, estado
- Botones de acción: "Navigate", "Check In", "Check Out"
- Empty states cuando no hay visitas
- Indicador de follow-up requerido
- Diseño responsive y mobile-first
- Función de refresh

**Ejemplo de uso**:
```tsx
import { TodayVisitsList } from '@/components/visits'
import { useVisits } from '@/hooks/useVisits'

function TodayVisitsPage() {
  const { visits, loading, refetch, checkIn, checkOut } = useVisits()

  const handleCheckIn = async (visitId: string) => {
    await checkIn(visitId)
    refetch()
  }

  const handleCheckOut = async (visitId: string) => {
    await checkOut(visitId)
    refetch()
  }

  const handleNavigate = (visit: Visit) => {
    // Abrir en Google Maps o app de navegación
    const url = `https://www.google.com/maps/dir/?api=1&destination=${visit.check_in_latitude},${visit.check_in_longitude}`
    window.open(url, '_blank')
  }

  return (
    <TodayVisitsList
      visits={visits}
      loading={loading}
      onCheckIn={handleCheckIn}
      onCheckOut={handleCheckOut}
      onNavigate={handleNavigate}
      onRefresh={refetch}
    />
  )
}
```

**Props**:
- `visits?: Visit[]` - Array de visitas (se filtran automáticamente las del día)
- `loading?: boolean` - Estado de carga
- `onCheckIn?: (visitId: string) => void` - Callback para check-in
- `onCheckOut?: (visitId: string) => void` - Callback para check-out
- `onNavigate?: (visit: Visit) => void` - Callback para navegación
- `onRefresh?: () => void` - Callback para refrescar datos

---

## Componentes de Opportunities

### 3. OpportunityBoard (con Drag & Drop)

Kanban board con funcionalidad completa de drag & drop para gestionar opportunities por stage.

**Ubicación**: `/frontend/components/opportunities/OpportunityBoard.tsx`

**Características**:
- Drag & drop usando @dnd-kit
- Columnas para cada OpportunityStage
- Optimistic updates al mover cards
- Visual feedback durante drag
- Estadísticas por columna (count, total value)
- Modales de creación y edición integrados
- DragOverlay para mejor UX

**Ejemplo de uso**:
```tsx
import { OpportunityBoard } from '@/components/opportunities'
import { useOpportunities } from '@/hooks/useOpportunities'

function PipelinePage() {
  const { opportunities, updateStage, refetch } = useOpportunities()

  const handleStageUpdate = async (id: string, stage: OpportunityStage) => {
    try {
      await updateStage(id, stage)
      // El componente hace optimistic update
    } catch (error) {
      console.error('Failed to update stage:', error)
      refetch() // Revertir en caso de error
    }
  }

  const handleEdit = (opportunity: Opportunity) => {
    // El componente maneja el modal internamente
  }

  const handleDelete = async (id: string) => {
    await deleteOpportunity(id)
    refetch()
  }

  return (
    <OpportunityBoard
      opportunities={opportunities}
      onStageUpdate={handleStageUpdate}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={refetch}
    />
  )
}
```

**Props**:
- `opportunities: Opportunity[]` - Array de opportunities
- `onStageUpdate: (id: string, stage: OpportunityStage) => Promise<void>` - Actualizar stage
- `onEdit: (opportunity: Opportunity) => void` - Editar opportunity
- `onDelete: (id: string) => void` - Eliminar opportunity
- `onRefresh: () => void` - Refrescar datos

**Nota**: El componente ya estaba implementado con @dnd-kit. Solo se verificó que tuviera toda la funcionalidad completa.

---

### 4. PipelineCharts

Dashboard de analytics con 3 charts para analizar el pipeline de ventas.

**Ubicación**: `/frontend/components/opportunities/PipelineCharts.tsx`

**Características**:
- **Win Rate Chart**: Bar chart comparando won vs lost
- **Funnel Chart**: Funnel mostrando conversion entre stages
- **Trend Chart**: Line chart de opportunities creadas por mes
- Tarjetas de estadísticas resumen (Win Rate, Total Value, Weighted Value, Avg Days to Close)
- Responsive design
- Loading skeletons
- Empty states
- Tooltips informativos

**Ejemplo de uso**:
```tsx
import { PipelineCharts } from '@/components/opportunities'
import { usePipelineAnalytics } from '@/hooks/usePipelineAnalytics'

function PipelineAnalyticsPage() {
  const { analytics, loading } = usePipelineAnalytics()

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-bold">Pipeline Analytics</h1>
      <PipelineCharts
        analyticsData={analytics}
        loading={loading}
      />
    </div>
  )
}
```

**Props**:
- `analyticsData: PipelineStats` - Datos de analytics del pipeline
- `loading?: boolean` - Estado de carga

**Tipo PipelineStats**:
```typescript
interface PipelineStats {
  total_opportunities: number
  total_value: number
  weighted_value: number
  win_rate: number
  avg_days_to_close: number
  by_stage: Array<{
    stage: OpportunityStage
    count: number
    total_value: number
  }>
}
```

---

## Componentes de Analytics

### 5. AnalyticsDashboard

Dashboard completo que integra todos los charts de analytics de ventas (ABC, Discounts, Trends, Top Products).

**Ubicación**: `/frontend/components/analytics/AnalyticsDashboard.tsx`

**Características**:
- Grid layout responsive (2 cols desktop, 1 col mobile)
- Integra ABCChart, DiscountAnalysis, MonthlyTrends, TopProductsTable
- Tarjetas de estadísticas resumen
- Export button (Excel/PDF)
- Refresh button
- Loading states con skeletons
- Error handling
- Date range display

**Ejemplo de uso**:
```tsx
import { AnalyticsDashboard } from '@/components/analytics'
import { useAnalysisJob } from '@/hooks/useAnalysisJob'

function AnalyticsPage({ analysisId }: { analysisId: string }) {
  const { data, loading, error, refetch, exportData } = useAnalysisJob(analysisId)

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      await exportData(format)
      // Descargar archivo
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <AnalyticsDashboard
        analysisId={analysisId}
        initialData={data}
        loading={loading}
        error={error}
        onExport={handleExport}
        onRefresh={refetch}
      />
    </div>
  )
}
```

**Props**:
- `analysisId: string` - ID del análisis
- `initialData?: AnalysisResults | null` - Datos iniciales
- `loading?: boolean` - Estado de carga
- `error?: string | null` - Mensaje de error
- `onExport?: (format: 'excel' | 'pdf') => void` - Callback para exportar
- `onRefresh?: () => void` - Callback para refrescar

**Tipo AnalysisResults**:
```typescript
interface AnalysisResults {
  abc_classification: ABCClassification[]
  top_products: TopProduct[]
  discount_analysis: DiscountAnalysis
  monthly_trends: MonthlyTrend[]
  summary: {
    total_sales: number
    total_quantity: number
    unique_products: number
    avg_ticket: number
    date_range: {
      start: string
      end: string
    }
  }
}
```

---

## Componente UI Agregado

### Skeleton

Componente de loading placeholder para mejorar UX durante estados de carga.

**Ubicación**: `/frontend/components/ui/skeleton.tsx`

**Ejemplo de uso**:
```tsx
import { Skeleton } from '@/components/ui/skeleton'

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}
```

---

## Instalación de Dependencias

Asegúrate de tener todas las librerías necesarias instaladas:

```bash
cd frontend
npm install @react-google-maps/api recharts @dnd-kit/core @dnd-kit/sortable
```

---

## Variables de Entorno

Agrega la siguiente variable a tu archivo `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

---

## Archivos de Tipos

Todos los componentes usan tipos TypeScript estrictos definidos en:

- `/frontend/types/visits.ts` - Tipos de visitas y calls
- `/frontend/types/opportunities.ts` - Tipos de opportunities y pipeline
- `/frontend/types/analytics.ts` - Tipos de analytics y análisis

---

## Imports Simplificados

Se crearon archivos de índice para facilitar las importaciones:

```tsx
// En lugar de:
import { VisitsMap } from '@/components/visits/VisitsMap'
import { TodayVisitsList } from '@/components/visits/TodayVisitsList'

// Puedes usar:
import { VisitsMap, TodayVisitsList } from '@/components/visits'

// Similar para opportunities y analytics
import { OpportunityBoard, PipelineCharts } from '@/components/opportunities'
import { AnalyticsDashboard, ABCChart } from '@/components/analytics'
```

---

## Notas Importantes

1. **Google Maps API**: Necesitas una API key válida con Google Maps JavaScript API habilitada
2. **Responsive Design**: Todos los componentes están optimizados para mobile y desktop
3. **Error Handling**: Los componentes manejan estados de carga, error y empty states
4. **Accessibility**: Se incluyen ARIA labels y navegación por teclado donde es apropiado
5. **Performance**: Se usa React.memo y useMemo donde es apropiado para optimizar renders

---

## Testing

Para probar los componentes:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

---

## Próximos Pasos

1. Configurar tu Google Maps API key
2. Implementar los hooks personalizados mencionados (useVisits, useOpportunities, etc.)
3. Conectar los componentes con tus endpoints de API
4. Agregar tests para los nuevos componentes
5. Configurar export de Excel/PDF en el backend

---

Para más información, consulta la documentación oficial de:
- [Google Maps React](https://visgl.github.io/react-google-maps/)
- [Recharts](https://recharts.org/)
- [dnd-kit](https://dndkit.com/)
