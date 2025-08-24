'use client';
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}
