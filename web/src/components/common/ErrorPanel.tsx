'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function ErrorPanel({ message = 'Failed to load data.' }: { message?: string }) {
  const router = useRouter();
  return (
    <div className="rounded border border-red-500/40 p-3 text-sm text-red-600 flex items-center justify-between">
      <div>{message}</div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => router.refresh()}>Retry</Button>
      </div>
    </div>
  );
}
