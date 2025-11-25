'use client'

/**
 * ProtectedRoute Component
 * Client-side route protection wrapper
 * Verifies authentication, roles, and redirects if needed
 */

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import type { UserRole } from '@/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireRoles?: UserRole[]
  redirectTo?: string
  unauthorizedRedirectTo?: string
  loadingComponent?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireRoles,
  redirectTo = '/login',
  unauthorizedRedirectTo = '/dashboard',
  loadingComponent,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkAuth } = useAuth()
  const { hasRole } = useRole()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Memoize requireRoles array to prevent unnecessary re-renders
  const memoizedRequireRoles = useMemo(() => requireRoles, [requireRoles?.join(',')])

  // Initial auth check - only runs once on mount
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('[ProtectedRoute] Starting auth verification...')

      try {
        await checkAuth()
      } catch (error) {
        console.error('[ProtectedRoute] Auth check failed:', error)
      } finally {
        setAuthChecked(true)
        console.log('[ProtectedRoute] Auth check completed')
      }
    }

    verifyAuth()

    // Fallback: force auth check to complete after 5 seconds
    const timeout = setTimeout(() => {
      if (!authChecked) {
        console.warn('[ProtectedRoute] Auth check timeout - forcing completion')
        setAuthChecked(true)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, []) // Empty deps to run only once

  // Handle redirects and authorization after auth is checked
  useEffect(() => {
    if (!authChecked || isLoading) {
      console.log('[ProtectedRoute] Waiting for auth check...', { authChecked, isLoading })
      return
    }

    console.log('[ProtectedRoute] Checking route access:', {
      requireAuth,
      isAuthenticated,
      pathname: window.location.pathname
    })

    // If route requires auth and user is not authenticated, redirect
    if (requireAuth && !isAuthenticated) {
      console.log('[ProtectedRoute] Redirecting to login - auth required but not authenticated')
      router.push(redirectTo)
      return
    }

    // If route requires NO auth (like login page) and user IS authenticated
    if (!requireAuth && isAuthenticated) {
      console.log('[ProtectedRoute] Redirecting to dashboard - user already authenticated')
      router.push('/dashboard')
      return
    }

    // Check role-based access if required
    if (requireAuth && memoizedRequireRoles && memoizedRequireRoles.length > 0) {
      const hasRequiredRole = hasRole(memoizedRequireRoles)
      if (!hasRequiredRole) {
        setIsAuthorized(false)
        router.push(unauthorizedRedirectTo)
        return
      }
    }

    setIsAuthorized(true)
  }, [authChecked, isAuthenticated, requireAuth, memoizedRequireRoles, redirectTo, unauthorizedRedirectTo, router, hasRole, isLoading])

  // Show loading state while checking authentication and authorization
  if (isLoading || !authChecked || isAuthorized === null) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verificando autenticación...</p>
          </div>
        </div>
      )
    )
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null
  }

  // If auth is NOT required (like login page) and user IS authenticated, don't render
  if (!requireAuth && isAuthenticated) {
    return null
  }

  // If authorization check failed, don't render children
  if (isAuthorized === false) {
    return null
  }

  // Render children if auth check passes
  return <>{children}</>
}
