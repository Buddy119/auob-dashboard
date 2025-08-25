'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CollectionListItem, CollectionListResponse } from '@/features/collections/types';
import type { Run, RunListResponse } from '@/features/runs/types';

// Load collections (first N for the grid)
export function useCollectionsOverview(limit = 24) {
  return useQuery({
    queryKey: ['dashboard', 'collections', limit],
    queryFn: () => api.get<CollectionListResponse>(`/api/collections?limit=${limit}&offset=0`),
    staleTime: 5_000,
  });
}

// Fetch latest Run (full detail) for a collection (1 request to /runs? then 1 to /runs/:id)
export function useLatestRunForCollection(collectionId: string) {
  return useQuery({
    queryKey: ['dashboard', 'latest-run', collectionId],
    queryFn: async () => {
      const list = await api.get<RunListResponse>(`/api/runs?collectionId=${collectionId}&limit=1&offset=0`);
      if (!list.items.length) return null;
      const runId = list.items[0].id;
      const run = await api.get<Run>(`/api/runs/${runId}`);
      return run;
    },
    staleTime: 5_000,
  });
}

export type FailingItem = { key: string; path: string; count: number; lastSeen: string; sampleRunId: string };

// Compute "Top failing requests (7d)" from recent runs & their steps
export function useTopFailingRequests(days = 7, maxRuns = 30) {
  return useQuery({
    queryKey: ['dashboard', 'top-failing', days, maxRuns],
    queryFn: async (): Promise<FailingItem[]> => {
      const now = Date.now();
      const fromTs = now - days * 24 * 60 * 60 * 1000;

      const runsResp = await api.get<RunListResponse>(`/api/runs?limit=${maxRuns}&offset=0`);
      const recent = runsResp.items
        .filter(r => new Date(r.createdAt).getTime() >= fromTs)
        // newest first
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (!recent.length) return [];

      const stepsLists = await Promise.all(
        recent.map(r => api.get<{ total: number; items: { id: string; name: string; status: 'success'|'fail'; orderIndex?: number; requestId?: string | null; request?: { path: string } | null }[] }>(
          `/api/runs/${r.id}/steps?limit=2000&offset=0`
        ).then(s => ({ runId: r.id, createdAt: r.createdAt, steps: s.items })))
      );

      const agg = new Map<string, FailingItem>();
      for (const { runId, createdAt, steps } of stepsLists) {
        for (const s of steps) {
          if (s.status === 'success') continue;
          const path = s.request?.path || s.name || 'unknown';
          const key = path;
          const prev = agg.get(key);
          if (!prev) {
            agg.set(key, { key, path, count: 1, lastSeen: createdAt, sampleRunId: runId });
          } else {
            const newer = new Date(createdAt) > new Date(prev.lastSeen) ? createdAt : prev.lastSeen;
            agg.set(key, { ...prev, count: prev.count + 1, lastSeen: newer });
          }
        }
      }

      return Array.from(agg.values())
        .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
        .slice(0, 10);
    },
    staleTime: 30_000,
  });
}

// Helper to compute success rate from a run
export function successRate(run: Run | null): number | null {
  if (!run || run.totalRequests == null || run.successRequests == null) return null;
  if (run.totalRequests === 0) return 100;
  return Math.round((run.successRequests / run.totalRequests) * 100);
}

