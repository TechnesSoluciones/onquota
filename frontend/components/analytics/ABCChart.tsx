/**
 * ABCChart Component
 * Pie chart visualization for ABC classification
 */

'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { ABCClassification } from '@/types/analytics'
import { Card } from '@/components/ui/card'

interface ABCChartProps {
  data: ABCClassification[]
}

const COLORS = {
  A: '#22c55e', // green
  B: '#eab308', // yellow
  C: '#ef4444', // red
}

const DESCRIPTIONS = {
  A: 'High value products (80% of sales)',
  B: 'Medium value products (15% of sales)',
  C: 'Low value products (5% of sales)',
}

export function ABCChart({ data }: ABCChartProps) {
  const chartData = data.map((item) => ({
    name: `Category ${item.category}`,
    value: item.sales_percentage,
    products: item.product_count,
    category: item.category,
  }))

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">ABC Classification</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ category, value }) => `${category}: ${value.toFixed(1)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.category]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${value.toFixed(2)}%`,
              `${props.payload.products} products`,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 space-y-3">
        {data.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: COLORS[item.category] }}
              />
              <div>
                <p className="font-medium">Category {item.category}</p>
                <p className="text-sm text-gray-600">
                  {DESCRIPTIONS[item.category]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{item.product_count}</p>
              <p className="text-sm text-gray-600">products</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
