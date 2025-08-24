import { describe, it, expect } from '@jest/globals';

// copy the tiny helper from RunDialog to test it in isolation
function parseIntOrUndefined(v: string, min = 0) {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) return undefined;
  return Math.floor(n);
}

describe('parseIntOrUndefined', () => {
  it('parses valid numbers', () => {
    expect(parseIntOrUndefined('0')).toBe(0);
    expect(parseIntOrUndefined('15')).toBe(15);
    expect(parseIntOrUndefined('15.7')).toBe(15);
  });
  it('enforces min', () => {
    expect(parseIntOrUndefined('-1', 0)).toBeUndefined();
    expect(parseIntOrUndefined('0', 1)).toBeUndefined();
    expect(parseIntOrUndefined('1', 1)).toBe(1);
  });
  it('handles empty/invalid', () => {
    // @ts-expect-error
    expect(parseIntOrUndefined(undefined)).toBeUndefined();
    expect(parseIntOrUndefined('')).toBeUndefined();
    expect(parseIntOrUndefined('abc')).toBeUndefined();
  });
});
