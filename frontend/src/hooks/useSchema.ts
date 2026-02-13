'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GlobalSchema, ModelSchema } from '@/types';

export function useGlobalSchema(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  return useQuery<GlobalSchema>({
    queryKey: ['schema', 'global'],
    queryFn: async () => {
      return api.getGlobalSchema();
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useModelSchema(appLabel: string, modelName: string) {
  return useQuery<ModelSchema>({
    queryKey: ['schema', appLabel, modelName],
    queryFn: async () => {
      return api.getModelSchema(appLabel, modelName);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!appLabel && !!modelName,
  });
}

export function usePrefetchModelSchema() {
  const queryClient = useQueryClient();
  return (appLabel: string, modelName: string) => {
    queryClient.prefetchQuery({
      queryKey: ['schema', appLabel, modelName],
      queryFn: () => api.getModelSchema(appLabel, modelName),
    });
  };
}
