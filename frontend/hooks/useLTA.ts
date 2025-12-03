/**
 * useLTA Hooks
 * Custom hooks for managing Long Term Agreements
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  createLTA,
  listLTAs,
  getLTADetail,
  getClientLTA,
  updateLTA,
  deleteLTA,
} from '@/lib/api/lta'
import type {
  LTAAgreement,
  LTAAgreementCreate,
  LTAAgreementUpdate,
  LTAAgreementWithClient,
  LTAListResponse,
} from '@/types/lta'

/**
 * useClientLTA Hook
 * Hook for getting the LTA for a specific client
 */
interface UseClientLTAReturn {
  lta: LTAAgreementWithClient | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  create: (data: Omit<LTAAgreementCreate, 'client_id'>) => Promise<boolean>
  update: (data: LTAAgreementUpdate) => Promise<boolean>
  deleteLTA: () => Promise<boolean>
  refetch: () => Promise<void>
}

export function useClientLTA(clientId: string): UseClientLTAReturn {
  const { toast } = useToast()
  const [lta, setLTA] = useState<LTAAgreementWithClient | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch client LTA
   */
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getClientLTA(clientId)
      setLTA(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch client LTA'
      setError(errorMessage)
      // Don't show toast for 404 (no LTA exists yet)
      if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [clientId, toast])

  /**
   * Create new LTA for client
   */
  const create = useCallback(
    async (data: Omit<LTAAgreementCreate, 'client_id'>): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const ltaData: LTAAgreementCreate = {
          ...data,
          client_id: clientId,
        }
        const newLTA = await createLTA(ltaData)
        setLTA(newLTA as LTAAgreementWithClient)
        toast({
          title: 'Éxito',
          description: 'LTA creado exitosamente',
        })
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create LTA'
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
    [clientId, toast]
  )

  /**
   * Update existing LTA
   */
  const update = useCallback(
    async (data: LTAAgreementUpdate): Promise<boolean> => {
      if (!lta) return false

      setLoading(true)
      setError(null)

      try {
        const updatedLTA = await updateLTA(lta.id, data)
        setLTA({ ...lta, ...updatedLTA })
        toast({
          title: 'Éxito',
          description: 'LTA actualizado exitosamente',
        })
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update LTA'
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
    [lta, toast]
  )

  /**
   * Delete LTA
   */
  const deleteLTAFn = useCallback(async (): Promise<boolean> => {
    if (!lta) return false

    setLoading(true)
    setError(null)

    try {
      await deleteLTA(lta.id)
      setLTA(null)
      toast({
        title: 'Éxito',
        description: 'LTA eliminado exitosamente',
      })
      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete LTA'
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
  }, [lta, toast])

  /**
   * Refetch LTA
   */
  const refetch = useCallback(async () => {
    await fetch()
  }, [fetch])

  // Initial fetch
  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    lta,
    loading,
    error,
    fetch,
    create,
    update,
    deleteLTA: deleteLTAFn,
    refetch,
  }
}

/**
 * useLTAs Hook
 * Hook for listing all LTAs
 */
interface UseLTAsReturn {
  ltas: LTAAgreement[]
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  error: string | null
  fetchLTAs: (activeOnly?: boolean, page?: number, limit?: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useLTAs(
  initialActiveOnly: boolean = false,
  initialPage: number = 1,
  initialLimit: number = 20
): UseLTAsReturn {
  const { toast } = useToast()
  const [ltas, setLTAs] = useState<LTAAgreement[]>([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: initialPage,
    limit: initialLimit,
    pages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeOnly, setActiveOnly] = useState(initialActiveOnly)

  /**
   * Fetch LTAs with filters and pagination
   */
  const fetchLTAs = useCallback(
    async (
      activeOnlyParam?: boolean,
      pageParam?: number,
      limitParam?: number
    ) => {
      setLoading(true)
      setError(null)

      const active = activeOnlyParam !== undefined ? activeOnlyParam : activeOnly
      const page = pageParam !== undefined ? pageParam : pagination.page
      const limit = limitParam !== undefined ? limitParam : pagination.limit

      setActiveOnly(active)

      try {
        const response: LTAListResponse = await listLTAs(active, page, limit)
        setLTAs(response.items)
        setPagination({
          total: response.total,
          page: response.page,
          limit: response.limit,
          pages: response.pages,
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch LTAs'
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
    [activeOnly, pagination.page, pagination.limit, toast]
  )

  /**
   * Refetch with current params
   */
  const refetch = useCallback(async () => {
    await fetchLTAs(activeOnly, pagination.page, pagination.limit)
  }, [fetchLTAs, activeOnly, pagination.page, pagination.limit])

  // Initial fetch
  useEffect(() => {
    fetchLTAs(initialActiveOnly, initialPage, initialLimit)
  }, [fetchLTAs, initialActiveOnly, initialPage, initialLimit])

  return {
    ltas,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    pages: pagination.pages,
    loading,
    error,
    fetchLTAs,
    refetch,
  }
}
