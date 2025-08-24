'use client';
import { create } from 'zustand';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

type Toast = { id: string; title: string; description?: string };
type Store = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<Store>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36),
          ...t,
        },
      ],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return { toast: push };
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  useEffect(() => {
    const timer = setInterval(() => {
      // auto-dismiss after ~4s
      const first = toasts[0];
      if (first) dismiss(first.id);
    }, 4000);
    return () => clearInterval(timer);
  }, [toasts, dismiss]);

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((t) => (
        <div key={t.id} className={twMerge('rounded-md border border-border/50 bg-bg dark:bg-zinc-900 p-3 shadow')}>
          <div className="font-medium">{t.title}</div>
          {t.description && <div className="text-sm opacity-80">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}
