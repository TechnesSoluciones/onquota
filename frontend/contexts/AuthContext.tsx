'use client'

/**
 * Authentication Context
 * Provides authentication state and methods to the entire application
 * Wraps useAuth hook to make it available throughout the app
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth as useAuthHook } from '@/hooks/useAuth'
import type { UserResponse, LoginRequest, RegisterRequest } from '@/types/auth'

interface AuthContextType {
  // State
  user: UserResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Methods
  login: (data: LoginRequest) => Promise<{ success: boolean; error?: string }>
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
  refreshUser: () => Promise<{ success: boolean; user?: UserResponse; error?: string }>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * AuthProvider Component
 * Wraps the application and provides authentication context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] Initializing authentication...')

      // Try to check auth, but don't block if it fails
      try {
        // Only check auth if we have some indication of being authenticated
        // (e.g., tenant_id in localStorage)
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null

        if (tenantId) {
          console.log('[AuthContext] Found tenant_id, checking auth...')
          await auth.checkAuth()
        } else {
          console.log('[AuthContext] No tenant_id found, skipping auth check')
        }
      } catch (error) {
        console.log('[AuthContext] Auth check failed during initialization:', error)
      } finally {
        setIsInitialized(true)
        console.log('[AuthContext] Initialization complete')
      }
    }

    initializeAuth()
  }, []) // Empty deps array - only run once on mount

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuthContext Hook
 * Use this hook to access authentication state and methods
 * Must be used within AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
