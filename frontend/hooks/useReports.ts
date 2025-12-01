/**
 * useReports Hooks
 * Custom hooks for managing reports and analytics
 */

import { useState, useEffect, useCallback } from 'react'
import { reportsApi } from '@/lib/api/reports'
import type {
  ExecutiveDashboard,
  QuotationConversionReport,
  SalesFunnelReport,
  ReportFilters,
  ExportRequest,
  ExportJob,
} from '@/types/reports'

/**
 * Hook to fetch executive dashboard with KPIs and analytics
 */
export function useExecutiveDashboard(initialFilters?: ReportFilters) {
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await reportsApi.getExecutiveDashboard(filters)
      setDashboard(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading executive dashboard'
      setError(errorMessage)
      setDashboard(null)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const refresh = () => {
    fetchDashboard()
  }

  return {
    dashboard,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    refresh,
  }
}

/**
 * Hook to fetch quotation conversion report
 */
export function useQuotationConversionReport(initialFilters?: ReportFilters) {
  const [report, setReport] = useState<QuotationConversionReport | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await reportsApi.getQuotationConversionReport(filters)
      setReport(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading quotation conversion report'
      setError(errorMessage)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const refresh = () => {
    fetchReport()
  }

  return {
    report,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    refresh,
  }
}

/**
 * Hook to fetch sales funnel analysis report
 */
export function useSalesFunnelReport(initialFilters?: ReportFilters) {
  const [report, setReport] = useState<SalesFunnelReport | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await reportsApi.getSalesFunnelReport(filters)
      setReport(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading sales funnel report'
      setError(errorMessage)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const updateFilters = (newFilters: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const refresh = () => {
    fetchReport()
  }

  return {
    report,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    refresh,
  }
}

/**
 * Hook to export reports to Excel or PDF
 */
export function useExportReport() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportJob, setExportJob] = useState<ExportJob | null>(null)

  const exportReport = async (
    request: ExportRequest
  ): Promise<ExportJob | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const job = await reportsApi.exportReport(request)
      setExportJob(job)
      return job
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error exporting report'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const checkJobStatus = async (jobId: string): Promise<ExportJob | null> => {
    try {
      const job = await reportsApi.getExportJobStatus(jobId)
      setExportJob(job)
      return job
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error checking export job status'
      setError(errorMessage)
      return null
    }
  }

  const clearJob = () => {
    setExportJob(null)
    setError(null)
  }

  return {
    exportReport,
    checkJobStatus,
    clearJob,
    exportJob,
    isLoading,
    error,
  }
}

/**
 * Hook to check reports module health
 */
export function useReportsHealth() {
  const [health, setHealth] = useState<{
    status: string
    module: string
    version: string
    phase: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await reportsApi.healthCheck()
      setHealth(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error checking reports health'
      setError(errorMessage)
      setHealth(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  return {
    health,
    isLoading,
    error,
    refresh: checkHealth,
  }
}
