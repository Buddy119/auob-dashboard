'use client';

import type { RunAssertionView } from '@/features/runs/types';

export function AssertionsPanel({ assertions }: { assertions: RunAssertionView[] }) {
  if (!assertions.length) {
    return <div className="rounded border border-border/40 p-4 text-sm opacity-70">No assertions for this step.</div>;
  }
  return (
    <div className="rounded border border-border/40">
      <ul className="divide-y divide-border/40">
        {assertions.map((a, i) => (
          <li key={`${a.name}-${i}`} className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">{a.name}</div>
              <span className={`text-xs rounded px-1.5 py-0.5 ${a.status === 'pass' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {a.status.toUpperCase()}
              </span>
            </div>
            {a.errorMsg && <div className="text-xs text-red-600 mt-1">{a.errorMsg}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
