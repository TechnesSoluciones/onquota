/**
 * NotificationItem Component
 * Individual notification item with icon, message, and actions
 */

import { useRouter } from 'next/navigation'
import { Info, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notifications'
import { NOTIFICATION_TYPE_CONFIG } from '@/types/notifications'
import { formatDistanceToNow } from 'date-fns'

interface NotificationItemProps {
  notification: Notification
  onRead: () => void
  onDelete?: () => void
  showDelete?: boolean
}

const ICON_MAP: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle,
  ERROR: XCircle,
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  showDelete = false,
}: NotificationItemProps) {
  const router = useRouter()
  const config = NOTIFICATION_TYPE_CONFIG[notification.type]
  const Icon = ICON_MAP[notification.type]

  const handleClick = () => {
    // Mark as read
    if (!notification.is_read) {
      onRead()
    }

    // Navigate if action_url is provided
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return date
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex gap-3 rounded-lg border p-4 transition-colors',
        notification.action_url && 'cursor-pointer hover:bg-gray-50',
        !notification.is_read && 'bg-blue-50/50 border-blue-200',
        notification.is_read && 'bg-white border-gray-200'
      )}
    >
      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
          config.bgColor
        )}
      >
        <Icon className={cn('h-5 w-5', config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm font-semibold',
              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
            )}
          >
            {notification.title}
          </h4>
          {showDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-gray-500">
          {formatTime(notification.created_at)}
        </p>
      </div>
    </div>
  )
}
