'use client';
import type { CollectionEnv } from '@/features/collections/types';

export function EnvsTable({ envs }: { envs: CollectionEnv[] }) {
  if (!envs?.length) return <div className="rounded border border-border/40 p-3 text-sm opacity-75">No environments.</div>;
  return (
    <div className="overflow-x-auto rounded border border-border/40">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Default</th><th className="p-2 text-left">File</th><th className="p-2 text-left">Created</th></tr>
        </thead>
        <tbody>
          {envs.map(e => (
            <tr key={e.id} className="border-t border-border/40">
              <td className="p-2">{e.name}</td>
              <td className="p-2">{e.isDefault ? 'Yes' : 'No'}</td>
              <td className="p-2 truncate max-w-[320px]"><code className="opacity-80">{e.fileUri}</code></td>
              <td className="p-2">{new Date(e.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
