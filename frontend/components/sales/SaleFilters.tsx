'use client'

import { useState, useEffect } from 'react'
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
import { SALE_STATUS_LABELS } from '@/constants/sales'
import { SaleStatus, type QuoteFilters } from '@/types/quote'
import { clientsApi } from '@/lib/api/clients'
import { useToast } from '@/hooks/use-toast'
import { Search, X, Loader2 } from 'lucide-react'
import type { ClientResponse } from '@/types/client'

interface SaleFiltersProps {
  filters: QuoteFilters
  onFilterChange: (filters: Partial<QuoteFilters>) => void
  onClear: () => void
}

/**
 * Filters component for sales/quotes
 * Supports filtering by status, client, date range, and search
 */
export function SaleFilters({
  filters,
  onFilterChange,
  onClear,
}: SaleFiltersProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState(filters.search || '')
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Load clients when component mounts
  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const response = await clientsApi.getClients({ page_size: 1000 })
        setClients(response.items)
      } catch (error) {
        console.error('Error loading clients:', error)
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los clientes',
          variant: 'destructive',
        })
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [toast])

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

      <form
        onSubmit={handleSearchSubmit}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Búsqueda */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search"
              placeholder="# cotización, cliente..."
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
                onFilterChange({ status: value as SaleStatus })
              }
            }}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.values(SaleStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {SALE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <Label htmlFor="client">Cliente</Label>
          <Select
            value={filters.client_id || 'all'}
            onValueChange={(value) =>
              onFilterChange({ client_id: value === 'all' ? undefined : value })
            }
            disabled={loadingClients}
          >
            <SelectTrigger id="client">
              {loadingClients ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Cargando...</span>
                </div>
              ) : (
                <SelectValue placeholder="Todos" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
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
            onChange={(e) =>
              onFilterChange({ date_from: e.target.value || undefined })
            }
          />
        </div>

        {/* Fecha hasta */}
        <div className="space-y-2">
          <Label htmlFor="date_to">Hasta</Label>
          <Input
            id="date_to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) =>
              onFilterChange({ date_to: e.target.value || undefined })
            }
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

      {/* Active Filters Summary */}
      {(filters.status || filters.client_id || filters.date_from || filters.date_to || filters.search) && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Filtros activos:{' '}
            {[
              filters.status && `Estado: ${SALE_STATUS_LABELS[filters.status]}`,
              filters.client_id && 'Cliente seleccionado',
              filters.date_from && `Desde: ${filters.date_from}`,
              filters.date_to && `Hasta: ${filters.date_to}`,
              filters.search && `Búsqueda: "${filters.search}"`,
            ]
              .filter(Boolean)
              .join(' • ')}
          </p>
        </div>
      )}
    </div>
  )
}
