'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import {
  FileText,
  CheckCircle,
  UserPlus,
  Activity as ActivityIcon,
} from 'lucide-react'
import type { RecentActivityData, ActivityEvent } from '@/types/dashboard'

interface RecentActivityWidgetProps {
  data: RecentActivityData
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'quote_created':
    case 'quote_accepted':
      return FileText
    case 'expense_approved':
      return CheckCircle
    case 'client_created':
      return UserPlus
    default:
      return ActivityIcon
  }
}

/**
 * Get color for activity type
 */
function getActivityColor(type: ActivityEvent['type']) {
  switch (type) {
    case 'quote_created':
      return 'bg-blue-100 text-blue-700'
    case 'quote_accepted':
      return 'bg-green-100 text-green-700'
    case 'expense_approved':
      return 'bg-purple-100 text-purple-700'
    case 'client_created':
      return 'bg-orange-100 text-orange-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

/**
 * Recent Activity Widget
 * Timeline of recent system events
 */
export function RecentActivityWidget({ data }: RecentActivityWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Últimos {data.events.length} eventos del sistema
        </p>
      </CardHeader>
      <CardContent>
        {data.events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay actividad reciente
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {data.events.map((event) => {
              const Icon = getActivityIcon(event.type)
              const colorClass = getActivityColor(event.type)

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${colorClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
