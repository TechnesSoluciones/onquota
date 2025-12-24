/**
 * Admin API Service
 * Handles all admin-related API calls (user management, audit logs, settings)
 */

import { apiClient } from './client'
import type {
  AdminUserCreate,
  AdminUserUpdate,
  AdminUserResponse,
  UserListResponse,
  UserFilters,
  AuditLogResponse,
  AuditLogListResponse,
  AuditLogFilters,
  TenantSettingsUpdate,
  TenantSettingsResponse,
  UserStatsResponse,
  SystemStatsResponse,
} from '@/types/admin'

/**
 * Admin API endpoints
 */
export const adminApi = {
  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Get all users with filters and pagination
   * GET /api/v1/admin/users
   */
  getUsers: async (filters?: UserFilters): Promise<UserListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
      if (filters.search) params.append('search', filters.search)
      if (filters.role) params.append('role', filters.role)
      if (filters.is_active !== undefined)
        params.append('is_active', filters.is_active.toString())
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_desc !== undefined)
        params.append('sort_desc', filters.sort_desc.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/admin/users?${queryString}`
      : '/api/v1/admin/users'

    const response = await apiClient.get<UserListResponse>(url)
    return response.data
  },

  /**
   * Get single user by ID
   * GET /api/v1/admin/users/{id}
   */
  getUser: async (id: string): Promise<AdminUserResponse> => {
    const response = await apiClient.get<AdminUserResponse>(
      `/api/v1/admin/users/${id}`
    )
    return response.data
  },

  /**
   * Create new user
   * POST /api/v1/admin/users
   */
  createUser: async (data: AdminUserCreate): Promise<AdminUserResponse> => {
    const response = await apiClient.post<AdminUserResponse>(
      '/api/v1/admin/users',
      data
    )
    return response.data
  },

  /**
   * Update user
   * PUT /api/v1/admin/users/{id}
   */
  updateUser: async (
    id: string,
    data: AdminUserUpdate
  ): Promise<AdminUserResponse> => {
    const response = await apiClient.put<AdminUserResponse>(
      `/api/v1/admin/users/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete user
   * DELETE /api/v1/admin/users/{id}
   */
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/users/${id}`)
  },

  /**
   * Get user statistics
   * GET /api/v1/admin/users/stats
   */
  getUserStats: async (): Promise<UserStatsResponse> => {
    const response = await apiClient.get<UserStatsResponse>(
      '/api/v1/admin/users/stats'
    )
    return response.data
  },

  // ============================================================================
  // Audit Logs
  // ============================================================================

  /**
   * Get audit logs with filters and pagination
   * GET /api/v1/admin/audit-logs
   */
  getAuditLogs: async (
    filters?: AuditLogFilters
  ): Promise<AuditLogListResponse> => {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.page !== undefined)
        params.append('page', filters.page.toString())
      if (filters.page_size !== undefined)
        params.append('page_size', filters.page_size.toString())
      if (filters.action) params.append('action', filters.action)
      if (filters.resource_type)
        params.append('resource_type', filters.resource_type)
      if (filters.resource_id)
        params.append('resource_id', filters.resource_id)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.search) params.append('search', filters.search)
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_desc !== undefined)
        params.append('sort_desc', filters.sort_desc.toString())
    }

    const queryString = params.toString()
    const url = queryString
      ? `/api/v1/admin/audit-logs?${queryString}`
      : '/api/v1/admin/audit-logs'

    const response = await apiClient.get<AuditLogListResponse>(url)
    return response.data
  },

  /**
   * Get audit log statistics
   * GET /api/v1/admin/audit-logs/stats
   */
  getAuditStats: async (): Promise<{
    total_audit_logs: number
    actions_today: number
    actions_this_week: number
    top_actions: Array<{ action: string; count: number }>
  }> => {
    const response = await apiClient.get(
      '/api/v1/admin/audit-logs/stats'
    )
    return response.data
  },

  // ============================================================================
  // Tenant Settings
  // ============================================================================

  /**
   * Get tenant settings
   * GET /api/v1/admin/settings
   */
  getSettings: async (): Promise<TenantSettingsResponse> => {
    const response = await apiClient.get<TenantSettingsResponse>(
      '/api/v1/admin/settings'
    )
    return response.data
  },

  /**
   * Update tenant settings
   * PUT /api/v1/admin/settings
   */
  updateSettings: async (
    data: TenantSettingsUpdate
  ): Promise<TenantSettingsResponse> => {
    const response = await apiClient.put<TenantSettingsResponse>(
      '/api/v1/admin/settings',
      data
    )
    return response.data
  },

  // ============================================================================
  // System Statistics
  // ============================================================================

  /**
   * Get system statistics (combined user stats + audit stats)
   * GET /api/v1/admin/stats
   */
  getSystemStats: async (): Promise<SystemStatsResponse> => {
    const response = await apiClient.get<SystemStatsResponse>(
      '/api/v1/admin/stats'
    )
    return response.data
  },
}
