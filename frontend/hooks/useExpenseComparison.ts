import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface MonthlyExpenseData {
  month: string
  month_num: number
  actual: number
  previous: number
  actual_count: number
  previous_count: number
}

export interface ExpenseComparisonSummary {
  total_actual: number
  total_previous: number
  average_monthly: number
  percent_change: number
  min_month: {
    name: string
    amount: number
  } | null
  max_month: {
    name: string
    amount: number
  } | null
}

export interface ExpenseComparisonData {
  year: number
  comparison_type: string
  monthly_data: MonthlyExpenseData[]
  summary: ExpenseComparisonSummary
}

export interface ExpenseComparisonParams {
  year: number
  comparisonType?: 'monthly' | 'yearly' | 'quarter'
  categoryId?: string
  startDate?: string
  endDate?: string
}

export function useExpenseComparison(params: ExpenseComparisonParams) {
  const [data, setData] = useState<ExpenseComparisonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query string
      const queryParams = new URLSearchParams({
        year: params.year.toString(),
        comparison_type: params.comparisonType || 'monthly'
      })

      if (params.categoryId) {
        queryParams.append('category_id', params.categoryId)
      }

      if (params.startDate) {
        queryParams.append('start_date', params.startDate)
      }

      if (params.endDate) {
        queryParams.append('end_date', params.endDate)
      }

      const response = await api.get(`/expenses/comparison/monthly?${queryParams.toString()}`)
      setData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos de comparación')
      console.error('Error fetching expense comparison:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.year, params.comparisonType, params.categoryId, params.startDate, params.endDate])

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  }
}
