/**
 * NotificationBell Component
 * Notification bell icon with badge and dropdown
 */

'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from './NotificationDropdown'
import { useNotificationBell } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { unreadCount } = useNotificationBell()

  return (
    <NotificationDropdown open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <>
            {/* Badge */}
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
            {/* Pulse Animation */}
            <span className="absolute -right-1 -top-1 h-5 w-5 animate-ping rounded-full bg-red-600 opacity-75" />
          </>
        )}
      </Button>
    </NotificationDropdown>
  )
}
