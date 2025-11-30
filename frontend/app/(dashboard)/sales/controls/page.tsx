'use client'

/**
 * Sales Controls Page
 * Main page for managing sales controls with stats and filters
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, AlertCircle, Package, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { SalesControlList } from '@/components/sales/controls/SalesControlList'
import { useSalesControls, useSalesControlStats, useOverdueSalesControls } from '@/hooks/useSalesControls'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { SalesControlListItem } from '@/types/sales'

export default function SalesControlsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { salesControls, isLoading, error } = useSalesControls()
  const { stats } = useSalesControlStats()
  const { overdueSalesControls } = useOverdueSalesControls()

  const handleView = (salesControl: SalesControlListItem) => {
    router.push(`/sales/controls/${salesControl.id}`)
  }

  const handleEdit = (salesControl: SalesControlListItem) => {
    // For now, viewing is the same as editing
    router.push(`/sales/controls/${salesControl.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales Controls</h1>
          <p className="text-muted-foreground">
            Manage purchase orders and track deliveries
          </p>
        </div>
        <Button onClick={() => router.push('/sales/controls/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Sales Control
        </Button>
      </div>

      {/* Overdue Alert */}
      {overdueSalesControls && overdueSalesControls.length > 0 && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-800">
              You have {overdueSalesControls.length} overdue order(s)!
            </p>
            <p className="text-sm text-red-700">
              Please review and update the delivery status
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats.total_sales_controls}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overdue Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue_count}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.total_amount, 'COP')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                On-Time Delivery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {stats.on_time_delivery_rate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.by_status).map(([status, data]) => (
                <div
                  key={status}
                  className="flex flex-col items-center p-3 bg-slate-50 rounded-lg"
                >
                  <Badge variant="outline" className="mb-2 capitalize">
                    {status.replace('_', ' ')}
                  </Badge>
                  <p className="text-xl font-bold text-slate-900">{data.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(data.total_amount, 'COP')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error loading sales controls</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <SalesControlList
          salesControls={salesControls}
          onView={handleView}
          onEdit={handleEdit}
        />
      )}
    </div>
  )
}
