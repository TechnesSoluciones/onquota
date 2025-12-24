/**
 * Commitments API Client
 * API functions for commitment and follow-up management
 */

import { apiClient } from './client'
import type {
  Commitment,
  CommitmentCreate,
  CommitmentUpdate,
  CommitmentComplete,
  CommitmentListResponse,
  CommitmentFilters,
} from '@/types/visit'

// ============================================================================
// COMMITMENTS API
// ============================================================================

export const commitmentsApi = {
  /**
   * Get all commitments with filters and pagination
   * GET /api/v1/commitments
   */
  getCommitments: async (
    filters?: CommitmentFilters
  ): Promise<CommitmentListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.visit_id) params.append('visit_id', filters.visit_id)
      if (filters.assigned_to_user_id)
        params.append('assigned_to_user_id', filters.assigned_to_user_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/commitments?${queryString}`
      : '/api/v1/commitments'

    const response = await apiClient.get<CommitmentListResponse>(url)
    return response.data
  },

  /**
   * Get single commitment by ID
   * GET /api/v1/commitments/{id}
   */
  getCommitment: async (id: string): Promise<Commitment> => {
    const response = await apiClient.get<Commitment>(
      `/api/v1/commitments/${id}`
    )
    return response.data
  },

  /**
   * Create new commitment
   * POST /api/v1/commitments
   */
  createCommitment: async (data: CommitmentCreate): Promise<Commitment> => {
    const response = await apiClient.post<Commitment>(
      '/api/v1/commitments',
      data
    )
    return response.data
  },

  /**
   * Update commitment
   * PUT /api/v1/commitments/{id}
   */
  updateCommitment: async (
    id: string,
    data: CommitmentUpdate
  ): Promise<Commitment> => {
    const response = await apiClient.put<Commitment>(
      `/api/v1/commitments/${id}`,
      data
    )
    return response.data
  },

  /**
   * Mark commitment as completed
   * POST /api/v1/commitments/{id}/complete
   */
  completeCommitment: async (
    id: string,
    data: CommitmentComplete
  ): Promise<Commitment> => {
    const response = await apiClient.post<Commitment>(
      `/api/v1/commitments/${id}/complete`,
      data
    )
    return response.data
  },

  /**
   * Delete commitment (soft delete)
   * DELETE /api/v1/commitments/{id}
   */
  deleteCommitment: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/commitments/${id}`)
  },

  /**
   * Get all pending commitments
   * GET /api/v1/commitments/pending
   */
  getPendingCommitments: async (
    assignedToUserId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<CommitmentListResponse> => {
    const params = new URLSearchParams()
    if (assignedToUserId)
      params.append('assigned_to_user_id', assignedToUserId)
    params.append('page', String(page))
    params.append('page_size', String(pageSize))

    const queryString = params.toString()
    const url = `/api/v1/commitments/pending?${queryString}`

    const response = await apiClient.get<CommitmentListResponse>(url)
    return response.data
  },

  /**
   * Get all overdue commitments
   * GET /api/v1/commitments/overdue
   */
  getOverdueCommitments: async (
    assignedToUserId?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<CommitmentListResponse> => {
    const params = new URLSearchParams()
    if (assignedToUserId)
      params.append('assigned_to_user_id', assignedToUserId)
    params.append('page', String(page))
    params.append('page_size', String(pageSize))

    const queryString = params.toString()
    const url = `/api/v1/commitments/overdue?${queryString}`

    const response = await apiClient.get<CommitmentListResponse>(url)
    return response.data
  },

  /**
   * Get commitment statistics
   * GET /api/v1/commitments/stats
   */
  getCommitmentStats: async (assignedToUserId?: string): Promise<any> => {
    const params = new URLSearchParams()
    if (assignedToUserId)
      params.append('assigned_to_user_id', assignedToUserId)

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/commitments/stats?${queryString}`
      : '/api/v1/commitments/stats'

    const response = await apiClient.get(url)
    return response.data
  },
}
