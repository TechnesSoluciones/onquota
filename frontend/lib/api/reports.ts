/**
 * Reports API Service
 * Handles all reports and analytics API calls
 */

import { apiClient } from './client'
import type {
  ExecutiveDashboard,
  QuotationConversionReport,
  SalesFunnelReport,
  ReportFilters,
  ExportRequest,
  ExportJob,
} from '@/types/reports'

/**
 * Reports API endpoints
 */
export const reportsApi = {
  /**
   * Get executive dashboard with KPIs, trends, and top performers
   * GET /api/v1/reports/dashboard/executive
   */
  getExecutiveDashboard: async (
    filters?: ReportFilters
  ): Promise<ExecutiveDashboard> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.sales_rep_id)
        params.append('sales_rep_id', filters.sales_rep_id)
      if (filters.product_line_id)
        params.append('product_line_id', filters.product_line_id)
      if (filters.currency) params.append('currency', filters.currency)
      if (filters.comparison_period)
        params.append('comparison_period', filters.comparison_period)
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/reports/dashboard/executive?${queryString}`
      : '/api/v1/reports/dashboard/executive'

    const response = await apiClient.get<ExecutiveDashboard>(url)
    return response.data
  },

  /**
   * Get quotation conversion analysis report
   * GET /api/v1/reports/quotations/conversion
   */
  getQuotationConversionReport: async (
    filters?: ReportFilters
  ): Promise<QuotationConversionReport> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.sales_rep_id)
        params.append('sales_rep_id', filters.sales_rep_id)
      if (filters.currency) params.append('currency', filters.currency)
      if (filters.comparison_period)
        params.append('comparison_period', filters.comparison_period)
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/reports/quotations/conversion?${queryString}`
      : '/api/v1/reports/quotations/conversion'

    const response = await apiClient.get<QuotationConversionReport>(url)
    return response.data
  },

  /**
   * Get complete sales funnel analysis
   * GET /api/v1/reports/funnel/complete-analysis
   */
  getSalesFunnelReport: async (
    filters?: ReportFilters
  ): Promise<SalesFunnelReport> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.sales_rep_id)
        params.append('sales_rep_id', filters.sales_rep_id)
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/reports/funnel/complete-analysis?${queryString}`
      : '/api/v1/reports/funnel/complete-analysis'

    const response = await apiClient.get<SalesFunnelReport>(url)
    return response.data
  },

  /**
   * Export report to Excel or PDF
   * POST /api/v1/reports/export
   * Returns job ID to track export progress
   */
  exportReport: async (request: ExportRequest): Promise<ExportJob> => {
    const response = await apiClient.post<ExportJob>(
      '/api/v1/reports/export',
      request
    )
    return response.data
  },

  /**
   * Get export job status
   * GET /api/v1/reports/export/{job_id}
   */
  getExportJobStatus: async (jobId: string): Promise<ExportJob> => {
    const response = await apiClient.get<ExportJob>(
      `/api/v1/reports/export/${jobId}`
    )
    return response.data
  },

  /**
   * Health check for reports module
   * GET /api/v1/reports/health
   */
  healthCheck: async (): Promise<{
    status: string
    module: string
    version: string
    phase: string
  }> => {
    const response = await apiClient.get<{
      status: string
      module: string
      version: string
      phase: string
    }>('/api/v1/reports/health')
    return response.data
  },
}
