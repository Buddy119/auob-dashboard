'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCollectionsLookup } from '@/features/runs/queries';
import { Input } from '@/components/ui/Input';

export function CollectionSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const [q, setQ] = useState('');
  const { data } = useCollectionsLookup(q, 10);

  // When a collection id is currently selected, show its name as read-only value at top of list
  const selected = useMemo(() => data?.items.find(i => i.id === value), [data, value]);

  // Debounce-like UX via built-in state; we already query on change above
  useEffect(() => { /* no-op, just to hint controlled input */ }, [q]);

  return (
    <div className="relative">
      <Input
        placeholder={selected ? `Selected: ${selected.name} (type to change)` : 'Filter by collection…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      { (q || data) && (
        <div className="absolute z-10 mt-1 w-full rounded border border-border/40 bg-bg dark:bg-zinc-900 text-sm max-h-64 overflow-auto">
          <button
            className={`w-full text-left px-3 py-2 hover:bg-muted ${!value ? 'font-medium' : ''}`}
            onClick={() => { onChange(undefined); setQ(''); }}
          >
            (All collections)
          </button>
          {data?.items.map((c) => (
            <button
              key={c.id}
              className={`w-full text-left px-3 py-2 hover:bg-muted ${c.id === value ? 'font-medium' : ''}`}
              onClick={() => { onChange(c.id); setQ(''); }}
            >
              {c.name}
            </button>
          ))}
          {!data?.items.length && q && <div className="px-3 py-2 opacity-70">No matches</div>}
        </div>
      )}
    </div>
  );
}
