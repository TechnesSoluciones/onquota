/**
 * OpportunityCard Component
 * Card component for displaying opportunity information in the Kanban board
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreVertical, Calendar, DollarSign, TrendingUp, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import type { Opportunity } from '@/types/opportunities'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface OpportunityCardProps {
  opportunity: Opportunity
  onEdit: () => void
  onDelete: () => void
  onClick?: () => void
}

export function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
  onClick,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'No date set'
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return date
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown or buttons
    if ((e.target as HTMLElement).closest('[data-dropdown]')) {
      return
    }
    onClick?.()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="group relative cursor-grab rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:cursor-grab hover:shadow-md active:cursor-grabbing"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <h3 className="flex-1 text-sm font-semibold text-gray-900 line-clamp-2">
          {opportunity.name}
        </h3>

        {/* Actions Menu */}
        <div data-dropdown>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Client */}
      <div className="mb-3 flex items-center text-sm text-gray-600">
        <User className="mr-2 h-3.5 w-3.5" />
        <span className="truncate">{opportunity.client_name}</span>
      </div>

      {/* Value */}
      <div className="mb-3 flex items-center text-sm font-medium text-gray-900">
        <DollarSign className="mr-2 h-4 w-4 text-green-600" />
        <span>
          {formatCurrency(opportunity.estimated_value, opportunity.currency)}
        </span>
      </div>

      {/* Probability */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center">
            <TrendingUp className="mr-1 h-3 w-3" />
            <span>Probability</span>
          </div>
          <span className="font-medium">{opportunity.probability}%</span>
        </div>
        <Progress value={opportunity.probability} className="h-1.5" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-3">
        {/* Expected Close Date */}
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          <span>{formatDate(opportunity.expected_close_date)}</span>
        </div>

        {/* Sales Rep Avatar */}
        {opportunity.sales_rep_name && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {getInitials(opportunity.sales_rep_name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
