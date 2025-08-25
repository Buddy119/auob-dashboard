'use client';
import { useMemo, useState } from 'react';
import type { CollectionEnv } from '@/features/collections/types';
import { toAbsoluteUri, parsePostmanEnv, ParsedEnvVar } from '@/features/collections/envUtils';
import { Button } from '@/components/ui/Button';

export function EnvsTable({
  envs,
  preferredEnvId,
  onSetPreferred,
  onRunWith,
}: {
  envs: CollectionEnv[];
  preferredEnvId?: string;
  onSetPreferred?: (envId: string) => void;
  onRunWith?: (envId: string) => void;
}) {
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [vars, setVars] = useState<ParsedEnvVar[] | null>(null);
  const envMap = useMemo(() => new Map(envs.map(e => [e.id, e])), [envs]);

  async function openInspect(envId: string) {
    setInspectId(envId);
    setVars(null);
    const env = envMap.get(envId);
    if (!env) return;
    const abs = toAbsoluteUri(env.fileUri);
    if (!abs) return; // cannot preview
    try {
      const res = await fetch(abs, { cache: 'no-store' });
      const json = await res.json();
      setVars(parsePostmanEnv(json));
    } catch {
      setVars([]); // show "no vars"
    }
  }

  async function copyVars() {
    if (!vars || !vars.length) return;
    const text = vars.filter(v => v.enabled).map(v => `${v.key}=${v.value}`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  if (!envs?.length) {
    return <div className="rounded border border-border/40 p-3 text-sm opacity-75">No environments.</div>;
  }
  return (
    <>
      <div className="overflow-x-auto rounded border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Default</th>
              <th className="p-2 text-left">Preferred</th>
              <th className="p-2 text-left">File</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {envs.map(e => {
              const abs = toAbsoluteUri(e.fileUri);
              const isPreferred = e.id === preferredEnvId;
              return (
                <tr key={e.id} className="border-t border-border/40">
                  <td className="p-2">{e.name}</td>
                  <td className="p-2">{e.isDefault ? 'Yes' : 'No'}</td>
                  <td className="p-2">{isPreferred ? '★' : ''}</td>
                  <td className="p-2 truncate max-w-[280px]"><code className="opacity-80">{e.fileUri}</code></td>
                  <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {onRunWith && <Button variant="ghost" onClick={() => onRunWith(e.id)}>Run</Button>}
                      {onSetPreferred && <Button variant="ghost" onClick={() => onSetPreferred(e.id)}>{isPreferred ? 'Preferred' : 'Set preferred'}</Button>}
                      <Button variant="ghost" onClick={() => openInspect(e.id)}>Inspect</Button>
                      {abs
                        ? <a className="px-3 py-1.5 text-sm rounded-md hover:bg-muted" target="_blank" rel="noopener noreferrer" href={abs}>Download</a>
                        : <span className="px-3 py-1.5 text-sm rounded-md opacity-50">Download</span>
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inspect Drawer/Modal (very light) */}
      {inspectId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInspectId(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg border border-border/50 bg-bg p-4 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Environment variables</div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => copyVars()} disabled={!vars || vars.length === 0}>Copy</Button>
                  <Button variant="ghost" onClick={() => setInspectId(null)}>Close</Button>
                </div>
              </div>
              {!vars
                ? <div className="text-sm opacity-70">Loading…</div>
                : vars.length === 0
                  ? <div className="text-sm opacity-70">No variables (or preview unavailable).</div>
                  : (
                    <div className="overflow-x-auto rounded border border-border/40">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50"><tr><th className="p-2 text-left">Key</th><th className="p-2 text-left">Value</th><th className="p-2">Enabled</th></tr></thead>
                        <tbody>
                          {vars.map(v => (
                            <tr key={v.key} className="border-t border-border/40">
                              <td className="p-2 font-mono">{v.key}</td>
                              <td className="p-2 font-mono truncate max-w-[420px]">{v.value}</td>
                              <td className="p-2 text-center">{v.enabled ? 'Yes' : 'No'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}

