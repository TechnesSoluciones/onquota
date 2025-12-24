/**
 * API Client - FIXED VERSION with Cookie-based Authentication
 *
 * CRITICAL SECURITY FIX:
 * - Removed localStorage token storage (XSS vulnerability)
 * - Tokens now sent via httpOnly cookies from backend
 * - Added CSRF token support
 * - Cookies automatically sent with requests (withCredentials)
 *
 * Migration Notes:
 * 1. Replace existing client.ts with this file
 * 2. Remove all localStorage token operations
 * 3. Backend must send tokens in httpOnly cookies
 * 4. CSRF token required for state-changing requests
 */
import axios from 'axios'
import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'
import type { ApiError } from '@/types/common'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * CSRF Token management
 * Stored in memory (not localStorage) for security
 */
let csrfToken: string | null = null

/**
 * Main API client instance with cookie support
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // CRITICAL: Enable credentials (cookies) to be sent
  withCredentials: true,
})

/**
 * Fetch CSRF token from backend
 * Should be called on app initialization and when token expires
 */
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await axios.get<{ csrf_token: string }>(
      `${API_URL}/api/v1/csrf-token`,
      {
        withCredentials: true, // Include cookies
      }
    )
    csrfToken = response.data.csrf_token
    console.debug('[Security] CSRF token fetched')
    return csrfToken
  } catch (error) {
    console.error('[Security] Failed to fetch CSRF token:', error)
    return null
  }
}

/**
 * Get current CSRF token
 * Fetches new token if not present
 */
export const getCsrfToken = async (): Promise<string | null> => {
  if (!csrfToken) {
    return await fetchCsrfToken()
  }
  return csrfToken
}

/**
 * Request interceptor
 * Adds CSRF token to state-changing requests
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for state-changing methods
    const methodsRequiringCsrf = ['POST', 'PUT', 'DELETE', 'PATCH']
    if (config.method && methodsRequiringCsrf.includes(config.method.toUpperCase())) {
      const token = await getCsrfToken()
      if (token && config.headers) {
        config.headers['X-CSRF-Token'] = token
      }
    }

    // Tenant ID is now in cookie (read-only for display purposes)
    // Backend validates tenant from JWT cookie
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(null)
    }
  })

  failedQueue = []
}

/**
 * Response interceptor
 * Handles errors and automatic token refresh
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Handle 403 CSRF errors - fetch new token and retry
    if (error.response?.status === 403) {
      const errorData = error.response.data as any
      if (errorData?.error?.includes('csrf') || errorData?.error?.includes('CSRF')) {
        console.warn('[Security] CSRF token invalid, fetching new token')
        await fetchCsrfToken()
        // Don't retry automatically - let user retry the action
        return Promise.reject(error)
      }
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // SECURITY FIX: Call refresh endpoint
        // Refresh token is automatically sent via httpOnly cookie
        // No need to send it in request body
        await apiClient.post('/api/v1/auth/refresh')

        // Refresh successful - new tokens set in cookies automatically
        processQueue(null)
        isRefreshing = false

        // Retry original request with new token (in cookie)
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error)
        isRefreshing = false
        handleAuthenticationFailure()
        return Promise.reject(refreshError)
      }
    }

    // Transform error to consistent format
    const apiError: ApiError = {
      detail:
        error.response?.data?.detail ||
        error.message ||
        'An unexpected error occurred',
      status_code: error.response?.status,
    }

    return Promise.reject(apiError)
  }
)

/**
 * Handle authentication failure
 * Clears auth state and redirects to login
 */
const handleAuthenticationFailure = () => {
  // Clear CSRF token
  csrfToken = null

  // Call logout endpoint to clear cookies
  // Use native fetch to avoid interceptors
  fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    // Ignore errors - user is being logged out anyway
  })

  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * SECURITY FIX: Removed all localStorage token functions
 * Tokens are now managed by httpOnly cookies
 */

/**
 * Get tenant ID from cookie (for display purposes only)
 * Backend validates tenant from JWT token
 */
export const getTenantId = (): string | null => {
  if (typeof window === 'undefined') return null

  // Read tenant_id cookie (not httpOnly, safe to read)
  const cookies = document.cookie.split(';')
  const tenantCookie = cookies.find(c => c.trim().startsWith('tenant_id='))
  if (tenantCookie) {
    return tenantCookie.split('=')[1]
  }
  return null
}

/**
 * Check if user is authenticated
 * Checks for presence of access_token cookie
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false

  // Check if access_token cookie exists
  // Note: Cannot read httpOnly cookies from JavaScript
  // This is a best-effort check - backend is source of truth
  const cookies = document.cookie.split(';')
  return cookies.some(c => c.trim().startsWith('access_token='))
}

/**
 * Clear all authentication data
 * Calls logout endpoint to clear cookies server-side
 */
export const clearAuth = async (): Promise<void> => {
  try {
    // Call logout endpoint (clears cookies server-side)
    await apiClient.post('/api/v1/auth/logout')
  } catch (error) {
    console.error('[Auth] Logout failed:', error)
  }

  // Clear CSRF token
  csrfToken = null

  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * Initialize API client
 * Fetches CSRF token on app load
 */
export const initializeApiClient = async (): Promise<void> => {
  try {
    await fetchCsrfToken()
    console.debug('[Security] API client initialized with CSRF protection')
  } catch (error) {
    console.error('[Security] Failed to initialize API client:', error)
  }
}

export default apiClient
