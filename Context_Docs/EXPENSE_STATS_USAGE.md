# Guía de Uso: Estadísticas de Gastos

## Estructura de Carpetas

```
frontend/
├── hooks/
│   └── useExpenseStats.ts          # Hook custom para obtener estadísticas
├── components/
│   └── expenses/
│       ├── ExpenseStats.tsx         # Componente principal de estadísticas
│       ├── ExpenseFilters.tsx       # Filtros de gastos (existente)
│       └── ...
├── app/
│   └── (dashboard)/
│       ├── expenses/
│       │   ├── page.tsx             # Lista de gastos
│       │   ├── [id]/                # Detalle de gasto
│       │   └── stats/
│       │       └── page.tsx         # Nueva: Página de estadísticas
│       └── layout.tsx
└── lib/
    └── api/
        └── expenses.ts              # API service con getExpenseSummary()
```

## Uso del Hook

### useExpenseStats.ts

```typescript
import { useExpenseStats } from '@/hooks/useExpenseStats'

export function MyComponent() {
  const { stats, isLoading, error, refresh } = useExpenseStats()

  if (isLoading) {
    return <div>Cargando...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div>
      <h2>Total: {stats?.total_amount}</h2>
      <button onClick={refresh}>Actualizar</button>
    </div>
  )
}
```

### Estructura de Datos

```typescript
interface ExpenseStats {
  total_amount: number           // Total en dinero
  total_count: number            // Cantidad total de gastos
  pending_count: number          // Gastos pendientes por aprobar
  approved_count: number         // Gastos aprobados
  rejected_count: number         // Gastos rechazados
  by_category: Array<{
    category_name: string        // Nombre de la categoría
    amount: number | string      // Total de la categoría
    count: number                // Cantidad en la categoría
  }>
}
```

## Navegación en Sidebar

### Antes
```
Dashboard
Gastos          ← Link directo a /dashboard/expenses
Clientes
Ventas
Transporte
Reportes
Configuración
```

### Después
```
Dashboard
Gastos          ← Expandible (botón con icono de chevron)
  ├─ Lista       ← /dashboard/expenses
  ├─ Estadísticas ← /dashboard/expenses/stats
Clientes
Ventas
Transporte
Reportes
Configuración
```

## Pantalla de Estadísticas

### Ubicación
```
/dashboard/expenses/stats
```

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ Estadísticas de Gastos                                   │
│ Análisis y visualización de tus gastos                   │
└──────────────────────────────────────────────────────────┘

KPI Cards (4 columnas en desktop, 2 en tablet, 1 en mobile):

┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Total Gastos │  │ Pendientes   │  │ Aprobados    │  │ Rechazados   │
│ ↗ 45,300,000 │  │ ⏱ 12         │  │ ✓ 156        │  │ ✗ 8          │
│ 200 registros│  │ Por aprobar  │  │ Confirmados  │  │ No aprobados │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

Gráficos (2 columnas):

┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Gastos por Categoría         │  │ Distribución por Estado      │
│                              │  │                              │
│  ▌ Restaurantes              │  │           Aprobados 85%      │
│  ▌ Transporte                │  │          ◯ 156               │
│  ▌ Hotel                      │  │                              │
│  ▌ Internet                   │  │  Pendientes 5%  Rechazados   │
│  ▌ Otros                      │  │  12              3%          │
└──────────────────────────────┘  └──────────────────────────────┘

Tabla Detallada:

┌─────────────────────────────────────────────────────┐
│ Detalle por Categoría                               │
├──────────────┬──────────────┬──────────────────────┤
│ Categoría    │ Cantidad     │ Total                │
├──────────────┼──────────────┼──────────────────────┤
│ Restaurantes │ 85           │ 12,450,000           │
│ Transporte   │ 45           │ 8,900,000            │
│ Hotel        │ 32           │ 15,200,000           │
│ Internet     │ 23           │ 3,450,000            │
│ Otros        │ 15           │ 5,300,000            │
└──────────────┴──────────────┴──────────────────────┘
```

## API Response Example

```json
{
  "total_amount": 45300000,
  "total_count": 200,
  "pending_count": 12,
  "approved_count": 156,
  "rejected_count": 32,
  "by_category": [
    {
      "category_name": "Restaurantes",
      "amount": "12450000",
      "count": 85
    },
    {
      "category_name": "Transporte",
      "amount": "8900000",
      "count": 45
    },
    {
      "category_name": "Hotel",
      "amount": "15200000",
      "count": 32
    },
    {
      "category_name": "Internet",
      "amount": "3450000",
      "count": 23
    },
    {
      "category_name": "Otros",
      "amount": "5300000",
      "count": 15
    }
  ]
}
```

## Flujo de Interacción

### 1. Usuario navega a /dashboard/expenses
```
Usuario
   │
   └─> Sidebar: Click en "Gastos"
       └─> Expand menú desplegable
           ├─ Lista (activa)
           └─ Estadísticas
