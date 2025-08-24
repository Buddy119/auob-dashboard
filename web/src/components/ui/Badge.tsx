'use client';
import { twMerge } from 'tailwind-merge';
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={twMerge('inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs', className)}>{children}</span>;
}
