'use client'

/**
 * SalesControlList Component
 * Displays a table of sales controls with filters and actions
 */

import { Button } from '@/components/ui/button'
import { Edit, Eye } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SalesControlStatusBadge } from './SalesControlStatusBadge'
import type { SalesControlListItem } from '@/types/sales'

interface SalesControlListProps {
  salesControls: SalesControlListItem[]
  onView: (salesControl: SalesControlListItem) => void
  onEdit: (salesControl: SalesControlListItem) => void
  isLoading?: boolean
}

export function SalesControlList({
  salesControls,
  onView,
  onEdit,
  isLoading = false,
}: SalesControlListProps) {
  if (salesControls.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-muted-foreground">No sales controls found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first sales control to get started
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Folio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                PO Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sales Rep
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Promise Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {salesControls.map((control) => (
              <tr
                key={control.id}
                className={`hover:bg-slate-50 transition-colors ${
                  control.is_overdue ? 'bg-red-50/30' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">
                    {control.folio_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(control.po_reception_date)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {control.po_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {control.client_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {control.sales_rep_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {control.promise_date ? (
                    <div>
                      <div className="text-sm text-slate-900">
                        {formatDate(control.promise_date)}
                      </div>
                      {control.days_until_promise !== null &&
                        control.days_until_promise !== undefined && (
                          <div
                            className={`text-xs ${
                              control.days_until_promise < 0
                                ? 'text-red-600'
                                : control.days_until_promise <= 7
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {control.days_until_promise < 0
                              ? `${Math.abs(control.days_until_promise)} days overdue`
                              : control.days_until_promise === 0
                              ? 'Due today'
                              : `${control.days_until_promise} days left`}
                          </div>
                        )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                  {formatCurrency(control.total_amount, control.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <SalesControlStatusBadge
                    status={control.status}
                    isOverdue={control.is_overdue}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(control)}
                      disabled={isLoading}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(control)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
