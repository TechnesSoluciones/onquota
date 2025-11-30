/**
 * Sales Controls API Service
 * Handles all sales controls (purchase orders) API calls
 */

import { apiClient } from './client'
import type {
  SalesControlCreate,
  SalesControlUpdate,
  SalesControl,
  SalesControlDetail,
  SalesControlListResponse,
  SalesControlListItem,
  SalesControlFilters,
  SalesControlMarkDeliveredRequest,
  SalesControlMarkInvoicedRequest,
  SalesControlMarkPaidRequest,
  SalesControlCancelRequest,
  SalesControlUpdateLeadTimeRequest,
  SalesControlStats,
} from '@/types/sales'

/**
 * Sales Controls API endpoints
 */
export const salesControlsApi = {
  /**
   * Get all sales controls with filters and pagination
   * GET /api/v1/sales/controls
   */
  getSalesControls: async (
    filters?: SalesControlFilters
  ): Promise<SalesControlListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters.quotation_id)
        params.append('quotation_id', filters.quotation_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.po_date_from)
        params.append('po_date_from', filters.po_date_from)
      if (filters.po_date_to) params.append('po_date_to', filters.po_date_to)
      if (filters.promise_date_from)
        params.append('promise_date_from', filters.promise_date_from)
      if (filters.promise_date_to)
        params.append('promise_date_to', filters.promise_date_to)
      if (filters.min_amount !== undefined)
        params.append('min_amount', filters.min_amount.toString())
      if (filters.max_amount !== undefined)
        params.append('max_amount', filters.max_amount.toString())
      if (filters.is_overdue !== undefined)
        params.append('is_overdue', filters.is_overdue.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/controls?${queryString}`
      : '/api/v1/sales/controls'

    const response = await apiClient.get<SalesControlListResponse>(url)
    return response.data
  },

  /**
   * Get overdue sales controls
   * GET /api/v1/sales/controls/overdue
   */
  getOverdueSalesControls: async (
    assignedTo?: string
  ): Promise<SalesControlListItem[]> => {
    const params = new URLSearchParams()
    if (assignedTo) params.append('assigned_to', assignedTo)

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/controls/overdue?${queryString}`
      : '/api/v1/sales/controls/overdue'

    const response = await apiClient.get<SalesControlListItem[]>(url)
    return response.data
  },

  /**
   * Get single sales control by ID (with lines)
   * GET /api/v1/sales/controls/{id}
   */
  getSalesControl: async (id: string): Promise<SalesControlDetail> => {
    const response = await apiClient.get<SalesControlDetail>(
      `/api/v1/sales/controls/${id}`
    )
    return response.data
  },

  /**
   * Create new sales control
   * POST /api/v1/sales/controls
   */
  createSalesControl: async (
    data: SalesControlCreate
  ): Promise<SalesControlDetail> => {
    const response = await apiClient.post<SalesControlDetail>(
      '/api/v1/sales/controls',
      data
    )
    return response.data
  },

  /**
   * Update sales control
   * PUT /api/v1/sales/controls/{id}
   */
  updateSalesControl: async (
    id: string,
    data: SalesControlUpdate
  ): Promise<SalesControl> => {
    const response = await apiClient.put<SalesControl>(
      `/api/v1/sales/controls/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete sales control (soft delete)
   * DELETE /api/v1/sales/controls/{id}
   */
  deleteSalesControl: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sales/controls/${id}`)
  },

  /**
   * Mark sales control as in production
   * POST /api/v1/sales/controls/{id}/mark-in-production
   */
  markInProduction: async (id: string): Promise<SalesControl> => {
    const response = await apiClient.post<SalesControl>(
      `/api/v1/sales/controls/${id}/mark-in-production`,
      {}
    )
    return response.data
  },

  /**
   * Mark sales control as delivered
   * POST /api/v1/sales/controls/{id}/mark-delivered
   */
  markDelivered: async (
    id: string,
    data: SalesControlMarkDeliveredRequest
  ): Promise<SalesControl> => {
    const response = await apiClient.post<SalesControl>(
      `/api/v1/sales/controls/${id}/mark-delivered`,
      data
    )
    return response.data
  },

  /**
   * Mark sales control as invoiced
   * POST /api/v1/sales/controls/{id}/mark-invoiced
   */
  markInvoiced: async (
    id: string,
    data: SalesControlMarkInvoicedRequest
  ): Promise<SalesControl> => {
    const response = await apiClient.post<SalesControl>(
      `/api/v1/sales/controls/${id}/mark-invoiced`,
      data
    )
    return response.data
  },

  /**
   * Mark sales control as paid (triggers quota achievement update)
   * POST /api/v1/sales/controls/{id}/mark-paid
   */
  markPaid: async (
    id: string,
    data: SalesControlMarkPaidRequest
  ): Promise<SalesControl> => {
    const response = await apiClient.post<SalesControl>(
      `/api/v1/sales/controls/${id}/mark-paid`,
      data
    )
    return response.data
  },

  /**
   * Cancel sales control
   * POST /api/v1/sales/controls/{id}/cancel
   */
  cancelSalesControl: async (
    id: string,
    data: SalesControlCancelRequest
  ): Promise<SalesControl> => {
    const response = await apiClient.post<SalesControl>(
      `/api/v1/sales/controls/${id}/cancel`,
      data
    )
    return response.data
  },

  /**
   * Update lead time and recalculate promise date
   * PUT /api/v1/sales/controls/{id}/lead-time
   */
  updateLeadTime: async (
    id: string,
    data: SalesControlUpdateLeadTimeRequest
  ): Promise<SalesControl> => {
    const response = await apiClient.put<SalesControl>(
      `/api/v1/sales/controls/${id}/lead-time`,
      data
    )
    return response.data
  },

  /**
   * Get sales control statistics
   * GET /api/v1/sales/controls/stats/summary
   */
  getSalesControlStats: async (
    assignedTo?: string
  ): Promise<SalesControlStats> => {
    const params = new URLSearchParams()
    if (assignedTo) params.append('assigned_to', assignedTo)

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/controls/stats/summary?${queryString}`
      : '/api/v1/sales/controls/stats/summary'

    const response = await apiClient.get<SalesControlStats>(url)
    return response.data
  },
}
