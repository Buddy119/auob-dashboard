'use client';

import Link from 'next/link';
import type { RunListItem } from '@/features/runs/types';
import { RunStatusBadge } from './RunStatusBadge';
import { HealthBadge } from './HealthBadge';

export function RunsTable({
  items,
  collectionNameOf,
}: {
  items: RunListItem[];
  collectionNameOf: (id: string) => string;
}) {
  if (!items?.length) {
    return <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">No runs found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Run</th>
            <th className="p-3">Collection</th>
            <th className="p-3">Status</th>
            <th className="p-3">Health</th>
            <th className="p-3">Created</th>
            <th className="p-3">Duration</th>
            <th className="p-3">P95 (ms)</th>
            <th className="p-3">Failed</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t border-border/40 hover:bg-muted/40">
              <td className="p-3">
                <Link href={`/runs/${r.id}`} className="text-primary hover:underline font-mono">{r.id.slice(0, 8)}</Link>
              </td>
              <td className="p-3">
                <Link href={`/collections/${r.collectionId}`} className="text-primary hover:underline">
                  {collectionNameOf(r.collectionId)}
                </Link>
              </td>
              <td className="p-3"><RunStatusBadge status={r.status} /></td>
              <td className="p-3"><HealthBadge health={r.health ?? undefined} /></td>
              <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="p-3">{r.durationMs != null ? `${r.durationMs} ms` : '-'}</td>
              <td className="p-3">{r.p95Ms ?? '-'}</td>
              <td className="p-3">{r.failedRequests ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
