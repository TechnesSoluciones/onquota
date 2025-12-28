/**
 * Notifications Page V2
 * Full-page view for managing all notifications
 * Updated with Design System V2
 */

'use client'

import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { PageLayout } from '@/components/layouts'

export default function NotificationsPage() {
  return (
    <PageLayout
      title="Notificaciones"
      description="Gestiona y revisa todas tus notificaciones"
    >
      <div className="mx-auto max-w-4xl">
        <NotificationCenter />
      </div>
    </PageLayout>
  )
}
