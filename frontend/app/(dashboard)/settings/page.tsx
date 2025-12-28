/**
 * Settings Overview Page V2
 * Main dashboard for settings with stats, quick access, and recent activity
 * Updated with Design System V2
 */

'use client'

import { StatsCards } from '@/components/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui-v2'
import { PageLayout } from '@/components/layouts'
import { Icon } from '@/components/icons'
import Link from 'next/link'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  // Fetch recent audit logs (last 5)
  const { logs, isLoading: logsLoading } = useAuditLogs({ page_size: 5 })

  // Quick access cards configuration
  const quickAccessCards = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: 'people',
      href: '/settings/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'General Settings',
      description: 'Configure tenant settings and preferences',
      icon: 'settings',
      href: '/settings/general',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Security',
      description: 'Security settings and authentication',
      icon: 'security',
      href: '/settings/security',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and track changes',
      icon: 'description',
      href: '/settings/audit-logs',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  // Format action for display
  const formatAction = (action: string): string => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get action badge variant
  const getActionVariant = (
    action: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('create')) return 'default'
    if (action.includes('update')) return 'secondary'
    if (action.includes('delete')) return 'destructive'
    return 'outline'
  }

  return (
    <PageLayout
      title="Settings"
      description="Manage your system configuration and preferences"
    >
      {/* Stats Cards */}
      <StatsCards />

      {/* Quick Access Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {quickAccessCards.map((card) => {
            return (
              <Link key={card.href} href={card.href}>
                <Card className="group cursor-pointer transition-all hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className={`rounded-lg p-3 ${card.bgColor} transition-transform group-hover:scale-110`}
                      >
                        <Icon name={card.icon} className={`h-6 w-6 ${card.color}`} />
                      </div>
                      <Icon name="arrow_forward" className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                    <CardTitle className="mt-4">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Link
            href="/settings/audit-logs"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest Audit Logs</CardTitle>
            <CardDescription>
              Recent system actions and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="description" className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No hay registros de actividad recientes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionVariant(log.action)}>
                          {formatAction(log.action)}
                        </Badge>
                        {log.resource_type && (
                          <span className="text-sm text-muted-foreground">
                            on {log.resource_type}
                          </span>
                        )}
                      </div>
                      {log.user_email && (
                        <p className="text-sm text-muted-foreground">
                          by {log.user_email}
                        </p>
                      )}
                      {log.description && (
                        <p className="text-sm">{log.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'PPp', {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
