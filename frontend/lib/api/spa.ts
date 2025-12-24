/**
 * SPA (Special Price Agreements) API Service
 * Handles all SPA-related API calls
 */

import { apiClient } from './client'
import type {
  SPAUploadResult,
  SPAListResponse,
  SPAAgreement,
  SPAAgreementWithClient,
  SPADiscountSearchRequest,
  SPADiscountResponse,
  SPAStats,
  SPASearchParams,
  SPAUploadLog,
} from '@/types/spa'

/**
 * SPA API endpoints
 */
export const spaApi = {
  /**
   * Upload SPA file (Excel or TSV)
   * POST /api/v1/spa/upload
   */
  uploadFile: async (
    file: File,
    autoCreateClients: boolean = false
  ): Promise<SPAUploadResult> => {
    const formData = new FormData()
    formData.append('file', file)

    const params = new URLSearchParams()
    params.append('auto_create_clients', autoCreateClients.toString())

    const response = await apiClient.post<SPAUploadResult>(
      `/api/v1/spa/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Get all SPAs with filters and pagination
   * GET /api/v1/spa
   */
  listSPAs: async (params?: SPASearchParams): Promise<SPAListResponse> => {
    const queryParams = new URLSearchParams()

    if (params) {
      if (params.page !== undefined)
        queryParams.append('page', params.page.toString())
      if (params.limit !== undefined)
        queryParams.append('page_size', params.limit.toString())
      if (params.client_id) queryParams.append('client_id', params.client_id)
      if (params.article_number)
        queryParams.append('article_number', params.article_number)
      if (params.bpid) queryParams.append('bpid', params.bpid)
      if (params.is_active !== undefined && params.is_active !== null)
        queryParams.append('active_only', params.is_active.toString())
      if (params.search) queryParams.append('search', params.search)
      if (params.sort_by) queryParams.append('sort_by', params.sort_by)
      if (params.sort_order === 'desc')
        queryParams.append('sort_desc', 'true')
      else if (params.sort_order === 'asc')
        queryParams.append('sort_desc', 'false')
    }

    const queryString = queryParams.toString()
    const url = queryString ? `/api/v1/spa?${queryString}` : '/api/v1/spa'

    const response = await apiClient.get<SPAListResponse>(url)
    return response.data
  },

  /**
   * Get single SPA by ID with client details
   * GET /api/v1/spa/{id}
   */
  getSPADetail: async (spaId: string): Promise<SPAAgreementWithClient> => {
    const response = await apiClient.get<SPAAgreementWithClient>(
      `/api/v1/spa/${spaId}`
    )
    return response.data
  },

  /**
   * Get all SPAs for a specific client
   * GET /api/v1/spa/client/{client_id}
   */
  getClientSPAs: async (
    clientId: string,
    activeOnly: boolean = true
  ): Promise<SPAAgreement[]> => {
    const params = new URLSearchParams()
    params.append('active_only', activeOnly.toString())

    const response = await apiClient.get<SPAAgreement[]>(
      `/api/v1/spa/client/${clientId}?${params.toString()}`
    )
    return response.data
  },

  /**
   * Search for best discount for a product/client combination
   * POST /api/v1/spa/search-discount
   */
  searchDiscount: async (
    request: SPADiscountSearchRequest
  ): Promise<SPADiscountResponse> => {
    const response = await apiClient.post<SPADiscountResponse>(
      '/api/v1/spa/search-discount',
      request
    )
    return response.data
  },

  /**
   * Get SPA statistics
   * GET /api/v1/spa/stats
   */
  getStats: async (): Promise<SPAStats> => {
    const response = await apiClient.get<SPAStats>('/api/v1/spa/stats')
    return response.data
  },

  /**
   * Export SPAs to Excel
   * GET /api/v1/spa/export
   * Returns a downloadable Excel file
   */
  exportSPAs: async (
    clientId?: string,
    activeOnly: boolean = false
  ): Promise<Blob> => {
    const params = new URLSearchParams()
    if (clientId) params.append('client_id', clientId)
    params.append('active_only', activeOnly.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/spa/export?${queryString}`
      : '/api/v1/spa/export'

    const response = await apiClient.get(url, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Delete SPA (soft delete)
   * DELETE /api/v1/spa/{id}
   */
  deleteSPA: async (spaId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/spa/${spaId}`)
  },

  /**
   * Get upload history
   * GET /api/v1/spa/uploads/history
   */
  getUploadHistory: async (limit: number = 20): Promise<SPAUploadLog[]> => {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())

    const response = await apiClient.get<SPAUploadLog[]>(
      `/api/v1/spa/uploads/history?${params.toString()}`
    )
    return response.data
  },

  /**
   * Helper: Download exported file
   * Triggers browser download for Excel file
   */
  downloadExport: async (
    clientId?: string,
    activeOnly: boolean = false,
    filename?: string
  ): Promise<void> => {
    const blob = await spaApi.exportSPAs(clientId, activeOnly)

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download =
      filename || `spas_export_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

// Named exports for convenience
export const uploadSPAFile = spaApi.uploadFile
export const listSPAs = spaApi.listSPAs
export const getSPADetail = spaApi.getSPADetail
export const getClientSPAs = spaApi.getClientSPAs
export const searchSPADiscount = spaApi.searchDiscount
export const getSPAStats = spaApi.getStats
export const exportSPAs = spaApi.exportSPAs
export const deleteSPA = spaApi.deleteSPA
export const getUploadHistory = spaApi.getUploadHistory
export const downloadSPAExport = spaApi.downloadExport
