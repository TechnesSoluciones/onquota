/**
 * useNotifications Hook
 * Custom hook for managing notifications state and operations
 * Includes support for real-time updates via Server-Sent Events (SSE)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} from '@/lib/api/notifications'
import type {
  Notification,
  NotificationFilters,
} from '@/types/notifications'

interface UseNotificationsReturn {
  // State
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null

  // Operations
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  remove: (id: string) => Promise<boolean>
  refetch: () => Promise<void>

  // Real-time
  isConnected: boolean
}

export function useNotifications(
  initialFilters?: NotificationFilters,
  enableSSE: boolean = false
): UseNotificationsReturn {
  const { toast } = useToast()

  // Memoize initialFilters to prevent unnecessary re-renders
  const memoizedInitialFilters = useMemo(
    () => initialFilters,
    [JSON.stringify(initialFilters)]
  )

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentFilters, setCurrentFilters] = useState<
    NotificationFilters | undefined
  >(memoizedInitialFilters)
  const eventSourceRef = useRef<EventSource | null>(null)

  /**
   * Fetch notifications with filters
   */
  const fetchNotifications = useCallback(
    async (filters?: NotificationFilters) => {
      setLoading(true)
      setError(null)
      setCurrentFilters(filters)

      try {
        const response = await getNotifications(filters)
        setNotifications(response.items)
        setUnreadCount(response.unread_count)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch notifications'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /**
   * Fetch unread count only
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await markNotificationAsRead(id)
        // Optimistic update
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, is_read: true } : notif
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to mark notification as read'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      // Update all notifications
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true }))
      )
      setUnreadCount(0)
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to mark all notifications as read'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }, [toast])

  /**
   * Delete a notification
   */
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteNotification(id)
        const wasUnread = notifications.find((n) => n.id === id)?.is_read === false
        setNotifications((prev) => prev.filter((notif) => notif.id !== id))
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        toast({
          title: 'Success',
          description: 'Notification deleted',
        })
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete notification'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return false
      }
    },
    [toast, notifications]
  )

  /**
   * Refetch notifications with current filters
   */
  const refetch = useCallback(async () => {
    await fetchNotifications(currentFilters)
  }, [fetchNotifications, currentFilters])

  /**
   * Setup Server-Sent Events for real-time notifications
   */
  useEffect(() => {
    if (!enableSSE) return

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const eventSource = new EventSource(
      `${API_URL}/api/v1/notifications/stream`,
      {
        withCredentials: true,
      }
    )

    eventSource.onopen = () => {
      setIsConnected(true)
      console.log('SSE connection opened')
    }

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data)

        // Add new notification to the list
        setNotifications((prev) => [notification, ...prev])
        setUnreadCount((prev) => prev + 1)

        // Show toast notification
        toast({
          title: notification.title,
          description: notification.message,
        })
      } catch (err) {
        console.error('Failed to parse SSE notification:', err)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setIsConnected(false)
      eventSource.close()
    }

    eventSourceRef.current = eventSource

    // Cleanup on unmount
    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [enableSSE, toast])

  // Initial fetch
  useEffect(() => {
    fetchNotifications(memoizedInitialFilters)
  }, [fetchNotifications, memoizedInitialFilters])

  // Periodic unread count refresh (every 30 seconds)
  useEffect(() => {
    if (!enableSSE) {
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [enableSSE, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    remove,
    refetch,
    isConnected,
  }
}

/**
 * useNotificationBell Hook
 * Lightweight hook for notification bell (unread count only)
 */
interface UseNotificationBellReturn {
  unreadCount: number
  fetchUnreadCount: () => Promise<void>
  markAllAsRead: () => Promise<void>
}

export function useNotificationBell(): UseNotificationBellReturn {
  const { toast } = useToast()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead()
      setUnreadCount(0)
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to mark all notifications as read'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }, [toast])

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Periodic refresh (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  return {
    unreadCount,
    fetchUnreadCount,
    markAllAsRead,
  }
}
