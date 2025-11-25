'use client'

/**
 * Header Component
 * Sticky header with notifications and user menu
 * Positioned at the top of the main content area
 */

import { NotificationBell } from '@/components/notifications/NotificationBell'
import UserMenu from './UserMenu'

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Dashboard' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      {/* Left Section - Title/Breadcrumb */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      {/* Right Section - Notifications and User Menu */}
      <div className="flex items-center gap-4">
        {/* Notification Bell with Dropdown */}
        <NotificationBell />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  )
}
