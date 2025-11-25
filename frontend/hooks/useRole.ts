/**
 * useRole Hook
 * Provides role-based access control utilities
 * Simplifies checking user permissions and roles
 */

import { useCallback } from 'react'
import { useAuth } from './useAuth'
import { UserRole } from '@/types/auth'

interface UseRoleReturn {
  hasRole: (roles: UserRole | UserRole[]) => boolean
  isAdmin: () => boolean
  isSalesRep: () => boolean
  isSupervisor: () => boolean
  isAnalyst: () => boolean
  canApproveExpenses: () => boolean
  canViewAnalytics: () => boolean
  canManageUsers: () => boolean
  currentRole: UserRole | null
}

/**
 * useRole Hook
 * Provides convenient methods to check user roles and permissions
 */
export function useRole(): UseRoleReturn {
  const { user } = useAuth()

  /**
   * Check if user has any of the specified roles
   * @param roles - Single role or array of roles to check
   * @returns true if user has at least one of the specified roles
   */
  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) {
      return false
    }
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role as UserRole)
  }, [user])

  /**
   * Check if user is an admin
   */
  const isAdmin = (): boolean => hasRole(UserRole.ADMIN)

  /**
   * Check if user is a sales representative
   */
  const isSalesRep = (): boolean => hasRole(UserRole.SALES_REP)

  /**
   * Check if user is a supervisor
   */
  const isSupervisor = (): boolean => hasRole(UserRole.SUPERVISOR)

  /**
   * Check if user is an analyst
   */
  const isAnalyst = (): boolean => hasRole(UserRole.ANALYST)

  /**
   * Check if user can approve expenses
   * (Admins and Supervisors can approve expenses)
   */
  const canApproveExpenses = (): boolean =>
    hasRole([UserRole.ADMIN, UserRole.SUPERVISOR])

  /**
   * Check if user can view analytics
   * (Admins, Supervisors, and Analysts can view analytics)
   */
  const canViewAnalytics = (): boolean =>
    hasRole([UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ANALYST])

  /**
   * Check if user can manage users
   * (Only Admins can manage users)
   */
  const canManageUsers = (): boolean => hasRole(UserRole.ADMIN)

  return {
    hasRole,
    isAdmin,
    isSalesRep,
    isSupervisor,
    isAnalyst,
    canApproveExpenses,
    canViewAnalytics,
    canManageUsers,
    currentRole: user?.role as UserRole | null,
  }
}
