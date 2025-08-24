'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function Pagination({ total, limit }: { total: number; limit: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const pages = Math.max(1, Math.ceil(total / limit));
  const q = params.get('q') || '';

  const go = (p: number) => {
    const search = new URLSearchParams(params.toString());
    search.set('page', String(p));
    router.push(`/collections?${search.toString()}`);
  };

  return (
    <div className="flex items-center justify-between text-sm py-2">
      <div>Page {page} / {pages} {q ? `(filtered)` : ''}</div>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => go(page - 1)}>Prev</Button>
        <Button variant="ghost" disabled={page >= pages} onClick={() => go(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
