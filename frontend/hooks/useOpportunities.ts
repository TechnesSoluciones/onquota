/**
 * useOpportunities Hook
 * Custom hook for managing opportunities state and operations
 */

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStage,
  deleteOpportunity,
  getPipelineStats,
} from '@/lib/api/opportunities'
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityUpdate,
  OpportunityFilters,
  PipelineStats,
  OpportunityStage,
} from '@/types/opportunities'

interface UseOpportunitiesReturn {
  // State
  opportunities: Opportunity[]
  stats: PipelineStats | null
  loading: boolean
  error: string | null

  // Operations
  fetchOpportunities: (filters?: OpportunityFilters) => Promise<void>
  fetchStats: () => Promise<void>
  create: (data: OpportunityCreate) => Promise<Opportunity | null>
  update: (id: string, data: OpportunityUpdate) => Promise<Opportunity | null>
  updateStage: (id: string, stage: OpportunityStage) => Promise<Opportunity | null>
  remove: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useOpportunities(
  initialFilters?: OpportunityFilters
): UseOpportunitiesReturn {
  const { toast } = useToast()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFilters, setCurrentFilters] = useState<
    OpportunityFilters | undefined
  >(initialFilters)

  /**
   * Fetch opportunities with filters
   */
  const fetchOpportunities = useCallback(
    async (filters?: OpportunityFilters) => {
      setLoading(true)
      setError(null)
      setCurrentFilters(filters)

      try {
        const response = await getOpportunities(filters)
        setOpportunities(response.items)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch opportunities'
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
   * Fetch pipeline statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getPipelineStats()
      setStats(statsData)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch statistics'
      console.error('Error fetching stats:', errorMessage)
    }
  }, [])

  /**
   * Create a new opportunity
   */
  const create = useCallback(
    async (data: OpportunityCreate): Promise<Opportunity | null> => {
      setLoading(true)
      setError(null)

      try {
        const newOpportunity = await createOpportunity(data)
        setOpportunities((prev) => [newOpportunity, ...prev])
        toast({
          title: 'Success',
          description: 'Opportunity created successfully',
        })
        await fetchStats()
        return newOpportunity
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create opportunity'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [toast, fetchStats]
  )

  /**
   * Update an opportunity
   */
  const update = useCallback(
    async (
      id: string,
      data: OpportunityUpdate
    ): Promise<Opportunity | null> => {
      setLoading(true)
      setError(null)

      try {
        const updatedOpportunity = await updateOpportunity(id, data)
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? updatedOpportunity : opp))
        )
        toast({
          title: 'Success',
          description: 'Opportunity updated successfully',
        })
        await fetchStats()
        return updatedOpportunity
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update opportunity'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [toast, fetchStats]
  )

  /**
   * Update opportunity stage (for drag and drop)
   */
  const updateStage = useCallback(
    async (
      id: string,
      stage: OpportunityStage
    ): Promise<Opportunity | null> => {
      try {
        const updatedOpportunity = await updateOpportunityStage(id, stage)
        // Optimistic update
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? updatedOpportunity : opp))
        )
        await fetchStats()
        return updatedOpportunity
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update stage'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        // Revert optimistic update
        await fetchOpportunities(currentFilters)
        return null
      }
    },
    [toast, fetchOpportunities, currentFilters, fetchStats]
  )

  /**
   * Delete an opportunity
   */
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await deleteOpportunity(id)
        setOpportunities((prev) => prev.filter((opp) => opp.id !== id))
        toast({
          title: 'Success',
          description: 'Opportunity deleted successfully',
        })
        await fetchStats()
        return true
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete opportunity'
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
    [toast, fetchStats]
  )

  /**
   * Refetch opportunities with current filters
   */
  const refetch = useCallback(async () => {
    await fetchOpportunities(currentFilters)
    await fetchStats()
  }, [fetchOpportunities, fetchStats, currentFilters])

  // Initial fetch
  useEffect(() => {
    fetchOpportunities(initialFilters)
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    opportunities,
    stats,
    loading,
    error,
    fetchOpportunities,
    fetchStats,
    create,
    update,
    updateStage,
    remove,
    refetch,
  }
}

/**
 * useSingleOpportunity Hook
 * Custom hook for managing a single opportunity
 */
interface UseSingleOpportunityReturn {
  opportunity: Opportunity | null
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  update: (data: OpportunityUpdate) => Promise<Opportunity | null>
  remove: () => Promise<boolean>
}

export function useSingleOpportunity(
  id: string
): UseSingleOpportunityReturn {
  const { toast } = useToast()
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch single opportunity
   */
  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getOpportunity(id)
      setOpportunity(data)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch opportunity'
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
   * Update opportunity
   */
  const update = useCallback(
    async (data: OpportunityUpdate): Promise<Opportunity | null> => {
      setLoading(true)
      setError(null)

      try {
        const updatedOpportunity = await updateOpportunity(id, data)
        setOpportunity(updatedOpportunity)
        toast({
          title: 'Success',
          description: 'Opportunity updated successfully',
        })
        return updatedOpportunity
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update opportunity'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        return null
      } finally {
        setLoading(false)
      }
    },
    [id, toast]
  )

  /**
   * Delete opportunity
   */
  const remove = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      await deleteOpportunity(id)
      toast({
        title: 'Success',
        description: 'Opportunity deleted successfully',
      })
      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete opportunity'
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
    opportunity,
    loading,
    error,
    fetch,
    update,
    remove,
  }
}
