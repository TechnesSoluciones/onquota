/**
 * Dashboard Layout
 * Main layout wrapper for all dashboard pages
 * Includes sidebar and header navigation
 */

import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export const metadata = {
  title: 'Dashboard - OnQuota',
  description: 'Main dashboard for OnQuota sales management platform',
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar - Fixed left navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header - Sticky top navigation */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
