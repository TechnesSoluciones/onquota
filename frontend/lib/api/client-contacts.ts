/**
 * Client Contacts API Service
 * Handles all client contacts (employees) API calls
 */

import { apiClient } from './client'
import type {
  ClientContact,
  ClientContactCreate,
  ClientContactUpdate,
  ClientContactListResponse,
} from '@/types/client'

/**
 * Client Contacts API endpoints
 */
export const clientContactsApi = {
  /**
   * Get all contacts for a client
   * GET /api/v1/clients/{client_id}/contacts
   */
  getClientContacts: async (
    clientId: string,
    page?: number,
    pageSize?: number,
    isActive?: boolean
  ): Promise<ClientContactListResponse> => {
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (pageSize !== undefined) params.append('page_size', pageSize.toString())
    if (isActive !== undefined) params.append('is_active', isActive.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/clients/${clientId}/contacts?${queryString}`
      : `/api/v1/clients/${clientId}/contacts`

    const response = await apiClient.get<ClientContactListResponse>(url)
    return response.data
  },

  /**
   * Get single contact by ID
   * GET /api/v1/clients/{client_id}/contacts/{contact_id}
   */
  getClientContact: async (
    clientId: string,
    contactId: string
  ): Promise<ClientContact> => {
    const response = await apiClient.get<ClientContact>(
      `/api/v1/clients/${clientId}/contacts/${contactId}`
    )
    return response.data
  },

  /**
   * Create new contact
   * POST /api/v1/clients/{client_id}/contacts
   */
  createClientContact: async (
    clientId: string,
    data: ClientContactCreate
  ): Promise<ClientContact> => {
    const response = await apiClient.post<ClientContact>(
      `/api/v1/clients/${clientId}/contacts`,
      data
    )
    return response.data
  },

  /**
   * Update contact
   * PUT /api/v1/clients/{client_id}/contacts/{contact_id}
   */
  updateClientContact: async (
    clientId: string,
    contactId: string,
    data: ClientContactUpdate
  ): Promise<ClientContact> => {
    const response = await apiClient.put<ClientContact>(
      `/api/v1/clients/${clientId}/contacts/${contactId}`,
      data
    )
    return response.data
  },

  /**
   * Delete contact (soft delete)
   * DELETE /api/v1/clients/{client_id}/contacts/{contact_id}
   */
  deleteClientContact: async (
    clientId: string,
    contactId: string
  ): Promise<void> => {
    await apiClient.delete(`/api/v1/clients/${clientId}/contacts/${contactId}`)
  },
}
