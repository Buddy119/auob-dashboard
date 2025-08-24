'use client';

import type { Run } from '@/features/runs/types';
import { RunStatusBadge } from './RunStatusBadge';
import { Button } from '@/components/ui/Button';

export function RunHeader({
  run,
  onCancel,
  cancelling,
  connected,
}: {
  run: Run | undefined;
  onCancel: () => void;
  cancelling: boolean;
  connected: boolean;
}) {
  return (
    <div className="rounded border border-border/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RunStatusBadge status={run?.status ?? 'queued'} />
          <div className="text-sm opacity-70">
            Health: <span className="font-mono">{run?.health ?? '-'}</span>
          </div>
          <div className={`text-xs rounded px-1.5 py-0.5 ${connected ? 'bg-emerald-600 text-white' : 'bg-zinc-600 text-white'}`}>
            {connected ? 'LIVE' : 'DISCONNECTED'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={cancelling || !run || ['success','partial','fail','timeout','error','cancelled'].includes(run.status)}>
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        </div>
      </div>

      {run && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>Created: <span className="font-mono">{new Date(run.createdAt).toLocaleString()}</span></div>
          <div>Started: <span className="font-mono">{run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}</span></div>
          <div>Ended: <span className="font-mono">{run.endedAt ? new Date(run.endedAt).toLocaleString() : '-'}</span></div>
          <div>Total: <span className="font-mono">{run.totalRequests ?? 0}</span></div>
          <div>Success: <span className="font-mono">{run.successRequests ?? 0}</span></div>
          <div>Failed: <span className="font-mono">{run.failedRequests ?? 0}</span></div>
          <div>P95 (ms): <span className="font-mono">{run.p95Ms ?? 0}</span></div>
        </div>
      )}
    </div>
  );
}
