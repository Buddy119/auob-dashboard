'use client';

import Link from 'next/link';
import type { CollectionListItem } from '@/features/collections/types';

export function CollectionsTable({ items }: { items: CollectionListItem[] }) {
  if (!items?.length) {
    return <div className="rounded-lg border border-border/40 p-6 text-sm opacity-75">No collections yet. Use “Upload Collection”.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="p-3">Name</th>
            <th className="p-3">Version</th>
            <th className="p-3">Created</th>
            <th className="p-3">Envs</th>
            <th className="p-3">Requests</th>
            <th className="p-3">Runs</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t border-border/40 hover:bg-muted/40">
              <td className="p-3">
                <Link href={`/collections/${c.id}`} className="text-primary hover:underline">{c.name}</Link>
              </td>
              <td className="p-3">{c.version ?? '-'}</td>
              <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
              <td className="p-3">{c._count.envs}</td>
              <td className="p-3">{c._count.requests}</td>
              <td className="p-3">{c._count.runs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
