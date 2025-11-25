'use client'

import { Button } from '@/components/ui/button'
import { SaleStats } from '@/components/sales/SaleStats'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Sales statistics page
 * Displays comprehensive sales/quotes analytics and KPIs
 */
export default function SalesStatsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Estadísticas de Ventas</h1>
            <p className="text-muted-foreground">
              Análisis y métricas de cotizaciones
            </p>
          </div>
        </div>
      </div>

      {/* Stats Component */}
      <SaleStats />
    </div>
  )
}
