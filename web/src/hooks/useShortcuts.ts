'use client';

import { useEffect } from 'react';

type Binding = {
  combo: string; // e.g. 'slash', 'u', 'r', 'escape', 'arrowdown', 'arrowup', 'a'
  handler: (e: KeyboardEvent) => void;
  when?: () => boolean; // optional guard
  preventDefault?: boolean;
};

const keyOf = (e: KeyboardEvent) => e.key.toLowerCase();

export function useShortcuts(bindings: Binding[], deps: unknown[] = []) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyOf(e);
      for (const b of bindings) {
        if (b.combo === k && (!b.when || b.when())) {
          if (b.preventDefault !== false) e.preventDefault();
          b.handler(e);
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
