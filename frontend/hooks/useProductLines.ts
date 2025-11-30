/**
 * useProductLines Hooks
 * Custom hooks for managing product lines catalog
 */

import { useState, useEffect, useCallback } from 'react'
import { productLinesApi } from '@/lib/api/product-lines'
import type {
  ProductLine,
  ProductLineFilters,
  ProductLineCreate,
  ProductLineUpdate,
} from '@/types/sales'

/**
 * Hook to manage product lines list with filtering and pagination
 */
export function useProductLines(initialFilters?: ProductLineFilters) {
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<ProductLineFilters>(
    initialFilters || {}
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProductLines = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await productLinesApi.getProductLines({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setProductLines(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading product lines'
      setError(errorMessage)
      setProductLines([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchProductLines()
  }, [fetchProductLines])

  const updateFilters = (newFilters: Partial<ProductLineFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.total_pages) {
      setPagination((prev) => ({ ...prev, page }))
    }
  }

  const refresh = () => {
    fetchProductLines()
  }

  return {
    productLines,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  }
}

/**
 * Hook to get active product lines (for dropdowns)
 */
export function useActiveProductLines() {
  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActiveProductLines = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await productLinesApi.getActiveProductLines()
      setProductLines(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading active product lines'
      setError(errorMessage)
      setProductLines([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActiveProductLines()
  }, [fetchActiveProductLines])

  return {
    productLines,
    isLoading,
    error,
    refresh: fetchActiveProductLines,
  }
}

/**
 * Hook to get a single product line by ID
 */
export function useProductLine(id: string) {
  const [productLine, setProductLine] = useState<ProductLine | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProductLine = useCallback(async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await productLinesApi.getProductLine(id)
      setProductLine(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading product line'
      setError(errorMessage)
      setProductLine(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProductLine()
  }, [fetchProductLine])

  return {
    productLine,
    isLoading,
    error,
    refresh: fetchProductLine,
  }
}

/**
 * Hook to create a product line
 */
export function useCreateProductLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProductLine = async (
    data: ProductLineCreate
  ): Promise<ProductLine | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const newProductLine = await productLinesApi.createProductLine(data)
      return newProductLine
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error creating product line'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createProductLine,
    isLoading,
    error,
  }
}

/**
 * Hook to update a product line
 */
export function useUpdateProductLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProductLine = async (
    id: string,
    data: ProductLineUpdate
  ): Promise<ProductLine | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const updatedProductLine = await productLinesApi.updateProductLine(
        id,
        data
      )
      return updatedProductLine
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error updating product line'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    updateProductLine,
    isLoading,
    error,
  }
}

/**
 * Hook to delete a product line
 */
export function useDeleteProductLine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteProductLine = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      await productLinesApi.deleteProductLine(id)
      return true
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error deleting product line'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    deleteProductLine,
    isLoading,
    error,
  }
}
