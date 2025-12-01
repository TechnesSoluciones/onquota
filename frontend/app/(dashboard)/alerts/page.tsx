'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { AlertTriangle, TrendingDown, TrendingUp, Target, DollarSign, Calendar } from 'lucide-react'
import { useExpenseComparison } from '@/hooks/useExpenseComparison'
import { useSalesComparison } from '@/hooks/useSalesComparison'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Alert {
  id: string
  type: 'warning' | 'danger' | 'success'
  category: 'expenses' | 'sales'
  title: string
  message: string
  value: number
  icon: any
  link: string
}

export default function AlertsDashboardPage() {
  const currentYear = new Date().getFullYear()
  const [alerts, setAlerts] = useState<Alert[]>([])

  const { data: expenseData } = useExpenseComparison({
    year: currentYear,
    comparisonType: 'monthly'
  })

  const { data: salesData } = useSalesComparison({
    year: currentYear,
    comparisonType: 'monthly'
  })

  useEffect(() => {
    const newAlerts: Alert[] = []

    // Expense Alerts
    if (expenseData) {
      if (expenseData.summary.percent_change < -10) {
        newAlerts.push({
          id: 'expense-decrease',
          type: 'warning',
          category: 'expenses',
          title: 'Caída en Gastos',
          message: `Los gastos han disminuido un ${Math.abs(expenseData.summary.percent_change).toFixed(1)}% comparado con el año anterior.`,
          value: expenseData.summary.percent_change,
          icon: TrendingDown,
          link: '/expenses/comparison'
        })
      }

      if (expenseData.summary.percent_change > 20) {
        newAlerts.push({
          id: 'expense-increase',
          type: 'danger',
          category: 'expenses',
          title: 'Incremento Significativo en Gastos',
          message: `Los gastos han aumentado un ${expenseData.summary.percent_change.toFixed(1)}% (${formatCurrency(expenseData.summary.total_actual - expenseData.summary.total_previous, 'DOP')}).`,
          value: expenseData.summary.percent_change,
          icon: AlertTriangle,
          link: '/expenses/comparison'
        })
      }
    }

    // Sales Alerts
    if (salesData) {
      if (salesData.summary.percent_change < -15) {
        newAlerts.push({
          id: 'sales-decrease',
          type: 'danger',
          category: 'sales',
          title: 'Caída Significativa en Ventas',
          message: `Las ventas han disminuido un ${Math.abs(salesData.summary.percent_change).toFixed(1)}% comparado con el año anterior.`,
          value: salesData.summary.percent_change,
          icon: TrendingDown,
          link: '/sales/comparison'
        })
      }

      if (salesData.summary.acceptance_rate < 40) {
        newAlerts.push({
          id: 'low-acceptance',
          type: 'warning',
          category: 'sales',
          title: 'Baja Tasa de Aceptación',
          message: `La tasa de aceptación es de ${salesData.summary.acceptance_rate}%, por debajo del objetivo del 40%.`,
          value: salesData.summary.acceptance_rate,
          icon: Target,
          link: '/sales/comparison'
        })
      }

      if (salesData.summary.percent_change > 25) {
        newAlerts.push({
          id: 'sales-increase',
          type: 'success',
          category: 'sales',
          title: 'Excelente Desempeño en Ventas',
          message: `Las ventas han aumentado un ${salesData.summary.percent_change.toFixed(1)}% (${formatCurrency(salesData.summary.total_actual - salesData.summary.total_previous, 'DOP')}).`,
          value: salesData.summary.percent_change,
          icon: TrendingUp,
          link: '/sales/comparison'
        })
      }
    }

    setAlerts(newAlerts)
  }, [expenseData, salesData])

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          subtext: 'text-red-700',
          icon: 'text-red-600'
        }
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-900',
          subtext: 'text-orange-700',
          icon: 'text-orange-600'
        }
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-900',
          subtext: 'text-green-700',
          icon: 'text-green-600'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-900',
          subtext: 'text-gray-700',
          icon: 'text-gray-600'
        }
    }
  }

  const dangerAlerts = alerts.filter(a => a.type === 'danger')
  const warningAlerts = alerts.filter(a => a.type === 'warning')
  const successAlerts = alerts.filter(a => a.type === 'success')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Alertas</h1>
        <p className="text-muted-foreground">
          Centro de notificaciones y alertas del sistema
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Alertas</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Críticas</p>
              <p className="text-2xl font-bold">{dangerAlerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-orange-100 p-3">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Advertencias</p>
              <p className="text-2xl font-bold">{warningAlerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Positivas</p>
              <p className="text-2xl font-bold">{successAlerts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* No Alerts Message */}
      {alerts.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <div className="rounded-full bg-green-100 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Todo en Orden</h3>
            <p className="text-muted-foreground">
              No hay alertas críticas o advertencias en este momento.
            </p>
          </div>
        </Card>
      )}

      {/* Danger Alerts */}
      {dangerAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Alertas Críticas
          </h2>
          {dangerAlerts.map((alert) => {
            const colors = getAlertColor(alert.type)
            const Icon = alert.icon
            return (
              <Link key={alert.id} href={alert.link}>
                <Card className={`p-4 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${colors.icon} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${colors.text}`}>{alert.title}</h3>
                      <p className={`text-sm ${colors.subtext} mt-1`}>{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Categoría: {alert.category === 'expenses' ? 'Gastos' : 'Ventas'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Advertencias
          </h2>
          {warningAlerts.map((alert) => {
            const colors = getAlertColor(alert.type)
            const Icon = alert.icon
            return (
              <Link key={alert.id} href={alert.link}>
                <Card className={`p-4 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${colors.icon} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${colors.text}`}>{alert.title}</h3>
                      <p className={`text-sm ${colors.subtext} mt-1`}>{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Categoría: {alert.category === 'expenses' ? 'Gastos' : 'Ventas'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Success Alerts */}
      {successAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Buenas Noticias
          </h2>
          {successAlerts.map((alert) => {
            const colors = getAlertColor(alert.type)
            const Icon = alert.icon
            return (
              <Link key={alert.id} href={alert.link}>
                <Card className={`p-4 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${colors.icon} mt-0.5`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${colors.text}`}>{alert.title}</h3>
                      <p className={`text-sm ${colors.subtext} mt-1`}>{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Categoría: {alert.category === 'expenses' ? 'Gastos' : 'Ventas'}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
