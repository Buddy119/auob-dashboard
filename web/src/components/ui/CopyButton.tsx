'use client';

import { Button } from './Button';
import { useCopy } from '@/hooks/useCopy';

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied',
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const copy = useCopy();
  return (
    <Button
      variant="ghost"
      className={className}
      onClick={async () => {
        await copy(text, copiedLabel);
      }}
      aria-label={label}
      title={label}
    >
      {label}
    </Button>
  );
}
