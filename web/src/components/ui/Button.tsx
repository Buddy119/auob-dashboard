'use client';
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', ...props }, ref) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm h-9 px-3 transition';
  const styles = {
    primary: 'bg-primary text-white hover:opacity-90 disabled:opacity-60',
    ghost: 'bg-transparent hover:bg-muted',
  }[variant];
  return <button ref={ref} className={twMerge(clsx(base, styles, className))} {...props} />;
});
