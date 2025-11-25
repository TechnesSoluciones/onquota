import { useState, useEffect } from 'react'
import { salesApi } from '@/lib/api/sales'
import type { QuoteSummary } from '@/types/quote'

/**
 * Hook to fetch and manage sales/quotes statistics
 * Provides summary data including totals, counts by status, conversion rates, and top clients
 */
export function useSalesStats() {
  const [stats, setStats] = useState<QuoteSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await salesApi.getQuoteSummary()
        setStats(data)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar estadísticas'
        setError(errorMessage)
        setStats(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, isLoading, error }
}
