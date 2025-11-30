'use client'

/**
 * SalesControlStatusBadge Component
 * Badge component for sales control status with color coding
 */

import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { SalesControlStatus } from '@/types/sales'

interface SalesControlStatusBadgeProps {
  status: SalesControlStatus
  isOverdue?: boolean
  className?: string
}

const STATUS_CONFIG = {
  [SalesControlStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  },
  [SalesControlStatus.IN_PRODUCTION]: {
    label: 'In Production',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  },
  [SalesControlStatus.DELIVERED]: {
    label: 'Delivered',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  },
  [SalesControlStatus.INVOICED]: {
    label: 'Invoiced',
    className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  },
  [SalesControlStatus.PAID]: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
  },
  [SalesControlStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
  },
}

export function SalesControlStatusBadge({
  status,
  isOverdue = false,
  className = '',
}: SalesControlStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${config.className} ${className}`}>
        {config.label}
      </Badge>
      {isOverdue && status !== SalesControlStatus.PAID && (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 hover:bg-red-200"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      )}
    </div>
  )
}
