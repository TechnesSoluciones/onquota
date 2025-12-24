/**
 * Sales API Service
 * Handles all quote-related API calls
 */

import { apiClient } from './client'
import type {
  QuoteCreate,
  QuoteUpdate,
  Quote,
  QuoteWithItems,
  QuoteListResponse,
  QuoteSummary,
  QuoteFilters,
  QuoteItemCreate,
  QuoteItem,
  SaleStatus,
} from '@/types/quote'

/**
 * Sales API endpoints
 */
export const salesApi = {
  /**
   * Get all quotes with filters and pagination
   * GET /api/v1/quotes
   */
  getQuotes: async (filters?: QuoteFilters): Promise<QuoteListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.sales_rep_id)
        params.append('sales_rep_id', filters.sales_rep_id)
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
    const url = queryString ? `/api/v1/quotes?${queryString}` : '/api/v1/quotes'

    const response = await apiClient.get<QuoteListResponse>(url)
    return response.data
  },

  /**
   * Get single quote by ID
   * GET /api/v1/quotes/{id}
   */
  getQuote: async (id: string): Promise<QuoteWithItems> => {
    const response = await apiClient.get<QuoteWithItems>(`/api/v1/quotes/${id}`)
    return response.data
  },

  /**
   * Create new quote
   * POST /api/v1/quotes
   */
  createQuote: async (data: QuoteCreate): Promise<Quote> => {
    const response = await apiClient.post<Quote>('/api/v1/quotes', data)
    return response.data
  },

  /**
   * Update quote
   * PUT /api/v1/quotes/{id}
   */
  updateQuote: async (id: string, data: QuoteUpdate): Promise<Quote> => {
    const response = await apiClient.put<Quote>(`/api/v1/quotes/${id}`, data)
    return response.data
  },

  /**
   * Delete quote
   * DELETE /api/v1/quotes/{id}
   */
  deleteQuote: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/quotes/${id}`)
  },

  /**
   * Update quote status
   * PATCH /api/v1/quotes/{id}/status
   */
  updateQuoteStatus: async (id: string, status: SaleStatus): Promise<Quote> => {
    const response = await apiClient.patch<Quote>(
      `/api/v1/quotes/${id}/status`,
      { status }
    )
    return response.data
  },

  /**
   * Get quote summary/statistics
   * GET /api/v1/quotes/summary
   */
  getQuoteSummary: async (): Promise<QuoteSummary> => {
    const response = await apiClient.get<QuoteSummary>('/api/v1/quotes/summary')
    return response.data
  },

  /**
   * Add item to quote
   * POST /api/v1/quotes/{quoteId}/items
   */
  addQuoteItem: async (
    quoteId: string,
    data: QuoteItemCreate
  ): Promise<QuoteItem> => {
    const response = await apiClient.post<QuoteItem>(
      `/api/v1/quotes/${quoteId}/items`,
      data
    )
    return response.data
  },

  /**
   * Update quote item
   * PUT /api/v1/quotes/{quoteId}/items/{itemId}
   */
  updateQuoteItem: async (
    quoteId: string,
    itemId: string,
    data: Partial<QuoteItemCreate>
  ): Promise<QuoteItem> => {
    const response = await apiClient.put<QuoteItem>(
      `/api/v1/quotes/${quoteId}/items/${itemId}`,
      data
    )
    return response.data
  },

  /**
   * Delete quote item
   * DELETE /api/v1/quotes/{quoteId}/items/{itemId}
   */
  deleteQuoteItem: async (quoteId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/quotes/${quoteId}/items/${itemId}`)
  },
}
