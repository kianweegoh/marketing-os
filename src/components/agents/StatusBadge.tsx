import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

const STATUS_STYLES: Record<AgentStatus, { label: string; dot: string; text: string }> = {
  idle: { label: 'Idle', dot: 'bg-zinc-400', text: 'text-ink-muted' },
  running: { label: 'Running', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600 dark:text-amber-400' },
  complete: { label: 'Complete', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { label: 'Error', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
};

/** Small status pill. The running dot pulses; `prefers-reduced-motion` disables it globally. */
export function StatusBadge({ status }: { status: AgentStatus }) {
  const { label, dot, text } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium',
        text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
