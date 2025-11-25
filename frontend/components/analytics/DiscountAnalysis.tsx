/**
 * DiscountAnalysis Component
 * Display discount metrics and analysis
 */

'use client'

import { DiscountAnalysis as DiscountAnalysisType } from '@/types/analytics'
import { Card } from '@/components/ui/card'
import { Badge, Percent, TrendingDown, Package } from 'lucide-react'

interface DiscountAnalysisProps {
  data: DiscountAnalysisType
}

export function DiscountAnalysis({ data }: DiscountAnalysisProps) {
  const metrics = [
    {
      label: 'Average Discount',
      value: `${data.avg_discount_percentage.toFixed(1)}%`,
      icon: Percent,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Total Discounted Sales',
      value: `$${data.total_discounted_sales.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingDown,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Discount Frequency',
      value: `${data.discount_frequency.toFixed(1)}%`,
      icon: Badge,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Products with Discount',
      value: data.products_with_discount.toLocaleString(),
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Discount Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Overview of discount patterns and impact
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card"
              >
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">{metric.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {data.highest_discount > 0 && (
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <p className="font-semibold text-yellow-900">Highest Discount</p>
            </div>
            <p className="text-3xl font-bold text-yellow-700">
              {data.highest_discount.toFixed(1)}%
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              Maximum discount applied to any product
            </p>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Discount Impact</p>
              <p className="font-medium mt-1">
                {((data.total_discounted_sales / (data.total_discounted_sales / (1 - data.avg_discount_percentage / 100))) * 100).toFixed(1)}% of potential revenue
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Products Affected</p>
              <p className="font-medium mt-1">
                {data.discount_frequency.toFixed(0)}% of all transactions
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
