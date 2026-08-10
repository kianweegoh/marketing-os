import type { Metadata } from 'next';
import { ToastProvider } from '@/components/shared/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kalo AI Marketing OS',
  description:
    'A multi-agent marketing operations platform. Seven specialist agents, one shared company context.',
};

/**
 * Blocking script injected before first paint. It reads the stored preference and applies the
 * `dark` class to <html> synchronously, so the page never flashes the wrong theme on load.
 * Defaults to light when nothing is stored.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    /* localStorage unavailable (private mode, blocked cookies) — fall back to light. */
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
