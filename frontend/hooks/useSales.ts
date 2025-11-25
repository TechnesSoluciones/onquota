import { useState, useEffect, useCallback } from 'react'
import { salesApi } from '@/lib/api/sales'
import type { Quote, QuoteFilters, QuoteListResponse } from '@/types/quote'

/**
 * Hook to manage quotes list with filtering and pagination
 * Handles loading, error states, and provides mutation methods
 */
export function useSales(initialFilters?: QuoteFilters) {
  const [quotes, setQuotes] = useState<Quote[]>([])
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
  const [filters, setFilters] = useState<QuoteFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await salesApi.getQuotes({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setQuotes(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      })
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar cotizaciones'
      setError(errorMessage)
      setQuotes([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const updateFilters = (newFilters: Partial<QuoteFilters>) => {
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
    fetchQuotes()
  }

  return {
    quotes,
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
