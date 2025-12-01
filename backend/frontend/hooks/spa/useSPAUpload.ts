/**
 * Hook para upload de archivos SPA
 */

import { useState, useCallback } from 'react';
import { spaApi } from '@/lib/api/spa';
import type { SPAUploadResult } from '@/types/spa';
import { useToast } from '@/hooks/useToast';

export function useSPAUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SPAUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const uploadFile = useCallback(
    async (file: File, autoCreateClients: boolean = false) => {
      try {
        setUploading(true);
        setProgress(0);
        setError(null);
        setResult(null);

        // Validar archivo antes de subir
        const validExtensions = ['xls', 'xlsx', 'tsv'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          throw new Error(
            `Invalid file type. Allowed: ${validExtensions.join(', ')}`
          );
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error('File too large. Maximum size: 10MB');
        }

        // Upload con progreso
        const uploadResult = await spaApi.upload(
          file,
          autoCreateClients,
          setProgress
        );

        setResult(uploadResult);

        // Mostrar notificación
        if (uploadResult.error_count === 0) {
          showToast({
            type: 'success',
            message: `Successfully uploaded ${uploadResult.success_count} SPAs`
          });
        } else {
          showToast({
            type: 'warning',
            message: `Uploaded ${uploadResult.success_count} SPAs with ${uploadResult.error_count} errors`
          });
        }

        return uploadResult;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
        setError(errorMessage);

        showToast({
          type: 'error',
          message: errorMessage
        });

        throw err;
      } finally {
        setUploading(false);
        setProgress(100);
      }
    },
    [showToast]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return {
    uploadFile,
    uploading,
    progress,
    result,
    error,
    reset
  };
}
