import { useState, useEffect } from 'react'
import { dashboardApi } from '@/lib/api/dashboard'
import type {
  DashboardKPIs,
  DashboardSummary,
  RevenueData,
  ExpensesData,
  TopClientsData,
  RecentActivityData,
} from '@/types/dashboard'

/**
 * Hook to fetch dashboard KPIs
 */
export function useDashboardKPIs() {
  const [data, setData] = useState<DashboardKPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const kpis = await dashboardApi.getKPIs()
        setData(kpis)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar KPIs'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, isLoading, error }
}

/**
 * Hook to fetch dashboard summary
 */
export function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const summary = await dashboardApi.getSummary()
        setData(summary)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar resumen'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, isLoading, error }
}

/**
 * Hook to fetch revenue monthly data
 */
export function useRevenueMonthly(year?: number) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const revenue = await dashboardApi.getRevenueMonthly(year)
        setData(revenue)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar ingresos'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [year])

  return { data, isLoading, error }
}

/**
 * Hook to fetch expenses monthly data
 */
export function useExpensesMonthly(year?: number) {
  const [data, setData] = useState<ExpensesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const expenses = await dashboardApi.getExpensesMonthly(year)
        setData(expenses)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar gastos'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [year])

  return { data, isLoading, error }
}

/**
 * Hook to fetch top clients
 */
export function useTopClients(
  limit: number = 10,
  period: 'current_month' | 'current_year' | 'all_time' = 'current_year'
) {
  const [data, setData] = useState<TopClientsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const clients = await dashboardApi.getTopClients(limit, period)
        setData(clients)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar top clientes'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [limit, period])

  return { data, isLoading, error }
}

/**
 * Hook to fetch recent activity
 */
export function useRecentActivity(limit: number = 20) {
  const [data, setData] = useState<RecentActivityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const activity = await dashboardApi.getRecentActivity(limit)
        setData(activity)
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.detail ||
          err?.message ||
          'Error al cargar actividad'
        setError(errorMessage)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [limit])

  return { data, isLoading, error }
}
