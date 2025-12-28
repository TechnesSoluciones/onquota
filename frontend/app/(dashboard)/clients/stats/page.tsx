/**
 * Client Statistics Page V2
 * Analytics and summary of client portfolio
 * Updated with Design System V2
 */

import { ClientStats } from '@/components/clients/ClientStats'
import { PageLayout } from '@/components/layouts'

export default function ClientStatsPage() {
  return (
    <PageLayout
      title="Estadísticas de Clientes"
      description="Resumen y análisis de tu cartera de clientes"
      backLink="/clients"
    >
      <ClientStats />
    </PageLayout>
  )
}
