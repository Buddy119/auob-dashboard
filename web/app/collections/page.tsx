'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCollectionsList } from '@/features/collections/queries';
import { CollectionsTable } from '@/components/collections/CollectionsTable';
import { Pagination } from '@/components/collections/Pagination';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UploadCollectionDialog } from '@/components/collections/UploadCollectionDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function CollectionsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get('q') || '';
  const initialPage = parseInt(params.get('page') || '1', 10);
  const [q, setQ] = useState(initialQ);
  const debouncedQ = useDebouncedValue(q, 400);
  const page = isNaN(initialPage) ? 1 : initialPage;

  const { data, isLoading, isError } = useCollectionsList(debouncedQ, page, 10);
  const [open, setOpen] = useState(false);

  const onSearchChange = (v: string) => {
    setQ(v);
    const sp = new URLSearchParams(params.toString());
    sp.set('q', v);
    sp.set('page', '1');
    router.push(`/collections?${sp.toString()}`);
  };

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 10;
  const items = data?.items ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections</h1>
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">Upload Collection</Button>
      </div>
      <div className="flex items-center gap-3">
        <Input placeholder="Search collections…" value={q} onChange={(e) => onSearchChange(e.target.value)} />
      </div>
      {isError && <div className="rounded border border-red-500/40 p-3 text-sm text-red-600">Failed to load collections.</div>}
      {isLoading ? (
        <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">Loading…</div>
      ) : (
        <>
          <CollectionsTable items={items} />
          <Pagination total={total} limit={limit} />
        </>
      )}
      <UploadCollectionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
