'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateRunBody,
  CreateRunResponse,
  Run,
  RunAssertionView,
  RunListResponse,
  RunStepDetail,
  RunStepResponse,
  RunStepView,
} from './types';
import type { CollectionListItem, CollectionListResponse } from '@/features/collections/types';

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
    select: (res) =>
      res.items.map((i) => ({
        id: i.id,
        stepId: i.runStepId,
        name: i.name,
        status: i.status,
        errorMsg: i.errorMsg ?? null,
      })),
    staleTime: 1000,
    refetchInterval: enabled ? 2000 : false,
  });
}

export function useRunStep(runId: string | null, stepId: string | null, enabled: boolean) {
  const queryEnabled = Boolean(runId && stepId && enabled);

  return useQuery({
    queryKey: ['run-step', runId, stepId],
    queryFn: () => api.get<RunStepDetail>(`/api/runs/${runId}/steps/${stepId}`),
    enabled: queryEnabled,
    staleTime: 1000,
    refetchInterval: (data) => {
      if (!queryEnabled) return false;
      if (!data) return 2000;
      if (data.response) return false;
      if (data.status === 'fail') return false;
      return 2000;
    },
  });
}

export function useRunStepResponse(runId: string | null, stepId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['run-step-response', runId, stepId],
    queryFn: () => api.get<{ id: string; response: RunStepResponse | null }>(`/api/runs/${runId}/steps/${stepId}/response`),
    enabled: Boolean(runId && stepId && enabled),
    select: (res) => res.response,
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
  });
}

export function useCancelRun() {
  return useMutation({
    mutationFn: (runId: string) => api.post<{ status: string }>(`/api/runs/${runId}/cancel`, {}),
  });
}

export function useRunsList(params: { collectionId?: string; status?: string; page: number; limit?: number }) {
  const limit = params.limit ?? 10;
  const offset = (Math.max(1, params.page) - 1) * limit;
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', String(offset));
  if (params.collectionId) qs.set('collectionId', params.collectionId);
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  return useQuery({
    queryKey: ['runs', Object.fromEntries(qs.entries())],
    queryFn: () => api.get<RunListResponse>(`/api/runs?${qs.toString()}`),
    keepPreviousData: true,
    staleTime: 5000,
  });
}

/** Lightweight collection search for the autocomplete */
export function useCollectionsLookup(q: string, limit = 10) {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  qs.set('offset', '0');
  if (q) qs.set('q', q);
  return useQuery({
    queryKey: ['collections-lookup', q, limit],
    queryFn: () => api.get<CollectionListResponse>(`/api/collections?${qs.toString()}`),
    staleTime: 5000,
  });
}

/** Small helper to map collectionId -> name (best effort) */
export function useCollectionNameMap() {
  return useQuery({
    queryKey: ['collections-name-map'],
    queryFn: async () => {
      const res = await api.get<CollectionListResponse>('/api/collections?limit=1000&offset=0');
      const map = new Map<string, string>();
      res.items.forEach((c: CollectionListItem) => map.set(c.id, c.name));
      return map;
    },
    staleTime: 10_000,
  });
}
