'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { RevenueData } from '@/types/dashboard'

interface RevenueChartProps {
  data: RevenueData
}

/**
 * Monthly Revenue Line Chart
 * Shows revenue trends with year-over-year comparison
 */
export function RevenueChart({ data }: RevenueChartProps) {
  // Combine current and previous year data
  const chartData = data.current_year.map((current, index) => ({
    month: current.label,
    current: current.value,
    previous: data.previous_year?.[index]?.value || null,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Mensuales</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total año actual: {formatCurrency(data.total_current_year)}
          {data.total_previous_year && (
            <> • Año anterior: {formatCurrency(data.total_previous_year)}</>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Año actual"
              dot={{ r: 3 }}
            />
            {data.previous_year && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Año anterior"
                dot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
