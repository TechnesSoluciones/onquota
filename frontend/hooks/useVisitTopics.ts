/**
 * Visit Topics Hooks
 * React hooks for visit topic management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitTopicsApi } from '@/lib/api';
import type {
  VisitTopic,
  VisitTopicCreate,
  VisitTopicUpdate,
} from '@/types/visit';
import { toast } from 'sonner';

// Query keys
export const visitTopicKeys = {
  all: ['visit-topics'] as const,
  lists: () => [...visitTopicKeys.all, 'list'] as const,
  list: (filters: { isActive?: boolean; page?: number }) =>
    [...visitTopicKeys.lists(), filters] as const,
  active: () => [...visitTopicKeys.all, 'active'] as const,
  detail: (id: string) => [...visitTopicKeys.all, 'detail', id] as const,
};

/**
 * Get all active visit topics (for dropdowns)
 */
export const useActiveVisitTopics = () => {
  return useQuery({
    queryKey: visitTopicKeys.active(),
    queryFn: () => visitTopicsApi.getActive(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get paginated list of visit topics
 */
export const useVisitTopics = (
  isActive?: boolean,
  page: number = 1,
  pageSize: number = 100
) => {
  return useQuery({
    queryKey: visitTopicKeys.list({ isActive, page }),
    queryFn: () => visitTopicsApi.getTopics(isActive, page, pageSize),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get a single visit topic by ID
 */
export const useVisitTopic = (topicId: string | null) => {
  return useQuery({
    queryKey: visitTopicKeys.detail(topicId || ''),
    queryFn: () => visitTopicsApi.getTopic(topicId!),
    enabled: !!topicId,
  });
};

/**
 * Create a new visit topic
 */
export const useCreateVisitTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VisitTopicCreate) => visitTopicsApi.createTopic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitTopicKeys.all });
      toast.success('Tema creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al crear tema');
    },
  });
};

/**
 * Update a visit topic
 */
export const useUpdateVisitTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      data,
    }: {
      topicId: string;
      data: VisitTopicUpdate;
    }) => visitTopicsApi.updateTopic(topicId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: visitTopicKeys.all });
      queryClient.invalidateQueries({
        queryKey: visitTopicKeys.detail(variables.topicId),
      });
      toast.success('Tema actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al actualizar tema');
    },
  });
};

/**
 * Deactivate a visit topic
 */
export const useDeactivateVisitTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topicId: string) => visitTopicsApi.deactivateTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitTopicKeys.all });
      toast.success('Tema desactivado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al desactivar tema');
    },
  });
};

/**
 * Seed default visit topics
 */
export const useSeedDefaultTopics = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => visitTopicsApi.seedDefaults(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: visitTopicKeys.all });
      toast.success(`${data.length} temas predefinidos creados exitosamente`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || 'Error al crear temas predefinidos'
      );
    },
  });
};
