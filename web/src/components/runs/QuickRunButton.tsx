'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { RunDialog } from '@/components/runs/RunDialog';
import { useCollectionDetail } from '@/features/collections/queries';
import { getPreferredEnvId } from '@/features/collections/envPref';

export function QuickRunButton({ collectionId }: { collectionId: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useCollectionDetail(collectionId, false);

  const initialEnvId = useMemo(() => {
    const pref = getPreferredEnvId(collectionId);
    if (pref) return pref;
    const def = data?.envs?.find(e => e.isDefault)?.id;
    return def;
  }, [collectionId, data?.envs]);

  return (
    <>
      <Button onClick={() => setOpen(true)} aria-haspopup="dialog">Run now</Button>
      {open && (
        <RunDialog
          open={open}
          onOpenChange={setOpen}
          collectionId={collectionId}
          envs={data?.envs ?? []}
          initialEnvId={initialEnvId}
        />
      )}
    </>
  );
}

