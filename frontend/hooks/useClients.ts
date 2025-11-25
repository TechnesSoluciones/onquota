import { useState, useEffect, useCallback } from 'react'
import { clientsApi } from '@/lib/api/clients'
import type { ClientResponse, ClientFilters } from '@/types/client'
import type { ClientListResponse } from '@/types/client'

/**
 * Hook to manage clients list with filtering and pagination
 * Handles loading, error states, and provides mutation methods
 */
export function useClients(initialFilters?: ClientFilters) {
  const [clients, setClients] = useState<ClientResponse[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    page_size: number
    total: number
    pages: number
  }>({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
  })
  const [filters, setFilters] = useState<ClientFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await clientsApi.getClients({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setClients(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      })
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar clientes'
      setError(errorMessage)
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const updateFilters = (newFilters: Partial<ClientFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to page 1
  }

  const clearFilters = () => {
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }

  const refresh = () => {
    fetchClients()
  }

  return {
    clients,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  }
}
