'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { ExpensesData } from '@/types/dashboard'

interface ExpensesChartProps {
  data: ExpensesData
}

/**
 * Monthly Expenses Bar Chart
 */
export function ExpensesChart({ data }: ExpensesChartProps) {
  const chartData = data.current_year.map((current, index) => ({
    month: current.label,
    current: current.value,
    previous: data.previous_year?.[index]?.value || null,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos Mensuales</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total año actual: {formatCurrency(data.total_current_year)}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
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
            <Bar
              dataKey="current"
              fill="#EF4444"
              name="Año actual"
            />
            {data.previous_year && (
              <Bar
                dataKey="previous"
                fill="#FCA5A5"
                name="Año anterior"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
