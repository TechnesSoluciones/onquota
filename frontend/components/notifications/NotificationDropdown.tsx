/**
 * NotificationDropdown Component
 * Popover dropdown showing recent notifications
 */

import { useRouter } from 'next/navigation'
import { Check, ExternalLink, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { NotificationItem } from './NotificationItem'
import { useNotifications } from '@/hooks/useNotifications'

interface NotificationDropdownProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function NotificationDropdown({
  children,
  open,
  onOpenChange,
}: NotificationDropdownProps) {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    remove,
  } = useNotifications({ page: 1, page_size: 5 })

  const recentNotifications = notifications.slice(0, 5)

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  const handleViewAll = () => {
    onOpenChange?.(false)
    router.push('/notifications')
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-600">
                {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-2 text-xs text-gray-600">
                  Loading notifications...
                </p>
              </div>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-gray-400">
              <Inbox className="h-8 w-8" />
              <p className="mt-2 text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  onDelete={() => remove(notification.id)}
                  showDelete
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={handleViewAll}
              >
                View all notifications
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
