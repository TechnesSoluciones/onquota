/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import apiClient from './client'
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  TokenRefresh,
  UserResponse,
  PasswordResetRequest,
  PasswordReset,
  PasswordChange,
} from '@/types/auth'

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Register new user and tenant
   * POST /api/v1/auth/register
   *
   * NOTE: Tokens are set as httpOnly cookies by the backend.
   * The response only contains user data, not tokens.
   */
  register: async (data: RegisterRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>(
      '/api/v1/auth/register',
      data
    )
    return response.data
  },

  /**
   * Login user
   * POST /api/v1/auth/login
   *
   * NOTE: Tokens are set as httpOnly cookies by the backend.
   * The response only contains user data, not tokens.
   */
  login: async (data: LoginRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>(
      '/api/v1/auth/login',
      data
    )
    return response.data
  },

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refresh: async (data: TokenRefresh): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>(
      '/api/v1/auth/refresh',
      data
    )
    return response.data
  },

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout')
  },

  /**
   * Get current authenticated user
   * GET /api/v1/auth/me
   */
  me: async (): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>('/api/v1/auth/me')
    return response.data
  },

  /**
   * Request password reset
   * POST /api/v1/auth/password-reset-request
   */
  requestPasswordReset: async (data: PasswordResetRequest): Promise<void> => {
    await apiClient.post('/api/v1/auth/password-reset-request', data)
  },

  /**
   * Reset password with token
   * POST /api/v1/auth/password-reset
   */
  resetPassword: async (data: PasswordReset): Promise<void> => {
    await apiClient.post('/api/v1/auth/password-reset', data)
  },

  /**
   * Change password (authenticated user)
   * POST /api/v1/auth/password-change
   */
  changePassword: async (data: PasswordChange): Promise<void> => {
    await apiClient.post('/api/v1/auth/password-change', data)
  },
}
