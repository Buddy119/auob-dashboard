export type RunStatus = 'queued'|'running'|'success'|'partial'|'fail'|'timeout'|'error'|'cancelled';
export type HealthStatus = 'HEALTHY'|'DEGRADED'|'UNHEALTHY'|'UNKNOWN';

export type Run = {
  id: string;
  collectionId: string;
  environmentId?: string | null;
  status: RunStatus;
  health?: HealthStatus | null;
  createdAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  durationMs?: number | null;
  totalRequests?: number | null;
  successRequests?: number | null;
  failedRequests?: number | null;
  p50Ms?: number | null;
  p95Ms?: number | null;
  p99Ms?: number | null;
  errorMsg?: string | null;
};

export type CreateRunBody = Partial<{
  environmentId: string;
  timeoutRequestMs: number;
  delayRequestMs: number;
  bail: boolean;
  insecure: boolean;
  maxDurationMs: number;
}>;

export type CreateRunResponse = { runId: string };
