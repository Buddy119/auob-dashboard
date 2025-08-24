'use client';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Button variant="ghost" aria-label="Toggle theme" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      {isDark ? '🌙' : '☀️'}
    </Button>
  );
}
