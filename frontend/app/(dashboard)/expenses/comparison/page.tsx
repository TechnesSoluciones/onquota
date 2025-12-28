'use client'

/**
 * Expense Comparison Page V2
 * Monthly/yearly expense comparison with charts
 * Updated with Design System V2
 */

import { useState } from 'react'
import { Card, Button } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useExpenseComparison } from '@/hooks/useExpenseComparison'
import { formatCurrency } from '@/lib/utils'

export default function ExpensesComparisonPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [comparisonType, setComparisonType] = useState<'monthly' | 'yearly' | 'quarter'>('monthly')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showDateRange, setShowDateRange] = useState(false)

  const { data, isLoading, error, refresh } = useExpenseComparison({
    year: parseInt(selectedYear),
    comparisonType: comparisonType,
    categoryId: categoryFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  })

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  const handleClearFilters = () => {
    setCategoryFilter('')
    setStartDate('')
    setEndDate('')
    setShowDateRange(false)
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const endpoint = format === 'excel' ? 'excel' : 'pdf'
      const response = await api.get(`/expenses/comparison/export/${endpoint}?year=${selectedYear}`, {
        responseType: 'blob'
      })

      // Create blob and download
      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `gastos_comparacion_${selectedYear}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al exportar:', error)
    }
  }

  if (error) {
    return (
      <PageLayout
        title="Comparación de Gastos"
        description="Analiza y compara los gastos entre diferentes períodos"
        backLink="/expenses"
      >
        <Card className="p-6">
          <div className="flex items-center gap-4 text-error">
            <Icon name="error" className="h-6 w-6" />
            <div>
              <p className="font-semibold">Error al cargar datos</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={refresh} className="mt-4">Reintentar</Button>
        </Card>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Comparación de Gastos"
      description="Analiza y compara los gastos entre diferentes períodos"
      backLink="/expenses"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('excel')} leftIcon={<Icon name="download" />}>
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} leftIcon={<Icon name="download" />}>
            Exportar PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Año</label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={showDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Comparación</label>
              <Select value={comparisonType} onValueChange={setComparisonType} disabled={showDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mes vs Mes Anterior</SelectItem>
                  <SelectItem value="yearly">Año vs Año Anterior</SelectItem>
                  <SelectItem value="quarter">Trimestre Actual vs Anterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Categoría (Opcional)</label>
              <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="office">Oficina</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="travel">Viajes</SelectItem>
                  <SelectItem value="equipment">Equipamiento</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Rango de Fechas Personalizado</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateRange(!showDateRange)}
              >
                {showDateRange ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>

            {showDateRange && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {(categoryFilter || startDate || endDate) && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Alert for significant drops */}
      {data && data.summary.percent_change < -10 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Caída Significativa Detectada</h3>
              <p className="text-sm text-orange-700 mt-1">
                Los gastos han disminuido un {Math.abs(data.summary.percent_change).toFixed(1)}%
                comparado con el año anterior. Esto representa una reducción de{' '}
                {formatCurrency(data.summary.total_previous - data.summary.total_actual, 'DOP')}.
              </p>
            </div>
          </div>
        </Card>
      )}

      {data && data.summary.percent_change > 20 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Incremento Significativo Detectado</h3>
              <p className="text-sm text-red-700 mt-1">
                Los gastos han aumentado un {data.summary.percent_change.toFixed(1)}%
                comparado con el año anterior. Esto representa un incremento de{' '}
                {formatCurrency(data.summary.total_actual - data.summary.total_previous, 'DOP')}.
                Considera revisar las categorías de gasto para identificar oportunidades de optimización.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando datos de comparación...</p>
          </div>
        </Card>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Promedio Mensual</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.average_monthly, 'DOP')}
                  </p>
                  <p className={`text-xs flex items-center gap-1 ${
                    data.summary.percent_change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.summary.percent_change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(data.summary.percent_change)}% vs año anterior
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingDown className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mes con Menor Gasto</p>
                  <p className="text-2xl font-bold">
                    {data.summary.min_month?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.summary.min_month ? formatCurrency(data.summary.min_month.amount, 'DOP') : ''}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-red-100 p-3">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mes con Mayor Gasto</p>
                  <p className="text-2xl font-bold">
                    {data.summary.max_month?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.summary.max_month ? formatCurrency(data.summary.max_month.amount, 'DOP') : ''}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comparación Mensual {selectedYear}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.monthly_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), 'DOP')}
                />
                <Legend />
                <Bar dataKey="actual" fill="#3b82f6" name="Año Actual" />
                <Bar dataKey="previous" fill="#94a3b8" name="Año Anterior" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Line Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tendencia Anual</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthly_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), 'DOP')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Año Actual"
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  name="Año Anterior"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : null}
      </div>
    </PageLayout>
  )
}
