import { LogoutButton } from '@/components/layout/LogoutButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

/**
 * Dashboard shell.
 *
 * The full grouped-navigation Sidebar lands in a later batch (Section 14). For now this provides
 * the wrapper, the theme control, and sign-out so the authenticated area is usable end to end.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-sidebar px-6 py-3">
        <span className="text-sm font-semibold tracking-tight text-ink">
          Kalo AI <span className="text-ink-muted">· Marketing OS</span>
        </span>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
