import { useState, useEffect } from 'react'
import { expensesApi } from '@/lib/api/expenses'

export interface ExpenseStats {
  total_amount: number
  total_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
  by_category: Array<{
    category_name: string
    amount: number | string
    count: number
  }>
}

export function useExpenseStats() {
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await expensesApi.getExpenseSummary()
      setStats(data as ExpenseStats)
    } catch (err: any) {
      setError(err?.detail || 'Error al cargar estadísticas')
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = () => {
    fetchStats()
  }

  return { stats, isLoading, error, refresh }
}
