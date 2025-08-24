'use client';

import { useMemo, useState } from 'react';
import { buildRequestsTree, TreeNode } from '@/features/collections/tree';
import type { RequestItem } from '@/features/collections/types';
import { MethodBadge } from './MethodBadge';
import { Button } from '@/components/ui/Button';
import { useToggleCritical } from '@/features/collections/queries';

export function RequestsTree({
  collectionId,
  requests,
  filter,
}: {
  collectionId: string;
  requests: RequestItem[];
  filter: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggleCritical = useToggleCritical(collectionId);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(r => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  }, [requests, filter]);

  const tree = useMemo<TreeNode[]>(() => buildRequestsTree(filtered), [filtered]);

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: TreeNode[]) => nodes.forEach(n => {
      if (n.type === 'folder') { next[n.key] = true; walk(n.children); }
    });
    walk(tree);
    setOpen(next);
  };
  const collapseAll = () => setOpen({});

  const Folder = ({ node }: { node: Extract<TreeNode, { type: 'folder' }> }) => {
    const isOpen = !!open[node.key];
    return (
      <div className="ml-2">
        <div className="flex items-center gap-2 py-1 cursor-pointer select-none" onClick={() => setOpen({ ...open, [node.key]: !isOpen })}>
          <span className="text-xs">{isOpen ? '▾' : '▸'}</span>
          <span className="font-medium">{node.name}</span>
        </div>
        {isOpen && (
          <div className="ml-4 border-l border-border/30">
            {node.children.map(c => c.type === 'folder'
              ? <Folder key={c.key} node={c} />
              : <RequestRow key={c.key} node={c} />
            )}
          </div>
        )}
      </div>
    );
  };

  const RequestRow = ({ node }: { node: Extract<TreeNode, { type: 'request' }> }) => {
    const isCritical = node.isCritical;
    const busy = toggleCritical.isPending;

    return (
      <div className="flex items-center justify-between gap-3 py-1 pl-3 pr-2 hover:bg-muted/40 rounded">
        <div className="flex items-center gap-2">
          <MethodBadge m={node.method} />
          <div className="text-sm">{node.name}</div>
          {isCritical && <span className="text-[10px] rounded bg-red-600 text-white px-1.5 py-0.5">CRITICAL</span>}
          <div className="text-xs opacity-60 font-mono">/{node.path}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => toggleCritical.mutate({ requestId: node.id, isCritical: !isCritical })}
            aria-label={isCritical ? 'Unmark critical' : 'Mark critical'}
            title={isCritical ? 'Unmark critical' : 'Mark critical'}
          >
            {isCritical ? 'Unmark critical' : 'Mark critical'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm opacity-70">{filtered.length} request(s)</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={expandAll}>Expand all</Button>
          <Button variant="ghost" onClick={collapseAll}>Collapse all</Button>
        </div>
      </div>
      <div className="rounded border border-border/40 p-2">
        {tree.length === 0 ? (
          <div className="p-4 text-sm opacity-70">No requests match your filter.</div>
        ) : (
          tree.map(n => n.type === 'folder'
            ? <Folder key={n.key} node={n} />
            : <RequestRow key={n.key} node={n} />
          )
        )}
      </div>
    </div>
  );
}
