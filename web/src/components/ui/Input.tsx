'use client';
import { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props }, ref,
) {
  return (
    <input
      ref={ref}
      className={twMerge('h-9 w-full rounded-md border border-border/50 bg-bg px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-900', className)}
      {...props}
    />
  );
});
