/**
 * Quotations API Service
 * Handles all quotations registry API calls
 */

import { apiClient } from './client'
import type {
  QuotationCreate,
  QuotationUpdate,
  Quotation,
  QuotationListResponse,
  QuotationFilters,
  QuotationWinRequest,
  QuotationWinResponse,
  QuotationLoseRequest,
  QuotationStats,
} from '@/types/sales'

/**
 * Quotations API endpoints
 */
export const quotationsApi = {
  /**
   * Get all quotations with filters and pagination
   * GET /api/v1/sales/quotations
   */
  getQuotations: async (
    filters?: QuotationFilters
  ): Promise<QuotationListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.min_amount !== undefined)
        params.append('min_amount', filters.min_amount.toString())
      if (filters.max_amount !== undefined)
        params.append('max_amount', filters.max_amount.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/quotations?${queryString}`
      : '/api/v1/sales/quotations'

    const response = await apiClient.get<QuotationListResponse>(url)
    return response.data
  },

  /**
   * Get single quotation by ID
   * GET /api/v1/sales/quotations/{id}
   */
  getQuotation: async (id: string): Promise<Quotation> => {
    const response = await apiClient.get<Quotation>(
      `/api/v1/sales/quotations/${id}`
    )
    return response.data
  },

  /**
   * Create new quotation
   * POST /api/v1/sales/quotations
   */
  createQuotation: async (data: QuotationCreate): Promise<Quotation> => {
    const response = await apiClient.post<Quotation>(
      '/api/v1/sales/quotations',
      data
    )
    return response.data
  },

  /**
   * Update quotation
   * PUT /api/v1/sales/quotations/{id}
   */
  updateQuotation: async (
    id: string,
    data: QuotationUpdate
  ): Promise<Quotation> => {
    const response = await apiClient.put<Quotation>(
      `/api/v1/sales/quotations/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete quotation (soft delete)
   * DELETE /api/v1/sales/quotations/{id}
   */
  deleteQuotation: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sales/quotations/${id}`)
  },

  /**
   * Mark quotation as won (creates sales control automatically)
   * POST /api/v1/sales/quotations/{id}/win
   */
  markQuotationWon: async (
    id: string,
    data: QuotationWinRequest
  ): Promise<QuotationWinResponse> => {
    const response = await apiClient.post<QuotationWinResponse>(
      `/api/v1/sales/quotations/${id}/win`,
      data
    )
    return response.data
  },

  /**
   * Mark quotation as lost
   * POST /api/v1/sales/quotations/{id}/lose
   */
  markQuotationLost: async (
    id: string,
    data: QuotationLoseRequest
  ): Promise<Quotation> => {
    const response = await apiClient.post<Quotation>(
      `/api/v1/sales/quotations/${id}/lose`,
      data
    )
    return response.data
  },

  /**
   * Get quotation statistics (win rate, etc.)
   * GET /api/v1/sales/quotations/stats
   */
  getQuotationStats: async (): Promise<QuotationStats> => {
    const response = await apiClient.get<QuotationStats>(
      '/api/v1/sales/quotations/stats'
    )
    return response.data
  },
}
