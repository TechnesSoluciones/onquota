/**
 * useQuotations Hooks
 * Custom hooks for managing quotations registry
 */

import { useState, useEffect, useCallback } from 'react'
import { quotationsApi } from '@/lib/api/quotations'
import type {
  Quotation,
  QuotationFilters,
  QuotationCreate,
  QuotationUpdate,
  QuotationWinRequest,
  QuotationWinResponse,
  QuotationLoseRequest,
  QuotationStats,
} from '@/types/sales'

/**
 * Hook to manage quotations list with filtering and pagination
 */
export function useQuotations(initialFilters?: QuotationFilters) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<QuotationFilters>(
    initialFilters || {}
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotations = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await quotationsApi.getQuotations({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setQuotations(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quotations'
      setError(errorMessage)
      setQuotations([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchQuotations()
  }, [fetchQuotations])

  const updateFilters = (newFilters: Partial<QuotationFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 }))
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
    fetchQuotations()
  }

  return {
    quotations,
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

/**
 * Hook to get a single quotation by ID
 */
export function useQuotation(id: string) {
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotation = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await quotationsApi.getQuotation(id)
      setQuotation(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quotation'
      setError(errorMessage)
      setQuotation(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchQuotation()
  }, [fetchQuotation])

  return {
    quotation,
    isLoading,
    error,
    refresh: fetchQuotation,
  }
}

/**
 * Hook to create a quotation
 */
export function useCreateQuotation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuotation = async (
    data: QuotationCreate
  ): Promise<Quotation | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const newQuotation = await quotationsApi.createQuotation(data)
      return newQuotation
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error creating quotation'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createQuotation,
    isLoading,
    error,
  }
}

/**
 * Hook to update a quotation
 */
export function useUpdateQuotation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuotation = async (
    id: string,
    data: QuotationUpdate
  ): Promise<Quotation | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedQuotation = await quotationsApi.updateQuotation(id, data)
      return updatedQuotation
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error updating quotation'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateQuotation,
    isLoading,
    error,
  }
}

/**
 * Hook to delete a quotation
 */
export function useDeleteQuotation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteQuotation = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      await quotationsApi.deleteQuotation(id)
      return true
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error deleting quotation'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteQuotation,
    isLoading,
    error,
  }
}

/**
 * Hook to mark quotation as won
 * IMPORTANT: Auto-creates sales control in the backend
 */
export function useMarkQuotationWon() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markQuotationWon = async (
    id: string,
    data: QuotationWinRequest
  ): Promise<QuotationWinResponse | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await quotationsApi.markQuotationWon(id, data)
      return response
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking quotation as won'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markQuotationWon,
    isLoading,
    error,
  }
}

/**
 * Hook to mark quotation as lost
 */
export function useMarkQuotationLost() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markQuotationLost = async (
    id: string,
    data: QuotationLoseRequest
  ): Promise<Quotation | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedQuotation = await quotationsApi.markQuotationLost(id, data)
      return updatedQuotation
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking quotation as lost'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markQuotationLost,
    isLoading,
    error,
  }
}

/**
 * Hook to get quotation statistics (win rate, totals, etc.)
 */
export function useQuotationStats() {
  const [stats, setStats] = useState<QuotationStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await quotationsApi.getQuotationStats()
      setStats(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quotation statistics'
      setError(errorMessage)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  }
}
