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
import { Search, X, Filter } from 'lucide-react'
import type { SPASearchParams, SPAStatus } from '@/types/spa'

interface SPAFiltersProps {
  filters: SPASearchParams
  onFilterChange: (filters: Partial<SPASearchParams>) => void
  onClear: () => void
}

export function SPAFilters({ filters, onFilterChange, onClear }: SPAFiltersProps) {
  const [search, setSearch] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilterChange({ search: search || undefined })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Filtros</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      </div>

      <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Artículo, descripción, BPID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* BPID */}
        <div className="space-y-2">
          <Label htmlFor="bpid">BPID</Label>
          <Input
            id="bpid"
            placeholder="Ej: BP001"
            value={filters.bpid || ''}
            onChange={(e) => onFilterChange({ bpid: e.target.value || undefined })}
          />
        </div>

        {/* Article Number */}
        <div className="space-y-2">
          <Label htmlFor="article_number">Número de artículo</Label>
          <Input
            id="article_number"
            placeholder="Ej: ART-001"
            value={filters.article_number || ''}
            onChange={(e) => onFilterChange({ article_number: e.target.value || undefined })}
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ status: undefined })
              } else {
                onFilterChange({ status: value as SPAStatus })
              }
            }}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Only */}
        <div className="space-y-2">
          <Label htmlFor="is_active">Vigencia</Label>
          <Select
            value={
              filters.is_active === undefined
                ? 'all'
                : filters.is_active
                ? 'active'
                : 'inactive'
            }
            onValueChange={(value) => {
              if (value === 'all') {
                onFilterChange({ is_active: undefined })
              } else {
                onFilterChange({ is_active: value === 'active' })
              }
            }}
          >
            <SelectTrigger id="is_active">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Vigentes</SelectItem>
              <SelectItem value="inactive">No vigentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </form>
    </div>
  )
}
