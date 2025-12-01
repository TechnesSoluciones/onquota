/**
 * Executive Dashboard Report Page
 * Comprehensive overview with KPIs, trends, and top performers
 */

'use client'

import { useState } from 'react'
import { useExecutiveDashboard } from '@/hooks/useReports'
import { KPIGrid } from '@/components/reports/dashboard/KPIGrid'
import { AlertsPanel } from '@/components/reports/dashboard/AlertsPanel'
import { DateRangePicker } from '@/components/reports/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, RefreshCcw, Download, TrendingUp } from 'lucide-react'
import { Label } from '@/components/ui/label'

export default function ExecutiveDashboardPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [comparisonPeriod, setComparisonPeriod] = useState<string>('')

  const { dashboard, isLoading, error, updateFilters, refresh } = useExecutiveDashboard({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    currency: currency,
    comparison_period: comparisonPeriod || undefined,
  })

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start)
    setEndDate(end)
    updateFilters({
      start_date: start,
      end_date: end,
    })
  }

  const handleCurrencyChange = (value: string) => {
    setCurrency(value)
    updateFilters({ currency: value })
  }

  const handleComparisonChange = (value: string) => {
    setComparisonPeriod(value)
    updateFilters({
      comparison_period: value === 'none' ? undefined : (value as any),
    })
  }

  // Show error state
  if (error && !isLoading && !dashboard) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">
            Análisis completo de KPIs, tendencias y desempeño
          </p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error al cargar el dashboard</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
        <Button onClick={refresh}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  // Show loading state (first load)
  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando dashboard ejecutivo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">
            Análisis completo de KPIs, tendencias y desempeño
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onRangeChange={handleDateRangeChange}
            />

            <div className="grid gap-4 md:grid-cols-2">
              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                    <SelectItem value="DOP">DOP - Peso Dominicano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comparison Period */}
              <div className="space-y-2">
                <Label htmlFor="comparison">Comparación</Label>
                <Select value={comparisonPeriod} onValueChange={handleComparisonChange}>
                  <SelectTrigger id="comparison">
                    <SelectValue placeholder="Sin comparación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin comparación</SelectItem>
                    <SelectItem value="previous_period">Período anterior</SelectItem>
                    <SelectItem value="previous_year">Año anterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      {dashboard && (
        <KPIGrid
          kpis={dashboard.kpis}
          currency={currency}
          isLoading={isLoading}
        />
      )}

      {/* Alerts Panel */}
      {dashboard && (
        <AlertsPanel
          alerts={dashboard.alerts}
          isLoading={isLoading}
        />
      )}

      {/* Top Performers Section */}
      {dashboard && dashboard.top_clients.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Clientes</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.top_clients.map((client) => (
                <div
                  key={client.client_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.total_transactions} transacciones • Promedio:{' '}
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: 0,
                      }).format(Number(client.avg_transaction_value))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                        minimumFractionDigits: 0,
                      }).format(Number(client.total_revenue))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {client.percentage_of_total.toFixed(1)}% del total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period Info */}
      {dashboard && (
        <div className="text-center text-xs text-muted-foreground">
          Datos del período:{' '}
          {dashboard.period.start_date} al {dashboard.period.end_date}
          {dashboard.period.label && ` (${dashboard.period.label})`}
          <br />
          Generado: {new Date(dashboard.generated_at).toLocaleString('es-ES')}
        </div>
      )}
    </div>
  )
}
