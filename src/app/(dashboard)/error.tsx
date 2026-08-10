'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches unhandled errors anywhere under the dashboard layout. The heading is a fixed label —
 * the actual `error.message` is always rendered too, so this is never a bare "Something went
 * wrong" with no real information.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
      <p className="mt-1.5 max-w-sm text-sm text-ink-muted">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
