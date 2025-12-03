import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/api/admin'
import type {
  AdminUserResponse,
  UserFilters,
  AdminUserCreate,
  AdminUserUpdate,
  UserStatsResponse,
} from '@/types/admin'

/**
 * Hook to manage admin users with filtering, pagination, and CRUD operations
 * Handles loading, error states, and provides mutation methods
 */
export function useAdminUsers(initialFilters?: UserFilters) {
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    page_size: number
    total: number
    total_pages: number
  }>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [filters, setFilters] = useState<UserFilters>(initialFilters || {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getUsers({
        ...filters,
        page: pagination.page,
        page_size: pagination.page_size,
      })

      setUsers(response.users)
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        total_pages: response.total_pages,
      })
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al cargar usuarios'
      setError(errorMessage)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, pagination.page, pagination.page_size])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const updateFilters = (newFilters: Partial<UserFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to page 1
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
    fetchUsers()
  }

  const createUser = async (
    data: AdminUserCreate
  ): Promise<AdminUserResponse> => {
    const newUser = await adminApi.createUser(data)
    refresh() // Refresh list after creating
    return newUser
  }

  const updateUser = async (
    id: string,
    data: AdminUserUpdate
  ): Promise<AdminUserResponse> => {
    const updatedUser = await adminApi.updateUser(id, data)
    refresh() // Refresh list after updating
    return updatedUser
  }

  const deleteUser = async (id: string): Promise<void> => {
    await adminApi.deleteUser(id)
    refresh() // Refresh list after deleting
  }

  return {
    users,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
    createUser,
    updateUser,
    deleteUser,
  }
}

/**
 * Hook to get user statistics
 */
export function useUserStats() {
  const [stats, setStats] = useState<UserStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getUserStats()
      setStats(response)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al cargar estadísticas'
      setError(errorMessage)
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = () => {
    fetchStats()
  }

  return {
    stats,
    isLoading,
    error,
    refresh,
  }
}
