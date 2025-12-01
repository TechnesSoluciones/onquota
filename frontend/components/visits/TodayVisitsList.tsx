/**
 * TodayVisitsList Component
 * Mobile-first list of today's visits with quick actions
 * Features filtering, check-in/out, and navigation
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import {
  Navigation,
  LogIn,
  LogOut,
  MapPin,
  Clock,
  User,
  Filter,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Visit, VisitStatus } from '@/types/visits'
import { cn } from '@/lib/utils'

interface TodayVisitsListProps {
  onCheckIn?: (visitId: string) => void
  onCheckOut?: (visitId: string) => void
  onNavigate?: (visit: Visit) => void
  onRefresh?: () => void
  loading?: boolean
  visits?: Visit[]
}

/**
 * Status configuration for styling
 */
const STATUS_CONFIG: Record<
  VisitStatus,
  {
    label: string
    color: string
    bgColor: string
    icon: any
  }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: Loader2,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
    icon: XCircle,
  },
}

/**
 * Filter options
 */
type FilterType = 'all' | VisitStatus

export function TodayVisitsList({
  onCheckIn,
  onCheckOut,
  onNavigate,
  onRefresh,
  loading = false,
  visits = [],
}: TodayVisitsListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [refreshing, setRefreshing] = useState(false)

  /**
   * Filter today's visits
   */
  const todayVisits = useMemo(() => {
    return visits.filter((visit) => {
      try {
        return isToday(parseISO(visit.scheduled_date))
      } catch {
        return false
      }
    })
  }, [visits])

  /**
   * Apply status filter
   */
  const filteredVisits = useMemo(() => {
    if (filter === 'all') return todayVisits

    return todayVisits.filter((visit) => visit.status === filter)
  }, [todayVisits, filter])

  /**
   * Sort visits by scheduled time
   */
  const sortedVisits = useMemo(() => {
    return [...filteredVisits].sort((a, b) => {
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    })
  }, [filteredVisits])

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return

    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  /**
   * Format time for display
   */
  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'HH:mm')
    } catch {
      return '--:--'
    }
  }

  /**
   * Handle navigation
   */
  const handleNavigate = (visit: Visit) => {
    if (onNavigate) {
      onNavigate(visit)
    } else if (visit.check_in_latitude && visit.check_in_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${visit.check_in_latitude},${visit.check_in_longitude}`
      window.open(url, '_blank')
    }
  }

  /**
   * Check if visit can be checked in
   */
  const canCheckIn = (visit: Visit) => {
    return visit.status === 'SCHEDULED' && onCheckIn
  }

  /**
   * Check if visit can be checked out
   */
  const canCheckOut = (visit: Visit) => {
    return visit.status === 'IN_PROGRESS' && onCheckOut
  }

  /**
   * Get count for each filter
   */
  const getFilterCount = (filterType: FilterType): number => {
    if (filterType === 'all') return todayVisits.length
    return todayVisits.filter((v) => v.status === filterType).length
  }

  /**
   * Render empty state
   */
  if (!loading && todayVisits.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No visits scheduled today
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            You're all clear for today! Check back tomorrow for upcoming visits.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Today's Visits</h2>
          <p className="text-sm text-gray-600">
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs">
            All ({getFilterCount('all')})
          </TabsTrigger>
          <TabsTrigger value="SCHEDULED" className="text-xs">
            Scheduled ({getFilterCount('SCHEDULED')})
          </TabsTrigger>
          <TabsTrigger value="IN_PROGRESS" className="text-xs">
            Active ({getFilterCount('IN_PROGRESS')})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="text-xs">
            Done ({getFilterCount('COMPLETED')})
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" className="text-xs">
            Cancelled ({getFilterCount('CANCELLED')})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Visit List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          </Card>
        ) : sortedVisits.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No visits found
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Try changing your filter to see more visits.
              </p>
            </div>
          </Card>
        ) : (
          sortedVisits.map((visit) => {
            const statusConfig = STATUS_CONFIG[visit.status]
            const StatusIcon = statusConfig.icon

            return (
              <Card
                key={visit.id}
                className={cn(
                  'overflow-hidden border-l-4 transition-shadow hover:shadow-md',
                  statusConfig.bgColor
                )}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {visit.title}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-600">
                        <User className="mr-1.5 h-3.5 w-3.5" />
                        <span>{visit.client_name}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('ml-2', statusConfig.color, statusConfig.bgColor)}
                    >
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Time and Location */}
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="mr-2 h-4 w-4 text-gray-500" />
                      <span className="font-medium">{formatTime(visit.scheduled_date)}</span>
                      {visit.duration_minutes && (
                        <span className="ml-1 text-gray-500">
                          ({visit.duration_minutes} min)
                        </span>
                      )}
                    </div>

                    {visit.check_in_address && (
                      <div className="flex items-start text-sm text-gray-600">
                        <MapPin className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                        <span className="line-clamp-2">{visit.check_in_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {visit.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                      {visit.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Navigate Button */}
                    {(visit.check_in_latitude || visit.check_in_longitude) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate(visit)}
                        className="flex-1 sm:flex-none"
                      >
                        <Navigation className="mr-2 h-4 w-4" />
                        Navigate
                      </Button>
                    )}

                    {/* Check In Button */}
                    {canCheckIn(visit) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onCheckIn!(visit.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Check In
                      </Button>
                    )}

                    {/* Check Out Button */}
                    {canCheckOut(visit) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onCheckOut!(visit.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Check Out
                      </Button>
                    )}
                  </div>

                  {/* Follow-up indicator */}
                  {visit.follow_up_required && visit.status === 'COMPLETED' && (
                    <div className="mt-3 flex items-center rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-700">
                      <AlertCircle className="mr-2 h-3.5 w-3.5" />
                      Follow-up required
                      {visit.follow_up_date && (
                        <span className="ml-1">
                          - {format(parseISO(visit.follow_up_date), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
