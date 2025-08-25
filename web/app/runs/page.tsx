'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useRunsList, useCollectionNameMap } from '@/features/runs/queries';
import { RunsTable } from '@/components/runs/RunsTable';
import { CollectionSelect } from '@/components/runs/CollectionSelect';
import { RunsPagination } from '@/components/runs/RunsPagination';
import { Input } from '@/components/ui/Input';

const STATUSES = ['all','queued','running','success','partial','timeout','error','cancelled'] as const;

export default function RunsPage() {
  const params = useSearchParams();
  const router = useRouter();

  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const status = (params.get('status') || 'all') as typeof STATUSES[number];
  const collectionId = params.get('collectionId') || undefined;
  const from = params.get('from') || ''; // client-only filter (current page)
  const to = params.get('to') || '';

  const { data, isLoading, isError } = useRunsList({ collectionId, status, page, limit: 10 });
  const { data: nameMap } = useCollectionNameMap();

  const setParam = (k: string, v?: string) => {
    const sp = new URLSearchParams(params.toString());
    if (v) sp.set(k, v); else sp.delete(k);
    sp.set('page', '1'); // reset page on filter change
    router.push(`/runs?${sp.toString()}`);
  };

  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    if (!from && !to) return items;
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    return items.filter(i => {
      const ts = new Date(i.createdAt).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }, [data?.items, from, to]);

  const collectionNameOf = (id: string) => nameMap?.get(id) || id.slice(0, 8);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Runs</h1>

      <div className="rounded border border-border/40 p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs opacity-70">Collection</div>
            <CollectionSelect value={collectionId} onChange={(id) => setParam('collectionId', id)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs opacity-70">Status</div>
            <select
              className="h-9 w-full rounded-md border border-border/50 bg-bg px-3 text-sm dark:bg-zinc-900"
              value={status}
              onChange={(e) => setParam('status', e.target.value)}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs opacity-70">From (client)</div>
            <Input type="datetime-local" value={from} onChange={(e) => setParam('from', e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs opacity-70">To (client)</div>
            <Input type="datetime-local" value={to} onChange={(e) => setParam('to', e.target.value)} />
          </div>
        </div>
      </div>

      {isError && <div className="rounded border border-red-500/40 p-3 text-sm text-red-600">Failed to load runs.</div>}

      {isLoading ? (
        <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">Loading…</div>
      ) : (
        <>
          <RunsTable items={filteredItems} collectionNameOf={collectionNameOf} />
          <RunsPagination total={data?.total ?? 0} limit={data?.limit ?? 10} />
        </>
      )}
    </div>
  );
}
