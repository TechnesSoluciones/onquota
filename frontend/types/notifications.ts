/**
 * Notification Types
 * TypeScript types for notification system
 */

/**
 * Notification type enum
 */
export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Notification type configuration
 */
export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  {
    label: string
    color: string
    bgColor: string
    iconColor: string
  }
> = {
  [NotificationType.INFO]: {
    label: 'Info',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  [NotificationType.WARNING]: {
    label: 'Warning',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  [NotificationType.SUCCESS]: {
    label: 'Success',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  [NotificationType.ERROR]: {
    label: 'Error',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
  },
}

/**
 * Notification response
 */
export interface NotificationResponse {
  id: string
  title: string
  message: string
  type: NotificationType
  action_url?: string | null
  is_read: boolean
  read_at?: string | null
  created_at: string
}

/**
 * Paginated notification list response
 */
export interface NotificationListResponse {
  items: NotificationResponse[]
  total: number
  page: number
  page_size: number
  pages: number
  unread_count: number
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  is_read?: boolean
  type?: NotificationType
  page?: number
  page_size?: number
}

/**
 * Mark as read request
 */
export interface MarkAsReadRequest {
  notification_ids: string[]
}

/**
 * Alias for NotificationResponse
 */
export type Notification = NotificationResponse
