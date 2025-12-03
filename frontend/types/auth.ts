/**
 * Authentication Types
 * TypeScript types synchronized with backend Pydantic schemas
 * Source: backend/schemas/auth.py
 */

/**
 * User roles in the system
 * Synced with: backend/models/user.py - UserRole enum
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SALES_REP = 'sales_rep',
  SUPERVISOR = 'supervisor',
  ANALYST = 'analyst',
}

/**
 * Tenant create request
 * Synced with: TenantCreate schema
 */
export interface TenantCreate {
  company_name: string
  domain?: string | null
}

/**
 * Tenant response
 * Synced with: TenantResponse schema
 */
export interface TenantResponse {
  id: string
  company_name: string
  domain: string | null
  is_active: boolean
  subscription_plan: string
  created_at: string
}

/**
 * User create request
 * Synced with: UserCreate schema
 */
export interface UserCreate {
  email: string
  password: string
  full_name: string
  phone?: string | null
}

/**
 * User update request
 * Synced with: UserUpdate schema
 */
export interface UserUpdate {
  full_name?: string | null
  phone?: string | null
  avatar_url?: string | null
}

/**
 * User response
 * Synced with: UserResponse schema
 */
export interface UserResponse {
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
  created_at: string
}

/**
 * Registration request (creates tenant + admin user)
 * Synced with: UserRegister schema
 */
export interface RegisterRequest {
  company_name: string
  domain?: string | null
  email: string
  password: string
  full_name: string
  phone?: string | null
}

/**
 * Login request
 * Synced with: UserLogin schema
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Token response
 * Synced with: TokenResponse schema
 */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

/**
 * Token refresh request
 * Synced with: TokenRefresh schema
 */
export interface TokenRefresh {
  refresh_token: string
}

/**
 * JWT token payload data
 * Synced with: TokenData schema
 */
export interface TokenData {
  user_id: string
  tenant_id: string
  email: string
  role: UserRole
}

/**
 * Password reset request
 * Synced with: PasswordResetRequest schema
 */
export interface PasswordResetRequest {
  email: string
}

/**
 * Password reset (with token)
 * Synced with: PasswordReset schema
 */
export interface PasswordReset {
  token: string
  new_password: string
}

/**
 * Password change (authenticated)
 * Synced with: PasswordChange schema
 */
export interface PasswordChange {
  current_password: string
  new_password: string
}

/**
 * Alias for UserResponse to match common naming pattern
 */
export type User = UserResponse
