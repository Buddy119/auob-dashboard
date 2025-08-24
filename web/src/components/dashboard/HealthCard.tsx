'use client';
import { Badge } from '@/components/ui/Badge';

export function HealthCard({ loading, error, data }: { loading: boolean; error: boolean; data?: { status: string; time: string; env: string; uptimeMs: number } }) {
  return (
    <div className="rounded-lg border p-4 border-border/40">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-medium">Backend Health</h2>
        <Badge>{loading ? 'Loading…' : error ? 'Error' : 'OK'}</Badge>
      </div>
      {data && !loading && !error && (
        <div className="text-sm opacity-80">
          <div>Status: <span className="font-mono">{data.status}</span></div>
          <div>Env: <span className="font-mono">{data.env}</span></div>
          <div>Time: <span className="font-mono">{new Date(data.time).toLocaleString()}</span></div>
          <div>Uptime: <span className="font-mono">{Math.round(data.uptimeMs / 1000)}s</span></div>
        </div>
      )}
      {error && <div className="text-sm text-red-500">Failed to reach backend. Check NEXT_PUBLIC_API_BASE_URL.</div>}
    </div>
  );
}
