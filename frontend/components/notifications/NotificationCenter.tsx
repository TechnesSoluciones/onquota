/**
 * NotificationCenter Component
 * Full-page notification center with filtering and pagination
 */

'use client'

import { useState } from 'react'
import { RefreshCw, Check, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NotificationItem } from './NotificationItem'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationType } from '@/types/notifications'
import { cn } from '@/lib/utils'

export function NotificationCenter() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all')

  const filterParams =
    filter === 'unread'
      ? { is_read: false, type: typeFilter !== 'all' ? typeFilter : undefined }
      : { type: typeFilter !== 'all' ? typeFilter : undefined }

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    remove,
    refetch,
  } = useNotifications(filterParams)

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    await refetch()
  }

  const handleFilterChange = (value: 'all' | 'unread') => {
    setFilter(value)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as NotificationType | 'all')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              You have {unreadCount} unread{' '}
              {unreadCount === 1 ? 'notification' : 'notifications'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={handleFilterChange as any}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={NotificationType.INFO}>Info</SelectItem>
            <SelectItem value={NotificationType.SUCCESS}>Success</SelectItem>
            <SelectItem value={NotificationType.WARNING}>Warning</SelectItem>
            <SelectItem value={NotificationType.ERROR}>Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-gray-600">Loading notifications...</p>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
              <Check className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              All caught up!
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications to show'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
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
  )
}
