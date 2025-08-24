'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateRun } from '@/features/runs/queries';
import type { CollectionEnv } from '@/features/collections/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collectionId: string;
  envs: CollectionEnv[];
};

function parseIntOrUndefined(v: string, min = 0) {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) return undefined;
  return Math.floor(n);
}

export function RunDialog({ open, onOpenChange, collectionId, envs }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const createRun = useCreateRun(collectionId);

  const [environmentId, setEnvironmentId] = useState<string>('');
  const [timeoutRequestMs, setTimeoutRequestMs] = useState<string>('0');
  const [delayRequestMs, setDelayRequestMs] = useState<string>('0');
  const [maxDurationMs, setMaxDurationMs] = useState<string>(''); // optional
  const [bail, setBail] = useState<boolean>(false);
  const [insecure, setInsecure] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {};
    const t = parseIntOrUndefined(timeoutRequestMs, 0);
    const d = parseIntOrUndefined(delayRequestMs, 0);
    const m = parseIntOrUndefined(maxDurationMs, 1);
    if (environmentId) body.environmentId = environmentId;
    if (typeof t === 'number') body.timeoutRequestMs = t;
    if (typeof d === 'number') body.delayRequestMs = d;
    if (typeof m === 'number') body.maxDurationMs = m;
    if (bail) body.bail = true;
    if (insecure) body.insecure = true;

    try {
      const res = await createRun.mutateAsync(body);
      onOpenChange(false);
      router.push(`/runs/${res.runId}`);
    } catch (err: any) {
      toast({ title: 'Failed to start run', description: err?.message || 'Unknown error' });
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} title="Run collection">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Environment</label>
          <select
            className="h-9 w-full rounded-md border border-border/50 bg-bg px-3 text-sm dark:bg-zinc-900"
            value={environmentId}
            onChange={(e) => setEnvironmentId(e.target.value)}
          >
            <option value="">(None)</option>
            {envs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}{e.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs opacity-70">Optional. Use the default environment if applicable.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Per-request timeout (ms)</label>
            <Input type="number" min={0} step={1} value={timeoutRequestMs} onChange={(e) => setTimeoutRequestMs(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Delay between requests (ms)</label>
            <Input type="number" min={0} step={1} value={delayRequestMs} onChange={(e) => setDelayRequestMs(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max run duration (ms)</label>
            <Input type="number" min={1} step={1} placeholder="(optional)" value={maxDurationMs} onChange={(e) => setMaxDurationMs(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bail} onChange={(e) => setBail(e.target.checked)} />
            Bail on folder fail
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={insecure} onChange={(e) => setInsecure(e.target.checked)} />
            Insecure (ignore TLS)
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={createRun.isPending}>
            {createRun.isPending ? 'Starting…' : 'Start Run'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
