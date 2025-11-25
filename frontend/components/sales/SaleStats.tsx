'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSalesStats } from '@/hooks/useSalesStats'
import { formatCurrency } from '@/lib/utils'
import {
  Loader2,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
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
import { SaleStatus } from '@/types/quote'
import { SALE_STATUS_LABELS } from '@/constants/sales'

/**
 * Sales statistics dashboard component
 * Displays KPIs, charts, and top clients for quotes/sales
 */
export function SaleStats() {
  const { stats, isLoading, error } = useSalesStats()

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

  // Calculate total amount across all statuses
  const totalAmount = Object.values(stats.total_amount_by_status).reduce(
    (sum, amount) => sum + amount,
    0
  )

  // Prepare data for status distribution pie chart
  const statusData = [
    {
      name: SALE_STATUS_LABELS[SaleStatus.DRAFT],
      value: stats.draft_count,
      color: '#6B7280',
    },
    {
      name: SALE_STATUS_LABELS[SaleStatus.SENT],
      value: stats.sent_count,
      color: '#3B82F6',
    },
    {
      name: SALE_STATUS_LABELS[SaleStatus.ACCEPTED],
      value: stats.accepted_count,
      color: '#10B981',
    },
    {
      name: SALE_STATUS_LABELS[SaleStatus.REJECTED],
      value: stats.rejected_count,
      color: '#EF4444',
    },
    {
      name: SALE_STATUS_LABELS[SaleStatus.EXPIRED],
      value: stats.expired_count,
      color: '#F59E0B',
    },
  ].filter((item) => item.value > 0) // Only show statuses with data

  // Prepare data for amount by status bar chart
  const amountByStatusData = Object.entries(stats.total_amount_by_status)
    .filter(([_, amount]) => amount > 0)
    .map(([status, amount]) => ({
      status: SALE_STATUS_LABELS[status as SaleStatus],
      amount,
    }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cotizaciones
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_quotes}</div>
            <p className="text-xs text-muted-foreground">Todas las cotizaciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Valor de todas las cotizaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Conversión
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats.conversion_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Cotizaciones aceptadas vs enviadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aceptadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.accepted_count}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.total_amount_by_status[SaleStatus.ACCEPTED] || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Borradores
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.draft_count}
            </div>
            <p className="text-xs text-muted-foreground">Por enviar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviadas
            </CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.sent_count}
            </div>
            <p className="text-xs text-muted-foreground">Pendientes de respuesta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rechazadas
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.rejected_count}
            </div>
            <p className="text-xs text-muted-foreground">No aceptadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiradas
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.expired_count}
            </div>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart - Amount by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Monto por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {amountByStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={amountByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="status"
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
                      borderRadius: '4px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Quote Distribution by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
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
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clients Table */}
      {stats.top_clients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Posición
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Cliente
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.top_clients.map((client, idx) => (
                    <tr key={client.client_id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {client.client_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                        {formatCurrency(client.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
