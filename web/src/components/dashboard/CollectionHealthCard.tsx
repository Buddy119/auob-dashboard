'use client';

import type { CollectionListItem } from '@/features/collections/types';
import { useLatestRunForCollection, successRate } from '@/features/dashboard/queries';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';
import { HealthBadge } from '@/components/runs/HealthBadge';
import { QuickRunButton } from '@/components/runs/QuickRunButton';
import Link from 'next/link';

export function CollectionHealthCard({ c }: { c: CollectionListItem }) {
  const { data: run, isLoading } = useLatestRunForCollection(c.id);
  const rate = successRate(run);

  return (
    <div className="rounded-lg border border-border/40 p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/collections/${c.id}`} className="text-base font-medium text-primary hover:underline">
            {c.name}
          </Link>
          <div className="text-xs opacity-70">Version: {c.version ?? '-'} · Requests: {c._count.requests} · Runs: {c._count.runs}</div>
        </div>
        <QuickRunButton collectionId={c.id} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="opacity-70">Status:</span>
          {isLoading ? <span className="text-xs opacity-60">Loading…</span> :
            run ? <RunStatusBadge status={run.status} /> : <span className="text-xs opacity-60">No runs</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-70">Health:</span>
          {run ? <HealthBadge health={run.health ?? undefined} /> : <span className="text-xs opacity-60">-</span>}
        </div>
        <div><span className="opacity-70">P95:</span> <span className="font-mono">{run?.p95Ms ?? '-'}</span></div>
        <div><span className="opacity-70">Success:</span> <span className="font-mono">{rate != null ? `${rate}%` : '-'}</span></div>
      </div>
    </div>
  );
}

