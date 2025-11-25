'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  INDUSTRY_LABELS
} from '@/constants/client'
import { ClientStatus, ClientType, Industry } from '@/types/client'
import { Search, X } from 'lucide-react'
import type { ClientFilters as Filters } from '@/types/client'

interface ClientFiltersProps {
  filters: Filters
  onFilterChange: (filters: Partial<Filters>) => void
  onClear: () => void
}

export function ClientFilters({ filters, onFilterChange, onClear }: ClientFiltersProps) {
  const [search, setSearch] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilterChange({ search: search || undefined })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtros</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nombre, email, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ status: undefined })
              } else {
                onFilterChange({ status: value as ClientStatus })
              }
            }}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.values(ClientStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {CLIENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label htmlFor="client_type">Tipo</Label>
          <Select
            value={filters.client_type || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ client_type: undefined })
              } else {
                onFilterChange({ client_type: value as ClientType })
              }
            }}
          >
            <SelectTrigger id="client_type">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.values(ClientType).map((type) => (
                <SelectItem key={type} value={type}>
                  {CLIENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industria */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industria</Label>
          <Select
            value={filters.industry || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ industry: undefined })
              } else {
                onFilterChange({ industry: value as Industry })
              }
            }}
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.values(Industry).map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {INDUSTRY_LABELS[industry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón buscar */}
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button type="submit" className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
        </div>
      </form>
    </div>
  )
}
