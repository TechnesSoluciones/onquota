/**
 * Expense Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/expense.py
 */

/**
 * Expense approval status
 * Synced with: backend/models/expense.py - ExpenseStatus enum
 */
export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Expense category create request
 * Synced with: ExpenseCategoryCreate schema
 */
export interface ExpenseCategoryCreate {
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
}

/**
 * Expense category update request
 * Synced with: ExpenseCategoryUpdate schema
 */
export interface ExpenseCategoryUpdate {
  name?: string | null
  description?: string | null
  icon?: string | null
  color?: string | null
  is_active?: boolean | null
}

/**
 * Expense category response
 * Synced with: ExpenseCategoryResponse schema
 */
export interface ExpenseCategoryResponse {
  id: string
  tenant_id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  is_active: boolean
  created_at: string
}

/**
 * Expense create request
 * Synced with: ExpenseCreate schema
 */
export interface ExpenseCreate {
  category_id?: string | null
  amount: number | string
  currency?: string
  description: string
  date: string
  receipt_url?: string | null
  receipt_number?: string | null
  vendor_name?: string | null
  notes?: string | null
}

/**
 * Expense update request
 * Synced with: ExpenseUpdate schema
 */
export interface ExpenseUpdate {
  category_id?: string | null
  amount?: number | string | null
  currency?: string | null
  description?: string | null
  date?: string | null
  receipt_url?: string | null
  receipt_number?: string | null
  vendor_name?: string | null
  notes?: string | null
}

/**
 * Expense response
 * Synced with: ExpenseResponse schema
 */
export interface ExpenseResponse {
  id: string
  tenant_id: string
  user_id: string
  category_id: string | null
  amount: number | string
  currency: string
  description: string
  date: string
  receipt_url: string | null
  receipt_number: string | null
  vendor_name: string | null
  status: ExpenseStatus
  approved_by: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Expense response with category details
 * Synced with: ExpenseWithCategory schema
 */
export interface ExpenseWithCategory extends ExpenseResponse {
  category: ExpenseCategoryResponse | null
}

/**
 * Expense status update request
 * Synced with: ExpenseStatusUpdate schema
 */
export interface ExpenseStatusUpdate {
  status: ExpenseStatus
  rejection_reason?: string | null
}

/**
 * Expense summary/statistics
 * Synced with: ExpenseSummary schema
 */
export interface ExpenseSummary {
  total_amount: number | string
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

/**
 * Paginated expense list response
 * Synced with: ExpenseListResponse schema
 */
export interface ExpenseListResponse {
  items: ExpenseWithCategory[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * Expense filters for list queries
 * Not a Pydantic schema, but useful for API calls
 */
export interface ExpenseFilters {
  status?: ExpenseStatus
  category_id?: string
  user_id?: string
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
  search?: string
  page?: number
  page_size?: number
}

/**
 * Alias for ExpenseResponse
 */
export type Expense = ExpenseResponse

/**
 * Alias for ExpenseCategoryResponse
 */
export type ExpenseCategory = ExpenseCategoryResponse
