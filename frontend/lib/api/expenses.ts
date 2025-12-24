/**
 * Expenses API Service
 * Handles all expense-related API calls
 */

import { apiClient } from './client'
import type {
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseResponse,
  ExpenseWithCategory,
  ExpenseListResponse,
  ExpenseStatusUpdate,
  ExpenseSummary,
  ExpenseCategoryCreate,
  ExpenseCategoryUpdate,
  ExpenseCategoryResponse,
  ExpenseFilters,
} from '@/types/expense'

/**
 * Expenses API endpoints
 */
export const expensesApi = {
  /**
   * Get all expenses with filters and pagination
   * GET /api/v1/expenses
   */
  getExpenses: async (
    filters?: ExpenseFilters
  ): Promise<ExpenseListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.category_id) params.append('category_id', filters.category_id)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.min_amount !== undefined)
        params.append('min_amount', filters.min_amount.toString())
      if (filters.max_amount !== undefined)
        params.append('max_amount', filters.max_amount.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/expenses?${queryString}`
      : '/api/v1/expenses'

    const response = await apiClient.get<ExpenseListResponse>(url)
    return response.data
  },

  /**
   * Get single expense by ID
   * GET /api/v1/expenses/{id}
   */
  getExpense: async (id: string): Promise<ExpenseWithCategory> => {
    const response = await apiClient.get<ExpenseWithCategory>(
      `/api/v1/expenses/${id}`
    )
    return response.data
  },

  /**
   * Create new expense
   * POST /api/v1/expenses
   */
  createExpense: async (data: ExpenseCreate): Promise<ExpenseResponse> => {
    const response = await apiClient.post<ExpenseResponse>(
      '/api/v1/expenses',
      data
    )
    return response.data
  },

  /**
   * Update expense
   * PUT /api/v1/expenses/{id}
   */
  updateExpense: async (
    id: string,
    data: ExpenseUpdate
  ): Promise<ExpenseResponse> => {
    const response = await apiClient.put<ExpenseResponse>(
      `/api/v1/expenses/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete expense
   * DELETE /api/v1/expenses/{id}
   */
  deleteExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/${id}`)
  },

  /**
   * Update expense status (approve/reject)
   * PATCH /api/v1/expenses/{id}/status
   */
  updateExpenseStatus: async (
    id: string,
    data: ExpenseStatusUpdate
  ): Promise<ExpenseResponse> => {
    const response = await apiClient.patch<ExpenseResponse>(
      `/api/v1/expenses/${id}/status`,
      data
    )
    return response.data
  },

  /**
   * Get expense summary/statistics
   * GET /api/v1/expenses/summary
   */
  getExpenseSummary: async (): Promise<ExpenseSummary> => {
    const response = await apiClient.get<ExpenseSummary>(
      '/api/v1/expenses/summary'
    )
    return response.data
  },
}

/**
 * Expense Categories API endpoints
 */
export const expenseCategoriesApi = {
  /**
   * Get all expense categories
   * GET /api/v1/expenses/categories
   */
  getCategories: async (): Promise<ExpenseCategoryResponse[]> => {
    const response = await apiClient.get<ExpenseCategoryResponse[]>(
      '/api/v1/expenses/categories'
    )
    return response.data
  },

  /**
   * Get single expense category by ID
   * GET /api/v1/expenses/categories/{id}
   */
  getCategory: async (id: string): Promise<ExpenseCategoryResponse> => {
    const response = await apiClient.get<ExpenseCategoryResponse>(
      `/api/v1/expenses/categories/${id}`
    )
    return response.data
  },

  /**
   * Create new expense category
   * POST /api/v1/expenses/categories
   */
  createCategory: async (
    data: ExpenseCategoryCreate
  ): Promise<ExpenseCategoryResponse> => {
    const response = await apiClient.post<ExpenseCategoryResponse>(
      '/api/v1/expenses/categories',
      data
    )
    return response.data
  },

  /**
   * Update expense category
   * PUT /api/v1/expenses/categories/{id}
   */
  updateCategory: async (
    id: string,
    data: ExpenseCategoryUpdate
  ): Promise<ExpenseCategoryResponse> => {
    const response = await apiClient.put<ExpenseCategoryResponse>(
      `/api/v1/expenses/categories/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete expense category
   * DELETE /api/v1/expenses/categories/{id}
   */
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/expenses/categories/${id}`)
  },
}
