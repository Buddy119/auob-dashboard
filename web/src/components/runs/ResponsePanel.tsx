'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRunStep, useRunStepResponse } from '@/features/runs/queries';
import type { RunStepResponse } from '@/features/runs/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { useCopy } from '@/hooks/useCopy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

function formatBytes(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '-';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function prettyJSON(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function isJSON(contentType: string | null | undefined) {
  return typeof contentType === 'string' && contentType.toLowerCase().includes('json');
}

function isXML(contentType: string | null | undefined) {
  if (!contentType) return false;
  const lowered = contentType.toLowerCase();
  return lowered.includes('xml') || lowered.includes('html');
}

function statusBadgeClass(status: number | null | undefined) {
  if (status == null) return 'bg-zinc-600 text-white';
  if (status >= 200 && status < 300) return 'bg-emerald-600 text-white';
  if (status >= 300 && status < 400) return 'bg-blue-600 text-white';
  if (status >= 400 && status < 500) return 'bg-amber-600 text-white';
  return 'bg-red-600 text-white';
}

function isBinaryResponse(resp: RunStepResponse | null | undefined) {
  if (!resp) return false;
  if (resp.bodyEncoding === 'base64') return true;
  const ct = resp.contentType?.toLowerCase() ?? '';
  if (!ct) return false;
  return (
    ct.startsWith('image/') && !ct.includes('svg') ||
    ct.startsWith('audio/') ||
    ct.startsWith('video/') ||
    ct.includes('octet-stream') ||
    ct.includes('pdf') ||
    ct.includes('zip')
  );
}

export function ResponsePanel({
  runId,
  stepId,
  visible,
  panelId,
}: {
  runId: string;
  stepId: string | null;
  visible: boolean;
  panelId?: string;
}) {
  const copy = useCopy();
  const [showFull, setShowFull] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setShowFull(false);
    }
  }, [visible]);

  useEffect(() => {
    setShowFull(false);
  }, [stepId]);

  const { data: stepData, isLoading, isError, error, isFetching } = useRunStep(runId, stepId, visible);
  const { data: fullResponse, isFetching: loadingFull } = useRunStepResponse(runId, stepId, visible && showFull);

  useEffect(() => {
    if (isLoading || isFetching) {
      setLiveMessage('Loading response details');
    } else if (showFull && loadingFull) {
      setLiveMessage('Loading full response body');
    } else if (!isLoading && !isFetching) {
      setLiveMessage('Response details ready');
    }
  }, [isLoading, isFetching, showFull, loadingFull]);

  const response = useMemo<RunStepResponse | null | undefined>(() => {
    if (showFull) {
      return fullResponse ?? stepData?.response;
    }
    return stepData?.response;
  }, [showFull, fullResponse, stepData]);

  const isBinary = isBinaryResponse(response);
  const bodyText = useMemo(() => {
    if (!response || isBinary) return null;
    const raw = showFull
      ? response.body ?? response.bodyPreview ?? null
      : response.bodyPreview ?? response.body ?? null;
    if (raw == null) return null;
    if (isJSON(response.contentType)) return prettyJSON(raw);
    if (isXML(response.contentType)) {
      return raw;
    }
    return raw;
  }, [response, isBinary, showFull]);

  const bodyForCopy = !isBinary
    ? showFull
      ? response?.body ?? response?.bodyPreview ?? ''
      : response?.bodyPreview ?? ''
    : '';
  const hasBodyForCopy = Boolean(bodyForCopy && bodyForCopy.length);

  const headersEntries = useMemo(() => Object.entries(response?.headers ?? {}), [response?.headers]);

  const canDownload = Boolean(stepId && (response?.body || response?.bodyPreview || response?.bodyEncoding === 'base64'));
  const downloadUrl = canDownload && stepId ? `${API_BASE}/api/runs/${runId}/steps/${stepId}/response/body` : null;

  if (!visible) {
    return null;
  }

  return (
    <section aria-label="Response" role="region" className="space-y-4" id={panelId}>
      <div className="sr-only" aria-live="polite">{liveMessage}</div>
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-28" />
          <Skeleton className="h-48" />
        </div>
      )}
      {isError && (
        <div className="rounded border border-red-500/40 p-4 text-sm text-red-600">
          Failed to load response: {(error as Error)?.message ?? 'Unknown error'}
        </div>
      )}
      {!isLoading && !isError && !response && (
        <div className="rounded border border-border/40 p-4 text-sm opacity-70">
          No response captured for this step.
        </div>
      )}
      {!isLoading && !isError && response && (
        <div className="space-y-4">
          <header className="flex flex-wrap items-center gap-3">
            <Badge className={statusBadgeClass(response.status)}>
              {response.status != null ? `${response.status}${response.statusText ? ` ${response.statusText}` : ''}` : 'No status'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Duration: <span className="font-mono">{response.durationMs != null ? `${response.durationMs} ms` : '-'}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Content-Type: <span className="font-mono">{response.contentType ?? '-'}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Size: <span className="font-mono">{formatBytes(response.size)}</span>
            </span>
            {response.truncated && (
              <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/40">Preview truncated</Badge>
            )}
            {loadingFull && <Spinner />}
          </header>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Headers</h3>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (!headersEntries.length) return;
                  const serialized = headersEntries.map(([k, v]) => `${k}: ${v}`).join('\n');
                  await copy(serialized, 'Headers copied');
                }}
                disabled={!headersEntries.length}
              >
                Copy all headers
              </Button>
            </div>
            <div className="rounded border border-border/40 max-h-64 overflow-auto text-xs">
              {headersEntries.length ? (
                <dl className="divide-y divide-border/40">
                  {headersEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 px-3 py-2">
                      <dt className="col-span-1 font-medium break-words">{key}</dt>
                      <dd className="col-span-2 break-words font-mono text-[11px]">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="p-3 text-muted-foreground">No headers available.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <h3 className="text-sm font-medium">Body</h3>
              <div className="flex items-center gap-2">
                {!isBinary && (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (!hasBodyForCopy) return;
                      await copy(bodyForCopy, 'Body copied');
                    }}
                    disabled={!hasBodyForCopy}
                  >
                    Copy body
                  </Button>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-transparent px-3 text-sm hover:bg-muted"
                    download
                    aria-label="Download response body"
                  >
                    Download body
                  </a>
                )}
                {response.truncated && !showFull && (
                  <Button onClick={() => setShowFull(true)} disabled={loadingFull}>
                    {loadingFull ? 'Loading…' : 'Load full body'}
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded border border-border/40 bg-zinc-950/90 text-green-100">
              {isBinary ? (
                <div className="p-4 text-sm">
                  Binary content not displayed.
                </div>
              ) : bodyText !== null ? (
                <pre className="max-h-[45vh] overflow-auto p-4 text-xs leading-relaxed" tabIndex={0}>
                  {bodyText}
                </pre>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No body captured.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
