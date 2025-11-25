# Ejemplos de Código - Estadísticas de Gastos

## Ejemplo 1: Usar el Hook en un Componente

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { formatCurrency } from '@/lib/utils'

export function SummaryCard() {
  const { stats, isLoading, error, refresh } = useExpenseStats()

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div className="text-red-600">{error}</div>
  if (!stats) return null

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Resumen de Gastos</h3>
      <p className="text-2xl font-bold">
        {formatCurrency(parseFloat(stats.total_amount.toString()))}
      </p>
      <p className="text-sm text-gray-600">{stats.total_count} registros</p>

      <div className="mt-4 space-x-2">
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
```

## Ejemplo 2: Renderizar Solo el Gráfico de Barras

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function CategoryChart() {
  const { stats } = useExpenseStats()

  const data = stats?.by_category.map(cat => ({
    ...cat,
    amount: typeof cat.amount === 'string'
      ? parseFloat(cat.amount)
      : cat.amount
  })) || []

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="category_name" />
        <YAxis />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
        />
        <Bar dataKey="amount" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

## Ejemplo 3: Tabla Customizada de Categorías

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { formatCurrency } from '@/lib/utils'

export function CategoryTable() {
  const { stats, isLoading } = useExpenseStats()

  if (isLoading) return <div>Cargando tabla...</div>

  return (
    <table className="w-full border-collapse">
      <thead className="bg-gray-100 border-b-2">
        <tr>
          <th className="text-left p-3 font-semibold">Categoría</th>
          <th className="text-center p-3 font-semibold">Cantidad</th>
          <th className="text-right p-3 font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {stats?.by_category.map((cat, idx) => (
          <tr key={idx} className="border-b hover:bg-gray-50">
            <td className="p-3">{cat.category_name}</td>
            <td className="text-center p-3">{cat.count}</td>
            <td className="text-right p-3 font-semibold">
              {formatCurrency(
                typeof cat.amount === 'string'
                  ? parseFloat(cat.amount)
                  : cat.amount
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

## Ejemplo 4: KPI Individual

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { CheckCircle } from 'lucide-react'

export function ApprovedExpensesKPI() {
  const { stats } = useExpenseStats()

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">Gastos Aprobados</h3>
        <CheckCircle className="h-4 w-4 text-green-500" />
      </div>

      <div className="text-3xl font-bold text-green-600">
        {stats?.approved_count ?? 0}
      </div>

      <p className="text-xs text-gray-500 mt-1">
        Confirmados en el sistema
      </p>
    </div>
  )
}
```

## Ejemplo 5: Gráfico Circular (Pie Chart)

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function StatusDistribution() {
  const { stats } = useExpenseStats()

  const data = [
    {
      name: 'Pendientes',
      value: stats?.pending_count ?? 0,
      color: '#FFA500'
    },
    {
      name: 'Aprobados',
      value: stats?.approved_count ?? 0,
      color: '#10B981'
    },
    {
      name: 'Rechazados',
      value: stats?.rejected_count ?? 0,
      color: '#EF4444'
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

## Ejemplo 6: Dashboard Mini

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'

export function MiniDashboard() {
  const { stats, isLoading } = useExpenseStats()

  if (isLoading) return <div>Cargando dashboard...</div>

  const metrics = [
    {
      label: 'Total',
      value: formatCurrency(parseFloat(stats?.total_amount.toString() ?? '0')),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Pendientes',
      value: stats?.pending_count ?? 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Aprobados',
      value: stats?.approved_count ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Rechazados',
      value: stats?.rejected_count ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map(metric => {
        const Icon = metric.icon
        return (
          <div key={metric.label} className={`p-4 rounded-lg ${metric.bgColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 ${metric.color}`} />
              <span className="text-sm font-medium text-gray-700">
                {metric.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

## Ejemplo 7: Integración en una Página

```typescript
// page.tsx
import { Suspense } from 'react'
import { ExpenseStats } from '@/components/expenses/ExpenseStats'

export const metadata = {
  title: 'Estadísticas de Gastos',
  description: 'Análisis y visualización de tus gastos',
}

export default function ExpenseStatsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Estadísticas de Gastos
          </h1>
          <p className="text-gray-600 mt-2">
            Análisis detallado de tus gastos y distribución por categoría
          </p>
        </div>

        {/* Content */}
        <Suspense fallback={<div>Cargando...</div>}>
          <ExpenseStats />
        </Suspense>
      </div>
    </div>
  )
}
```

## Ejemplo 8: Refrescar Datos Automáticamente

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { useEffect } from 'react'

export function AutoRefreshStats() {
  const { stats, refresh } = useExpenseStats()

  // Refrescar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="p-4 bg-white rounded-lg">
      <h3 className="font-semibold mb-4">Estadísticas en Vivo</h3>
      <p className="text-2xl font-bold">
        {stats?.total_count} gastos registrados
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Actualiza automáticamente cada 30 segundos
      </p>
    </div>
  )
}
```

## Ejemplo 9: Error Boundary

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'
import { AlertCircle } from 'lucide-react'

export function SafeStats() {
  const { stats, error, isLoading, refresh } = useExpenseStats()

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">Cargando estadísticas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h4 className="font-semibold text-red-900">Error</h4>
        </div>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-gray-500">No hay datos disponibles</div>
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded">
      <p className="text-green-800">
        Se encontraron {stats.total_count} gastos
      </p>
    </div>
  )
}
```

## Ejemplo 10: Exportar Datos

```typescript
'use client'

import { useExpenseStats } from '@/hooks/useExpenseStats'

export function ExportStats() {
  const { stats } = useExpenseStats()

  const handleExportCSV = () => {
    if (!stats) return

    const headers = ['Categoría', 'Cantidad', 'Total']
    const rows = stats.by_category.map(cat => [
      cat.category_name,
      cat.count,
      cat.amount
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'estadisticas_gastos.csv'
    a.click()
  }

  return (
    <button
      onClick={handleExportCSV}
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Descargar CSV
    </button>
  )
}
```

## Tipos TypeScript

```typescript
// Hook return type
export interface UseExpenseStatsReturn {
  stats: ExpenseStats | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// Stats interface
export interface ExpenseStats {
  total_amount: number
  total_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
  by_category: Array<{
    category_name: string
    amount: number | string
    count: number
  }>
}

// API Response
export interface ExpenseSummary {
  total_amount: number | string
  total_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
  by_category: Array<{
    category_name: string
    amount: number | string
    count: number
  }>
}
```

## Testing Examples

```typescript
// __tests__/useExpenseStats.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useExpenseStats } from '@/hooks/useExpenseStats'
import * as expensesApi from '@/lib/api/expenses'

jest.mock('@/lib/api/expenses')

describe('useExpenseStats', () => {
  it('debe cargar estadísticas', async () => {
    const mockData = {
      total_amount: 50000,
      total_count: 10,
      pending_count: 2,
      approved_count: 7,
      rejected_count: 1,
      by_category: []
    }

    ;(expensesApi.expensesApi.getExpenseSummary as jest.Mock).mockResolvedValue(mockData)

    const { result } = renderHook(() => useExpenseStats())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.stats).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('debe manejar errores', async () => {
    const error = new Error('API Error')
    ;(expensesApi.expensesApi.getExpenseSummary as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useExpenseStats())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.stats).toBeNull()
  })
})
```
