'use client'

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
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * Main Dashboard Page
 * Displays comprehensive overview with KPIs, charts, and widgets
 */
export default function DashboardPage() {
  const currentYear = new Date().getFullYear()

  // Fetch all dashboard data
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useDashboardKPIs()
  const { data: revenue, isLoading: revenueLoading, error: revenueError } = useRevenueMonthly(currentYear)
  const { data: expenses, isLoading: expensesLoading, error: expensesError } = useExpensesMonthly(currentYear)
  const { data: topClients, isLoading: clientsLoading, error: clientsError } = useTopClients(5, 'current_year')
  const { data: activity, isLoading: activityLoading, error: activityError } = useRecentActivity(10)

  // Overall loading state
  const isLoading = kpisLoading || revenueLoading || expensesLoading || clientsLoading || activityLoading

  // Check for critical errors (KPIs)
  if (kpisError && !kpisLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general del desempeño y métricas de tu equipo
          </p>
        </div>
        <div className="flex items-center gap-3 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error al cargar el dashboard</p>
            <p className="text-sm text-red-700">{kpisError}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading && !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Vista general del desempeño y métricas de tu equipo
        </p>
      </div>

      {/* KPI Cards */}
      {kpis && <KPICards kpis={kpis} />}

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        {revenueLoading ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : revenueError ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <p className="text-sm text-red-600">{revenueError}</p>
          </div>
        ) : revenue ? (
          <RevenueChart data={revenue} />
        ) : null}

        {/* Expenses Chart */}
        {expensesLoading ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : expensesError ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <p className="text-sm text-red-600">{expensesError}</p>
          </div>
        ) : expenses ? (
          <ExpensesChart data={expenses} />
        ) : null}
      </div>

      {/* Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Clients Widget */}
        {clientsLoading ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : clientsError ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <p className="text-sm text-red-600">{clientsError}</p>
          </div>
        ) : topClients ? (
          <TopClientsWidget data={topClients} />
        ) : null}

        {/* Recent Activity Widget */}
        {activityLoading ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activityError ? (
          <div className="flex items-center justify-center h-[400px] border rounded-lg">
            <p className="text-sm text-red-600">{activityError}</p>
          </div>
        ) : activity ? (
          <RecentActivityWidget data={activity} />
        ) : null}
      </div>
    </div>
  )
}
