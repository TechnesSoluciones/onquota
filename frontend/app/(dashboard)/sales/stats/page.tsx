'use client'

/**
 * Sales Statistics Page V2
 * Displays comprehensive sales/quotes analytics and KPIs
 * Updated with Design System V2
 */

import { PageLayout } from '@/components/layouts'
import { SaleStats } from '@/components/sales/SaleStats'

export default function SalesStatsPage() {
  return (
    <PageLayout
      title="Estadísticas de Ventas"
      description="Análisis y métricas de cotizaciones"
      breadcrumbs={[
        { label: 'Ventas', href: '/sales' },
        { label: 'Estadísticas' }
      ]}
    >
      <SaleStats />
    </PageLayout>
  )
}
