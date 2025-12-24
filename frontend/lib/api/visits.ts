/**
 * Visits and Calls API Service
 * Handles all visit and call tracking API calls
 * Enhanced with topics, opportunities, and analytics
 */

import { apiClient } from './client'
import type {
  VisitCreate,
  VisitUpdate,
  VisitResponse,
  VisitListResponse,
  VisitCheckIn,
  VisitCheckOut,
  VisitFilters,
  CallCreate,
  CallUpdate,
  CallResponse,
  CallListResponse,
  CallStart,
  CallEnd,
  CallFilters,
} from '@/types/visits'
import type {
  VisitTopic,
  VisitTopicCreate,
  VisitTopicUpdate,
  VisitTopicDetailCreate,
  VisitOpportunityCreate,
} from '@/types/visit'

// ============================================================================
// VISITS API
// ============================================================================

export const visitsApi = {
  /**
   * Get all visits with filters and pagination
   * GET /api/v1/visits
   */
  getVisits: async (filters?: VisitFilters): Promise<VisitListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString ? `/api/v1/visits?${queryString}` : '/api/v1/visits'

    const response = await apiClient.get<VisitListResponse>(url)
    return response.data
  },

  /**
   * Get single visit by ID
   * GET /api/v1/visits/{id}
   */
  getVisit: async (id: string): Promise<VisitResponse> => {
    const response = await apiClient.get<VisitResponse>(`/api/v1/visits/${id}`)
    return response.data
  },

  /**
   * Create new visit
   * POST /api/v1/visits
   */
  createVisit: async (data: VisitCreate): Promise<VisitResponse> => {
    const response = await apiClient.post<VisitResponse>(
      '/api/v1/visits',
      data
    )
    return response.data
  },

  /**
   * Update visit
   * PUT /api/v1/visits/{id}
   */
  updateVisit: async (
    id: string,
    data: VisitUpdate
  ): Promise<VisitResponse> => {
    const response = await apiClient.put<VisitResponse>(
      `/api/v1/visits/${id}`,
      data
    )
    return response.data
  },

  /**
   * Check in to a visit (GPS)
   * POST /api/v1/visits/{id}/check-in
   */
  checkIn: async (id: string, data: VisitCheckIn): Promise<VisitResponse> => {
    const response = await apiClient.post<VisitResponse>(
      `/api/v1/visits/${id}/check-in`,
      data
    )
    return response.data
  },

  /**
   * Check out from a visit (GPS)
   * POST /api/v1/visits/{id}/check-out
   */
  checkOut: async (
    id: string,
    data: VisitCheckOut
  ): Promise<VisitResponse> => {
    const response = await apiClient.post<VisitResponse>(
      `/api/v1/visits/${id}/check-out`,
      data
    )
    return response.data
  },

  /**
   * Delete visit (soft delete)
   * DELETE /api/v1/visits/{id}
   */
  deleteVisit: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/${id}`)
  },
}

// ============================================================================
// CALLS API
// ============================================================================

export const callsApi = {
  /**
   * Get all calls with filters and pagination
   * GET /api/v1/visits/calls
   */
  getCalls: async (filters?: CallFilters): Promise<CallListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.client_id) params.append('client_id', filters.client_id)
      if (filters.call_type) params.append('call_type', filters.call_type)
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
      ? `/api/v1/visits/calls?${queryString}`
      : '/api/v1/visits/calls'

    const response = await apiClient.get<CallListResponse>(url)
    return response.data
  },

  /**
   * Get single call by ID
   * GET /api/v1/visits/calls/{id}
   */
  getCall: async (id: string): Promise<CallResponse> => {
    const response = await apiClient.get<CallResponse>(
      `/api/v1/visits/calls/${id}`
    )
    return response.data
  },

  /**
   * Create new call
   * POST /api/v1/visits/calls
   */
  createCall: async (data: CallCreate): Promise<CallResponse> => {
    const response = await apiClient.post<CallResponse>(
      '/api/v1/visits/calls',
      data
    )
    return response.data
  },

  /**
   * Update call
   * PUT /api/v1/visits/calls/{id}
   */
  updateCall: async (id: string, data: CallUpdate): Promise<CallResponse> => {
    const response = await apiClient.put<CallResponse>(
      `/api/v1/visits/calls/${id}`,
      data
    )
    return response.data
  },

  /**
   * Start a call
   * POST /api/v1/visits/calls/{id}/start
   */
  startCall: async (id: string, data: CallStart): Promise<CallResponse> => {
    const response = await apiClient.post<CallResponse>(
      `/api/v1/visits/calls/${id}/start`,
      data
    )
    return response.data
  },

  /**
   * End a call
   * POST /api/v1/visits/calls/{id}/end
   */
  endCall: async (id: string, data: CallEnd): Promise<CallResponse> => {
    const response = await apiClient.post<CallResponse>(
      `/api/v1/visits/calls/${id}/end`,
      data
    )
    return response.data
  },

  /**
   * Delete call (soft delete)
   * DELETE /api/v1/visits/calls/{id}
   */
  deleteCall: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/calls/${id}`)
  },
}

