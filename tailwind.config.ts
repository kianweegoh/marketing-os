import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * Semantic colours are driven by CSS custom properties defined in `globals.css` and swapped by the
 * `.dark` class on <html>. They are declared as space-separated RGB channels so Tailwind's
 * `<alpha-value>` opacity modifiers (e.g. `bg-surface/60`) keep working.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--kalo-page) / <alpha-value>)',
        surface: 'rgb(var(--kalo-surface) / <alpha-value>)',
        sidebar: 'rgb(var(--kalo-sidebar) / <alpha-value>)',
        line: 'rgb(var(--kalo-line) / <alpha-value>)',
        field: 'rgb(var(--kalo-field) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--kalo-ink) / <alpha-value>)',
          muted: 'rgb(var(--kalo-ink-muted) / <alpha-value>)',
        },
      },
      borderColor: {
        DEFAULT: 'rgb(var(--kalo-line) / <alpha-value>)',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--kalo-ink) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [typography],
};

export default config;
