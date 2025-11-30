'use client'

/**
 * QuotationList Component
 * Displays a table of quotations with filters and actions
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { QuotationStatus } from '@/types/sales'
import type { QuotationListItem } from '@/types/sales'

interface QuotationListProps {
  quotations: QuotationListItem[]
  onEdit: (quotation: QuotationListItem) => void
  onDelete: (quotation: QuotationListItem) => void
  onMarkWon?: (quotation: QuotationListItem) => void
  onMarkLost?: (quotation: QuotationListItem) => void
  isLoading?: boolean
}

const STATUS_CONFIG = {
  [QuotationStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  },
  [QuotationStatus.WON]: {
    label: 'Won',
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
  },
  [QuotationStatus.LOST]: {
    label: 'Lost',
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
  },
}

export function QuotationList({
  quotations,
  onEdit,
  onDelete,
  onMarkWon,
  onMarkLost,
  isLoading = false,
}: QuotationListProps) {
  if (quotations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border">
        <p className="text-muted-foreground">No quotations found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first quotation to get started
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
                Quotation #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date
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
            {quotations.map((quotation) => (
              <tr
                key={quotation.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">
                    {quotation.quotation_number}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">
                    {quotation.client_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {formatDate(quotation.quotation_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                  {formatCurrency(quotation.total_amount, quotation.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant="outline"
                    className={STATUS_CONFIG[quotation.status].className}
                  >
                    {STATUS_CONFIG[quotation.status].label}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    {quotation.status === QuotationStatus.PENDING && (
                      <>
                        {onMarkWon && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkWon(quotation)}
                            disabled={isLoading}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Mark as Won"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {onMarkLost && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkLost(quotation)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Mark as Lost"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(quotation)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(quotation)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
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
