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
import { EXPENSE_STATUS, EXPENSE_STATUS_LABELS, EXPENSE_CATEGORIES } from '@/constants/expense-status'
import { Search, X } from 'lucide-react'
import type { ExpenseFilters as Filters, ExpenseStatus } from '@/types/expense'

interface ExpenseFiltersProps {
  filters: Filters
  onFilterChange: (filters: Partial<Filters>) => void
  onClear: () => void
}

export function ExpenseFilters({ filters, onFilterChange, onClear }: ExpenseFiltersProps) {
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

      <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Descripción, proveedor..."
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
                onFilterChange({ status: value as ExpenseStatus })
              }
            }}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(EXPENSE_STATUS).map(([, value]) => (
                <SelectItem key={value} value={value}>
                  {EXPENSE_STATUS_LABELS[value as keyof typeof EXPENSE_STATUS_LABELS]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={filters.category_id || 'all'}
            onValueChange={(value) =>
              onFilterChange({ category_id: value === 'all' ? undefined : value })
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fecha desde */}
        <div className="space-y-2">
          <Label htmlFor="date_from">Desde</Label>
          <Input
            id="date_from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onFilterChange({ date_from: e.target.value || undefined })}
          />
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
