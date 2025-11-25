/**
 * useApiError Hook
 * Custom hook for handling API errors consistently across the application
 */

import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'
import type { ApiError } from '@/types/common'

interface UseApiErrorReturn {
  error: string | null
  handleError: (err: unknown) => void
  clearError: () => void
  isError: boolean
}

/**
 * Hook for managing API error state
 *
 * @returns Object containing error state and handlers
 *
 * @example
 * ```tsx
 * const { error, handleError, clearError } = useApiError()
 *
 * try {
 *   await api.login(credentials)
 * } catch (err) {
 *   handleError(err)
 * }
 * ```
 */
export const useApiError = (): UseApiErrorReturn => {
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle different types of errors
   */
  const handleError = useCallback((err: unknown) => {
    // Handle AxiosError (API errors)
    if (err instanceof AxiosError) {
      const apiError = err.response?.data as ApiError | undefined
      const message =
        apiError?.detail ||
        err.message ||
        'An unexpected error occurred. Please try again.'
      setError(message)
      return
    }

    // Handle ApiError object directly
    if (err && typeof err === 'object' && 'detail' in err) {
      const apiError = err as ApiError
      setError(apiError.detail || 'An unexpected error occurred')
      return
    }

    // Handle standard Error
    if (err instanceof Error) {
      setError(err.message)
      return
    }

    // Handle string errors
    if (typeof err === 'string') {
      setError(err)
      return
    }

    // Fallback for unknown error types
    setError('An unexpected error occurred. Please try again.')
  }, [])

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError,
    clearError,
    isError: error !== null,
  }
}

/**
 * Extract error message from unknown error
 * Utility function for one-off error extraction
 */
export const getErrorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const apiError = err.response?.data as ApiError | undefined
    return (
      apiError?.detail ||
      err.message ||
      'An unexpected error occurred. Please try again.'
    )
  }

  if (err && typeof err === 'object' && 'detail' in err) {
    const apiError = err as ApiError
    return apiError.detail || 'An unexpected error occurred'
  }

  if (err instanceof Error) {
    return err.message
  }

  if (typeof err === 'string') {
    return err
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is a specific HTTP status code
 */
export const isErrorStatus = (err: unknown, statusCode: number): boolean => {
  if (err instanceof AxiosError) {
    return err.response?.status === statusCode
  }

  if (err && typeof err === 'object' && 'status_code' in err) {
    const apiError = err as ApiError
    return apiError.status_code === statusCode
  }

  return false
}

/**
 * Check if error is a 401 Unauthorized
 */
export const isUnauthorizedError = (err: unknown): boolean => {
  return isErrorStatus(err, 401)
}

/**
 * Check if error is a 403 Forbidden
 */
export const isForbiddenError = (err: unknown): boolean => {
  return isErrorStatus(err, 403)
}

/**
 * Check if error is a 404 Not Found
 */
export const isNotFoundError = (err: unknown): boolean => {
  return isErrorStatus(err, 404)
}

/**
 * Check if error is a 422 Validation Error
 */
export const isValidationError = (err: unknown): boolean => {
  return isErrorStatus(err, 422)
}

/**
 * Check if error is a network error
 */
export const isNetworkError = (err: unknown): boolean => {
  if (err instanceof AxiosError) {
    return !err.response && err.code === 'ERR_NETWORK'
  }
  return false
}