// ============================================================================
// VISIT TOPICS API
// ============================================================================

export const visitTopicsApi = {
  /**
   * Get all active visit topics (for dropdowns)
   * GET /api/v1/visit-topics/active
   */
  getActive: async (): Promise<VisitTopic[]> => {
    const response = await apiClient.get<VisitTopic[]>(
      '/api/v1/visit-topics/active'
    )
    return response.data
  },

  /**
   * Get paginated list of visit topics
   * GET /api/v1/visit-topics
   */
  getTopics: async (
    isActive?: boolean,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ items: VisitTopic[]; total: number }> => {
    const params = new URLSearchParams()
    if (isActive !== undefined) params.append('is_active', String(isActive))
    params.append('page', String(page))
    params.append('page_size', String(pageSize))

    const queryString = params.toString()
    const url = `/api/v1/visit-topics?${queryString}`

    const response = await apiClient.get<{
      items: VisitTopic[]
      total: number
    }>(url)
    return response.data
  },

  /**
   * Get a specific visit topic by ID
   * GET /api/v1/visit-topics/{id}
   */
  getTopic: async (topicId: string): Promise<VisitTopic> => {
    const response = await apiClient.get<VisitTopic>(
      `/api/v1/visit-topics/${topicId}`
    )
    return response.data
  },

  /**
   * Create a new visit topic
   * POST /api/v1/visit-topics
   */
  createTopic: async (data: VisitTopicCreate): Promise<VisitTopic> => {
    const response = await apiClient.post<VisitTopic>(
      '/api/v1/visit-topics',
      data
    )
    return response.data
  },

  /**
   * Update a visit topic
   * PUT /api/v1/visit-topics/{id}
   */
  updateTopic: async (
    topicId: string,
    data: VisitTopicUpdate
  ): Promise<VisitTopic> => {
    const response = await apiClient.put<VisitTopic>(
      `/api/v1/visit-topics/${topicId}`,
      data
    )
    return response.data
  },

  /**
   * Deactivate a visit topic (soft delete)
   * DELETE /api/v1/visit-topics/{id}
   */
  deactivateTopic: async (topicId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/visit-topics/${topicId}`)
  },

  /**
   * Seed default visit topics
   * POST /api/v1/visit-topics/seed
   */
  seedDefaults: async (): Promise<VisitTopic[]> => {
    const response = await apiClient.post<VisitTopic[]>(
      '/api/v1/visit-topics/seed'
    )
    return response.data
  },
}

// ============================================================================
// VISIT TOPICS (per visit) API
// ============================================================================

export const visitTopicDetailsApi = {
  /**
   * Add a topic to a visit
   * POST /api/v1/visits/{id}/topics
   */
  addTopic: async (
    visitId: string,
    data: VisitTopicDetailCreate
  ): Promise<void> => {
    await apiClient.post(`/api/v1/visits/${visitId}/topics`, data)
  },

  /**
   * Remove a topic from a visit
   * DELETE /api/v1/visits/{id}/topics/{topicDetailId}
   */
  removeTopic: async (
    visitId: string,
    topicDetailId: string
  ): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/${visitId}/topics/${topicDetailId}`)
  },
}

// ============================================================================
// VISIT OPPORTUNITIES (leads) API
// ============================================================================

export const visitOpportunitiesApi = {
  /**
   * Link an opportunity to a visit
   * POST /api/v1/visits/{id}/leads
   */
  linkOpportunity: async (
    visitId: string,
    data: VisitOpportunityCreate
  ): Promise<void> => {
    await apiClient.post(`/api/v1/visits/${visitId}/leads`, data)
  },

  /**
   * Unlink an opportunity from a visit
   * DELETE /api/v1/visits/{id}/leads/{opportunityId}
   */
  unlinkOpportunity: async (
    visitId: string,
    opportunityId: string
  ): Promise<void> => {
    await apiClient.delete(`/api/v1/visits/${visitId}/leads/${opportunityId}`)
  },
}

// ============================================================================
// VISIT ANALYTICS API
// ============================================================================

export const visitAnalyticsApi = {
  /**
   * Get visit analytics summary
   * GET /api/v1/visits/analytics/summary
   */
  getSummary: async (): Promise<any> => {
    const response = await apiClient.get('/api/v1/visits/analytics/summary')
    return response.data
  },

  /**
   * Get visit analytics by client
   * GET /api/v1/visits/analytics/by-client/{clientId}
   */
  getByClient: async (clientId: string): Promise<any> => {
    const response = await apiClient.get(
      `/api/v1/visits/analytics/by-client/${clientId}`
    )
    return response.data
  },

  /**
   * Get visit analytics by topic
   * GET /api/v1/visits/analytics/by-topic
   */
  getByTopic: async (): Promise<any> => {
    const response = await apiClient.get('/api/v1/visits/analytics/by-topic')
    return response.data
  },

  /**
   * Get conversion funnel analytics
   * GET /api/v1/visits/analytics/conversion
   */
  getConversionFunnel: async (): Promise<any> => {
    const response = await apiClient.get(
      '/api/v1/visits/analytics/conversion'
    )
    return response.data
  },
}