```

### 2. Usuario hace click en "Estadísticas"
```
Usuario
   │
   └─> Sidebar: Click en "Estadísticas"
       └─> Navigate a /dashboard/expenses/stats
           └─> Page.tsx carga ExpenseStats
               └─> Hook useExpenseStats se ejecuta
                   ├─ setIsLoading(true)
                   ├─ expensesApi.getExpenseSummary()
                   └─ setStats(data)
                       └─> Render dashboard
```

### 3. Dashboard renderiza con datos
```
ExpenseStats Component
├─ KPI Cards (4)
│  └─ formatCurrency() para montos
├─ BarChart (por categoría)
│  └─ Recharts ResponsiveContainer
├─ PieChart (por estado)
│  └─ Recharts ResponsiveContainer
└─ Tabla detallada
   └─ Filas iteradas con map()
```

## Manejo de Estados

### Loading
```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
```

### Error
```typescript
if (error || !stats) {
  return (
    <div className="text-center py-12 text-red-600">
      {error || 'Error al cargar estadísticas'}
    </div>
  )
}
```

### Success
```typescript
// Renderiza todos los componentes (KPI, Gráficos, Tabla)
```

## Responsividad

### Mobile (< 768px)
- 1 columna para KPI cards
- Gráficos al 100% de ancho
- Tabla con scroll horizontal

### Tablet (768px - 1024px)
- 2 columnas para KPI cards
- Gráficos lado a lado
- Tabla normal

### Desktop (> 1024px)
- 4 columnas para KPI cards
- Gráficos lado a lado
- Tabla con scroll suave

## Colores

### KPI Cards
- Total Gastos: Gris (muted-foreground)
- Pendientes: Naranja (#FFA500)
- Aprobados: Verde (#10B981)
- Rechazados: Rojo (#EF4444)

### Gráficos
- BarChart: Azul (#8884d8)
- PieChart: Naranja, Verde, Rojo (según estado)

## Funcionalidades Futuras

### Phase 2
- [ ] Filtro por rango de fechas
- [ ] Selector de período (Este mes, Último mes, Últimos 3 meses)
- [ ] Comparativas año a año

### Phase 3
- [ ] Export a CSV/PDF
- [ ] Compartir reportes
- [ ] Notificaciones de alertas

### Phase 4
- [ ] Predicciones de gastos (ML)
- [ ] Análisis de tendencias
- [ ] Recomendaciones de ahorro

## Testing

### Manual Testing
1. Navegar a /dashboard/expenses
2. Click en "Estadísticas" (chevron debe rotar)
3. Verificar carga de datos
4. Probar en diferentes tamaños de pantalla
5. Verificar tooltips en gráficos

### Unit Testing
```typescript
// Hook
- Verificar que fetchStats() se llama en useEffect
- Verificar manejo de errores
- Verificar refresh() funciona

// Componente
- Verificar renderizado de KPI cards
- Verificar gráficos con Recharts
- Verificar tabla con datos
- Verificar loading state
- Verificar error state
```

## Notas Importantes

1. **Moneda**: Todos los montos se formatean en COP (Pesos Colombianos)
2. **API**: El endpoint `/api/v1/expenses/summary` debe estar disponible
3. **Performance**: Los gráficos se renderizaban con ResponsiveContainer para optimizar
4. **Accesibilidad**: Los iconos tienen propósito semántico clara

## Troubleshooting

### Los gráficos no se muestran
- Verificar que recharts esté instalado: `npm list recharts`
- Verificar que ResponsiveContainer tiene parent con altura definida

### Los datos no cargan
- Verificar endpoint `/api/v1/expenses/summary` en backend
- Revisar console para errores de CORS
- Verificar token de autenticación

### Sidebar no expande
- Verificar que Sidebar es un client component (`'use client'`)
- Verificar que useState está correctamente importado

