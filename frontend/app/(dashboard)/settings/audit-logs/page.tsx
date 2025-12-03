/**
 * Audit Logs Page
 * View system activity and track changes with statistics
 */

'use client'

import { AuditLogsTable } from '@/components/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuditStats } from '@/hooks/useAuditLogs'
import { FileText, Calendar, TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AuditLogsPage() {
  const { stats, isLoading } = useAuditStats()

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Logs',
      value: stats?.total_audit_logs || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Actions Today',
      value: stats?.actions_today || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Actions This Week',
      value: stats?.actions_this_week || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          View system activity and track changes
        </p>
      </div>

      {/* Mini Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">
                    {card.value.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Top Actions Card */}
      {stats?.top_actions && stats.top_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Frequent Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.top_actions.slice(0, 5).map((action, index) => (
                  <div
                    key={`${action.action}-${index}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm font-medium capitalize">
                      {action.action.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {action.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <AuditLogsTable />
    </div>
  )
}
