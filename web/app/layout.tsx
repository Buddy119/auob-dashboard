import './globals.css';
import '../tailwind.css';
import type { ReactNode } from 'react';
import { Providers } from '@/app/providers';
import { Shell } from '@/components/layout/Shell';

export const metadata = { title: 'AUOB Dashboard', description: 'API Health Dashboard' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-black dark:bg-bg-dark dark:text-white antialiased">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
