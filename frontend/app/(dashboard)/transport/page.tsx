/**
 * Transport Overview Page
 * Main transport management dashboard
 */

'use client'

import { Car, Package, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TransportPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transporte</h1>
        <p className="text-muted-foreground">
          Gestiona tu flota de vehículos y envíos
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicles Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Car className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle>Vehículos</CardTitle>
            <CardDescription>
              Administra tu flota de vehículos, estado y mantenimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/transport/vehicles">
              <Button className="w-full">
                Ver Vehículos
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Shipments Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Envíos</CardTitle>
            <CardDescription>
              Gestiona los envíos, rutas y fletes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/transport/shipments">
              <Button className="w-full">
                Ver Envíos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Transporte</CardTitle>
          <CardDescription>
            Características del sistema de gestión de transporte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Car className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Gestión de Vehículos</h3>
              <p className="text-sm text-muted-foreground">
                Registra y controla tu flota de vehículos, su estado operativo,
                mantenimiento y conductores asignados
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Control de Envíos</h3>
              <p className="text-sm text-muted-foreground">
                Administra los envíos y fletes, rutas, costos y estados de
                entrega
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Seguimiento en Tiempo Real</h3>
              <p className="text-sm text-muted-foreground">
                Monitorea el estado de los envíos y la disponibilidad de los
                vehículos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
