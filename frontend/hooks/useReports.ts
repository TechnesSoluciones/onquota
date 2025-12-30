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
 * Helper function to create empty dashboard structure
 * FIX: Provides safe default values to prevent undefined errors
 */
const getEmptyDashboard = (): ExecutiveDashboard => ({
  period: {
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  },
  kpis: {
    total_revenue: 0,
    revenue_growth: 0,
    active_quotations: 0,
    quotations_value: 0,
    win_rate: 0,
    pipeline_value: 0,
    weighted_pipeline: 0,
    visits_this_period: 0,
    new_clients: 0,
    avg_sales_cycle_days: 0,
    conversion_rate: 0,
    total_expenses: 0,
    expense_to_revenue_ratio: 0,
  },
  revenue_trend: [],
  quotations_trend: [],
  visits_trend: [],
  top_sales_reps: [],
  top_clients: [],
  top_product_lines: [],
  alerts: [],
  generated_at: new Date().toISOString(),
})

/**
 * Hook to fetch executive dashboard with KPIs and analytics
 */
export function useExecutiveDashboard(initialFilters?: ReportFilters) {
  // FIX: Initialize with empty structure instead of null to prevent undefined errors
  const [dashboard, setDashboard] = useState<ExecutiveDashboard>(getEmptyDashboard())
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
      // FIX: Reset to empty structure instead of null
      setDashboard(getEmptyDashboard())
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
