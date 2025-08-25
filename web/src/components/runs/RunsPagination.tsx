'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function RunsPagination({ total, limit }: { total: number; limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const pages = Math.max(1, Math.ceil(total / limit));

  const go = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('page', String(p));
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div className="flex items-center justify-between text-sm py-2">
      <div>Page {page} / {pages} { (params.get('collectionId') || params.get('status') || params.get('from') || params.get('to')) ? '(filtered)' : ''}</div>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => go(page - 1)}>Prev</Button>
        <Button variant="ghost" disabled={page >= pages} onClick={() => go(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
