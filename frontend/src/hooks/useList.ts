'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaginatedResponse, ListParams } from '@/types';

export function useList<T = Record<string, unknown>>(
  appLabel: string,
  modelName: string,
  params: ListParams = {}
) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<PaginatedResponse<T>>({
    queryKey: ['list', appLabel, modelName, params],
    queryFn: () => api.list<T>(appLabel, modelName, params),
    enabled: !!appLabel && !!modelName,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(appLabel, modelName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', appLabel, modelName] });
    },
  });

  return {
    data,
    results: data?.results ?? [],
    count: data?.count ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.page_size ?? 25,
    totalPages: data?.total_pages ?? 0,
    isLoading,
    error,
    deleteOne: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['list', appLabel, modelName] }),
  };
}
