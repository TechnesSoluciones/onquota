/**
 * KPIGrid Component
 * Displays a grid of KPI metric cards for the executive dashboard
 */

'use client'

import { MetricCard } from '../shared/MetricCard'
import type { DashboardKPIs } from '@/types/reports'
import {
  DollarSign,
  TrendingUp,
  FileText,
  Target,
  Users,
  CalendarDays,
  Percent,
  Receipt,
} from 'lucide-react'

interface KPIGridProps {
  kpis: DashboardKPIs
  currency?: string
  isLoading?: boolean
}

export function KPIGrid({ kpis, currency = 'USD', isLoading = false }: KPIGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue */}
      <MetricCard
        title="Ingresos Totales"
        value={kpis.total_revenue}
        format="currency"
        currency={currency}
        trend={kpis.revenue_growth !== 0 ? {
          value: kpis.revenue_growth,
          label: 'vs período anterior'
        } : undefined}
        icon={DollarSign}
        iconColor="text-green-600"
        isLoading={isLoading}
      />

      {/* Active Quotations */}
      <MetricCard
        title="Cotizaciones Activas"
        value={kpis.active_quotations}
        format="number"
        subtitle={`Valor: ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(kpis.quotations_value))}`}
        icon={FileText}
        iconColor="text-blue-600"
        isLoading={isLoading}
      />

      {/* Win Rate */}
      <MetricCard
        title="Tasa de Conversión"
        value={kpis.win_rate}
        format="percentage"
        icon={Target}
        iconColor="text-purple-600"
        isLoading={isLoading}
      />

      {/* Pipeline Value */}
      <MetricCard
        title="Pipeline"
        value={kpis.pipeline_value}
        format="currency"
        currency={currency}
        subtitle={`Ponderado: ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(kpis.weighted_pipeline))}`}
        icon={TrendingUp}
        iconColor="text-orange-600"
        isLoading={isLoading}
      />

      {/* Visits */}
      <MetricCard
        title="Visitas Realizadas"
        value={kpis.visits_this_period}
        format="number"
        icon={CalendarDays}
        iconColor="text-indigo-600"
        isLoading={isLoading}
      />

      {/* New Clients */}
      <MetricCard
        title="Nuevos Clientes"
        value={kpis.new_clients}
        format="number"
        icon={Users}
        iconColor="text-teal-600"
        isLoading={isLoading}
      />

      {/* Conversion Rate */}
      <MetricCard
        title="Conversión General"
        value={kpis.conversion_rate}
        format="percentage"
        subtitle={`Ciclo: ${kpis.avg_sales_cycle_days.toFixed(0)} días`}
        icon={Percent}
        iconColor="text-cyan-600"
        isLoading={isLoading}
      />

      {/* Expenses */}
      <MetricCard
        title="Gastos Totales"
        value={kpis.total_expenses}
        format="currency"
        currency={currency}
        subtitle={`${kpis.expense_to_revenue_ratio.toFixed(1)}% de ingresos`}
        icon={Receipt}
        iconColor="text-red-600"
        isLoading={isLoading}
      />
    </div>
  )
}
