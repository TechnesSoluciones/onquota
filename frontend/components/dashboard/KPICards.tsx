'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Clock,
  Send,
  CheckCircle,
} from 'lucide-react'
import type { KPIMetric } from '@/types/dashboard'

interface KPICardProps {
  metric: KPIMetric
  icon?: React.ComponentType<{ className?: string }>
}

/**
 * Individual KPI Card component
 * Displays metric with trend indicator
 */
function KPICard({ metric, icon: Icon }: KPICardProps) {
  const formatValue = (value: number | null | undefined) => {
    // Handle null, undefined, or invalid values
    const numValue = Number(value)
    if (value === null || value === undefined || isNaN(numValue)) {
      console.warn('[KPICard] Invalid value received:', value, 'for metric:', metric.title)
      return metric.format_type === 'currency' ? '$0.00' : '0'
    }

    switch (metric.format_type) {
      case 'currency':
        return formatCurrency(numValue)
      case 'percentage':
        return `${numValue.toFixed(1)}%`
      case 'number':
        return Math.round(numValue).toString()
      default:
        return numValue.toString()
    }
  }

  const showTrend = metric.change_percent !== null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(metric.current_value)}
        </div>
        {showTrend && (
          <div className="flex items-center gap-1 mt-1">
            {metric.is_positive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <p
              className={`text-sm ${
                metric.is_positive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {metric.change_percent! > 0 ? '+' : ''}
              {Number(metric.change_percent).toFixed(1)}% vs anterior
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KPICardsProps {
  kpis: {
    total_revenue: KPIMetric
    monthly_quota: KPIMetric
    conversion_rate: KPIMetric
    active_clients: KPIMetric
    new_clients_this_month: KPIMetric
    total_expenses: KPIMetric
    pending_approvals: KPIMetric
    quotes_sent: KPIMetric
    quotes_accepted: KPIMetric
  }
}

/**
 * Dashboard KPI Cards Grid
 * Displays all main KPIs in a responsive grid
 */
export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard metric={kpis.total_revenue} icon={DollarSign} />
        <KPICard metric={kpis.monthly_quota} icon={Target} />
        <KPICard metric={kpis.conversion_rate} icon={TrendingUp} />
        <KPICard metric={kpis.active_clients} icon={Users} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard metric={kpis.new_clients_this_month} icon={Users} />
        <KPICard metric={kpis.total_expenses} icon={DollarSign} />
        <KPICard metric={kpis.pending_approvals} icon={Clock} />
        <KPICard metric={kpis.quotes_sent} icon={Send} />
      </div>
    </div>
  )
}
