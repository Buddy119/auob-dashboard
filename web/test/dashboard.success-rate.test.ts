import { successRate } from '@/features/dashboard/queries';
import type { Run } from '@/features/runs/types';

const baseRun: Run = {
  id: 'r',
  collectionId: 'c',
  status: 'success',
  createdAt: new Date().toISOString(),
  startedAt: null,
  endedAt: null,
};

test('computes success rate', () => {
  expect(successRate(null)).toBeNull();
  expect(successRate({ ...baseRun, totalRequests: 0, successRequests: 0 } as any)).toBe(100);
  expect(successRate({ ...baseRun, totalRequests: 10, successRequests: 7 } as any)).toBe(70);
  expect(successRate({ ...baseRun, totalRequests: 3, successRequests: 3 } as any)).toBe(100);
});

test('returns null if missing fields', () => {
  expect(successRate({ ...baseRun } as any)).toBeNull();
});

