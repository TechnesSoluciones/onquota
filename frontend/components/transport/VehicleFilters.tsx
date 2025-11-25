/**
 * VehicleFilters Component
 * Filters for vehicle list (status, type, search)
 */

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { VehicleStatus, VehicleType } from '@/types/transport'
import type { VehicleFilters as VehicleFiltersType } from '@/types/transport'

interface VehicleFiltersProps {
  filters: VehicleFiltersType
  onFiltersChange: (filters: Partial<VehicleFiltersType>) => void
  onClearFilters: () => void
}

const VEHICLE_TYPE_LABELS = {
  [VehicleType.CAR]: 'Auto',
  [VehicleType.VAN]: 'Van',
  [VehicleType.TRUCK]: 'Camión',
  [VehicleType.MOTORCYCLE]: 'Motocicleta',
  [VehicleType.OTHER]: 'Otro',
}

const VEHICLE_STATUS_LABELS = {
  [VehicleStatus.ACTIVE]: 'Activo',
  [VehicleStatus.MAINTENANCE]: 'Mantenimiento',
  [VehicleStatus.INACTIVE]: 'Inactivo',
}

export function VehicleFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: VehicleFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const handleSearch = () => {
    onFiltersChange({ search: searchInput || undefined })
  }

  const handleClearSearch = () => {
    setSearchInput('')
    onFiltersChange({ search: undefined })
  }

  const hasActiveFilters =
    filters.status || filters.vehicle_type || filters.search

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, marca o modelo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
            className="pl-9"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button onClick={handleSearch}>
          Buscar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              status: value === 'all' ? undefined : (value as VehicleStatus),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.values(VehicleStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {VEHICLE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Vehicle Type Filter */}
        <Select
          value={filters.vehicle_type || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              vehicle_type: value === 'all' ? undefined : (value as VehicleType),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de vehículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.values(VehicleType).map((type) => (
              <SelectItem key={type} value={type}>
                {VEHICLE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
