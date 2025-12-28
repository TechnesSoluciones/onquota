'use client'

/**
 * Sales Controls Page V2
 * Main page for managing sales controls with stats and filters
 * Updated with Design System V2
 */

import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
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
    <PageLayout
      title="Sales Controls"
      description="Manage purchase orders and track deliveries"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Controls' }
      ]}
      actions={
        <Button onClick={() => router.push('/sales/controls/new')} leftIcon={<Icon name="add" />}>
          New Sales Control
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Overdue Alert */}
        {overdueSalesControls && overdueSalesControls.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="warning" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-error">
                You have {overdueSalesControls.length} overdue order(s)!
              </p>
              <p className="text-sm text-error/80">
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
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="inventory_2" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-2xl font-bold">{stats.total_sales_controls}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Overdue Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="error" className="h-5 w-5 text-error" />
                  <p className="text-2xl font-bold text-error">
                    {stats.overdue_count}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Total Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="payments" className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_amount, 'COP')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  On-Time Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Icon name="trending_up" className="h-5 w-5 text-success" />
                  <p className="text-2xl font-bold text-success">
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
                    className="flex flex-col items-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                  >
                    <Badge variant="outline" className="mb-2 capitalize">
                      {status.replace('_', ' ')}
                    </Badge>
                    <p className="text-xl font-bold">{data.count}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
            <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error">Error loading sales controls</p>
              <p className="text-sm text-error/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <LoadingState message="Loading sales controls..." />
        ) : (
          <SalesControlList
            salesControls={salesControls}
            onView={handleView}
            onEdit={handleEdit}
          />
        )}
      </div>
    </PageLayout>
  )
}
