'use client';

import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);

    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch (error) {
      console.error('[logout] Request failed, clearing client state anyway:', error);
    }

    // Hard navigation so the middleware re-evaluates against the cleared cookie.
    window.location.href = '/login';
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60"
    >
      {isSigningOut ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {/* Hidden on the icon rail (narrow sidebar) — the icon alone communicates intent there. */}
      <span className="hidden lg:inline">{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
