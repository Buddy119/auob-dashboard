'use client';
import type { HealthStatus } from '@/features/runs/types';

export function HealthBadge({ health }: { health: HealthStatus | null | undefined }) {
  const label = health ?? 'UNKNOWN';
  const cls =
    label === 'HEALTHY' ? 'bg-emerald-600' :
    label === 'DEGRADED' ? 'bg-amber-500' :
    label === 'UNHEALTHY' ? 'bg-red-600' :
    'bg-zinc-600';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs text-white ${cls}`}>{label}</span>;
}
