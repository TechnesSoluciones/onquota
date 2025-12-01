/**
 * Hook para buscar descuentos SPA
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { spaApi } from '@/lib/api/spa';
import type { SPADiscountSearchRequest, SPADiscountResponse } from '@/types/spa';

export function useSPADiscount() {
  const [lastSearch, setLastSearch] = useState<SPADiscountSearchRequest | null>(null);
  const [lastResult, setLastResult] = useState<SPADiscountResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (request: SPADiscountSearchRequest) => spaApi.searchDiscount(request),
    onSuccess: (data, variables) => {
      setLastSearch(variables);
      setLastResult(data);
    }
  });

  const searchDiscount = useCallback(
    (clientId: string, articleNumber: string) => {
      const request: SPADiscountSearchRequest = {
        client_id: clientId,
        article_number: articleNumber
      };

      return mutation.mutateAsync(request);
    },
    [mutation]
  );

  const reset = useCallback(() => {
    setLastSearch(null);
    setLastResult(null);
    mutation.reset();
  }, [mutation]);

  return {
    searchDiscount,
    searching: mutation.isLoading,
    result: mutation.data || lastResult,
    error: mutation.error,
    lastSearch,
    reset
  };
}
