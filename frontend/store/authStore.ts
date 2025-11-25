/**
 * Authentication Store using Zustand
 * Manages global authentication state
 *
 * SECURITY: Tokens are NOT stored in localStorage
 * Tokens are managed by the server as httpOnly cookies (XSS-protected)
 * This store only manages in-memory user state and tenant information
 */

import { create } from 'zustand'
import { setTenantId } from '@/lib/api/client'
import type { UserResponse } from '@/types/auth'

interface AuthState {
  // State
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAuth: (
    user: UserResponse,
    accessToken: string,
    refreshToken: string,
    tenantId: string
  ) => void
  setUser: (user: UserResponse) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  /**
   * Set complete auth state
   * Stores tenant ID for API requests (via X-Tenant-ID header)
   *
   * IMPORTANT: Token parameters are accepted but NOT stored
   * Tokens are managed by httpOnly cookies (browser and server handle them)
   */
  setAuth: (user, accessToken, refreshToken, tenantId) => {
    // Store tenant ID in localStorage (for X-Tenant-ID header in API calls)
    // Tokens are NOT stored (they're in httpOnly cookies)
    setTenantId(tenantId)

    // Update store state
    set({
      user,
      isAuthenticated: true,
    })
  },

  /**
   * Update user data
   * Also sets isAuthenticated to true when user data is present
   */
  setUser: (user) => {
    set({ user, isAuthenticated: !!user })
  },

  /**
   * Clear all auth state
   * Clears in-memory state only (cookies are cleared by server on logout)
   */
  clearAuth: () => {
    // Reset store state
    set({
      user: null,
      isAuthenticated: false,
    })
  },

  /**
   * Set loading state
   */
  setLoading: (loading) => {
    set({ isLoading: loading })
  },
}))
