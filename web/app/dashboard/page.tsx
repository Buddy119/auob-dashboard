'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HealthCard } from '@/components/dashboard/HealthCard';
import { useCollectionsOverview, useTopFailingRequests } from '@/features/dashboard/queries';
import { CollectionHealthCard } from '@/components/dashboard/CollectionHealthCard';
import { TopFailingRequests } from '@/components/dashboard/TopFailingRequests';
import Link from 'next/link';
import { CardsSkeleton } from '@/components/skeletons/CardsSkeleton';
import { ErrorPanel } from '@/components/common/ErrorPanel';

export default function DashboardPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string; time: string; env: string; uptimeMs: number }>('/health'),
    staleTime: 5_000,
  });

  const { data: cols, isLoading, isError } = useCollectionsOverview(24);
  const { data: failing } = useTopFailingRequests(7, 30);

  const items = cols?.items ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Row 1: Backend health + quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthCard loading={health.isLoading} error={!!health.isError} data={health.data} />
        <div className="rounded-lg border p-4 border-border/40">
          <div className="font-medium mb-2">Get started</div>
          <ul className="list-disc list-inside text-sm opacity-80 space-y-1">
            <li><Link href="/collections" className="text-primary hover:underline">Upload a Postman collection</Link></li>
            <li>Open a collection and click <em>Run collection</em> to start a run.</li>
            <li>Watch live progress in the <Link href="/runs" className="text-primary hover:underline">Run Console</Link>.</li>
          </ul>
        </div>
      </div>

      {/* Row 2: Collections grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Collections</div>
          <Link href="/collections" className="text-sm text-primary hover:underline">View all →</Link>
        </div>

        {isError && <ErrorPanel message="Failed to load collections." />}
        {isLoading ? (
          <CardsSkeleton count={6} />
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">
            No collections yet. Go to <Link className="text-primary hover:underline" href="/collections">Collections</Link> to upload your first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((c) => <CollectionHealthCard key={c.id} c={c} />)}
          </div>
        )}
      </div>

      {/* Row 3: Top failing requests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Top failing requests (7d)</div>
          <Link href="/runs" className="text-sm text-primary hover:underline">Browse runs →</Link>
        </div>
        <TopFailingRequests items={failing ?? []} emptyReason="No recent runs or failures found." />
      </div>
    </div>
  );
}

