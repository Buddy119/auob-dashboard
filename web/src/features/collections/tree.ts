import type { RequestItem } from './types';

export type TreeNode =
  | { type: 'folder'; name: string; key: string; children: TreeNode[] }
  | { type: 'request'; key: string; name: string; path: string; method: RequestItem['method']; isCritical: boolean; id: string };

export function buildRequestsTree(requests: RequestItem[]): TreeNode[] {
  const root: Record<string, any> = {};
  for (const r of requests) {
    const parts = r.path.split('/').filter(Boolean);
    const keyParts: string[] = [];
    let cursor = root;
    for (let i = 0; i < parts.length; i++) {
      keyParts.push(parts[i]);
      const k = keyParts.join('/');
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        (cursor.__items ||= []).push({
          type: 'request',
          key: k,
          name: parts[i],
          path: r.path,
          method: r.method,
          isCritical: r.isCritical,
          id: r.id,
        });
      } else {
        cursor[parts[i]] ||= { __children: {}, __key: k, __name: parts[i] };
        cursor = cursor[parts[i]].__children;
      }
    }
  }
  function toNodes(node: any): TreeNode[] {
    const folders: TreeNode[] = Object.keys(node)
      .filter(k => !k.startsWith('__'))
      .sort((a, b) => a.localeCompare(b))
      .map(k => ({
        type: 'folder' as const,
        name: node[k].__name,
        key: node[k].__key,
        children: toNodes(node[k].__children),
      }));
    const reqs: TreeNode[] = (node.__items || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    return [...folders, ...reqs];
  }
  return toNodes(root);
}
