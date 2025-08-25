import { getPreferredEnvId, setPreferredEnvId, clearPreferredEnvId } from '@/features/collections/envPref';

test('stores and retrieves preferred env per collection', () => {
  const col = 'col_abc';
  expect(getPreferredEnvId(col)).toBeUndefined();
  setPreferredEnvId(col, 'env_1');
  expect(getPreferredEnvId(col)).toBe('env_1');
  clearPreferredEnvId(col);
  expect(getPreferredEnvId(col)).toBeUndefined();
});
