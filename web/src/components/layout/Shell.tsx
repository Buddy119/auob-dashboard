'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] grid-rows-[56px_1fr]">
      <header className="col-span-2 h-14 border-b border-border/40 flex items-center justify-between px-4">
        <Link href="/dashboard" className="font-semibold">AUOB</Link>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
        </div>
      </header>
      <aside className="border-r border-border/40 p-3">
        <nav className="space-y-1">
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/dashboard">Dashboard</Link>
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/collections">Collections</Link>
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/runs">Runs</Link>
        </nav>
      </aside>
      <main className="p-0">{children}</main>
    </div>
  );
}
