/**
 * Opportunities API Client
 * API functions for opportunity/sales pipeline management
 */

import { apiClient } from './client'
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityListResponse,
  OpportunityFilters,
  PipelineStats,
  OpportunityStage,
  StageUpdateRequest,
} from '@/types/opportunities'

const BASE_URL = '/api/v1/opportunities'

/**
 * Get all opportunities with filters
 */
export const getOpportunities = async (
  filters?: OpportunityFilters
): Promise<OpportunityListResponse> => {
  const params = new URLSearchParams()

  if (filters?.stage) {
    params.append('stage', filters.stage)
  }
  if (filters?.client_id) {
    params.append('client_id', filters.client_id)
  }
  if (filters?.assigned_to) {
    params.append('assigned_to', filters.assigned_to)
  }
  if (filters?.min_value) {
    params.append('min_value', filters.min_value.toString())
  }
  if (filters?.max_value) {
    params.append('max_value', filters.max_value.toString())
  }
  if (filters?.search) {
    params.append('search', filters.search)
  }
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }
  if (filters?.page_size) {
    params.append('page_size', filters.page_size.toString())
  }

  const url = params.toString() ? `${BASE_URL}?${params}` : BASE_URL
  const response = await apiClient.get<OpportunityListResponse>(url)
  return response.data
}

/**
 * Get a single opportunity by ID
 */
export const getOpportunity = async (id: string): Promise<Opportunity> => {
  const response = await apiClient.get<Opportunity>(`${BASE_URL}/${id}`)
  return response.data
}

/**
 * Create a new opportunity
 */
export const createOpportunity = async (
  data: OpportunityCreate
): Promise<Opportunity> => {
  const response = await apiClient.post<Opportunity>(BASE_URL, data)
  return response.data
}

/**
 * Update an existing opportunity
 */
export const updateOpportunity = async (
  id: string,
  data: OpportunityUpdate
): Promise<Opportunity> => {
  const response = await apiClient.patch<Opportunity>(`${BASE_URL}/${id}`, data)
  return response.data
}

/**
 * Update opportunity stage (for drag and drop)
 */
export const updateOpportunityStage = async (
  id: string,
  stage: OpportunityStage
): Promise<Opportunity> => {
  const data: StageUpdateRequest = { stage }
  const response = await apiClient.patch<Opportunity>(
    `${BASE_URL}/${id}/stage`,
    data
  )
  return response.data
}

/**
 * Delete an opportunity
 */
export const deleteOpportunity = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/${id}`)
}

/**
 * Get pipeline statistics
 */
export const getPipelineStats = async (): Promise<PipelineStats> => {
  const response = await apiClient.get<PipelineStats>(`${BASE_URL}/stats`)
  return response.data
}
