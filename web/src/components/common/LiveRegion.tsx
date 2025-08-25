'use client';
import { useEffect, useState } from 'react';

export function LiveRegion({ message }: { message: string | null }) {
  const [msg, setMsg] = useState<string>('');
  useEffect(() => {
    if (message) setMsg(message);
  }, [message]);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region">
      {msg}
    </div>
  );
}
