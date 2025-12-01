import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface MonthlySalesData {
  month: string
  month_num: number
  actual: number
  previous: number
  count: number
  prevCount: number
  accepted_count: number
}

export interface SalesComparisonSummary {
  total_actual: number
  total_previous: number
  total_quotes: number
  average_ticket: number
  percent_change: number
  acceptance_rate: number
  max_month: {
    name: string
    amount: number
  } | null
}

export interface SalesComparisonData {
  year: number
  comparison_type: string
  monthly_data: MonthlySalesData[]
  summary: SalesComparisonSummary
}

export interface SalesComparisonParams {
  year: number
  comparisonType?: 'monthly' | 'yearly' | 'quarter'
  clientId?: string
  assignedToId?: string
  startDate?: string
  endDate?: string
}

export function useSalesComparison(params: SalesComparisonParams) {
  const [data, setData] = useState<SalesComparisonData | null>(null)
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

      if (params.clientId) {
        queryParams.append('client_id', params.clientId)
      }

      if (params.assignedToId) {
        queryParams.append('assigned_to_id', params.assignedToId)
      }

      if (params.startDate) {
        queryParams.append('start_date', params.startDate)
      }

      if (params.endDate) {
        queryParams.append('end_date', params.endDate)
      }

      const response = await api.get(`/sales/comparison/monthly?${queryParams.toString()}`)
      setData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos de comparación')
      console.error('Error fetching sales comparison:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [params.year, params.comparisonType, params.clientId, params.assignedToId, params.startDate, params.endDate])

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  }
}
