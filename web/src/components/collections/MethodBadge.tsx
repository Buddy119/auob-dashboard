'use client';
export function MethodBadge({ m }: { m: string }) {
  const color =
    m === 'GET' ? 'bg-emerald-500' :
    m === 'POST' ? 'bg-blue-500' :
    m === 'PUT' ? 'bg-yellow-500' :
    m === 'PATCH' ? 'bg-amber-500' :
    m === 'DELETE' ? 'bg-red-500' :
    'bg-zinc-500';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs text-white ${color}`}>{m}</span>;
}
