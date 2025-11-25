'use client'

import { ClientStats } from '@/components/clients/ClientStats'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function ClientStatsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Estadísticas de Clientes</h1>
            <p className="text-muted-foreground">
              Resumen y análisis de tu cartera de clientes
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <ClientStats />
    </div>
  )
}
