'use client'

/**
 * SalesControlDetail Component
 * Detailed view of a sales control with lifecycle management
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Package,
  Truck,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SalesControlStatus } from '@/types/sales'
import { SalesControlStatusBadge } from './SalesControlStatusBadge'
import type { SalesControlDetail as SalesControlDetailType } from '@/types/sales'

interface SalesControlDetailProps {
  salesControl: SalesControlDetailType
  onMarkInProduction?: () => void
  onMarkDelivered?: () => void
  onMarkInvoiced?: () => void
  onMarkPaid?: () => void
  onCancel?: () => void
  isLoading?: boolean
}

const LIFECYCLE_STEPS = [
  {
    status: SalesControlStatus.PENDING,
    label: 'Pending',
    icon: Package,
    color: 'text-yellow-600',
  },
  {
    status: SalesControlStatus.IN_PRODUCTION,
    label: 'In Production',
    icon: Package,
    color: 'text-blue-600',
  },
  {
    status: SalesControlStatus.DELIVERED,
    label: 'Delivered',
    icon: Truck,
    color: 'text-purple-600',
  },
  {
    status: SalesControlStatus.INVOICED,
    label: 'Invoiced',
    icon: FileText,
    color: 'text-indigo-600',
  },
  {
    status: SalesControlStatus.PAID,
    label: 'Paid',
    icon: DollarSign,
    color: 'text-green-600',
  },
]

export function SalesControlDetail({
  salesControl,
  onMarkInProduction,
  onMarkDelivered,
  onMarkInvoiced,
  onMarkPaid,
  onCancel,
  isLoading = false,
}: SalesControlDetailProps) {
  const currentStepIndex = LIFECYCLE_STEPS.findIndex(
    (step) => step.status === salesControl.status
  )
  const progressPercentage = ((currentStepIndex + 1) / LIFECYCLE_STEPS.length) * 100

  const isCancelled = salesControl.status === SalesControlStatus.CANCELLED

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {salesControl.folio_number}
          </h2>
          <p className="text-sm text-muted-foreground">
            PO: {salesControl.po_number}
          </p>
        </div>
        <SalesControlStatusBadge
          status={salesControl.status}
          isOverdue={salesControl.is_overdue}
        />
      </div>

      {/* Overdue Alert */}
      {salesControl.is_overdue && !isCancelled && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">This order is overdue!</p>
            <p className="text-sm text-red-700">
              {salesControl.promise_date &&
                `Expected delivery was ${formatDate(salesControl.promise_date)}`}
            </p>
          </div>
        </div>
      )}

      {/* Lifecycle Progress */}
      {!isCancelled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-2" />
            <div className="grid grid-cols-5 gap-2">
              {LIFECYCLE_STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div key={step.status} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? `${step.color} bg-opacity-10 border-current`
                          : 'border-slate-300 text-slate-400'
                      } ${isCurrent ? 'ring-4 ring-opacity-20 ring-current' : ''}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <p
                      className={`text-xs text-center font-medium ${
                        isCompleted ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Client</p>
              <p className="text-sm text-muted-foreground">
                {salesControl.client_name}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Sales Rep</p>
              <p className="text-sm text-muted-foreground">
                {salesControl.sales_rep_name}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">PO Reception</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(salesControl.po_reception_date)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Promise Date</p>
              <p className="text-sm text-muted-foreground">
                {salesControl.promise_date
                  ? formatDate(salesControl.promise_date)
                  : 'Not set'}
              </p>
              {salesControl.days_until_promise !== null &&
                salesControl.days_until_promise !== undefined && (
                  <p
                    className={`text-xs ${
                      salesControl.days_until_promise < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {salesControl.days_until_promise < 0
                      ? `${Math.abs(salesControl.days_until_promise)} days overdue`
                      : `${salesControl.days_until_promise} days remaining`}
                  </p>
                )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Total Amount</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(
                  salesControl.total_amount,
                  salesControl.currency || 'COP'
                )}
              </p>
            </div>
          </div>
          {salesControl.lead_time_days && (
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">Lead Time</p>
                <p className="text-sm text-muted-foreground">
                  {salesControl.lead_time_days} days
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Line Breakdown */}
      {salesControl.lines && salesControl.lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product Line Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesControl.lines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {line.product_line_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {line.percentage.toFixed(1)}% of total
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(line.line_amount, salesControl.currency || 'COP')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Information */}
      {salesControl.actual_delivery_date && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Actual Delivery Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(salesControl.actual_delivery_date)}
              </p>
            </div>
            {salesControl.was_delivered_on_time !== null &&
              salesControl.was_delivered_on_time !== undefined && (
                <div>
                  <Badge
                    variant="outline"
                    className={
                      salesControl.was_delivered_on_time
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {salesControl.was_delivered_on_time
                      ? 'Delivered On Time'
                      : 'Delivered Late'}
                  </Badge>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Information */}
      {salesControl.invoice_number && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Invoice Number</p>
              <p className="text-sm text-muted-foreground">
                {salesControl.invoice_number}
              </p>
            </div>
            {salesControl.invoice_date && (
              <div>
                <p className="text-sm font-medium text-slate-900">Invoice Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(salesControl.invoice_date)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      {salesControl.payment_date && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm font-medium text-slate-900">Payment Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(salesControl.payment_date)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {salesControl.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {salesControl.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lifecycle Actions */}
      {!isCancelled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {salesControl.status === SalesControlStatus.PENDING &&
                onMarkInProduction && (
                  <Button
                    onClick={onMarkInProduction}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Mark as In Production
                  </Button>
                )}
              {salesControl.status === SalesControlStatus.IN_PRODUCTION &&
                onMarkDelivered && (
                  <Button
                    onClick={onMarkDelivered}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Mark as Delivered
                  </Button>
                )}
              {salesControl.status === SalesControlStatus.DELIVERED &&
                onMarkInvoiced && (
                  <Button
                    onClick={onMarkInvoiced}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Mark as Invoiced
                  </Button>
                )}
              {salesControl.status === SalesControlStatus.INVOICED && onMarkPaid && (
                <Button
                  onClick={onMarkPaid}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Paid
                </Button>
              )}
              {onCancel && salesControl.status !== SalesControlStatus.PAID && (
                <Button
                  onClick={onCancel}
                  disabled={isLoading}
                  variant="destructive"
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
