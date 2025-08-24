import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(0 0% 85%)',
        bg: 'hsl(0 0% 100%)',
        'bg-dark': 'hsl(0 0% 7%)',
        primary: { DEFAULT: '#3b82f6', foreground: '#fff' },
        muted: 'hsl(0 0% 96%)',
      }
    }
  },
  plugins: []
} satisfies Config;
