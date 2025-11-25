/**
 * ShipmentFilters Component
 * Filters for shipment list (status, dates, cities, search)
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
import { ShipmentStatus, SHIPMENT_STATUS_LABELS } from '@/types/transport'
import type { ShipmentFilters as ShipmentFiltersType } from '@/types/transport'

interface ShipmentFiltersProps {
  filters: ShipmentFiltersType
  onFiltersChange: (filters: Partial<ShipmentFiltersType>) => void
  onClearFilters: () => void
}

export function ShipmentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: ShipmentFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const handleSearch = () => {
    onFiltersChange({ search: searchInput || undefined })
  }

  const handleClearSearch = () => {
    setSearchInput('')
    onFiltersChange({ search: undefined })
  }

  const hasActiveFilters =
    filters.status ||
    filters.origin_city ||
    filters.destination_city ||
    filters.scheduled_date_from ||
    filters.scheduled_date_to ||
    filters.search

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de envío o descripción..."
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
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              status: value === 'all' ? undefined : (value as ShipmentStatus),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.values(ShipmentStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {SHIPMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Origin City Filter */}
        <Input
          placeholder="Ciudad de origen"
          value={filters.origin_city || ''}
          onChange={(e) =>
            onFiltersChange({ origin_city: e.target.value || undefined })
          }
          className="w-[180px]"
        />

        {/* Destination City Filter */}
        <Input
          placeholder="Ciudad de destino"
          value={filters.destination_city || ''}
          onChange={(e) =>
            onFiltersChange({ destination_city: e.target.value || undefined })
          }
          className="w-[180px]"
        />

        {/* Date Range */}
        <Input
          type="date"
          placeholder="Fecha desde"
          value={filters.scheduled_date_from || ''}
          onChange={(e) =>
            onFiltersChange({ scheduled_date_from: e.target.value || undefined })
          }
          className="w-[160px]"
        />

        <Input
          type="date"
          placeholder="Fecha hasta"
          value={filters.scheduled_date_to || ''}
          onChange={(e) =>
            onFiltersChange({ scheduled_date_to: e.target.value || undefined })
          }
          className="w-[160px]"
        />

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
