'use client';
import { Skeleton } from '@/components/ui/Skeleton';

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border/40 p-2">
      <div className="grid grid-cols-6 gap-2 p-2">
        <Skeleton className="h-4 w-24 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-1" />
        <Skeleton className="h-4 w-24 col-span-1" />
      </div>
      <div className="space-y-2 p-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
