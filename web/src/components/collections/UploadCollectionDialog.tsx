'use client';

import { useState, useRef } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useUploadCollection } from '@/features/collections/queries';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

export function UploadCollectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [colFile, setColFile] = useState<File | null>(null);
  const [envFile, setEnvFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { mutateAsync, isPending } = useUploadCollection();
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colFile) return;
    try {
      await mutateAsync({ collection: colFile, env: envFile || undefined });
      toast({ title: 'Uploaded', description: 'Collection uploaded successfully.' });
      formRef.current?.reset();
      setColFile(null);
      setEnvFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Unknown error' });
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} title="Upload Postman Collection">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="collection">Collection JSON *</label>
          <input
            id="collection"
            name="collection"
            type="file"
            accept="application/json,.json"
            required
            onChange={(e) => setColFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded file:border file:border-border/50 file:px-3 file:py-1.5 file:bg-muted"
          />
          <p className="mt-1 text-xs opacity-70">Upload a Postman v2.x collection JSON.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="env">Environment JSON (optional)</label>
          <input
            id="env"
            name="env"
            type="file"
            accept="application/json,.json"
            onChange={(e) => setEnvFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded file:border file:border-border/50 file:px-3 file:py-1.5 file:bg-muted"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={!colFile || isPending}>
            {isPending ? <span className="flex items-center gap-2"><Spinner/> Uploading…</span> : 'Upload'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
