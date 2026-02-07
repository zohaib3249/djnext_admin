'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDetail<T = Record<string, unknown>>(
  appLabel: string,
  modelName: string,
  id: string | null
) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<T>({
    queryKey: ['detail', appLabel, modelName, id],
    queryFn: () => api.get<T>(appLabel, modelName, id!),
    enabled: !!appLabel && !!modelName && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.partialUpdate<T>(appLabel, modelName, id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['detail', appLabel, modelName, id],
      });
      queryClient.invalidateQueries({ queryKey: ['list', appLabel, modelName] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.create<T>(appLabel, modelName, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', appLabel, modelName] });
    },
  });

  return {
    data,
    isLoading,
    error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    refetch: () =>
      queryClient.invalidateQueries({
        queryKey: ['detail', appLabel, modelName, id],
      }),
  };
}
