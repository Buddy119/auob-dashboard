'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Route error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen p-6 bg-bg dark:bg-bg-dark text-black dark:text-white">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <div className="rounded border border-red-500/40 p-4">
            <div className="text-sm text-red-600">{error.message || 'Unexpected error'}</div>
            {error.digest && <div className="text-xs opacity-70 mt-1">Digest: <code>{error.digest}</code></div>}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 text-sm rounded-md bg-primary text-white" onClick={() => reset()}>Try again</button>
            <Link href="/dashboard" className="px-3 py-2 text-sm rounded-md border border-border/50 hover:bg-muted">Go to Dashboard</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
