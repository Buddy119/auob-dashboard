'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useCollectionDetail } from '@/features/collections/queries';
import { Input } from '@/components/ui/Input';
import { RequestsTree } from '@/components/collections/RequestsTree';
import { EnvsTable } from '@/components/collections/EnvsTable';
import { Button } from '@/components/ui/Button';
import { RunDialog } from '@/components/runs/RunDialog';

function useTab() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('tab') || 'requests';
  const setTab = (t: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('tab', t);
    router.replace(`?${sp.toString()}`);
  };
  return { tab, setTab };
}

export default function CollectionDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { tab, setTab } = useTab();
  const [filter, setFilter] = useState('');
  const [runOpen, setRunOpen] = useState(false);
  const withRequests = tab === 'requests';

  const { data, isLoading, isError } = useCollectionDetail(id, withRequests);

  const header = useMemo(() => {
    if (!data) return null;
    return (
      <div className="rounded border border-border/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            <div className="text-sm opacity-70">
              Version: {data.version ?? '-'} · Created: {new Date(data.createdAt).toLocaleString()} · Updated: {new Date(data.updatedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRunOpen(true)}
              className="px-3 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90"
            >
              Run collection
            </button>
            <Link href="/collections" className="text-sm text-primary hover:underline">← Back to Collections</Link>
          </div>
        </div>
      </div>
    );
  }, [data]);

  return (
    <div className="p-6 space-y-4">
      {isError && <div className="rounded border border-red-500/40 p-3 text-sm text-red-600">Failed to load collection.</div>}
      {!isError && header}

      {/* Tabs */}
      <div className="border-b border-border/40 flex items-center gap-2">
        {['requests','environments','history'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === t ? 'border-primary text-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
            aria-current={tab === t ? 'page' : undefined}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading && <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">Loading…</div>}
      {!isLoading && data && (
        <>
          {tab === 'requests' && (
            <>
              <div className="flex items-center gap-3">
                <Input placeholder="Filter by name or path…" value={filter} onChange={(e) => setFilter(e.target.value)} />
                <div className="text-sm opacity-70">Total indexed: {data._count.requests}</div>
              </div>
              <RequestsTree collectionId={id} requests={data.requests || []} filter={filter} />
            </>
          )}

          {tab === 'environments' && (
            <EnvsTable envs={data.envs} />
          )}

          {tab === 'history' && (
            <div className="rounded border border-border/40 p-4 text-sm opacity-75">
              History view coming soon (FE‑5). Use the Runs page meanwhile.
            </div>
          )}
        </>
      )}
      {data && (
        <RunDialog
          open={runOpen}
          onOpenChange={setRunOpen}
          collectionId={id}
          envs={data.envs}
        />
      )}
    </div>
  );
}
