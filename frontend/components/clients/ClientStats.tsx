'use client'

import { useClientStats } from '@/hooks/useClientStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, Users, UserPlus, UserCheck, UserX, TrendingDown } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { INDUSTRY_LABELS } from '@/constants/client'

const STATUS_COLORS = {
  leads: '#3b82f6',      // blue
  prospects: '#8b5cf6',  // purple
  active: '#10b981',     // green
  inactive: '#6b7280',   // gray
  lost: '#ef4444',       // red
}

export function ClientStats() {
  const { stats, isLoading, error } = useClientStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-red-800">Error al cargar estadísticas</p>
          <p className="text-sm text-red-700">{error || 'Error desconocido'}</p>
        </div>
      </div>
    )
  }

  // Preparar datos para el gráfico de barras (por industria)
  const industryData = stats.by_industry
    .map((item) => ({
      name: INDUSTRY_LABELS[item.industry as keyof typeof INDUSTRY_LABELS] || item.industry,
      cantidad: item.count,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Preparar datos para el gráfico de pie (por estado)
  const statusData = [
    { name: 'Leads', value: stats.leads_count, color: STATUS_COLORS.leads },
    { name: 'Prospectos', value: stats.prospects_count, color: STATUS_COLORS.prospects },
    { name: 'Activos', value: stats.active_count, color: STATUS_COLORS.active },
    { name: 'Inactivos', value: stats.inactive_count, color: STATUS_COLORS.inactive },
    { name: 'Perdidos', value: stats.lost_count, color: STATUS_COLORS.lost },
  ].filter((item) => item.value > 0) // Solo mostrar estados con valores

  // Calcular tasa de conversión
  const conversionRate = stats.leads_count > 0
    ? ((stats.active_count / (stats.leads_count + stats.prospects_count + stats.active_count)) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_clients}</div>
            <p className="text-xs text-muted-foreground">Todos los registros</p>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.leads_count}</div>
            <p className="text-xs text-muted-foreground">Por contactar</p>
          </CardContent>
        </Card>

        {/* Prospectos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospectos</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.prospects_count}</div>
            <p className="text-xs text-muted-foreground">En proceso</p>
          </CardContent>
        </Card>

        {/* Activos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active_count}</div>
            <p className="text-xs text-muted-foreground">
              {conversionRate}% conversión
            </p>
          </CardContent>
        </Card>

        {/* Perdidos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perdidos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lost_count}</div>
            <p className="text-xs text-muted-foreground">No convertidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Barras - Por Industria */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Industria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={industryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pie - Por Estado */}
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
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla Detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle por Industria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Industria
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                    Porcentaje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {industryData.map((item, index) => {
                  const percentage = ((item.cantidad / stats.total_clients) * 100).toFixed(1)
                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-900">
                        {item.cantidad}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-muted-foreground">
                        {percentage}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
