import { useState, useEffect, useCallback } from 'react'
import { transportApi } from '@/lib/api'
import type { Vehicle, VehicleFilters, VehicleListResponse } from '@/types/transport'

/**
 * Hook to manage vehicles list with filtering and pagination
 * Handles loading, error states, and provides mutation methods
 */
export function useVehicles(initialFilters?: VehicleFilters) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    page_size: number
    total: number
    total_pages: number
  }>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<VehicleFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await transportApi.getVehicles({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setVehicles(response.vehicles)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar vehículos'
      setError(errorMessage)
      setVehicles([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  const updateFilters = (newFilters: Partial<VehicleFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to page 1
  }

  const clearFilters = () => {
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.total_pages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }

  const refresh = () => {
    fetchVehicles()
  }

  return {
    vehicles,
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
