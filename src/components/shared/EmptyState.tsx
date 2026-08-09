import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/** Designed placeholder for any list that has no rows yet. Never leave a blank area. */
export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-field">
        <Icon className="h-4 w-4 text-ink-muted" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-ink-muted">{description}</p>}
    </div>
  );
}
