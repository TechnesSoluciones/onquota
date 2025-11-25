/**
 * Vehicles List Page
 * Displays all vehicles with filtering, pagination, and CRUD operations
 */

'use client'

import { useState } from 'react'
import { Plus, Truck } from 'lucide-react'
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
import { VehicleFilters } from '@/components/transport/VehicleFilters'
import { CreateVehicleModal } from '@/components/transport/CreateVehicleModal'
import { useVehicles } from '@/hooks/useVehicles'

export default function VehiclesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const {
    vehicles,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  } = useVehicles()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-muted-foreground">
            Gestiona la flota de vehículos y su mantenimiento
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Vehículo
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra los vehículos por estado, tipo o búsqueda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
          />
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vehículos</CardTitle>
          <CardDescription>
            {pagination.total} vehículo(s) encontrado(s)
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
              <div className="text-muted-foreground">Cargando vehículos...</div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Truck className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No se encontraron vehículos
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar primer vehículo
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Kilometraje</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.plate_number}
                      </TableCell>
                      <TableCell>
                        {vehicle.brand} {vehicle.model}
                        {vehicle.year && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({vehicle.year})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {vehicle.vehicle_type}
                      </TableCell>
                      <TableCell>
                        <TransportStatusBadge
                          status={vehicle.status}
                          type="vehicle"
                        />
                      </TableCell>
                      <TableCell>
                        {vehicle.driver_name || (
                          <span className="text-muted-foreground">
                            Sin asignar
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.capacity_kg ? (
                          `${vehicle.capacity_kg} kg`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vehicle.mileage_km ? (
                          `${vehicle.mileage_km} km`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
      <CreateVehicleModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={refresh}
      />
    </div>
  )
}
