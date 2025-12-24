/**
 * API Client
 * Axios-based HTTP client with authentication and error handling
 *
 * SECURITY: This client uses httpOnly cookies for JWT token storage (XSS-protected)
 * Tokens are NOT stored in localStorage to prevent XSS attacks.
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
 * Storage keys for tenant ID (cookies are auto-managed by the browser)
 */
const STORAGE_KEYS = {
  TENANT_ID: 'tenant_id',
} as const

/**
 * Main API client instance
 * withCredentials: true enables httpOnly cookies to be sent with requests
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Enables sending httpOnly cookies with requests
})

/**
 * Request interceptor
 * Adds tenant ID header to all requests
 *
 * IMPORTANT: Access tokens are now sent via httpOnly cookies, NOT via Authorization header
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('[API Client] Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL
    })

    // Add tenant ID header (if available in localStorage)
    const tenantId = getTenantId()
    if (tenantId && config.headers) {
      config.headers['X-Tenant-ID'] = tenantId
      console.log('[API Client] Added X-Tenant-ID header:', tenantId)
    }

    return config
  },
  (error: AxiosError) => {
    console.error('[API Client] Request error:', error)
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
 *
 * SECURITY: Tokens are refreshed via httpOnly cookies, no manual token handling needed
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('[API Client] Response:', {
      status: response.status,
      url: response.config.url
    })
    return response
  },
  async (error: AxiosError<ApiError>) => {
    console.error('[API Client] Response error:', {
      status: error.response?.status,
      url: error.config?.url,
      detail: error.response?.data?.detail
    })
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            // Retry original request with new cookie
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Attempt to refresh the token
        // Note: refresh_token is read from httpOnly cookie automatically
        // Client passes empty object since token comes from cookie
        const response = await axios.post<{
          user_id: string
          tenant_id: string
          email: string
          role: string
        }>(`${API_URL}/api/v1/auth/refresh`, { refresh_token: '' }, {
          withCredentials: true, // CRITICAL: Include cookies
        })

        // New tokens are set as httpOnly cookies automatically by the server
        // No need to manually handle them

        // Process queued requests
        processQueue(null)
        isRefreshing = false

        // Retry original request with new token in cookie
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
 * Clears authentication state and redirects to login
 *
 * SECURITY: Tokens are in httpOnly cookies (browser-managed), so no manual clearing needed
 * Only clear localStorage state
 */
const handleAuthenticationFailure = () => {
  removeTenantId()

  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 * Tokens are no longer stored in localStorage
 */
export const getAuthToken = (): string | null => {
  console.warn(
    'getAuthToken() is deprecated. Tokens are now stored in httpOnly cookies and cannot be accessed from JavaScript. This is intentional for XSS protection.'
  )
  return null
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 */
export const setAuthToken = (_token: string): void => {
  console.warn(
    'setAuthToken() is deprecated. Tokens are now managed by the server as httpOnly cookies.'
  )
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 */
export const removeAuthToken = (): void => {
  console.warn(
    'removeAuthToken() is deprecated. Tokens are managed by httpOnly cookies.'
  )
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 */
export const getRefreshToken = (): string | null => {
  console.warn(
    'getRefreshToken() is deprecated. Tokens are now stored in httpOnly cookies and cannot be accessed from JavaScript. This is intentional for XSS protection.'
  )
  return null
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 */
export const setRefreshToken = (_token: string): void => {
  console.warn(
    'setRefreshToken() is deprecated. Tokens are now managed by the server as httpOnly cookies.'
  )
}

/**
 * DEPRECATED: Use httpOnly cookies instead
 * This function is kept for backwards compatibility only
 */
export const removeRefreshToken = (): void => {
  console.warn(
    'removeRefreshToken() is deprecated. Tokens are managed by httpOnly cookies.'
  )
}

/**
 * Get tenant ID from localStorage
 * Tenant ID is NOT a sensitive token, so it can be stored in localStorage
 */
export const getTenantId = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.TENANT_ID)
}

/**
 * Set tenant ID in localStorage
 * Tenant ID is NOT a sensitive token, so it can be stored in localStorage
 */
export const setTenantId = (tenantId: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.TENANT_ID, tenantId)
}

/**
 * Remove tenant ID from localStorage
 */
export const removeTenantId = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.TENANT_ID)
}

/**
 * Check if user is authenticated
 * Since tokens are in httpOnly cookies (not accessible from JS), we rely on making an API call
 * or checking the server response. This function is a placeholder for backwards compatibility.
 */
export const isAuthenticated = (): boolean => {
  // Tokens are in httpOnly cookies, so we can't check them from JavaScript
  // The actual authentication check happens when making API requests
  // If the request fails with 401, user is not authenticated
  return true // Assume authenticated if cookies are set (browser will handle this)
}

/**
 * Clear all authentication data
 * Clears localStorage data (cookies are cleared by the server on logout)
 */
export const clearAuth = (): void => {
  removeTenantId()
}

/**
 * Set full authentication state
 * CHANGED: No longer stores tokens (they're in httpOnly cookies)
 * Only stores tenant ID in localStorage
 */
export const setAuthState = (
  _accessToken: string,
  _refreshToken: string,
  tenantId: string
): void => {
  // Tokens are managed by httpOnly cookies - don't store them
  // Only store tenant ID which is not sensitive
  setTenantId(tenantId)
}

export default apiClient
