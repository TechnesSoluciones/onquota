/**
 * Two-Factor Authentication Types
 */

export interface TwoFactorEnableResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface TwoFactorVerifySetupRequest {
  token: string;
  secret: string;
}

export interface TwoFactorVerifySetupResponse {
  success: boolean;
  message: string;
  enabled_at: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  token?: string;
}

export interface TwoFactorDisableResponse {
  success: boolean;
  message: string;
}

export interface TwoFactorVerifyRequest {
  email: string;
  token: string;
}

export interface TwoFactorVerifyResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  verified_at?: string;
  backup_codes_remaining?: number;
}

export interface BackupCodesRegenerateRequest {
  password: string;
  token: string;
}

export interface BackupCodesRegenerateResponse {
  backup_codes: string[];
  message: string;
}

export interface LoginResponse {
  requires_2fa?: boolean;
  email?: string;
  message?: string;
  // Normal login response fields
  id?: string;
  full_name?: string;
  role?: string;
}
