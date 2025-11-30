/**
 * Quotas API Service
 * Handles all sales quotas and achievement tracking API calls
 */

import { apiClient } from './client'
import type {
  QuotaCreate,
  QuotaUpdate,
  Quota,
  QuotaDetail,
  QuotaListResponse,
  QuotaFilters,
  QuotaLineCreate,
  QuotaLineUpdate,
  QuotaLine,
  QuotaDashboardStats,
  QuotaTrendsResponse,
  AnnualQuotaStats,
  QuotaComparisonResponse,
} from '@/types/sales'

/**
 * Quotas API endpoints
 */
export const quotasApi = {
  /**
   * Get all quotas with filters and pagination
   * GET /api/v1/sales/quotas
   */
  getQuotas: async (filters?: QuotaFilters): Promise<QuotaListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.year !== undefined)
        params.append('year', filters.year.toString())
      if (filters.month !== undefined)
        params.append('month', filters.month.toString())
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotas?${queryString}`
      : '/api/v1/sales/quotas'

    const response = await apiClient.get<QuotaListResponse>(url)
    return response.data
  },

  /**
   * Get single quota by ID (with lines)
   * GET /api/v1/sales/quotas/{id}
   */
  getQuota: async (id: string): Promise<QuotaDetail> => {
    const response = await apiClient.get<QuotaDetail>(
      `/api/v1/sales/quotas/${id}`
    )
    return response.data
  },

  /**
   * Create new quota
   * POST /api/v1/sales/quotas
   */
  createQuota: async (data: QuotaCreate): Promise<QuotaDetail> => {
    const response = await apiClient.post<QuotaDetail>(
      '/api/v1/sales/quotas',
      data
    )
    return response.data
  },

  /**
   * Update quota
   * PUT /api/v1/sales/quotas/{id}
   */
  updateQuota: async (id: string, data: QuotaUpdate): Promise<Quota> => {
    const response = await apiClient.put<Quota>(
      `/api/v1/sales/quotas/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete quota (soft delete)
   * DELETE /api/v1/sales/quotas/{id}
   */
  deleteQuota: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sales/quotas/${id}`)
  },

  /**
   * Add product line to quota
   * POST /api/v1/sales/quotas/{id}/lines
   */
  addQuotaLine: async (
    quotaId: string,
    data: QuotaLineCreate
  ): Promise<QuotaLine> => {
    const response = await apiClient.post<QuotaLine>(
      `/api/v1/sales/quotas/${quotaId}/lines`,
      data
    )
    return response.data
  },

  /**
   * Update quota line
   * PUT /api/v1/sales/quotas/{id}/lines/{line_id}
   */
  updateQuotaLine: async (
    quotaId: string,
    lineId: string,
    data: QuotaLineUpdate
  ): Promise<QuotaLine> => {
    const response = await apiClient.put<QuotaLine>(
      `/api/v1/sales/quotas/${quotaId}/lines/${lineId}`,
      data
    )
    return response.data
  },

  /**
   * Remove quota line
   * DELETE /api/v1/sales/quotas/{id}/lines/{line_id}
   */
  deleteQuotaLine: async (quotaId: string, lineId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sales/quotas/${quotaId}/lines/${lineId}`)
  },

  /**
   * Get quota dashboard for current month
   * GET /api/v1/sales/quotas/dashboard
   */
  getQuotaDashboard: async (
    userId?: string,
    year?: number,
    month?: number
  ): Promise<QuotaDashboardStats> => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (year !== undefined) params.append('year', year.toString())
    if (month !== undefined) params.append('month', month.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotas/dashboard?${queryString}`
      : '/api/v1/sales/quotas/dashboard'

    const response = await apiClient.get<QuotaDashboardStats>(url)
    return response.data
  },

  /**
   * Get monthly quota trends for charts
   * GET /api/v1/sales/quotas/trends
   */
  getQuotaTrends: async (
    userId?: string,
    year?: number
  ): Promise<QuotaTrendsResponse> => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (year !== undefined) params.append('year', year.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotas/trends?${queryString}`
      : '/api/v1/sales/quotas/trends'

    const response = await apiClient.get<QuotaTrendsResponse>(url)
    return response.data
  },

  /**
   * Get annual quota summary
   * GET /api/v1/sales/quotas/annual
   */
  getAnnualQuotaStats: async (
    userId?: string,
    year?: number
  ): Promise<AnnualQuotaStats> => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (year !== undefined) params.append('year', year.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotas/annual?${queryString}`
      : '/api/v1/sales/quotas/annual'

    const response = await apiClient.get<AnnualQuotaStats>(url)
    return response.data
  },

  /**
   * Get month-to-month quota comparison
   * GET /api/v1/sales/quotas/comparison
   */
  getQuotaComparison: async (
    userId?: string,
    year?: number,
    month?: number
  ): Promise<QuotaComparisonResponse> => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId)
    if (year !== undefined) params.append('year', year.toString())
    if (month !== undefined) params.append('month', month.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotas/comparison?${queryString}`
      : '/api/v1/sales/quotas/comparison'

    const response = await apiClient.get<QuotaComparisonResponse>(url)
    return response.data
  },
}
