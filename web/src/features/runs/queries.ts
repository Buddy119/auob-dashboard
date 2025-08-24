'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateRunBody, CreateRunResponse, Run } from './types';

export function useCreateRun(collectionId: string) {
  return useMutation({
    mutationFn: (body: CreateRunBody) =>
      api.post<CreateRunResponse>(`/api/collections/${collectionId}/run`, body),
  });
}

const TERMINAL: Run['status'][] = ['success','partial','fail','timeout','error','cancelled'];

export function useRun(runId: string) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.get<Run>(`/api/runs/${runId}`),
    refetchInterval: (data) => {
      if (!data) return 1000;
      return TERMINAL.includes(data.status) ? false : 1000;
    },
  });
}
