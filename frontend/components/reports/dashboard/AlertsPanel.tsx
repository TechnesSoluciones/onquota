/**
 * AlertsPanel Component
 * Displays automated alerts based on KPIs and thresholds
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardAlert } from '@/types/reports'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertsPanelProps {
  alerts: DashboardAlert[]
  isLoading?: boolean
  className?: string
}

export function AlertsPanel({ alerts, isLoading = false, className }: AlertsPanelProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // FIX: Defensive validation - check that alerts exists AND is empty
  if (!alerts || alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay alertas activas</p>
            <p className="text-xs mt-1">Todos los indicadores están dentro de los parámetros normales</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSeverityIcon = (severity: DashboardAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: DashboardAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-950'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950'
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950'
    }
  }

  const getSeverityBadgeVariant = (severity: DashboardAlert['severity']): 'destructive' | 'default' | 'secondary' => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'default'
      case 'info':
      default:
        return 'secondary'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Alertas</CardTitle>
          <Badge variant="outline">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={cn(
                'flex gap-3 p-3 rounded-lg border',
                getSeverityColor(alert.severity)
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getSeverityIcon(alert.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{alert.title}</h4>
                  <Badge variant={getSeverityBadgeVariant(alert.severity)} className="text-xs">
                    {alert.severity === 'critical' && 'Crítico'}
                    {alert.severity === 'warning' && 'Advertencia'}
                    {alert.severity === 'info' && 'Info'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {alert.message}
                </p>
                {(alert.metric_value || alert.threshold) && (
                  <div className="flex gap-4 text-xs">
                    {alert.metric_value && (
                      <div>
                        <span className="text-muted-foreground">Valor actual: </span>
                        <span className="font-medium">{alert.metric_value}</span>
                      </div>
                    )}
                    {alert.threshold && (
                      <div>
                        <span className="text-muted-foreground">Umbral: </span>
                        <span className="font-medium">{alert.threshold}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
