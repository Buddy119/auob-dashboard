'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CollectionListResponse, UploadResponse } from './types';

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
