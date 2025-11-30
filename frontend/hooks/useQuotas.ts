/**
 * useQuotas Hooks
 * Custom hooks for managing sales quotas and achievement tracking
 */

import { useState, useEffect, useCallback } from 'react'
import { quotasApi } from '@/lib/api/quotas'
import type {
  Quota,
  QuotaDetail,
  QuotaFilters,
  QuotaCreate,
  QuotaUpdate,
  QuotaLine,
  QuotaLineCreate,
  QuotaLineUpdate,
  QuotaDashboardStats,
  QuotaTrendsResponse,
  AnnualQuotaStats,
  QuotaComparisonResponse,
} from '@/types/sales'

/**
 * Hook to manage quotas list with filtering and pagination
 */
export function useQuotas(initialFilters?: QuotaFilters) {
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<QuotaFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotas = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await quotasApi.getQuotas({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setQuotas(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error loading quotas'
      setError(errorMessage)
      setQuotas([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchQuotas()
  }, [fetchQuotas])

  const updateFilters = (newFilters: Partial<QuotaFilters>) => {
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
    fetchQuotas()
  }

  return {
    quotas,
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
 * Hook to get a single quota by ID (with lines)
 */
export function useQuota(id: string) {
  const [quota, setQuota] = useState<QuotaDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuota = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await quotasApi.getQuota(id)
      setQuota(data)
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error loading quota'
      setError(errorMessage)
      setQuota(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchQuota()
  }, [fetchQuota])

  return {
    quota,
    isLoading,
    error,
    refresh: fetchQuota,
  }
}

/**
 * Hook to create a quota
 */
export function useCreateQuota() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuota = async (
    data: QuotaCreate
  ): Promise<QuotaDetail | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const newQuota = await quotasApi.createQuota(data)
      return newQuota
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error creating quota'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createQuota,
    isLoading,
    error,
  }
}

/**
 * Hook to update a quota
 */
export function useUpdateQuota() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuota = async (
    id: string,
    data: QuotaUpdate
  ): Promise<Quota | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedQuota = await quotasApi.updateQuota(id, data)
      return updatedQuota
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error updating quota'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateQuota,
    isLoading,
    error,
  }
}

/**
 * Hook to delete a quota
 */
export function useDeleteQuota() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteQuota = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      await quotasApi.deleteQuota(id)
      return true
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error deleting quota'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteQuota,
    isLoading,
    error,
  }
}

/**
 * Hook to add a product line to a quota
 */
export function useAddQuotaLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addQuotaLine = async (
    quotaId: string,
    data: QuotaLineCreate
  ): Promise<QuotaLine | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const newLine = await quotasApi.addQuotaLine(quotaId, data)
      return newLine
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error adding quota line'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    addQuotaLine,
    isLoading,
    error,
  }
}

/**
 * Hook to update a quota line
 */
export function useUpdateQuotaLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuotaLine = async (
    quotaId: string,
    lineId: string,
    data: QuotaLineUpdate
  ): Promise<QuotaLine | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedLine = await quotasApi.updateQuotaLine(quotaId, lineId, data)
      return updatedLine
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error updating quota line'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateQuotaLine,
    isLoading,
    error,
  }
}

/**
 * Hook to delete a quota line
 */
export function useDeleteQuotaLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteQuotaLine = async (
    quotaId: string,
    lineId: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      await quotasApi.deleteQuotaLine(quotaId, lineId)
      return true
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error deleting quota line'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteQuotaLine,
    isLoading,
    error,
  }
}

/**
 * Hook to get quota dashboard for current or specific month
 * IMPORTANT: Main dashboard hook for quota tracking
 */
export function useQuotaDashboard(
  userId?: string,
  year?: number,
  month?: number
) {
  const [dashboard, setDashboard] = useState<QuotaDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await quotasApi.getQuotaDashboard(userId, year, month)
      setDashboard(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quota dashboard'
      setError(errorMessage)
      setDashboard(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId, year, month])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    dashboard,
    isLoading,
    error,
    refresh: fetchDashboard,
  }
}

/**
 * Hook to get monthly quota trends for charts
 */
export function useQuotaTrends(userId?: string, year?: number) {
  const [trends, setTrends] = useState<QuotaTrendsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTrends = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await quotasApi.getQuotaTrends(userId, year)
      setTrends(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quota trends'
      setError(errorMessage)
      setTrends(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId, year])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  return {
    trends,
    isLoading,
    error,
    refresh: fetchTrends,
  }
}

/**
 * Hook to get annual quota summary with product line breakdown
 */
export function useAnnualQuotaStats(userId?: string, year?: number) {
  const [stats, setStats] = useState<AnnualQuotaStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await quotasApi.getAnnualQuotaStats(userId, year)
      setStats(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading annual quota statistics'
      setError(errorMessage)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId, year])

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

/**
 * Hook to get month-to-month quota comparison
 */
export function useQuotaComparison(
  userId?: string,
  year?: number,
  month?: number
) {
  const [comparison, setComparison] = useState<QuotaComparisonResponse | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComparison = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await quotasApi.getQuotaComparison(userId, year, month)
      setComparison(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quota comparison'
      setError(errorMessage)
      setComparison(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId, year, month])

  useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  return {
    comparison,
    isLoading,
    error,
    refresh: fetchComparison,
  }
}
