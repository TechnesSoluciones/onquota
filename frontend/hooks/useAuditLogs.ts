import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { AuditLogResponse, AuditLogFilters } from '@/types/admin'

/**
 * Hook to manage audit logs with filtering and pagination
 * Handles loading, error states, and provides refresh method
 */
export function useAuditLogs(initialFilters?: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogResponse[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    page_size: number
    total: number
    total_pages: number
  }>({
    page: 1,
    page_size: 50,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<AuditLogFilters>(
    initialFilters || {}
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getAuditLogs({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setLogs(response.logs)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al cargar logs de auditoría'
      setError(errorMessage)
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const updateFilters = (newFilters: Partial<AuditLogFilters>) => {
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
    fetchLogs()
  }

  return {
    logs,
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
 * Hook to get audit log statistics
 */
export function useAuditStats() {
  const [stats, setStats] = useState<{
    total_audit_logs: number
    actions_today: number
    actions_this_week: number
    top_actions: Array<{ action: string; count: number }>
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getAuditStats()
      setStats(response)
    } catch (err: any) {
      const errorMessage =
        err?.detail ||
        err?.message ||
        'Error al cargar estadísticas de auditoría'
      setError(errorMessage)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = () => {
    fetchStats()
  }

  return {
    stats,
    isLoading,
    error,
    refresh,
  }
}
