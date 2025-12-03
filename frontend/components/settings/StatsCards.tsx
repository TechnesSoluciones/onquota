'use client'

import { useSystemStats } from '@/hooks/useAdminSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  Activity,
  UserPlus,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  iconColor?: string
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

/**
 * StatCard Component
 * Individual stat card with icon and value
 */
function StatCard({ title, value, icon, iconColor, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            iconColor || 'bg-slate-100 text-slate-600'
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs mt-2',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            <TrendingUp
              className={cn('h-3 w-3', !trend.isPositive && 'rotate-180')}
            />
            <span>
              {trend.isPositive ? '+' : ''}
              {trend.value}% vs mes anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * TopActionsCard Component
 * Card showing top actions with badge list
 */
function TopActionsCard({
  actions,
}: {
  actions: Array<{ action: string; count: number }>
}) {
  const formatActionLabel = (action: string): string => {
    const parts = action.split('.')
    if (parts.length === 2) {
      const [resource, actionType] = parts
      const actionLabels: Record<string, string> = {
        created: 'Creado',
        updated: 'Actualizado',
        deleted: 'Eliminado',
        login: 'Login',
        logout: 'Logout',
      }
      return `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${
        actionLabels[actionType] || actionType
      }`
    }
    return action
  }

  const getActionColor = (action: string): string => {
    if (action.includes('created')) return 'bg-green-100 text-green-800 border-green-200'
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (action.includes('deleted')) return 'bg-red-100 text-red-800 border-red-200'
    if (action.includes('login')) return 'bg-purple-100 text-purple-800 border-purple-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Acciones Más Frecuentes
        </CardTitle>
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
          <TrendingUp className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay acciones registradas</p>
        ) : (
          <div className="space-y-2">
            {actions.map((item, index) => (
              <div
                key={item.action}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground w-4">
                    {index + 1}.
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-xs truncate', getActionColor(item.action))}
                  >
                    {formatActionLabel(item.action)}
                  </Badge>
                </div>
                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * UserRolesCard Component
 * Card showing user distribution by role
 */
function UserRolesCard({ usersByRole }: { usersByRole: Record<string, number> }) {
  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    sales_rep: 'Vendedor',
    supervisor: 'Supervisor',
    analyst: 'Analista',
  }

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-500',
    admin: 'bg-blue-500',
    sales_rep: 'bg-green-500',
    supervisor: 'bg-yellow-500',
    analyst: 'bg-gray-500',
  }

  const roles = Object.entries(usersByRole).sort((a, b) => b[1] - a[1])
  const totalUsers = roles.reduce((sum, [, count]) => sum + count, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Usuarios por Rol
        </CardTitle>
        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600">
          <Users className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay usuarios</p>
        ) : (
          <div className="space-y-3">
            {roles.map(([role, count]) => {
              const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0
              return (
                <div key={role} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {roleLabels[role] || role}
                    </span>
                    <span className="text-muted-foreground">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', roleColors[role] || 'bg-gray-500')}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * StatsCards Component
 * Grid of statistics cards for admin dashboard
 *
 * Features:
 * - User statistics (total, active, new users)
 * - Audit log statistics
 * - Top actions list
 * - User distribution by role
 * - Loading skeletons
 * - Error handling
 */
export function StatsCards() {
  const { stats, isLoading, error, refresh } = useSystemStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="p-4 bg-red-50 border-l-4 border-red-500 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Error al cargar estadísticas</p>
              <p className="text-sm text-red-700">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const { user_stats, total_audit_logs, actions_today, actions_this_week, top_actions } =
    stats

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Users */}
        <StatCard
          title="Total de Usuarios"
          value={user_stats.total_users}
          icon={<Users className="h-4 w-4" />}
          iconColor="bg-blue-100 text-blue-600"
          description="Usuarios registrados en el sistema"
        />

        {/* Active Users */}
        <StatCard
          title="Usuarios Activos"
          value={user_stats.active_users}
          icon={<UserCheck className="h-4 w-4" />}
          iconColor="bg-green-100 text-green-600"
          description={`${user_stats.inactive_users} inactivos`}
        />

        {/* Recent Logins */}
        <StatCard
          title="Logins Recientes"
          value={user_stats.recent_logins}
          icon={<Activity className="h-4 w-4" />}
          iconColor="bg-purple-100 text-purple-600"
          description="Últimos 7 días"
        />

        {/* New Users This Month */}
        <StatCard
          title="Nuevos Usuarios (Este Mes)"
          value={user_stats.new_users_this_month}
          icon={<UserPlus className="h-4 w-4" />}
          iconColor="bg-indigo-100 text-indigo-600"
          description="Usuarios creados este mes"
        />

        {/* Audit Logs Today */}
        <StatCard
          title="Acciones Hoy"
          value={actions_today}
          icon={<FileText className="h-4 w-4" />}
          iconColor="bg-orange-100 text-orange-600"
          description={`${actions_this_week} esta semana`}
        />

        {/* Total Audit Logs */}
        <StatCard
          title="Total de Logs"
          value={total_audit_logs.toLocaleString()}
          icon={<FileText className="h-4 w-4" />}
          iconColor="bg-slate-100 text-slate-600"
          description="Logs de auditoría totales"
        />
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Actions */}
        <TopActionsCard actions={top_actions.slice(0, 5)} />

        {/* Users by Role */}
        <UserRolesCard usersByRole={user_stats.users_by_role} />
      </div>
    </div>
  )
}
