'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr] grid-rows-[56px_1fr]">
      {/* Skip link */}
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-primary text-white rounded px-3 py-1">
        Skip to content
      </a>

      <header className="col-span-2 h-14 border-b border-border/40 flex items-center justify-between px-4" role="banner">
        <Link href="/dashboard" className="font-semibold" aria-label="AUOB home">AUOB</Link>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
        </div>
      </header>

      <aside className="border-r border-border/40 p-3">
        <nav className="space-y-1" role="navigation" aria-label="Primary">
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/dashboard">Dashboard</Link>
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/collections">Collections</Link>
          <Link className="block rounded px-2 py-1 hover:bg-muted" href="/runs">Runs</Link>
        </nav>
      </aside>

      <main id="content" role="main" className="p-0" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
