/**
 * Custom authentication hook
 * Encapsulates all authentication logic and state management
 * Uses Zustand store for state and authApi for API calls
 */

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api/auth'
import type { LoginRequest, RegisterRequest } from '@/types/auth'
import { logger } from '@/lib/logger'

export const useAuth = () => {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, setAuth, clearAuth, setLoading, setUser } =
    useAuthStore()
  const [error, setError] = useState<string | null>(null)

  /**
   * Clear error message
   */
  const clearError = () => setError(null)

  /**
   * Login user with email and password
   * NOTE: Tokens are managed as httpOnly cookies by the backend.
   * We only need to fetch user data and update the store.
   */
  const login = async (data: LoginRequest) => {
    try {
      setLoading(true)
      clearError()

      logger.log('[useAuth] Starting login process...')

      // Call login API - backend sets httpOnly cookies automatically
      // Response contains user data, not tokens
      const userData = await authApi.login(data)

      // Check if 2FA is required
      if ('requires_2fa' in userData && userData.requires_2fa) {
        logger.log('[useAuth] 2FA required, redirecting to verification page')
        // Redirect to 2FA verification page with email
        router.push(`/verify-2fa?email=${encodeURIComponent(userData.email || data.email)}`)
        return { success: true, requires2FA: true }
      }

      logger.log('[useAuth] Login successful, user data received:', {
        userId: userData.id,
        email: userData.email,
        tenantId: userData.tenant_id
      })

      // Update store - pass empty strings for tokens since they're in httpOnly cookies
      // The setAuth function still accepts them for backwards compatibility
      setAuth(userData, '', '', userData.tenant_id)

      logger.log('[useAuth] Redirecting to dashboard...')

      // Redirect to dashboard
      router.push('/dashboard')

      return { success: true }
    } catch (err: any) {
      const message = err?.detail || err?.message || 'Error al iniciar sesión'
      setError(message)
      logger.error('[useAuth] Login error:', err)

      return {
        success: false,
        error: message,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Register new user and tenant
   * NOTE: Tokens are managed as httpOnly cookies by the backend.
   * We only need to fetch user data and update the store.
   */
  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true)
      clearError()

      logger.log('[useAuth] Starting registration process...')

      // Call register API - backend sets httpOnly cookies automatically
      // Response contains user data, not tokens
      const userData = await authApi.register(data)

      logger.log('[useAuth] Registration successful, user data received:', {
        userId: userData.id,
        email: userData.email,
        tenantId: userData.tenant_id
      })

      // Update store - pass empty strings for tokens since they're in httpOnly cookies
      setAuth(userData, '', '', userData.tenant_id)

      logger.log('[useAuth] Redirecting to dashboard...')

      // Redirect to dashboard
      router.push('/dashboard')

      return { success: true }
    } catch (err: any) {
      const message = err?.detail || err?.message || 'Error al registrarse'
      setError(message)
      logger.error('[useAuth] Register error:', err)

      return {
        success: false,
        error: message,
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout user and clear all authentication state
   * Calls logout API and redirects to login page
   */
  const logout = async () => {
    try {
      setLoading(true)
      clearError()

      // Call logout API endpoint (optional, depends on backend)
      await authApi.logout()
    } catch (err: any) {
      // Log error but continue with logout process
      logger.error('Logout API error:', err)
    } finally {
      // Clear auth state in store (which also clears API client tokens)
      clearAuth()

      // Redirect to login
      router.push('/login')
      setLoading(false)
    }
  }

  /**
   * Check if user is still authenticated
   * Verifies token validity by fetching user data
   * Uses httpOnly cookies automatically sent by the browser
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      logger.log('[useAuth] Checking authentication...')

      // Verify token by fetching user data
      // httpOnly cookies are automatically sent by the browser
      const userData = await authApi.me()

      logger.log('[useAuth] Authentication check successful:', {
        userId: userData.id,
        email: userData.email,
        tenantId: userData.tenant_id
      })

      setUser(userData)

      return true
    } catch (err: any) {
      logger.log('[useAuth] Authentication check failed:', err?.detail || err?.message)
      clearAuth()
      return false
    } finally {
      setLoading(false)
    }
  }, [setLoading, clearError, setUser, clearAuth])

  /**
   * Refresh user data from API
   * Updates user information in store
   */
  const refreshUser = async () => {
    try {
      const userData = await authApi.me()
      setUser(userData)
      return { success: true, user: userData }
    } catch (err: any) {
      const message = err?.detail || err?.message || 'Error al actualizar usuario'
      logger.error('Refresh user error:', err)

      return {
        success: false,
        error: message,
      }
    }
  }

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
    clearError,
  }
}
