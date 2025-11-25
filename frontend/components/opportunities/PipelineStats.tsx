/**
 * PipelineStats Component
 * Displays pipeline metrics and statistics
 */

import { TrendingUp, DollarSign, Target, BarChart3, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PipelineStats } from '@/types/opportunities'
import { STAGE_CONFIG } from '@/types/opportunities'
import { formatCurrency } from '@/lib/utils'

interface PipelineStatsProps {
  stats: PipelineStats | null
  loading?: boolean
}

export function PipelineStats({ stats, loading }: PipelineStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-32" />
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        No statistics available
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Opportunities',
      value: stats.total_opportunities,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.total_value, 'COP'),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Weighted Value',
      value: formatCurrency(stats.weighted_value, 'COP'),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Win Rate',
      value: `${stats.win_rate.toFixed(1)}%`,
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Avg Days to Close',
      value: Math.round(stats.avg_days_to_close),
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ]

  // Prepare chart data
  const chartData = stats.by_stage.map((item) => ({
    name: STAGE_CONFIG[item.stage]?.label || item.stage,
    count: item.count,
    value: item.total_value,
    stage: item.stage,
  }))

  // Get colors for bars
  const getBarColor = (stage: string) => {
    const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
    if (!config) return '#94a3b8'

    // Convert Tailwind class to hex color
    const colorMap: Record<string, string> = {
      'text-gray-700': '#374151',
      'text-blue-700': '#1d4ed8',
      'text-purple-700': '#7e22ce',
      'text-orange-700': '#c2410c',
      'text-green-700': '#15803d',
      'text-red-700': '#b91c1c',
    }

    return colorMap[config.color] || '#94a3b8'
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Distribution Chart */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Opportunities by Stage
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'count') return [value, 'Opportunities']
                if (name === 'value')
                  return [formatCurrency(Number(value), 'COP'), 'Total Value']
                return [value, name]
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.stage)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
