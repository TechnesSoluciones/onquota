/**
 * Dashboard API Service
 * Handles all dashboard metrics and analytics API calls
 */

import { apiClient } from './client'
import type {
  DashboardSummary,
  DashboardKPIs,
  RevenueData,
  ExpensesData,
  TopClientsData,
  RecentActivityData,
} from '@/types/dashboard'

/**
 * Dashboard API endpoints
 */
export const dashboardApi = {
  /**
   * Get complete dashboard summary
   * GET /api/v1/dashboard/summary
   */
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>(
      '/api/v1/dashboard/summary'
    )
    return response.data
  },

  /**
   * Get main dashboard KPIs with period comparisons
   * GET /api/v1/dashboard/kpis
   */
  getKPIs: async (): Promise<DashboardKPIs> => {
    const response = await apiClient.get<DashboardKPIs>(
      '/api/v1/dashboard/kpis'
    )
    return response.data
  },

  /**
   * Get monthly revenue time series
   * GET /api/v1/dashboard/revenue-monthly
   */
  getRevenueMonthly: async (year?: number): Promise<RevenueData> => {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/dashboard/revenue-monthly?${queryString}`
      : '/api/v1/dashboard/revenue-monthly'

    const response = await apiClient.get<RevenueData>(url)
    return response.data
  },

  /**
   * Get monthly expenses time series
   * GET /api/v1/dashboard/expenses-monthly
   */
  getExpensesMonthly: async (year?: number): Promise<ExpensesData> => {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/dashboard/expenses-monthly?${queryString}`
      : '/api/v1/dashboard/expenses-monthly'

    const response = await apiClient.get<ExpensesData>(url)
    return response.data
  },

  /**
   * Get top clients by revenue
   * GET /api/v1/dashboard/top-clients
   */
  getTopClients: async (
    limit?: number,
    period?: 'current_month' | 'current_year' | 'all_time'
  ): Promise<TopClientsData> => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (period) params.append('period', period)

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/dashboard/top-clients?${queryString}`
      : '/api/v1/dashboard/top-clients'

    const response = await apiClient.get<TopClientsData>(url)
    return response.data
  },

  /**
   * Get recent system activity
   * GET /api/v1/dashboard/recent-activity
   */
  getRecentActivity: async (limit?: number): Promise<RecentActivityData> => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/dashboard/recent-activity?${queryString}`
      : '/api/v1/dashboard/recent-activity'

    const response = await apiClient.get<RecentActivityData>(url)
    return response.data
  },
}
