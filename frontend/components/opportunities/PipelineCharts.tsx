/**
 * PipelineCharts Component
 * Comprehensive analytics charts for sales pipeline
 * Includes Win Rate, Funnel, and Trend visualizations
 */

'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Award, Target, Calendar, DollarSign } from 'lucide-react'
import type { PipelineStats, OpportunityStage } from '@/types/opportunities'
import { STAGE_CONFIG } from '@/types/opportunities'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface PipelineChartsProps {
  analyticsData: PipelineStats
  loading?: boolean
}

/**
 * Colors for charts
 */
const CHART_COLORS = {
  won: '#22c55e',
  lost: '#ef4444',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
}

/**
 * Funnel colors matching stage config
 */
const FUNNEL_COLORS: Record<OpportunityStage, string> = {
  LEAD: '#9ca3af',
  QUALIFIED: '#3b82f6',
  PROPOSAL: '#8b5cf6',
  NEGOTIATION: '#f59e0b',
  CLOSED_WON: '#22c55e',
  CLOSED_LOST: '#ef4444',
}

export function PipelineCharts({ analyticsData, loading = false }: PipelineChartsProps) {
  if (loading) {
    return <PipelineChartsLoading />
  }

  /**
   * Prepare Win Rate data
   */
  const winRateData = [
    {
      name: 'Won',
      value:
        analyticsData.by_stage.find((s) => s.stage === 'CLOSED_WON')?.count || 0,
      color: CHART_COLORS.won,
    },
    {
      name: 'Lost',
      value:
        analyticsData.by_stage.find((s) => s.stage === 'CLOSED_LOST')?.count || 0,
      color: CHART_COLORS.lost,
    },
  ]

  const totalClosed = winRateData.reduce((sum, item) => sum + item.value, 0)

  /**
   * Prepare Funnel data (exclude closed stages)
   */
  const funnelData = analyticsData.by_stage
    .filter(
      (stage) => stage.stage !== 'CLOSED_WON' && stage.stage !== 'CLOSED_LOST'
    )
    .map((stage) => ({
      name: STAGE_CONFIG[stage.stage].label,
      value: stage.count,
      totalValue: stage.total_value,
      fill: FUNNEL_COLORS[stage.stage],
    }))
    .sort((a, b) => b.value - a.value) // Sort by count descending

  /**
   * Prepare Trend data (mock monthly data - in real app this would come from API)
   */
  const trendData = generateMockTrendData(analyticsData)

  /**
   * Custom tooltip for funnel
   */
  const CustomFunnelTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    const data = payload[0].payload
    return (
      <div className="rounded-lg border bg-white p-3 shadow-md">
        <p className="mb-1 font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          Opportunities: <span className="font-medium">{data.value}</span>
        </p>
        <p className="text-sm text-gray-600">
          Total Value:{' '}
          <span className="font-medium">{formatCurrency(data.totalValue)}</span>
        </p>
      </div>
    )
  }

  /**
   * Custom tooltip for trend
   */
  const CustomTrendTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null

    return (
      <div className="rounded-lg border bg-white p-3 shadow-md">
        <p className="mb-1 font-semibold text-gray-900">{payload[0].payload.month}</p>
        <p className="text-sm text-blue-600">
          Created: <span className="font-medium">{payload[0].value}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {analyticsData.win_rate.toFixed(1)}%
              </p>
            </div>
            <div
              className={cn(
                'rounded-full p-2',
                analyticsData.win_rate >= 50 ? 'bg-green-100' : 'bg-orange-100'
              )}
            >
              {analyticsData.win_rate >= 50 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-orange-600" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.total_value)}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weighted Value</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(analyticsData.weighted_value)}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-2">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Days to Close</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {Math.round(analyticsData.avg_days_to_close)}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-2">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Win Rate Chart */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Win vs Loss</h3>
            <Award className="h-5 w-5 text-gray-400" />
          </div>

          {totalClosed === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-500">
                No closed opportunities yet
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {winRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 flex items-center justify-around border-t pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {winRateData[0].value}
              </p>
              <p className="text-xs text-gray-600">Won</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {winRateData[1].value}
              </p>
              <p className="text-xs text-gray-600">Lost</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {analyticsData.win_rate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-600">Win Rate</p>
            </div>
          </div>
        </Card>

        {/* Funnel Chart */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Pipeline Funnel
            </h3>
            <Target className="h-5 w-5 text-gray-400" />
          </div>

          {funnelData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-500">
                No active opportunities in pipeline
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <FunnelChart>
                <Tooltip content={<CustomFunnelTooltip />} />
                <Funnel
                  dataKey="value"
                  data={funnelData}
                  isAnimationActive
                  labelLine
                  label={(props: any) => {
                    const { name, value } = props
                    return `${name}: ${value}`
                  }}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Trend Chart - Full Width */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Opportunity Creation Trend
          </h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTrendTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.primary, r: 4 }}
              activeDot={{ r: 6 }}
              name="Opportunities Created"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

/**
 * Loading skeleton component
 */
function PipelineChartsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-4 h-6 w-32" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </Card>
    </div>
  )
}

/**
 * Generate mock trend data for the last 6 months
 * In a real application, this would come from the API
 */
function generateMockTrendData(stats: PipelineStats) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const avgPerMonth = Math.max(1, Math.round(stats.total_opportunities / 6))

  return months.map((month, index) => ({
    month,
    created: Math.max(
      0,
      avgPerMonth + Math.round((Math.random() - 0.5) * avgPerMonth)
    ),
  }))
}
