'use client'

/**
 * Main Dashboard Page V2
 * Displays comprehensive overview with KPIs, charts, and widgets
 * Updated with Design System V2
 */

import {
  useDashboardKPIs,
  useRevenueMonthly,
  useExpensesMonthly,
  useTopClients,
  useRecentActivity,
} from '@/hooks/useDashboard'
import { KPICards } from '@/components/dashboard/KPICards'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { ExpensesChart } from '@/components/dashboard/ExpensesChart'
import { TopClientsWidget } from '@/components/dashboard/TopClientsWidget'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { PageLayout } from '@/components/layouts'
import { LoadingState } from '@/components/patterns'
import { Icon } from '@/components/icons'
import { Card } from '@/components/ui-v2'

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()

  // Fetch all dashboard data
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKPIs()
  const { data: revenue, isLoading: revenueLoading, error: revenueError } = useRevenueMonthly(currentYear)
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = useExpensesMonthly(currentYear)
  const { data: topClients, isLoading: clientsLoading, error: clientsError } = useTopClients(5, 'current_year')
  const { data: activity, isLoading: activityLoading, error: activityError} = useRecentActivity(10)

  // Overall loading state
  const isLoading = kpisLoading || revenueLoading || expensesLoading || clientsLoading || activityLoading

  // Check for critical errors (KPIs)
  if (kpisError && !kpisLoading) {
    return (
      <PageLayout
        title="Dashboard"
        description="Vista general del desempeño y métricas de tu equipo"
      >
        <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/20">
          <Icon name="error" className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-error">Error al cargar el dashboard</p>
            <p className="text-sm text-error/80">{kpisError}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Show loading state
  if (isLoading && !kpis) {
    return (
      <PageLayout
        title="Dashboard"
        description="Vista general del desempeño y métricas de tu equipo"
      >
        <LoadingState message="Cargando dashboard..." />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="Dashboard"
      description="Vista general del desempeño y métricas de tu equipo"
      maxWidth="full"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        {kpis && <KPICards kpis={kpis} />}

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Chart */}
          {revenueLoading ? (
            <Card className="flex items-center justify-center h-[400px]">
              <LoadingState message="Cargando ingresos..." />
            </Card>
          ) : revenueError ? (
            <Card className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Icon name="error" className="h-8 w-8 text-error mx-auto mb-2" />
                <p className="text-sm text-error">{revenueError}</p>
              </div>
            </Card>
          ) : revenue ? (
            <RevenueChart data={revenue} />
          ) : null}

          {/* Expenses Chart */}
          {expensesLoading ? (
            <Card className="flex items-center justify-center h-[400px]">
              <LoadingState message="Cargando gastos..." />
            </Card>
          ) : expensesError ? (
            <Card className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Icon name="error" className="h-8 w-8 text-error mx-auto mb-2" />
                <p className="text-sm text-error">{expensesError}</p>
              </div>
            </Card>
          ) : expenses ? (
            <ExpensesChart data={expenses} />
          ) : null}
        </div>

        {/* Widgets Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Clients Widget */}
          {clientsLoading ? (
            <Card className="flex items-center justify-center h-[400px]">
              <LoadingState message="Cargando clientes..." />
            </Card>
          ) : clientsError ? (
            <Card className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Icon name="error" className="h-8 w-8 text-error mx-auto mb-2" />
                <p className="text-sm text-error">{clientsError}</p>
              </div>
            </Card>
          ) : topClients ? (
            <TopClientsWidget data={topClients} />
          ) : null}

          {/* Recent Activity Widget */}
          {activityLoading ? (
            <Card className="flex items-center justify-center h-[400px]">
              <LoadingState message="Cargando actividad..." />
            </Card>
          ) : activityError ? (
            <Card className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Icon name="error" className="h-8 w-8 text-error mx-auto mb-2" />
                <p className="text-sm text-error">{activityError}</p>
              </div>
            </Card>
          ) : activity ? (
            <RecentActivityWidget data={activity} />
          ) : null}
        </div>
      </div>
    </PageLayout>
  )
}
