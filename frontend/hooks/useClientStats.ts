import { useState, useEffect } from 'react'
import { clientsApi } from '@/lib/api/clients'
import type { ClientSummary } from '@/types/client'

/**
 * Hook to fetch and manage client statistics
 */
export function useClientStats() {
  const [stats, setStats] = useState<ClientSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await clientsApi.getClientSummary()
      setStats(data)
    } catch (err: any) {
      const errorMessage = err?.detail || err?.message || 'Error al cargar estadísticas'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    isLoading,
    error,
    refresh: fetchStats,
  }
}
