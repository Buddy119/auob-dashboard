'use client';

import { useToast } from '@/components/ui/Toast';

export function useCopy() {
  const { toast } = useToast();
  return async (text: string, label = 'Copied') => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast({ title: label });
      return true;
    } catch (e: any) {
      toast({ title: 'Copy failed', description: e?.message || 'Unknown error' });
      return false;
    }
  };
}
