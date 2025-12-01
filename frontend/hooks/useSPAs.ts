/**
 * useSPAs Hooks
 * Custom hooks for managing Special Price Agreements
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  listSPAs,
  getSPADetail,
  getClientSPAs,
  uploadSPAFile,
  searchSPADiscount,
  getSPAStats,
  deleteSPA,
  getUploadHistory,
  downloadSPAExport,
} from '@/lib/api/spa'
import type {
  SPAAgreement,
  SPAAgreementWithClient,
  SPASearchParams,
  SPAListResponse,
  SPAUploadResult,
  SPADiscountSearchRequest,
  SPADiscountResponse,
  SPAStats,
  SPAUploadLog,
} from '@/types/spa'

/**
 * useSPAs Hook
 * Main hook for listing and managing SPAs
 */
interface UseSPAsReturn {
  // State
  spas: SPAAgreement[]
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  error: string | null

  // Operations
  fetchSPAs: (params?: SPASearchParams) => Promise<void>
  deleteSPAById: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
  exportToFile: (clientId?: string, activeOnly?: boolean) => Promise<void>
}

export function useSPAs(initialParams?: SPASearchParams): UseSPAsReturn {
  const { toast } = useToast()
  const [spas, setSPAs] = useState<SPAAgreement[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentParams, setCurrentParams] = useState<
    SPASearchParams | undefined
  >(initialParams)

  /**
   * Fetch SPAs with filters and pagination
   */
  const fetchSPAs = useCallback(
    async (params?: SPASearchParams) => {
      setLoading(true)
      setError(null)
      setCurrentParams(params)

      try {
        const response: SPAListResponse = await listSPAs(params)
        setSPAs(response.items)
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          pages: response.pages,
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch SPAs'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /**
   * Delete SPA by ID
   */
  const deleteSPAById = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await deleteSPA(id)
        setSPAs((prev) => prev.filter((spa) => spa.id !== id))
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
        toast({
          title: 'Success',
          description: 'SPA deleted successfully',
        })
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete SPA'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return false
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  /**
   * Export SPAs to Excel and download
   */
  const exportToFile = useCallback(
    async (clientId?: string, activeOnly: boolean = false) => {
      try {
        await downloadSPAExport(clientId, activeOnly)
        toast({
          title: 'Success',
          description: 'SPA export downloaded successfully',
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to export SPAs'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    },
    [toast]
  )

  /**
   * Refetch SPAs with current params
   */
  const refetch = useCallback(async () => {
    await fetchSPAs(currentParams)
  }, [fetchSPAs, currentParams])

  // Initial fetch
  useEffect(() => {
    fetchSPAs(initialParams)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    spas,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    pages: pagination.pages,
    loading,
    error,
    fetchSPAs,
    deleteSPAById,
    refetch,
    exportToFile,
  }
}

/**
 * useSingleSPA Hook
 * Hook for managing a single SPA detail
 */
interface UseSingleSPAReturn {
  spa: SPAAgreementWithClient | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  deleteSPAById: () => Promise<boolean>
}

export function useSingleSPA(id: string): UseSingleSPAReturn {
  const { toast } = useToast()
  const [spa, setSPA] = useState<SPAAgreementWithClient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch single SPA detail
   */
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getSPADetail(id)
      setSPA(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch SPA detail'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  /**
   * Delete SPA
   */
  const deleteSPAById = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await deleteSPA(id)
      toast({
        title: 'Success',
        description: 'SPA deleted successfully',
      })
      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete SPA'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    spa,
    loading,
    error,
    fetch,
    deleteSPAById,
  }
}

/**
 * useClientSPAs Hook
 * Hook for getting all SPAs for a specific client
 */
interface UseClientSPAsReturn {
  spas: SPAAgreement[]
  loading: boolean
  error: string | null
  fetch: (activeOnly?: boolean) => Promise<void>
  refetch: () => Promise<void>
}

export function useClientSPAs(
  clientId: string,
  initialActiveOnly: boolean = true
): UseClientSPAsReturn {
  const { toast } = useToast()
  const [spas, setSPAs] = useState<SPAAgreement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly)

  /**
   * Fetch client SPAs
   */
  const fetch = useCallback(
    async (activeOnlyParam?: boolean) => {
      setLoading(true)
      setError(null)
      const active = activeOnlyParam !== undefined ? activeOnlyParam : activeOnly
      setActiveOnly(active)

      try {
        const data = await getClientSPAs(clientId, active)
        setSPAs(data)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch client SPAs'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [clientId, activeOnly, toast]
  )

  /**
   * Refetch with current activeOnly setting
   */
  const refetch = useCallback(async () => {
    await fetch(activeOnly)
  }, [fetch, activeOnly])

  // Initial fetch
  useEffect(() => {
    fetch(initialActiveOnly)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    spas,
    loading,
    error,
    fetch,
    refetch,
  }
}

/**
 * useSPAUpload Hook
 * Hook for uploading SPA files
 */
interface UseSPAUploadReturn {
  uploading: boolean
  result: SPAUploadResult | null
  error: string | null
  upload: (file: File, autoCreateClients?: boolean) => Promise<SPAUploadResult | null>
  reset: () => void
}

export function useSPAUpload(): UseSPAUploadReturn {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<SPAUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Upload SPA file
   */
  const upload = useCallback(
    async (
      file: File,
      autoCreateClients: boolean = false
    ): Promise<SPAUploadResult | null> => {
      setUploading(true)
      setError(null)
      setResult(null)

      try {
        const uploadResult = await uploadSPAFile(file, autoCreateClients)
        setResult(uploadResult)

        if (uploadResult.error_count > 0) {
          toast({
            title: 'Upload completed with errors',
            description: `${uploadResult.success_count} records imported, ${uploadResult.error_count} errors`,
            variant: 'default',
          })
        } else {
          toast({
            title: 'Success',
            description: `${uploadResult.success_count} SPA records imported successfully`,
          })
        }

        return uploadResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to upload SPA file'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setUploading(false)
      }
    },
    [toast]
  )

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    uploading,
    result,
    error,
    upload,
    reset,
  }
}

/**
 * useSPAStats Hook
 * Hook for SPA statistics
 */
interface UseSPAStatsReturn {
  stats: SPAStats | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  refetch: () => Promise<void>
}

export function useSPAStats(): UseSPAStatsReturn {
  const { toast } = useToast()
  const [stats, setStats] = useState<SPAStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch SPA statistics
   */
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getSPAStats()
      setStats(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch SPA statistics'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  /**
   * Refetch statistics
   */
  const refetch = useCallback(async () => {
    await fetch()
  }, [fetch])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    stats,
    loading,
    error,
    fetch,
    refetch,
  }
}

/**
 * useSPADiscount Hook
 * Hook for searching SPA discounts
 */
interface UseSPADiscountReturn {
  searching: boolean
  result: SPADiscountResponse | null
  error: string | null
  search: (request: SPADiscountSearchRequest) => Promise<SPADiscountResponse | null>
  reset: () => void
}

export function useSPADiscount(): UseSPADiscountReturn {
  const { toast } = useToast()
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<SPADiscountResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Search for discount
   */
  const search = useCallback(
    async (
      request: SPADiscountSearchRequest
    ): Promise<SPADiscountResponse | null> => {
      setSearching(true)
      setError(null)

      try {
        const searchResult = await searchSPADiscount(request)
        setResult(searchResult)
        return searchResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search discount'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setSearching(false)
      }
    },
    [toast]
  )

  /**
   * Reset search state
   */
  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    searching,
    result,
    error,
    search,
    reset,
  }
}

/**
 * useSPAUploadHistory Hook
 * Hook for SPA upload history
 */
interface UseSPAUploadHistoryReturn {
  logs: SPAUploadLog[]
  loading: boolean
  error: string | null
  fetch: (limit?: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useSPAUploadHistory(
  initialLimit: number = 20
): UseSPAUploadHistoryReturn {
  const { toast } = useToast()
  const [logs, setLogs] = useState<SPAUploadLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(initialLimit)

  /**
   * Fetch upload history
   */
  const fetch = useCallback(
    async (limitParam?: number) => {
      setLoading(true)
      setError(null)
      const currentLimit = limitParam !== undefined ? limitParam : limit
      setLimit(currentLimit)

      try {
        const data = await getUploadHistory(currentLimit)
        setLogs(data)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch upload history'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [limit, toast]
  )

  /**
   * Refetch with current limit
   */
  const refetch = useCallback(async () => {
    await fetch(limit)
  }, [fetch, limit])

  // Initial fetch
  useEffect(() => {
    fetch(initialLimit)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    logs,
    loading,
    error,
    fetch,
    refetch,
  }
}
