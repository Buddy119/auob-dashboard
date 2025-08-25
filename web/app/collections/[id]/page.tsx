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
import { getPreferredEnvId, setPreferredEnvId } from '@/features/collections/envPref';
import { RunConsoleSkeleton } from '@/components/skeletons/RunConsoleSkeleton';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { CopyButton } from '@/components/ui/CopyButton';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

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
  const [initialEnvId, setInitialEnvId] = useState<string | undefined>(undefined);
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
            {data && (
              <>
                <CopyButton label="Copy collection ID" copiedLabel="Collection ID copied" text={data.id} />
                <CopyButton
                  label="Copy collection link"
                  copiedLabel="Link copied"
                  text={typeof window !== 'undefined' ? window.location.href : `${API_BASE}/collections/${data.id}`}
                />
              </>
            )}
            <button
              onClick={() => {
                setInitialEnvId(undefined);
                setRunOpen(true);
              }}
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
      {isError && <ErrorPanel message="Failed to load collection." />}

      {isLoading && <RunConsoleSkeleton />}

      {!isLoading && data && (
        <>
          {header}

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
            <>
              <EnvsTable
                envs={data.envs}
                preferredEnvId={getPreferredEnvId(id)}
                onSetPreferred={(envId) => {
                  setPreferredEnvId(id, envId);
                  setInitialEnvId(envId);
                }}
                onRunWith={(envId) => {
                  setInitialEnvId(envId);
                  setRunOpen(true);
                }}
              />
              <RunDialog
                open={runOpen}
                onOpenChange={setRunOpen}
                collectionId={id}
                envs={data.envs}
                initialEnvId={initialEnvId || getPreferredEnvId(id) || data.envs.find(e => e.isDefault)?.id}
              />
            </>
          )}

          {tab === 'history' && (
            <div className="rounded border border-border/40 p-4 text-sm opacity-75">
              History view coming soon (FE‑5). Use the Runs page meanwhile.
            </div>
          )}

          {tab !== 'environments' && (
            <RunDialog
              open={runOpen}
              onOpenChange={setRunOpen}
              collectionId={id}
              envs={data.envs}
              initialEnvId={initialEnvId || getPreferredEnvId(id) || data.envs.find(e => e.isDefault)?.id}
            />
          )}
        </>
      )}
    </div>
  );
}
