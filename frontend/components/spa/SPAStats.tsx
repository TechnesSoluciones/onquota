'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle2, Clock, XCircle, Users, Package, TrendingDown, TrendingUp, Calendar } from 'lucide-react'
import type { SPAStats as SPAStatsType } from '@/types/spa'

interface SPAStatsProps {
  stats: SPAStatsType | null
  loading?: boolean
}

export function SPAStats({ stats, loading }: SPAStatsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Agreements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total SPAs
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_agreements.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Acuerdos totales registrados
          </p>
        </CardContent>
      </Card>

      {/* Active Agreements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            SPAs Activos
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.active_agreements.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Vigentes actualmente
          </p>
        </CardContent>
      </Card>

      {/* Pending Agreements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            SPAs Pendientes
          </CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.pending_agreements.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Iniciarán en el futuro
          </p>
        </CardContent>
      </Card>

      {/* Expired Agreements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            SPAs Expirados
          </CardTitle>
          <XCircle className="h-4 w-4 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">
            {stats.expired_agreements.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Fuera de vigencia
          </p>
        </CardContent>
      </Card>

      {/* Total Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Clientes
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_clients.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Con acuerdos especiales
          </p>
        </CardContent>
      </Card>

      {/* Total Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Productos
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_products.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Con precios especiales
          </p>
        </CardContent>
      </Card>

      {/* Average Discount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Descuento Promedio
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {Number(stats.avg_discount).toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Min: {Number(stats.min_discount).toFixed(2)}% | Max: {Number(stats.max_discount).toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      {/* Total Uploads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cargas
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_uploads.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {stats.last_upload_date
              ? `Última: ${new Date(stats.last_upload_date).toLocaleDateString()}`
              : 'Sin cargas aún'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
