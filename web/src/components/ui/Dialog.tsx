'use client';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

export function Dialog({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={twMerge('w-full max-w-lg rounded-lg border border-border/50 bg-bg p-4 dark:bg-zinc-900')}>
          {title && <div className="mb-2 text-lg font-medium">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
