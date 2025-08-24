'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateRunBody, CreateRunResponse, Run, RunAssertionView, RunStepView } from './types';

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

export function useRunSteps(runId: string, enabled: boolean) {
  // fetch up to 2000 steps as a single page for fallback; adjust if you expect more
  return useQuery({
    queryKey: ['run-steps', runId],
    queryFn: () => api.get<{ total: number; items: (RunStepView & { request: { path: string } | null })[] }>(`/api/runs/${runId}/steps?limit=2000&offset=0`),
    enabled,
    select: (res) =>
      res.items.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status as any,
        httpStatus: s.httpStatus ?? null,
        latencyMs: s.latencyMs ?? null,
        requestId: s.requestId ?? null,
        requestPath: s.request?.path ?? null,
        orderIndex: s.orderIndex ?? null,
      })) as RunStepView[],
    staleTime: 1000,
    refetchInterval: enabled ? 2000 : false,
  });
}

export function useRunAssertions(runId: string, stepId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['run-assertions', runId, stepId],
    queryFn: () => api.get<{ total: number; items: { id: string; runStepId: string; name: string; status: 'pass'|'fail'; errorMsg?: string | null }[] }>(
      `/api/runs/${runId}/assertions${stepId ? `?stepId=${stepId}` : ''}`
    ),
    enabled,
    select: (res) => res.items.map(i => ({ stepId: i.runStepId, name: i.name, status: i.status, errorMsg: i.errorMsg ?? null })),
    staleTime: 1000,
    refetchInterval: enabled ? 2000 : false,
  });
}

export function useCancelRun() {
  return useMutation({
    mutationFn: (runId: string) => api.post<{ status: string }>(`/api/runs/${runId}/cancel`, {}),
  });
}
