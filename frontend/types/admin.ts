/**
 * Admin Panel Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/admin.py
 */

import { UserRole } from './auth'

// ============================================================================
// User Management Types
// ============================================================================

/**
 * Admin user create request
 * Synced with: AdminUserCreate schema
 */
export interface AdminUserCreate {
  email: string
  password: string
  full_name: string
  phone?: string | null
  role?: UserRole
  is_active?: boolean
}

/**
 * Admin user update request
 * Synced with: AdminUserUpdate schema
 */
export interface AdminUserUpdate {
  full_name?: string | null
  phone?: string | null
  avatar_url?: string | null
  role?: UserRole | null
  is_active?: boolean | null
}

/**
 * Admin user response
 * Synced with: AdminUserResponse schema
 */
export interface AdminUserResponse {
  id: string
  tenant_id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  last_login: string | null
  last_login_ip: string | null
  created_at: string
  updated_at: string
}

/**
 * User list response with pagination
 * Synced with: UserListResponse schema
 */
export interface UserListResponse {
  users: AdminUserResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * User filters for listing
 * Synced with: UserFilters schema
 */
export interface UserFilters {
  page?: number
  page_size?: number
  search?: string | null
  role?: UserRole | null
  is_active?: boolean | null
  sort_by?: string
  sort_desc?: boolean
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Audit log response
 * Synced with: AuditLogResponse schema
 */
export interface AuditLogResponse {
  id: string
  tenant_id: string
  action: string
  resource_type: string
  resource_id: string | null
  description: string | null
  changes: Record<string, any>
  user_id: string | null
  user_email: string | null
  user_name: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/**
 * Audit log list response with pagination
 * Synced with: AuditLogListResponse schema
 */
export interface AuditLogListResponse {
  logs: AuditLogResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/**
 * Audit log filters
 * Synced with: AuditLogFilters schema
 */
export interface AuditLogFilters {
  page?: number
  page_size?: number
  action?: string | null
  resource_type?: string | null
  resource_id?: string | null
  user_id?: string | null
  start_date?: string | null
  end_date?: string | null
  search?: string | null
  sort_by?: string
  sort_desc?: boolean
}

// ============================================================================
// Tenant Settings Types
// ============================================================================

/**
 * Tenant settings update request
 * Synced with: TenantSettingsUpdate schema
 */
export interface TenantSettingsUpdate {
  company_name?: string | null
  domain?: string | null
  logo_url?: string | null
  timezone?: string | null
  date_format?: string | null
  currency?: string | null
}

/**
 * Tenant settings response
 * Synced with: TenantSettingsResponse schema
 */
export interface TenantSettingsResponse {
  id: string
  company_name: string
  domain: string | null
  logo_url: string | null
  is_active: boolean
  subscription_plan: string
  timezone: string | null
  date_format: string | null
  currency: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * User statistics
 * Synced with: UserStatsResponse schema
 */
export interface UserStatsResponse {
  total_users: number
  active_users: number
  inactive_users: number
  users_by_role: Record<string, number>
  recent_logins: number
  new_users_this_month: number
}

/**
 * System statistics
 * Synced with: SystemStatsResponse schema
 */
export interface SystemStatsResponse {
  user_stats: UserStatsResponse
  total_audit_logs: number
  actions_today: number
  actions_this_week: number
  top_actions: Array<{
    action: string
    count: number
  }>
}

// ============================================================================
// UI Helper Types
// ============================================================================

/**
 * User form data (for create/update forms)
 */
export interface UserFormData {
  email: string
  password?: string
  full_name: string
  phone?: string
  role: UserRole
  is_active: boolean
}

/**
 * Settings form data
 */
export interface SettingsFormData {
  company_name: string
  domain?: string
  logo_url?: string
  timezone?: string
  date_format?: string
  currency?: string
}

/**
 * Audit log action types (common actions)
 */
export enum AuditAction {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  SETTINGS_UPDATED = 'tenant.settings_updated',
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
}

/**
 * Resource types for audit logs
 */
export enum AuditResourceType {
  USER = 'user',
  TENANT = 'tenant',
  CLIENT = 'client',
  SALE = 'sale',
  EXPENSE = 'expense',
}
