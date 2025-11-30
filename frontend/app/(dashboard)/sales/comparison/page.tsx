'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingUp, TrendingDown, DollarSign, Download, Loader2, AlertCircle, FileText, Target, AlertTriangle } from 'lucide-react'
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
import { useSalesComparison } from '@/hooks/useSalesComparison'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'

export default function SalesComparisonPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [comparisonType, setComparisonType] = useState<'monthly' | 'yearly' | 'quarter'>('monthly')
  const [clientFilter, setClientFilter] = useState<string>('')
  const [salesRepFilter, setSalesRepFilter] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showDateRange, setShowDateRange] = useState(false)

  const { data, isLoading, error, refresh } = useSalesComparison({
    year: parseInt(selectedYear),
    comparisonType: comparisonType,
    clientId: clientFilter || undefined,
    assignedToId: salesRepFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  })

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString())

  const handleClearFilters = () => {
    setClientFilter('')
    setSalesRepFilter('')
    setStartDate('')
    setEndDate('')
    setShowDateRange(false)
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const endpoint = format === 'excel' ? 'excel' : 'pdf'
      const response = await api.get(`/sales/comparison/export/${endpoint}?year=${selectedYear}`, {
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
      link.download = `ventas_comparacion_${selectedYear}.${format === 'excel' ? 'xlsx' : 'pdf'}`
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Comparación Mensual de Ventas</h1>
          <p className="text-muted-foreground">
            Analiza y compara las ventas entre diferentes períodos
          </p>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-4 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <div>
              <p className="font-semibold">Error al cargar datos</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
          <Button onClick={refresh} className="mt-4">Reintentar</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comparación Mensual de Ventas</h1>
          <p className="text-muted-foreground">
            Analiza y compara las ventas entre diferentes períodos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Cliente (Opcional)</label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los clientes</SelectItem>
                  <SelectItem value="client1">Cliente A</SelectItem>
                  <SelectItem value="client2">Cliente B</SelectItem>
                  <SelectItem value="client3">Cliente C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor (Opcional)</label>
              <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los vendedores</SelectItem>
                  <SelectItem value="rep1">Juan Pérez</SelectItem>
                  <SelectItem value="rep2">María García</SelectItem>
                  <SelectItem value="rep3">Carlos López</SelectItem>
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
          {(clientFilter || salesRepFilter || startDate || endDate) && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Alert for significant changes in sales */}
      {data && data.summary.percent_change < -15 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Caída Significativa en Ventas</h3>
              <p className="text-sm text-red-700 mt-1">
                Las ventas han disminuido un {Math.abs(data.summary.percent_change).toFixed(1)}%
                comparado con el año anterior. Esto representa una pérdida de{' '}
                {formatCurrency(data.summary.total_previous - data.summary.total_actual, 'DOP')}.
                Se recomienda revisar la estrategia comercial y analizar la competencia.
              </p>
            </div>
          </div>
        </Card>
      )}

      {data && data.summary.acceptance_rate < 40 && (
        <Card className="p-4 border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Baja Tasa de Aceptación</h3>
              <p className="text-sm text-orange-700 mt-1">
                La tasa de aceptación es de {data.summary.acceptance_rate}%, lo cual está por debajo del objetivo.
                Considera revisar los precios, la calidad de las propuestas y el seguimiento a clientes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {data && data.summary.percent_change > 25 && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Excelente Desempeño en Ventas</h3>
              <p className="text-sm text-green-700 mt-1">
                Las ventas han aumentado un {data.summary.percent_change.toFixed(1)}%
                comparado con el año anterior. Esto representa un incremento de{' '}
                {formatCurrency(data.summary.total_actual - data.summary.total_previous, 'DOP')}.
                ¡Excelente trabajo del equipo de ventas!
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.total_actual, 'DOP')}
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
                <div className="rounded-full bg-purple-100 p-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cotizaciones</p>
                  <p className="text-2xl font-bold">
                    {data.summary.total_quotes}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total del año {selectedYear}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasa de Aceptación</p>
                  <p className="text-2xl font-bold">
                    {data.summary.acceptance_rate}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cotizaciones aceptadas
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Promedio</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.average_ticket, 'DOP')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Por cotización
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Best Month Card */}
          {data.summary.max_month && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Mejor Mes del Año</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {data.summary.max_month.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Ventas</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.summary.max_month.amount, 'DOP')}
                  </p>
                </div>
              </div>
            </Card>
          )}

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
            <h3 className="text-lg font-semibold mb-4">Tendencia Anual de Ventas</h3>
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

          {/* Quotes Count Comparison */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cantidad de Cotizaciones por Mes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthly_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Total Cotizaciones" />
                <Bar dataKey="accepted_count" fill="#10b981" name="Cotizaciones Aceptadas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      ) : null}
    </div>
  )
}
