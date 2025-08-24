'use client';

import Link from 'next/link';
import { useRun } from '@/features/runs/queries';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';

export default function RunPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;
  const { data, isLoading, isError } = useRun(runId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Run <span className="font-mono text-base">#{runId.slice(0, 8)}</span></h1>
        <Link href="/runs" className="text-sm text-primary hover:underline">← Runs</Link>
      </div>

      {isError && <div className="rounded border border-red-500/40 p-3 text-sm text-red-600">Failed to load run.</div>}
      {isLoading && <div className="rounded border border-border/40 p-4 text-sm opacity-75">Loading…</div>}

      {data && (
        <div className="rounded border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <RunStatusBadge status={data.status} />
            <div className="text-sm opacity-70">Health: <span className="font-mono">{data.health ?? '-'}</span></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>Created: <span className="font-mono">{new Date(data.createdAt).toLocaleString()}</span></div>
            <div>Started: <span className="font-mono">{data.startedAt ? new Date(data.startedAt).toLocaleString() : '-'}</span></div>
            <div>Ended: <span className="font-mono">{data.endedAt ? new Date(data.endedAt).toLocaleString() : '-'}</span></div>
            <div>Total: <span className="font-mono">{data.totalRequests ?? 0}</span></div>
            <div>Success: <span className="font-mono">{data.successRequests ?? 0}</span></div>
            <div>Failed: <span className="font-mono">{data.failedRequests ?? 0}</span></div>
            <div>P95 (ms): <span className="font-mono">{data.p95Ms ?? 0}</span></div>
          </div>
          {data.errorMsg && <div className="text-sm text-red-600">Error: {data.errorMsg}</div>}
          <div className="text-xs opacity-70">This is a minimal view. The live console with step stream arrives in FE‑4.</div>
        </div>
      )}
    </div>
  );
}
