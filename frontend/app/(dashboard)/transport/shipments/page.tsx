/**
 * Shipments List Page
 * Displays all shipments with filtering, pagination, and CRUD operations
 */

'use client'

import { useState } from 'react'
import { Plus, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransportStatusBadge } from '@/components/transport/TransportStatusBadge'
import { ShipmentFilters } from '@/components/transport/ShipmentFilters'
import { CreateShipmentModal } from '@/components/transport/CreateShipmentModal'
import { useShipments } from '@/hooks/useShipments'

export default function ShipmentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const {
    shipments,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useShipments()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Envíos</h1>
          <p className="text-muted-foreground">
            Gestiona los envíos y fletes
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Envío
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra los envíos por estado, ciudad o fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
          />
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Envíos</CardTitle>
          <CardDescription>
            {pagination.total} envío(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-muted-foreground">Cargando envíos...</div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No se encontraron envíos
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear primer envío
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Envío</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Fecha Programada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">
                        {shipment.shipment_number}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {shipment.origin_city}
                          </div>
                          <div className="text-muted-foreground">
                            → {shipment.destination_city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {shipment.client_name || (
                          <span className="text-muted-foreground">
                            Sin cliente
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {shipment.vehicle_plate || (
                          <span className="text-muted-foreground">
                            Sin asignar
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(shipment.scheduled_date).toLocaleDateString(
                          'es-ES'
                        )}
                      </TableCell>
                      <TableCell>
                        <TransportStatusBadge
                          status={shipment.status}
                          type="shipment"
                        />
                      </TableCell>
                      <TableCell>
                        ${shipment.freight_cost.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page === pagination.total_pages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <CreateShipmentModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refresh}
      />
    </div>
  )
}
