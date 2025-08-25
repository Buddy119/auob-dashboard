'use client';
import { twMerge } from 'tailwind-merge';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        'animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-700/60',
        className,
      )}
      aria-hidden="true"
    />
  );
}
