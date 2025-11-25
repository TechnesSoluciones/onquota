import { useState, useEffect, useCallback } from 'react'
import { expensesApi } from '@/lib/api/expenses'
import type { ExpenseWithCategory, ExpenseFilters } from '@/types/expense'
import type { ExpenseListResponse } from '@/types/expense'

/**
 * Hook to manage expenses list with filtering and pagination
 * Handles loading, error states, and provides mutation methods
 */
export function useExpenses(initialFilters?: ExpenseFilters) {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
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
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await expensesApi.getExpenses({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setExpenses(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      })
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar gastos'
      setError(errorMessage)
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const updateFilters = (newFilters: Partial<ExpenseFilters>) => {
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
    fetchExpenses()
  }

  return {
    expenses,
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
