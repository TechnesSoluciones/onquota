/**
 * Enhanced Visits Hooks
 * React hooks for visit management with topics and opportunities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  visitsApi,
  callsApi,
  visitTopicDetailsApi,
  visitOpportunitiesApi,
  visitAnalyticsApi,
} from '@/lib/api';
import type {
  Visit,
  VisitCreate,
  VisitUpdate,
  VisitFilters,
  VisitTopicDetailCreate,
  VisitOpportunityCreate,
  CallFilters,
  CallCreate,
  CallUpdate,
} from '@/types/visit';
import { toast } from 'sonner';

// Query keys
export const visitKeys = {
  all: ['visits'] as const,
  lists: () => [...visitKeys.all, 'list'] as const,
  list: (filters: VisitFilters) => [...visitKeys.lists(), filters] as const,
  detail: (id: string) => [...visitKeys.all, 'detail', id] as const,
  analytics: {
    all: ['visit-analytics'] as const,
    summary: () => [...visitKeys.analytics.all, 'summary'] as const,
    byClient: (clientId: string) =>
      [...visitKeys.analytics.all, 'by-client', clientId] as const,
    byTopic: () => [...visitKeys.analytics.all, 'by-topic'] as const,
    conversion: () => [...visitKeys.analytics.all, 'conversion'] as const,
  },
};

export const callKeys = {
  all: ['calls'] as const,
  lists: () => [...callKeys.all, 'list'] as const,
  list: (filters: CallFilters) => [...callKeys.lists(), filters] as const,
  detail: (id: string) => [...callKeys.all, 'detail', id] as const,
};

/**
 * Get paginated list of visits with filters
 */
export const useVisits = (filters?: VisitFilters) => {
  return useQuery({
    queryKey: visitKeys.list(filters || {}),
    queryFn: () => visitsApi.getVisits(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single visit by ID
 */
export const useVisit = (visitId: string | null) => {
  return useQuery({
    queryKey: visitKeys.detail(visitId || ''),
    queryFn: () => visitsApi.getVisit(visitId!),
    enabled: !!visitId,
  });
};

/**
 * Create a new visit
 */
export const useCreateVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VisitCreate) => visitsApi.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      toast.success('Visita creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al crear visita');
    },
  });
};

/**
 * Update a visit
 */
export const useUpdateVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      data,
    }: {
      visitId: string;
      data: VisitUpdate;
    }) => visitsApi.updateVisit(visitId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.visitId),
      });
      toast.success('Visita actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al actualizar visita');
    },
  });
};

/**
 * Delete a visit
 */
export const useDeleteVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visitId: string) => visitsApi.deleteVisit(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
      toast.success('Visita eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al eliminar visita');
    },
  });
};

// =============================================================================
// Calls Hooks
// =============================================================================

/**
 * Get paginated list of calls with filters
 */
export const useCalls = (filters?: CallFilters) => {
  return useQuery({
    queryKey: callKeys.list(filters || {}),
    queryFn: () => callsApi.getCalls(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single call by ID
 */
export const useCall = (callId: string | null) => {
  return useQuery({
    queryKey: callKeys.detail(callId || ''),
    queryFn: () => callsApi.getCall(callId!),
    enabled: !!callId,
  });
};

/**
 * Create a new call
 */
export const useCreateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CallCreate) => callsApi.createCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.lists() });
      toast.success('Llamada creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al crear llamada');
    },
  });
};

/**
 * Update a call
 */
export const useUpdateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      callId,
      data,
    }: {
      callId: string;
      data: CallUpdate;
    }) => callsApi.updateCall(callId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: callKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: callKeys.detail(variables.callId),
      });
      toast.success('Llamada actualizada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al actualizar llamada');
    },
  });
};

/**
 * Delete a call
 */
export const useDeleteCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (callId: string) => callsApi.deleteCall(callId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.lists() });
      toast.success('Llamada eliminada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al eliminar llamada');
    },
  });
};

/**
 * Add a topic to a visit
 */
export const useAddTopicToVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      data,
    }: {
      visitId: string;
      data: VisitTopicDetailCreate;
    }) => visitTopicDetailsApi.addTopic(visitId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.visitId),
      });
      toast.success('Tema agregado a la visita');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al agregar tema');
    },
  });
};

/**
 * Remove a topic from a visit
 */
export const useRemoveTopicFromVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      topicDetailId,
    }: {
      visitId: string;
      topicDetailId: string;
    }) => visitTopicDetailsApi.removeTopic(visitId, topicDetailId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.visitId),
      });
      toast.success('Tema eliminado de la visita');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al eliminar tema');
    },
  });
};

/**
 * Link an opportunity to a visit
 */
export const useLinkOpportunityToVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      data,
    }: {
      visitId: string;
      data: VisitOpportunityCreate;
    }) => visitOpportunitiesApi.linkOpportunity(visitId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.visitId),
      });
      toast.success('Lead vinculado a la visita');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al vincular lead');
    },
  });
};

/**
 * Unlink an opportunity from a visit
 */
export const useUnlinkOpportunityFromVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      opportunityId,
    }: {
      visitId: string;
      opportunityId: string;
    }) => visitOpportunitiesApi.unlinkOpportunity(visitId, opportunityId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: visitKeys.detail(variables.visitId),
      });
      toast.success('Lead desvinculado de la visita');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al desvincular lead');
    },
  });
};

// =============================================================================
// Analytics Hooks
// =============================================================================

/**
 * Get visit analytics summary
 */
export const useVisitAnalyticsSummary = () => {
  return useQuery({
    queryKey: visitKeys.analytics.summary(),
    queryFn: () => visitAnalyticsApi.getSummary(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get visit analytics by client
 */
export const useVisitAnalyticsByClient = (clientId: string | null) => {
  return useQuery({
    queryKey: visitKeys.analytics.byClient(clientId || ''),
    queryFn: () => visitAnalyticsApi.getByClient(clientId!),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get visit analytics by topic
 */
export const useVisitAnalyticsByTopic = () => {
  return useQuery({
    queryKey: visitKeys.analytics.byTopic(),
    queryFn: () => visitAnalyticsApi.getByTopic(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get conversion funnel analytics
 */
export const useVisitConversionFunnel = () => {
  return useQuery({
    queryKey: visitKeys.analytics.conversion(),
    queryFn: () => visitAnalyticsApi.getConversionFunnel(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
