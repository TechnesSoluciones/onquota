/**
 * Account Plans API Service
 * Handles all account planning related API calls
 */

import { apiClient } from './client'
import type {
  AccountPlanCreate,
  AccountPlanUpdate,
  AccountPlanResponse,
  AccountPlanListResponse,
  AccountPlanFilters,
  AccountPlanDetail,
  AccountPlanStats,
  MilestoneCreate,
  MilestoneUpdate,
  Milestone,
  SWOTItemCreate,
  SWOTItem,
} from '@/types/accounts'

/**
 * Account Plans API endpoints
 */
export const accountPlansApi = {
  /**
   * Get all account plans with filters and pagination
   * GET /api/v1/account-plans
   */
  getPlans: async (
    filters?: AccountPlanFilters
  ): Promise<AccountPlanListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/account-plans?${queryString}`
      : '/api/v1/account-plans'

    const response = await apiClient.get<AccountPlanListResponse>(url)
    return response.data
  },

  /**
   * Get single account plan by ID with full details
   * GET /api/v1/account-plans/{id}
   */
  getPlan: async (id: string): Promise<AccountPlanDetail> => {
    const response = await apiClient.get<AccountPlanDetail>(
      `/api/v1/account-plans/${id}`
    )
    return response.data
  },

  /**
   * Create new account plan
   * POST /api/v1/account-plans
   */
  createPlan: async (
    data: AccountPlanCreate
  ): Promise<AccountPlanResponse> => {
    const response = await apiClient.post<AccountPlanResponse>(
      '/api/v1/account-plans',
      data
    )
    return response.data
  },

  /**
   * Update account plan
   * PUT /api/v1/account-plans/{id}
   */
  updatePlan: async (
    id: string,
    data: AccountPlanUpdate
  ): Promise<AccountPlanResponse> => {
    const response = await apiClient.put<AccountPlanResponse>(
      `/api/v1/account-plans/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete account plan
   * DELETE /api/v1/account-plans/{id}
   */
  deletePlan: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/account-plans/${id}`)
  },

  /**
   * Get account plan statistics
   * GET /api/v1/account-plans/{id}/stats
   */
  getPlanStats: async (id: string): Promise<AccountPlanStats> => {
    const response = await apiClient.get<AccountPlanStats>(
      `/api/v1/account-plans/${id}/stats`
    )
    return response.data
  },

  /**
   * Get plans by status
   * GET /api/v1/account-plans/by-status/{status}
   */
  getPlansByStatus: async (
    status: string,
    page?: number,
    page_size?: number
  ): Promise<AccountPlanListResponse> => {
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (page_size !== undefined)
      params.append('page_size', page_size.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/account-plans/by-status/${status}?${queryString}`
      : `/api/v1/account-plans/by-status/${status}`

    const response = await apiClient.get<AccountPlanListResponse>(url)
    return response.data
  },

  /**
   * Create milestone for a plan
   * POST /api/v1/account-plans/{planId}/milestones
   */
  createMilestone: async (
    planId: string,
    data: MilestoneCreate
  ): Promise<Milestone> => {
    const response = await apiClient.post<Milestone>(
      `/api/v1/account-plans/${planId}/milestones`,
      data
    )
    return response.data
  },

  /**
   * Update milestone
   * PUT /api/v1/account-plans/milestones/{id}
   */
  updateMilestone: async (
    id: string,
    data: MilestoneUpdate
  ): Promise<Milestone> => {
    const response = await apiClient.put<Milestone>(
      `/api/v1/account-plans/milestones/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete milestone
   * DELETE /api/v1/account-plans/milestones/{id}
   */
  deleteMilestone: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/account-plans/milestones/${id}`)
  },

  /**
   * Mark milestone as completed
   * PATCH /api/v1/account-plans/milestones/{id}/complete
   */
  completeMilestone: async (id: string): Promise<Milestone> => {
    const response = await apiClient.patch<Milestone>(
      `/api/v1/account-plans/milestones/${id}/complete`
    )
    return response.data
  },

  /**
   * Create SWOT item for a plan
   * POST /api/v1/account-plans/{planId}/swot
   */
  createSWOTItem: async (
    planId: string,
    data: SWOTItemCreate
  ): Promise<SWOTItem> => {
    const response = await apiClient.post<SWOTItem>(
      `/api/v1/account-plans/${planId}/swot`,
      data
    )
    return response.data
  },

  /**
   * Delete SWOT item
   * DELETE /api/v1/account-plans/swot/{id}
   */
  deleteSWOTItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/account-plans/swot/${id}`)
  },
}
