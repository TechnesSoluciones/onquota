/**
 * Notifications Page
 * Full-page view for managing all notifications
 */

import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export const metadata = {
  title: 'Notifications - OnQuota',
  description: 'View and manage your notifications',
}

export default function NotificationsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <NotificationCenter />
        </div>
      </div>
    </div>
  )
}
