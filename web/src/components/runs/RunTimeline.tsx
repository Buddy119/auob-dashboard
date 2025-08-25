'use client';

import type { RunStepView } from '@/features/runs/types';

export function RunTimeline({
  steps,
  selectedStepId,
  onSelect,
}: {
  steps: RunStepView[];
  selectedStepId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!steps.length) {
    return <div className="rounded border border-border/40 p-4 text-sm opacity-70">No steps yet…</div>;
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (!selectedStepId) return;
    const idx = steps.findIndex(s => s.id === selectedStepId);
    if (e.key === 'ArrowDown') {
      const next = steps[Math.min(idx + 1, steps.length - 1)];
      if (next) onSelect(next.id);
    } else if (e.key === 'ArrowUp') {
      const prev = steps[Math.max(idx - 1, 0)];
      if (prev) onSelect(prev.id);
    }
  };
  return (
    <div className="rounded border border-border/40">
      <ul
        id="timeline-list"
        role="listbox"
        aria-label="Run steps"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="max-h-[60vh] overflow-auto divide-y divide-border/40 outline-none"
      >
        {steps.map((s) => {
          const isSel = s.id === selectedStepId;
          const statusColor = s.status === 'success' ? 'text-emerald-600' : 'text-red-600';
          return (
            <li
              key={s.id}
              role="option"
              aria-selected={isSel}
              className={`p-3 cursor-pointer hover:bg-muted/40 ${isSel ? 'bg-muted/60' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusColor}`}>{s.status.toUpperCase()}</span>
                  <span className="text-sm">{s.name}</span>
                </div>
                <div className="text-xs opacity-70">
                  <span className="mr-2">{s.httpStatus ?? '-'}</span>
                  <span className="mr-2">{s.latencyMs != null ? `${s.latencyMs}ms` : '-'}</span>
                </div>
              </div>
              {s.requestPath && <div className="text-xs opacity-60 font-mono mt-1">/{s.requestPath}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
