/**
 * MonthlyTrends Component
 * Line chart showing monthly sales trends
 */

'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MonthlyTrend } from '@/types/analytics'
import { Card } from '@/components/ui/card'

interface MonthlyTrendsProps {
  data: MonthlyTrend[]
}

export function MonthlyTrends({ data }: MonthlyTrendsProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    sales: item.total_sales,
    quantity: item.total_quantity,
    avgTicket: item.avg_ticket,
    products: item.unique_products,
  }))

  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`
  }

  const formatMonth = (month: string) => {
    // Format YYYY-MM to MMM YY
    const date = new Date(month + '-01')
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">
            {formatMonth(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name === 'Sales' || entry.name === 'Avg Ticket'
                  ? `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Monthly Trends</h3>
          <p className="text-sm text-muted-foreground">
            Sales performance over time
          </p>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatCurrency}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={renderTooltip} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              name="Sales"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="quantity"
              name="Quantity"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 4 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgTicket"
              name="Avg Ticket"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          {data.length > 0 && (
            <>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Total Sales
                </p>
                <p className="text-xl font-bold text-blue-600">
                  ${data.reduce((sum, item) => sum + item.total_sales, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <p className="text-xs font-medium text-green-900 mb-1">
                  Total Quantity
                </p>
                <p className="text-xl font-bold text-green-600">
                  {data.reduce((sum, item) => sum + item.total_quantity, 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50">
                <p className="text-xs font-medium text-orange-900 mb-1">
                  Avg Ticket
                </p>
                <p className="text-xl font-bold text-orange-600">
                  ${(data.reduce((sum, item) => sum + item.avg_ticket, 0) / data.length).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50">
                <p className="text-xs font-medium text-purple-900 mb-1">
                  Unique Products
                </p>
                <p className="text-xl font-bold text-purple-600">
                  {Math.max(...data.map(item => item.unique_products))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
