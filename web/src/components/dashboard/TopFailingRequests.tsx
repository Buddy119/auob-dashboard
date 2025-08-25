'use client';

import Link from 'next/link';
import type { FailingItem } from '@/features/dashboard/queries';

export function TopFailingRequests({
  items,
  emptyReason,
}: {
  items: FailingItem[];
  emptyReason?: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-border/40 p-4 text-sm opacity-75">
        {emptyReason || 'No failing requests in the selected window.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Request Path</th>
            <th className="p-3">Fail Count</th>
            <th className="p-3">Last Seen</th>
            <th className="p-3">Sample Run</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.key} className="border-t border-border/40">
              <td className="p-3 font-mono">{it.path}</td>
              <td className="p-3">{it.count}</td>
              <td className="p-3">{new Date(it.lastSeen).toLocaleString()}</td>
              <td className="p-3">
                <Link href={`/runs/${it.sampleRunId}`} className="text-primary hover:underline font-mono">
                  {it.sampleRunId.slice(0, 8)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

