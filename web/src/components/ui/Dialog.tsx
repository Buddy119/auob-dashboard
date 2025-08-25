'use client';
import { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

export function Dialog({
  open, onClose, children, title,
}: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  const titleId = 'dlg-title-' + (title?.toLowerCase().replace(/\s+/g, '-') || 'dialog');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) {
      document.addEventListener('keydown', onKey);
      prevFocus.current = document.activeElement as HTMLElement;
      // focus first focusable
      setTimeout(() => {
        const el = ref.current?.querySelector<HTMLElement>('[autofocus],select,input,button,textarea,[tabindex]:not([tabindex="-1"])');
        el?.focus();
      }, 0);
    } else {
      document.removeEventListener('keydown', onKey);
      prevFocus.current?.focus();
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" aria-labelledby={titleId} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div ref={ref} className={twMerge('w-full max-w-lg rounded-lg border border-border/50 bg-bg p-4 dark:bg-zinc-900')}>
          {title && <div id={titleId} className="mb-2 text-lg font-medium">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
