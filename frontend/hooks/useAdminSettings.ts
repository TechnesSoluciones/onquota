import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '@/lib/api/admin'
import type {
  TenantSettingsResponse,
  TenantSettingsUpdate,
  SystemStatsResponse,
} from '@/types/admin'

/**
 * Hook to manage tenant settings
 * Handles loading, error states, and provides update method
 */
export function useAdminSettings() {
  const [settings, setSettings] = useState<TenantSettingsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getSettings()
      setSettings(response)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al cargar configuraciones'
      setError(errorMessage)
      setSettings(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = async (
    data: TenantSettingsUpdate
  ): Promise<TenantSettingsResponse> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.updateSettings(data)
      setSettings(response)
      return response
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al actualizar configuraciones'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = () => {
    fetchSettings()
  }

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refresh,
  }
}

/**
 * Hook to get system statistics (combined user + audit stats)
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await adminApi.getSystemStats()
      setStats(response)
    } catch (err: any) {
      const errorMessage =
        err?.detail ||
        err?.message ||
        'Error al cargar estadísticas del sistema'
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
