/**
 * Clients API Service
 * Handles all client/CRM-related API calls
 */

import { apiClient } from './client'
import type {
  ClientCreate,
  ClientUpdate,
  ClientResponse,
  ClientListResponse,
  ClientSummary,
  ClientFilters,
} from '@/types/client'

/**
 * Clients API endpoints
 */
export const clientsApi = {
  /**
   * Get all clients with filters and pagination
   * GET /api/v1/clients
   */
  getClients: async (filters?: ClientFilters): Promise<ClientListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.client_type) params.append('client_type', filters.client_type)
      if (filters.industry) params.append('industry', filters.industry)
      if (filters.is_active !== undefined)
        params.append('is_active', filters.is_active.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString ? `/api/v1/clients?${queryString}` : '/api/v1/clients'

    const response = await apiClient.get<ClientListResponse>(url)
    return response.data
  },

  /**
   * Get single client by ID
   * GET /api/v1/clients/{id}
   */
  getClient: async (id: string): Promise<ClientResponse> => {
    const response = await apiClient.get<ClientResponse>(
      `/api/v1/clients/${id}`
    )
    return response.data
  },

  /**
   * Create new client
   * POST /api/v1/clients
   */
  createClient: async (data: ClientCreate): Promise<ClientResponse> => {
    const response = await apiClient.post<ClientResponse>(
      '/api/v1/clients',
      data
    )
    return response.data
  },

  /**
   * Update client
   * PUT /api/v1/clients/{id}
   */
  updateClient: async (
    id: string,
    data: ClientUpdate
  ): Promise<ClientResponse> => {
    const response = await apiClient.put<ClientResponse>(
      `/api/v1/clients/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete client
   * DELETE /api/v1/clients/{id}
   */
  deleteClient: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/clients/${id}`)
  },

  /**
   * Get client summary/statistics
   * GET /api/v1/clients/summary
   */
  getClientSummary: async (): Promise<ClientSummary> => {
    const response = await apiClient.get<ClientSummary>(
      '/api/v1/clients/summary'
    )
    return response.data
  },

  /**
   * Convert lead to active client
   * PATCH /api/v1/clients/{id}/convert
   */
  convertLead: async (id: string): Promise<ClientResponse> => {
    const response = await apiClient.patch<ClientResponse>(
      `/api/v1/clients/${id}/convert`
    )
    return response.data
  },

  /**
   * Mark client as lost
   * PATCH /api/v1/clients/{id}/mark-lost
   */
  markAsLost: async (id: string, reason?: string): Promise<ClientResponse> => {
    const response = await apiClient.patch<ClientResponse>(
      `/api/v1/clients/${id}/mark-lost`,
      { reason }
    )
    return response.data
  },

  /**
   * Reactivate inactive client
   * PATCH /api/v1/clients/{id}/reactivate
   */
  reactivateClient: async (id: string): Promise<ClientResponse> => {
    const response = await apiClient.patch<ClientResponse>(
      `/api/v1/clients/${id}/reactivate`
    )
    return response.data
  },

  /**
   * Get clients by status
   * GET /api/v1/clients/by-status/{status}
   */
  getClientsByStatus: async (
    status: string,
    page?: number,
    page_size?: number
  ): Promise<ClientListResponse> => {
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (page_size !== undefined)
      params.append('page_size', page_size.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/clients/by-status/${status}?${queryString}`
      : `/api/v1/clients/by-status/${status}`

    const response = await apiClient.get<ClientListResponse>(url)
    return response.data
  },

  /**
   * Get clients by industry
   * GET /api/v1/clients/by-industry/{industry}
   */
  getClientsByIndustry: async (
    industry: string,
    page?: number,
    page_size?: number
  ): Promise<ClientListResponse> => {
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (page_size !== undefined)
      params.append('page_size', page_size.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/clients/by-industry/${industry}?${queryString}`
      : `/api/v1/clients/by-industry/${industry}`

    const response = await apiClient.get<ClientListResponse>(url)
    return response.data
  },

  /**
   * Search clients
   * GET /api/v1/clients/search
   */
  searchClients: async (
    query: string,
    page?: number,
    page_size?: number
  ): Promise<ClientListResponse> => {
    const params = new URLSearchParams()
    params.append('q', query)
    if (page !== undefined) params.append('page', page.toString())
    if (page_size !== undefined)
      params.append('page_size', page_size.toString())

    const response = await apiClient.get<ClientListResponse>(
      `/api/v1/clients/search?${params.toString()}`
    )
    return response.data
  },
}

// Named exports for convenience
export const getClients = clientsApi.getClients
export const getClient = clientsApi.getClient
export const createClient = clientsApi.createClient
export const updateClient = clientsApi.updateClient
export const deleteClient = clientsApi.deleteClient
export const getClientSummary = clientsApi.getClientSummary
export const convertLead = clientsApi.convertLead
export const markAsLost = clientsApi.markAsLost
export const reactivateClient = clientsApi.reactivateClient
export const getClientsByStatus = clientsApi.getClientsByStatus
export const getClientsByIndustry = clientsApi.getClientsByIndustry
export const searchClients = clientsApi.searchClients
