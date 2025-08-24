import { buildRequestsTree } from '@/features/collections/tree';
import type { RequestItem } from '@/features/collections/types';

test('builds nested tree grouped by path segments', () => {
  const reqs: RequestItem[] = [
    { id: '1', name: 'List Users', method: 'GET', url: '', path: 'Users/List Users', isCritical: false },
    { id: '2', name: 'Get User', method: 'GET', url: '', path: 'Users/Get User', isCritical: false },
    { id: '3', name: 'Create Order', method: 'POST', url: '', path: 'Orders/Create Order', isCritical: false },
  ];
  const tree = buildRequestsTree(reqs);
  expect(tree.length).toBe(2);
  const users = tree.find(n => n.type === 'folder' && n.name === 'Users')!;
  expect(users && users.type === 'folder' && users.children.length).toBe(2);
  const orders = tree.find(n => n.type === 'folder' && n.name === 'Orders')!;
  expect(orders && orders.type === 'folder' && orders.children.length).toBe(1);
});
