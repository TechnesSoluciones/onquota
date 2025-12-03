/**
 * Settings Layout
 * Admin panel layout with authorization check and navigation tabs
 * Only accessible to ADMIN and SUPER_ADMIN users
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/auth'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Users, Settings as SettingsIcon, FileText } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    // Check authorization after loading completes
    if (!isLoading) {
      const hasAdminAccess =
        user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

      if (!hasAdminAccess) {
        redirect('/dashboard')
      }
    }
  }, [user, isLoading])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Prevent flash of unauthorized content
  const hasAdminAccess =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN

  if (!hasAdminAccess) {
    return null
  }

  // Tab configuration
  const tabs = [
    {
      value: '/settings',
      label: 'Overview',
      icon: Shield,
      exact: true,
    },
    {
      value: '/settings/users',
      label: 'Users',
      icon: Users,
      exact: false,
    },
    {
      value: '/settings/general',
      label: 'General',
      icon: SettingsIcon,
      exact: false,
    },
    {
      value: '/settings/audit-logs',
      label: 'Audit Logs',
      icon: FileText,
      exact: false,
    },
  ]

  // Determine active tab
  const activeTab =
    tabs.find((tab) =>
      tab.exact ? pathname === tab.value : pathname?.startsWith(tab.value)
    )?.value || '/settings'

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings & Administration</h1>
          <p className="text-muted-foreground">
            Manage users, configure system settings, and review audit logs
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link key={tab.value} href={tab.value} passHref legacyBehavior>
                <TabsTrigger
                  value={tab.value}
                  className="flex items-center gap-2"
                  asChild
                >
                  <a>
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </a>
                </TabsTrigger>
              </Link>
            )
          })}
        </TabsList>
      </Tabs>

      {/* Page Content */}
      <div className="mt-6">{children}</div>
    </div>
  )
}
