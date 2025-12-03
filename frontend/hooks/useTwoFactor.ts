/**
 * Two-Factor Authentication Hook
 */
import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import type {
  TwoFactorEnableResponse,
  TwoFactorVerifySetupRequest,
  TwoFactorVerifySetupResponse,
  TwoFactorDisableRequest,
  TwoFactorDisableResponse,
  TwoFactorVerifyRequest,
  TwoFactorStatusResponse,
  BackupCodesRegenerateRequest,
  BackupCodesRegenerateResponse,
} from '@/types/two-factor';

export function useTwoFactor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Enable 2FA - Get QR code and backup codes
   */
  const enable2FA = async (): Promise<TwoFactorEnableResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<TwoFactorEnableResponse>(
        '/auth/2fa/enable'
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to enable 2FA';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify and complete 2FA setup
   */
  const verifySetup = async (
    data: TwoFactorVerifySetupRequest
  ): Promise<TwoFactorVerifySetupResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<TwoFactorVerifySetupResponse>(
        '/auth/2fa/verify-setup',
        data
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid verification code';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable 2FA
   */
  const disable2FA = async (
    data: TwoFactorDisableRequest
  ): Promise<TwoFactorDisableResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<TwoFactorDisableResponse>(
        '/auth/2fa/disable',
        data
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to disable 2FA';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify 2FA code during login
   */
  const verifyLogin = async (
    data: TwoFactorVerifyRequest
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/auth/2fa/verify-login', data);
      // Cookies are set by backend, no need to handle response
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid verification code';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get 2FA status
   */
  const getStatus = async (): Promise<TwoFactorStatusResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<TwoFactorStatusResponse>(
        '/auth/2fa/status'
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to get 2FA status';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regenerate backup codes
   */
  const regenerateBackupCodes = async (
    data: BackupCodesRegenerateRequest
  ): Promise<BackupCodesRegenerateResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<BackupCodesRegenerateResponse>(
        '/auth/2fa/backup-codes/regenerate',
        data
      );
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to regenerate backup codes';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    enable2FA,
    verifySetup,
    disable2FA,
    verifyLogin,
    getStatus,
    regenerateBackupCodes,
  };
}
