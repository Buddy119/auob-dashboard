'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CollectionDetail, CollectionListResponse, UploadResponse } from './types';

export function useCollectionsList(q: string, page: number, limit = 10) {
  const offset = (Math.max(1, page) - 1) * limit;
  return useQuery({
    queryKey: ['collections', { q, page, limit }],
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set('limit', String(limit));
      qs.set('offset', String(offset));
      if (q) qs.set('q', q);
      return api.get<CollectionListResponse>(`/api/collections?${qs.toString()}`);
    },
    keepPreviousData: true,
    staleTime: 5000,
  });
}

export function useUploadCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: { collection: File; env?: File }) => {
      const fd = new FormData();
      fd.append('collection', files.collection);
      if (files.env) fd.append('env', files.env);
      return api.postMultipart<UploadResponse>('/api/collections/upload', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useCollectionDetail(id: string, withRequests: boolean) {
  return useQuery({
    queryKey: ['collection', id, { withRequests }],
    queryFn: () => api.get<CollectionDetail>(`/api/collections/${id}${withRequests ? '?withRequests=true' : ''}`),
    staleTime: 5_000,
  });
}

export function useToggleCritical(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { requestId: string; isCritical: boolean }) => {
      return api.patch<{ id: string; isCritical: boolean }>(
        `/api/collections/${collectionId}/requests/${p.requestId}`,
        { isCritical: p.isCritical },
      );
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: ['collection', collectionId] });
      const key = ['collection', collectionId, { withRequests: true }];
      const prev = qc.getQueryData<CollectionDetail>(key);
      if (prev?.requests) {
        const next: CollectionDetail = {
          ...prev,
          requests: prev.requests.map(r => r.id === p.requestId ? { ...r, isCritical: p.isCritical } : r),
        };
        qc.setQueryData(key, next);
      }
      return { prev };
    },
    onError: (_err, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(['collection', collectionId, { withRequests: true }], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['collection', collectionId], exact: false });
    },
  });
}
