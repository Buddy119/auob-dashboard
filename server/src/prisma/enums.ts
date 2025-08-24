export enum RunStatus {
  queued = 'queued',
  running = 'running',
  success = 'success',
  fail = 'fail',
  partial = 'partial',
  timeout = 'timeout',
  error = 'error',
  cancelled = 'cancelled',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export enum StepStatus {
  success = 'success',
  fail = 'fail',
}

