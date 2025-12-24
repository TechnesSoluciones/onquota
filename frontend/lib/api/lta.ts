/**
 * LTA API Client
 * API functions for managing Long Term Agreements
 */

import { apiClient } from './client'
import type {
  LTAAgreement,
  LTAAgreementCreate,
  LTAAgreementUpdate,
  LTAAgreementWithClient,
  LTAListResponse,
} from '@/types/lta'

const BASE_URL = '/api/v1/lta'

/**
 * Create a new LTA agreement
 */
export async function createLTA(
  data: LTAAgreementCreate
): Promise<LTAAgreement> {
  return apiClient.post<LTAAgreement>(BASE_URL, data)
}

/**
 * List all LTA agreements with pagination
 */
export async function listLTAs(
  activeOnly: boolean = false,
  page: number = 1,
  limit: number = 20
): Promise<LTAListResponse> {
  const params = new URLSearchParams()
  if (activeOnly) params.append('active_only', 'true')
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  const url = `${BASE_URL}?${params.toString()}`
  return apiClient.get<LTAListResponse>(url)
}

/**
 * Get LTA agreement by ID
 */
export async function getLTADetail(id: string): Promise<LTAAgreementWithClient> {
  return apiClient.get<LTAAgreementWithClient>(`${BASE_URL}/${id}`)
}

/**
 * Get LTA agreement for a specific client
 */
export async function getClientLTA(
  clientId: string
): Promise<LTAAgreementWithClient | null> {
  return apiClient.get<LTAAgreementWithClient | null>(
    `${BASE_URL}/client/${clientId}`
  )
}

/**
 * Get LTA agreement by agreement number
 */
export async function getLTAByNumber(
  agreementNumber: string
): Promise<LTAAgreementWithClient> {
  return apiClient.get<LTAAgreementWithClient>(
    `${BASE_URL}/agreement/${agreementNumber}`
  )
}

/**
 * Update LTA agreement
 */
export async function updateLTA(
  id: string,
  data: LTAAgreementUpdate
): Promise<LTAAgreement> {
  return apiClient.put<LTAAgreement>(`${BASE_URL}/${id}`, data)
}

/**
 * Delete LTA agreement
 */
export async function deleteLTA(id: string): Promise<void> {
  return apiClient.delete(`${BASE_URL}/${id}`)
}
