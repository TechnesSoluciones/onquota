'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { PlanCard } from './PlanCard'
import { AccountPlanResponse, PlanStatus } from '@/types/accounts'
import { cn } from '@/lib/utils'

interface PlanListProps {
  plans: (AccountPlanResponse & {
    milestones_count?: number
    completed_milestones?: number
  })[]
  isLoading?: boolean
  onSearch?: (query: string) => void
  onFilterStatus?: (status: PlanStatus | 'all') => void
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function PlanList({
  plans,
  isLoading = false,
  onSearch,
  onFilterStatus,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: PlanListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    onSearch?.('')
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    onFilterStatus?.(value === 'all' ? 'all' : (value as PlanStatus))
  }

  // Loading skeletons
  const renderSkeletons = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[280px] animate-pulse rounded-lg border bg-muted"
        />
      ))}
    </>
  )

  // Empty state
  const renderEmptyState = () => (
    <div className="col-span-full flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Search className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">No plans found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {searchQuery || statusFilter !== 'all'
          ? 'Try adjusting your filters to find what you are looking for.'
          : 'Get started by creating your first account plan.'}
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={PlanStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={PlanStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={PlanStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={PlanStatus.CANCELLED}>Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {renderSkeletons()}
        </div>
      ) : plans.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange?.(page)}
                className={cn(
                  'h-9 w-9',
                  page === currentPage && 'pointer-events-none'
                )}
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
