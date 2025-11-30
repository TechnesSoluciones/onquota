'use client'

/**
 * QuotaDashboard Component
 * Main quota dashboard with trends and comparisons
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuotaCard } from './QuotaCard'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Calendar, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type {
  QuotaDashboardStats,
  QuotaTrendsResponse,
  QuotaComparisonResponse,
} from '@/types/sales'

interface QuotaDashboardProps {
  dashboard?: QuotaDashboardStats
  trends?: QuotaTrendsResponse
  comparison?: QuotaComparisonResponse
  currency?: string
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function QuotaDashboard({
  dashboard,
  trends,
  comparison,
  currency = 'COP',
}: QuotaDashboardProps) {
  // Format trends data for charts
  const trendsChartData =
    trends?.trends.map((trend) => ({
      month: MONTH_NAMES[trend.month - 1],
      quota: trend.quota_amount,
      achieved: trend.achieved_amount,
      percentage: trend.achievement_percentage,
    })) || []

  return (
    <div className="space-y-6">
      {/* Current Quota Card */}
      {dashboard && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Current Month Performance
          </h3>
          <QuotaCard quota={dashboard} currency={currency} />
        </div>
      )}

      {/* Comparison Stats */}
      {comparison && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Month-to-Month Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Month */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Current Month
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {comparison.current_month.achievement_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(comparison.current_month.achieved_amount, currency)}{' '}
                    / {formatCurrency(comparison.current_month.quota_amount, currency)}
                  </p>
                </div>
              </div>

              {/* Previous Month */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Previous Month
                </p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {comparison.previous_month.achievement_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(
                      comparison.previous_month.achieved_amount,
                      currency
                    )}{' '}
                    / {formatCurrency(comparison.previous_month.quota_amount, currency)}
                  </p>
                </div>
              </div>

              {/* Change */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Change</p>
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className={`h-5 w-5 ${
                      comparison.change_percentage >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  />
                  <p
                    className={`text-2xl font-bold ${
                      comparison.change_percentage >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {comparison.change_percentage >= 0 ? '+' : ''}
                    {comparison.change_percentage.toFixed(1)}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {comparison.change_percentage >= 0
                    ? 'Improvement from last month'
                    : 'Decrease from last month'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trends Chart */}
      {trends && trendsChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Achievement Trends</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {trends.user_name} - {trends.year}
            </p>
          </CardHeader>
          <CardContent>
            {/* Line Chart - Achievement Over Time */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-4">
                  Quota vs Achieved
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, currency)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="quota"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Quota"
                    />
                    <Line
                      type="monotone"
                      dataKey="achieved"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Achieved"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart - Achievement Percentage */}
              <div>
                <h4 className="text-sm font-medium text-slate-900 mb-4">
                  Achievement Percentage
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                    <Legend />
                    <Bar
                      dataKey="percentage"
                      fill="#8b5cf6"
                      name="Achievement %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Line Breakdown by Achievement */}
      {dashboard && dashboard.lines && dashboard.lines.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Product Line Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sort by achievement percentage */}
              {[...dashboard.lines]
                .sort((a, b) => b.achievement_percentage - a.achievement_percentage)
                .map((line) => {
                  const achievementColor =
                    line.achievement_percentage >= 90
                      ? 'bg-green-500'
                      : line.achievement_percentage >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'

                  return (
                    <div
                      key={line.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-900">
                            {line.product_line_name}
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {line.achievement_percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {formatCurrency(line.achieved_amount, currency)}
                          </span>
                          <span>/</span>
                          <span>{formatCurrency(line.quota_amount, currency)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${achievementColor} text-white font-bold`}
                        >
                          {Math.round(line.achievement_percentage)}
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!dashboard && !trends && !comparison && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No quota data available for the selected period
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
