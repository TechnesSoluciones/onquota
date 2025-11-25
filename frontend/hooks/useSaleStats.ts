import { useState, useEffect } from 'react'
import { salesApi } from '@/lib/api/sales'
import type { QuoteSummary } from '@/types/quote'

/**
 * Hook to fetch and manage quote statistics
 */
export function useSaleStats() {
  const [stats, setStats] = useState<QuoteSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await salesApi.getQuoteSummary()
      setStats(data)
    } catch (err: any) {
      const errorMessage =
        err?.detail || err?.message || 'Error al cargar estadísticas'
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
