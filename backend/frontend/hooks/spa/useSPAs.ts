/**
 * Hook para listar SPAs con react-query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spaApi } from '@/lib/api/spa';
import type { SPASearchParams } from '@/types/spa';
import { useToast } from '@/hooks/useToast';

const SPA_QUERY_KEY = 'spas';

export function useSPAs(params: SPASearchParams = {}) {
  return useQuery({
    queryKey: [SPA_QUERY_KEY, params],
    queryFn: () => spaApi.list(params),
    keepPreviousData: true,
    staleTime: 30000 // 30 segundos
  });
}

export function useSPADetail(spaId: string | null) {
  return useQuery({
    queryKey: [SPA_QUERY_KEY, 'detail', spaId],
    queryFn: () => spaId ? spaApi.getById(spaId) : null,
    enabled: !!spaId
  });
}

export function useClientSPAs(clientId: string | null, activeOnly: boolean = true) {
  return useQuery({
    queryKey: [SPA_QUERY_KEY, 'client', clientId, activeOnly],
    queryFn: () => clientId ? spaApi.getClientSpas(clientId, activeOnly) : [],
    enabled: !!clientId,
    staleTime: 60000 // 1 minuto
  });
}

export function useDeleteSPA() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (spaId: string) => spaApi.delete(spaId),
    onSuccess: () => {
      queryClient.invalidateQueries([SPA_QUERY_KEY]);
      showToast({
        type: 'success',
        message: 'SPA deleted successfully'
      });
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to delete SPA'
      });
    }
  });
}

export function useExportSPAs() {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportSPAs = useCallback(
    async (params: SPASearchParams = {}) => {
      try {
        setExporting(true);

        const blob = await spaApi.export(params);

        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `spas_export_${timestamp}.xlsx`;

        spaApi.downloadExport(blob, filename);

        showToast({
          type: 'success',
          message: 'SPAs exported successfully'
        });
      } catch (error: any) {
        showToast({
          type: 'error',
          message: error.response?.data?.detail || 'Export failed'
        });
      } finally {
        setExporting(false);
      }
    },
    [showToast]
  );

  return {
    exportSPAs,
    exporting
  };
}
