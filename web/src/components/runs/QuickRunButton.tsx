'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { RunDialog } from '@/components/runs/RunDialog';
import { useCollectionDetail } from '@/features/collections/queries';

export function QuickRunButton({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCollectionDetail(collectionId, false);

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">Run now</Button>
      {open && (
        <RunDialog
          open={open}
          onOpenChange={setOpen}
          collectionId={collectionId}
          envs={data?.envs ?? []}
        />
      )}
    </>
  );
}

