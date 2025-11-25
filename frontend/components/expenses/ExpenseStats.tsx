'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExpenseStats } from '@/hooks/useExpenseStats'
import { formatCurrency } from '@/lib/utils'
import { Loader2, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export function ExpenseStats() {
  const { stats, isLoading, error } = useExpenseStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-red-600">
        {error || 'Error al cargar estadísticas'}
      </div>
    )
  }

  // Convert amount to number for formatting
  const totalAmount = typeof stats.total_amount === 'string'
    ? parseFloat(stats.total_amount)
    : stats.total_amount

  const categoryChartData = stats.by_category.map(cat => ({
    ...cat,
    amount: typeof cat.amount === 'string' ? parseFloat(cat.amount) : cat.amount
  }))

  const statusData = [
    { name: 'Pendientes', value: stats.pending_count, color: '#FFA500' },
    { name: 'Aprobados', value: stats.approved_count, color: '#10B981' },
    { name: 'Rechazados', value: stats.rejected_count, color: '#EF4444' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gastos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total_count} registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending_count}
            </div>
            <p className="text-xs text-muted-foreground">
              Por aprobar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprobados
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved_count}
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechazados
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected_count}
            </div>
            <p className="text-xs text-muted-foreground">
              No aprobados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico por Categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category_name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Estado */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => value.toString()}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla por Categoría */}
      {stats.by_category.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Categoría
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.by_category.map((cat, idx) => {
                    const catAmount = typeof cat.amount === 'string'
                      ? parseFloat(cat.amount)
                      : cat.amount
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm">{cat.category_name}</td>
                        <td className="px-4 py-3 text-sm text-right">{cat.count}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(catAmount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
