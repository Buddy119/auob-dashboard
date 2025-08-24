'use client';
import type { Run } from '@/features/runs/types';

export function RunStatusBadge({ status }: { status: Run['status'] }) {
  const color =
    status === 'success' ? 'bg-emerald-500' :
    status === 'running' ? 'bg-blue-500' :
    status === 'queued' ? 'bg-zinc-500' :
    status === 'partial' ? 'bg-amber-500' :
    status === 'timeout' || status === 'error' || status === 'fail' ? 'bg-red-600' :
    status === 'cancelled' ? 'bg-zinc-600' : 'bg-zinc-500';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs text-white ${color}`}>{status}</span>;
}
