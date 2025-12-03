'use client'

import { memo } from 'react'
import { SaleStatus } from '@/types/quote'
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS } from '@/constants/sales'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: SaleStatus
  className?: string
}

/**
 * Badge component for displaying quote status
 * Shows localized label with appropriate color
 */
const StatusBadgeComponent = ({ status, className }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        SALE_STATUS_COLORS[status],
        className
      )}
    >
      {SALE_STATUS_LABELS[status]}
    </span>
  )
}

// Memoize component to prevent unnecessary re-renders
export const StatusBadge = memo(StatusBadgeComponent)
StatusBadge.displayName = 'StatusBadge'
