/**
 * Product Lines API Service
 * Handles all product lines catalog API calls
 */

import { apiClient } from './client'
import type {
  ProductLineCreate,
  ProductLineUpdate,
  ProductLine,
  ProductLineListResponse,
  ProductLineFilters,
} from '@/types/sales'

/**
 * Product Lines API endpoints
 */
export const productLinesApi = {
  /**
   * Get all product lines with filters and pagination
   * GET /api/v1/sales/product-lines
   */
  getProductLines: async (
    filters?: ProductLineFilters
  ): Promise<ProductLineListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.is_active !== undefined)
        params.append('is_active', filters.is_active.toString())
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/sales/product-lines?${queryString}`
      : '/api/v1/sales/product-lines'

    const response = await apiClient.get<ProductLineListResponse>(url)
    return response.data
  },

  /**
   * Get all active product lines (for dropdowns)
   * GET /api/v1/sales/product-lines/active
   */
  getActiveProductLines: async (): Promise<ProductLine[]> => {
    const response = await apiClient.get<ProductLine[]>(
      '/api/v1/sales/product-lines/active'
    )
    return response.data
  },

  /**
   * Get single product line by ID
   * GET /api/v1/sales/product-lines/{id}
   */
  getProductLine: async (id: string): Promise<ProductLine> => {
    const response = await apiClient.get<ProductLine>(
      `/api/v1/sales/product-lines/${id}`
    )
    return response.data
  },

  /**
   * Create new product line
   * POST /api/v1/sales/product-lines
   */
  createProductLine: async (data: ProductLineCreate): Promise<ProductLine> => {
    const response = await apiClient.post<ProductLine>(
      '/api/v1/sales/product-lines',
      data
    )
    return response.data
  },

  /**
   * Update product line
   * PUT /api/v1/sales/product-lines/{id}
   */
  updateProductLine: async (
    id: string,
    data: ProductLineUpdate
  ): Promise<ProductLine> => {
    const response = await apiClient.put<ProductLine>(
      `/api/v1/sales/product-lines/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete product line (soft delete)
   * DELETE /api/v1/sales/product-lines/{id}
   */
  deleteProductLine: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sales/product-lines/${id}`)
  },
}
