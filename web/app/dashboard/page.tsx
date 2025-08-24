'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HealthCard } from '@/components/dashboard/HealthCard';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string; time: string; env: string; uptimeMs: number }>('/health'),
    staleTime: 5_000,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthCard loading={isLoading} error={isError} data={data} />
        {/* Placeholder cards for collections, runs, etc. (FE-1..6) */}
        <div className="rounded-lg border p-4 border-border/40">Coming soon…</div>
      </div>
    </div>
  );
}
