/**
 * Common Types
 * Shared types used across the application
 */

/**
 * Generic paginated response
 * Used for all list endpoints
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

/**
 * API error response
 * Standard error format from FastAPI
 */
export interface ApiError {
  detail: string
  status_code?: number
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  success: boolean
}

/**
 * Query parameters for pagination
 */
export interface PaginationParams {
  page?: number
  page_size?: number
}

/**
 * Query parameters for sorting
 */
export interface SortParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined
}

/**
 * Form validation error
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Upload file response
 */
export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  content_type: string
}

/**
 * Date range filter
 */
export interface DateRange {
  start: string
  end: string
}

/**
 * Generic ID parameter
 */
export type ID = string

/**
 * Generic status type
 */
export type Status = 'active' | 'inactive' | 'pending' | 'archived'

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean
  error: string | null
}

/**
 * Async data state
 */
export interface AsyncData<T> extends LoadingState {
  data: T | null
}
