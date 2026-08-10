import { Loader2 } from 'lucide-react';

/** Route-level fallback shown while a dashboard page's server data is loading. */
export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden="true" />
    </div>
  );
}
