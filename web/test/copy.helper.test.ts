import { useCopy } from '@/hooks/useCopy';
import { renderHook, act } from '@testing-library/react';

const originalClipboard = global.navigator.clipboard;

beforeEach(() => {
  // @ts-ignore
  global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
});
afterEach(() => {
  // @ts-ignore
  global.navigator.clipboard = originalClipboard;
});

test('useCopy writes to clipboard and returns true', async () => {
  const { result } = renderHook(() => useCopy());
  let ok = false;
  await act(async () => {
    ok = await result.current('hello', 'copied');
  });
  expect(ok).toBe(true);
});
