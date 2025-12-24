/**
 * Notifications API Client
 * API functions for notification management
 */

import { apiClient } from './client'
import type {
  Notification,
  NotificationListResponse,
  NotificationFilters,
  MarkAsReadRequest,
} from '@/types/notifications'

const BASE_URL = '/api/v1/notifications'

/**
 * Get all notifications with filters
 */
export const getNotifications = async (
  filters?: NotificationFilters
): Promise<NotificationListResponse> => {
  const params = new URLSearchParams()

  if (filters?.is_read !== undefined) {
    params.append('is_read', filters.is_read.toString())
  }
  if (filters?.type) {
    params.append('type', filters.type)
  }
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }
  if (filters?.page_size) {
    params.append('page_size', filters.page_size.toString())
  }

  const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL
  const response = await apiClient.get<NotificationListResponse>(url)
  return response.data
}

/**
 * Get a single notification by ID
 */
export const getNotification = async (id: string): Promise<Notification> => {
  const response = await apiClient.get<Notification>(`${BASE_URL}/${id}`)
  return response.data
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (
  id: string
): Promise<Notification> => {
  const response = await apiClient.patch<Notification>(
    `${BASE_URL}/${id}/read`
  )
  return response.data
}

/**
 * Mark multiple notifications as read
 */
export const markNotificationsAsRead = async (
  ids: string[]
): Promise<void> => {
  const data: MarkAsReadRequest = { notification_ids: ids }
  await apiClient.post(`${BASE_URL}/mark-read`, data)
}

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (): Promise<void> => {
  await apiClient.post(`${BASE_URL}/mark-all-read`)
}

/**
 * Delete a notification
 */
export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`)
}

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get<{ unread_count: number }>(
    `${BASE_URL}/unread-count`
  )
  return response.data.unread_count
}
