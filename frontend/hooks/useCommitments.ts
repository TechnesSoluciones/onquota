/**
 * Commitments Hooks
 * React hooks for commitment and follow-up management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commitmentsApi } from '@/lib/api';
import type {
  Commitment,
  CommitmentCreate,
  CommitmentUpdate,
  CommitmentComplete,
  CommitmentFilters,
} from '@/types/visit';
import { toast } from 'sonner';

// Query keys
export const commitmentKeys = {
  all: ['commitments'] as const,
  lists: () => [...commitmentKeys.all, 'list'] as const,
  list: (filters: CommitmentFilters) =>
    [...commitmentKeys.lists(), filters] as const,
  pending: (userId?: string, page?: number) =>
    [...commitmentKeys.all, 'pending', { userId, page }] as const,
  overdue: (userId?: string, page?: number) =>
    [...commitmentKeys.all, 'overdue', { userId, page }] as const,
  stats: (userId?: string) =>
    [...commitmentKeys.all, 'stats', userId] as const,
  detail: (id: string) => [...commitmentKeys.all, 'detail', id] as const,
};

/**
 * Get paginated list of commitments with filters
 */
export const useCommitments = (filters?: CommitmentFilters) => {
  return useQuery({
    queryKey: commitmentKeys.list(filters || {}),
    queryFn: () => commitmentsApi.getCommitments(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single commitment by ID
 */
export const useCommitment = (commitmentId: string | null) => {
  return useQuery({
    queryKey: commitmentKeys.detail(commitmentId || ''),
    queryFn: () => commitmentsApi.getCommitment(commitmentId!),
    enabled: !!commitmentId,
  });
};

/**
 * Get pending commitments
 */
export const usePendingCommitments = (
  assignedToUserId?: string,
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: commitmentKeys.pending(assignedToUserId, page),
    queryFn: () =>
      commitmentsApi.getPendingCommitments(assignedToUserId, page, pageSize),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Get overdue commitments
 */
export const useOverdueCommitments = (
  assignedToUserId?: string,
  page: number = 1,
  pageSize: number = 20
) => {
  return useQuery({
    queryKey: commitmentKeys.overdue(assignedToUserId, page),
    queryFn: () =>
      commitmentsApi.getOverdueCommitments(assignedToUserId, page, pageSize),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Get commitment statistics
 */
export const useCommitmentStats = (assignedToUserId?: string) => {
  return useQuery({
    queryKey: commitmentKeys.stats(assignedToUserId),
    queryFn: () => commitmentsApi.getCommitmentStats(assignedToUserId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Create a new commitment
 */
export const useCreateCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CommitmentCreate) =>
      commitmentsApi.createCommitment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commitmentKeys.all });
      toast.success('Compromiso creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al crear compromiso');
    },
  });
};

/**
 * Update a commitment
 */
export const useUpdateCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commitmentId,
      data,
    }: {
      commitmentId: string;
      data: CommitmentUpdate;
    }) => commitmentsApi.updateCommitment(commitmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commitmentKeys.all });
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.detail(variables.commitmentId),
      });
      toast.success('Compromiso actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || 'Error al actualizar compromiso'
      );
    },
  });
};

/**
 * Complete a commitment
 */
export const useCompleteCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commitmentId,
      data,
    }: {
      commitmentId: string;
      data: CommitmentComplete;
    }) => commitmentsApi.completeCommitment(commitmentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: commitmentKeys.all });
      queryClient.invalidateQueries({
        queryKey: commitmentKeys.detail(variables.commitmentId),
      });
      toast.success('Compromiso completado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || 'Error al completar compromiso'
      );
    },
  });
};

/**
 * Delete a commitment
 */
export const useDeleteCommitment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commitmentId: string) =>
      commitmentsApi.deleteCommitment(commitmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commitmentKeys.all });
      toast.success('Compromiso eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.detail || 'Error al eliminar compromiso'
      );
    },
  });
};
