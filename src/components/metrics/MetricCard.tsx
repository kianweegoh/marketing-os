import { STATUS_DOT_CLASS, type MetricStatus } from '@/lib/metrics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  caption: string;
  status: MetricStatus;
}

/** One of the four top-of-page summary tiles for the most recent metrics entry. */
export function MetricCard({ label, value, caption, status }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASS[status])} aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{caption}</p>
    </div>
  );
}
