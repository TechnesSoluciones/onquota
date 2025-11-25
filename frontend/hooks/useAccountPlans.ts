import { useState, useEffect, useCallback } from 'react'
import { accountPlansApi } from '@/lib/api/accounts'
import type {
  AccountPlanResponse,
  AccountPlanFilters,
  AccountPlanListResponse,
  AccountPlanDetail,
  AccountPlanStats,
  AccountPlanCreate,
  AccountPlanUpdate,
  MilestoneCreate,
  MilestoneUpdate,
  SWOTItemCreate,
} from '@/types/accounts'
import { useToast } from './use-toast'

/**
 * Hook to manage account plans with filtering, pagination, and CRUD operations
 * Handles loading, error states, and provides mutation methods
 */
export function useAccountPlans(initialFilters?: AccountPlanFilters) {
  const [plans, setPlans] = useState<AccountPlanResponse[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    page_size: number
    total: number
    pages: number
  }>({
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
  })
  const [filters, setFilters] = useState<AccountPlanFilters>(
    initialFilters || {}
  )
  const [selectedPlan, setSelectedPlan] = useState<AccountPlanDetail | null>(
    null
  )
  const [stats, setStats] = useState<AccountPlanStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  /**
   * Fetch all plans with current filters
   */
  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await accountPlansApi.getPlans({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setPlans(response.items)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        pages: response.pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error loading account plans'
      setError(errorMessage)
      setPlans([])
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size, toast])

  /**
   * Fetch single plan with full details (milestones, SWOT)
   */
  const fetchPlan = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const plan = await accountPlansApi.getPlan(id)
        setSelectedPlan(plan)

        // Also fetch stats for this plan
        const planStats = await accountPlansApi.getPlanStats(id)
        setStats(planStats)

        return plan
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error loading account plan'
        setError(errorMessage)
        setSelectedPlan(null)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [toast]
  )

  /**
   * Create new account plan
   */
  const createPlan = useCallback(
    async (data: AccountPlanCreate) => {
      try {
        setIsLoading(true)
        setError(null)

        const newPlan = await accountPlansApi.createPlan(data)

        toast({
          title: 'Success',
          description: 'Account plan created successfully',
        })

        // Refresh plans list
        await fetchPlans()

        return newPlan
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error creating account plan'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fetchPlans, toast]
  )

  /**
   * Update existing account plan
   */
  const updatePlan = useCallback(
    async (id: string, data: AccountPlanUpdate) => {
      try {
        setIsLoading(true)
        setError(null)

        const updatedPlan = await accountPlansApi.updatePlan(id, data)

        toast({
          title: 'Success',
          description: 'Account plan updated successfully',
        })

        // If this is the selected plan, update it
        if (selectedPlan?.id === id) {
          await fetchPlan(id)
        }

        // Refresh plans list
        await fetchPlans()

        return updatedPlan
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error updating account plan'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fetchPlan, fetchPlans, selectedPlan?.id, toast]
  )

  /**
   * Delete account plan
   */
  const deletePlan = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true)
        setError(null)

        await accountPlansApi.deletePlan(id)

        toast({
          title: 'Success',
          description: 'Account plan deleted successfully',
        })

        // Clear selected plan if it was deleted
        if (selectedPlan?.id === id) {
          setSelectedPlan(null)
          setStats(null)
        }

        // Refresh plans list
        await fetchPlans()
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error deleting account plan'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [fetchPlans, selectedPlan?.id, toast]
  )

  /**
   * Create milestone for a plan
   */
  const createMilestone = useCallback(
    async (planId: string, data: MilestoneCreate) => {
      try {
        const milestone = await accountPlansApi.createMilestone(planId, data)

        toast({
          title: 'Success',
          description: 'Milestone added successfully',
        })

        // Refresh plan details if this is the selected plan
        if (selectedPlan?.id === planId) {
          await fetchPlan(planId)
        }

        return milestone
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error creating milestone'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan?.id, toast]
  )

  /**
   * Update milestone
   */
  const updateMilestone = useCallback(
    async (id: string, data: MilestoneUpdate) => {
      try {
        const milestone = await accountPlansApi.updateMilestone(id, data)

        toast({
          title: 'Success',
          description: 'Milestone updated successfully',
        })

        // Refresh plan details
        if (selectedPlan) {
          await fetchPlan(selectedPlan.id)
        }

        return milestone
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error updating milestone'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan, toast]
  )

  /**
   * Delete milestone
   */
  const deleteMilestone = useCallback(
    async (id: string) => {
      try {
        await accountPlansApi.deleteMilestone(id)

        toast({
          title: 'Success',
          description: 'Milestone deleted successfully',
        })

        // Refresh plan details
        if (selectedPlan) {
          await fetchPlan(selectedPlan.id)
        }
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error deleting milestone'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan, toast]
  )

  /**
   * Complete milestone
   */
  const completeMilestone = useCallback(
    async (id: string) => {
      try {
        await accountPlansApi.completeMilestone(id)

        toast({
          title: 'Success',
          description: 'Milestone marked as completed',
        })

        // Refresh plan details
        if (selectedPlan) {
          await fetchPlan(selectedPlan.id)
        }
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error completing milestone'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan, toast]
  )

  /**
   * Create SWOT item for a plan
   */
  const createSWOTItem = useCallback(
    async (planId: string, data: SWOTItemCreate) => {
      try {
        const swotItem = await accountPlansApi.createSWOTItem(planId, data)

        toast({
          title: 'Success',
          description: 'SWOT item added successfully',
        })

        // Refresh plan details if this is the selected plan
        if (selectedPlan?.id === planId) {
          await fetchPlan(planId)
        }

        return swotItem
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error creating SWOT item'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan?.id, toast]
  )

  /**
   * Delete SWOT item
   */
  const deleteSWOTItem = useCallback(
    async (id: string) => {
      try {
        await accountPlansApi.deleteSWOTItem(id)

        toast({
          title: 'Success',
          description: 'SWOT item deleted successfully',
        })

        // Refresh plan details
        if (selectedPlan) {
          await fetchPlan(selectedPlan.id)
        }
      } catch (err: any) {
        const errorMessage =
          err?.detail || err?.message || 'Error deleting SWOT item'
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        throw err
      }
    },
    [fetchPlan, selectedPlan, toast]
  )

  /**
   * Update filters
   */
  const updateFilters = useCallback((newFilters: Partial<AccountPlanFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to page 1
  }, [])

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  /**
   * Go to specific page
   */
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => {
      if (page >= 1 && page <= prev.pages) {
        return { ...prev, page }
      }
      return prev
    })
  }, [])

  /**
   * Refresh current data
   */
  const refresh = useCallback(() => {
    fetchPlans()
  }, [fetchPlans])

  // Auto-fetch plans on mount and when filters/pagination change
  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  return {
    // State
    plans,
    pagination,
    filters,
    selectedPlan,
    stats,
    isLoading,
    error,

    // Plan CRUD operations
    fetchPlans,
    fetchPlan,
    createPlan,
    updatePlan,
    deletePlan,

    // Milestone operations
    createMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,

    // SWOT operations
    createSWOTItem,
    deleteSWOTItem,

    // Filter and pagination
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
  }
}
