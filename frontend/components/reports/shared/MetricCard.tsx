/**
 * MetricCard Component
 * Displays a single KPI metric with value, label, and trend
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendIndicator } from './TrendIndicator'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label?: string
  }
  icon?: LucideIcon
  iconColor?: string
  format?: 'number' | 'currency' | 'percentage'
  currency?: string
  className?: string
  isLoading?: boolean
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = 'text-primary',
  format = 'number',
  currency = 'USD',
  className,
  isLoading = false,
}: MetricCardProps) {
  const formatValue = (val: string | number): string => {
    if (isLoading) return '...'

    const numValue = typeof val === 'string' ? parseFloat(val) : val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numValue)

      case 'percentage':
        return `${numValue.toFixed(1)}%`

      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(numValue)
    }
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn('h-4 w-4', iconColor)} />}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {formatValue(value)}
          </div>

          <div className="flex items-center gap-2">
            {trend && (
              <TrendIndicator
                value={trend.value}
                label={trend.label}
                size="sm"
              />
            )}

            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
