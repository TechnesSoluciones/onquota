/**
 * Hook para estadísticas de SPAs
 */

import { useQuery } from '@tanstack/react-query';
import { spaApi } from '@/lib/api/spa';

export function useSPAStats() {
  return useQuery({
    queryKey: ['spa-stats'],
    queryFn: () => spaApi.getStats(),
    staleTime: 60000, // 1 minuto
    refetchInterval: 300000 // Re-fetch cada 5 minutos
  });
}
