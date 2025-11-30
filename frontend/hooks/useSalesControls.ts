/**
 * useSalesControls Hooks
 * Custom hooks for managing sales controls (purchase orders)
 */

import { useState, useEffect, useCallback } from 'react'
import { salesControlsApi } from '@/lib/api/sales-controls'
import type {
  SalesControl,
  SalesControlDetail,
  SalesControlListItem,
  SalesControlFilters,
  SalesControlCreate,
  SalesControlUpdate,
  SalesControlMarkDeliveredRequest,
  SalesControlMarkInvoicedRequest,
  SalesControlMarkPaidRequest,
  SalesControlCancelRequest,
  SalesControlUpdateLeadTimeRequest,
  SalesControlStats,
} from '@/types/sales'

/**
 * Hook to manage sales controls list with filtering and pagination
 */
export function useSalesControls(initialFilters?: SalesControlFilters) {
  const [salesControls, setSalesControls] = useState<SalesControlListItem[]>(
    []
  )
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<SalesControlFilters>(
    initialFilters || {}
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalesControls = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await salesControlsApi.getSalesControls({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setSalesControls(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading sales controls'
      setError(errorMessage)
      setSalesControls([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchSalesControls()
  }, [fetchSalesControls])

  const updateFilters = (newFilters: Partial<SalesControlFilters>) => {
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
    fetchSalesControls()
  }

  return {
    salesControls,
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
 * Hook to get overdue sales controls
 */
export function useOverdueSalesControls(assignedTo?: string) {
  const [overdueControls, setOverdueControls] = useState<
    SalesControlListItem[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOverdueControls = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await salesControlsApi.getOverdueSalesControls(assignedTo)
      setOverdueControls(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading overdue sales controls'
      setError(errorMessage)
      setOverdueControls([])
    } finally {
      setIsLoading(false)
    }
  }, [assignedTo])

  useEffect(() => {
    fetchOverdueControls()
  }, [fetchOverdueControls])

  return {
    overdueControls,
    isLoading,
    error,
    refresh: fetchOverdueControls,
  }
}

/**
 * Hook to get a single sales control by ID (with lines)
 */
export function useSalesControl(id: string) {
  const [salesControl, setSalesControl] = useState<SalesControlDetail | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSalesControl = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await salesControlsApi.getSalesControl(id)
      setSalesControl(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading sales control'
      setError(errorMessage)
      setSalesControl(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSalesControl()
  }, [fetchSalesControl])

  return {
    salesControl,
    isLoading,
    error,
    refresh: fetchSalesControl,
  }
}

/**
 * Hook to create a sales control
 */
export function useCreateSalesControl() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSalesControl = async (
    data: SalesControlCreate
  ): Promise<SalesControlDetail | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const newSalesControl = await salesControlsApi.createSalesControl(data)
      return newSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error creating sales control'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createSalesControl,
    isLoading,
    error,
  }
}

/**
 * Hook to update a sales control
 */
export function useUpdateSalesControl() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSalesControl = async (
    id: string,
    data: SalesControlUpdate
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.updateSalesControl(
        id,
        data
      )
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error updating sales control'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateSalesControl,
    isLoading,
    error,
  }
}

/**
 * Hook to delete a sales control
 */
export function useDeleteSalesControl() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteSalesControl = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      await salesControlsApi.deleteSalesControl(id)
      return true
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error deleting sales control'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteSalesControl,
    isLoading,
    error,
  }
}

/**
 * Hook to mark sales control as in production
 */
export function useMarkInProduction() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markInProduction = async (id: string): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.markInProduction(id)
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking as in production'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markInProduction,
    isLoading,
    error,
  }
}

/**
 * Hook to mark sales control as delivered
 */
export function useMarkDelivered() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markDelivered = async (
    id: string,
    data: SalesControlMarkDeliveredRequest
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.markDelivered(id, data)
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking as delivered'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markDelivered,
    isLoading,
    error,
  }
}

/**
 * Hook to mark sales control as invoiced
 */
export function useMarkInvoiced() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markInvoiced = async (
    id: string,
    data: SalesControlMarkInvoicedRequest
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.markInvoiced(id, data)
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking as invoiced'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markInvoiced,
    isLoading,
    error,
  }
}

/**
 * Hook to mark sales control as paid
 * IMPORTANT: Triggers quota achievement update in the backend
 */
export function useMarkPaid() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markPaid = async (
    id: string,
    data: SalesControlMarkPaidRequest
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.markPaid(id, data)
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error marking as paid'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    markPaid,
    isLoading,
    error,
  }
}

/**
 * Hook to cancel a sales control
 */
export function useCancelSalesControl() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelSalesControl = async (
    id: string,
    data: SalesControlCancelRequest
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.cancelSalesControl(
        id,
        data
      )
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error cancelling sales control'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    cancelSalesControl,
    isLoading,
    error,
  }
}

/**
 * Hook to update lead time and recalculate promise date
 */
export function useUpdateLeadTime() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateLeadTime = async (
    id: string,
    data: SalesControlUpdateLeadTimeRequest
  ): Promise<SalesControl | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedSalesControl = await salesControlsApi.updateLeadTime(
        id,
        data
      )
      return updatedSalesControl
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error updating lead time'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateLeadTime,
    isLoading,
    error,
  }
}

/**
 * Hook to get sales control statistics
 */
export function useSalesControlStats(assignedTo?: string) {
  const [stats, setStats] = useState<SalesControlStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await salesControlsApi.getSalesControlStats(assignedTo)
      setStats(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail ||
        err?.message ||
        'Error loading sales control statistics'
      setError(errorMessage)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [assignedTo])

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
