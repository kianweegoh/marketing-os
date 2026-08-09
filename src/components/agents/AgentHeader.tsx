import { StatusBadge } from '@/components/agents/StatusBadge';
import { CATEGORY_LABELS, type AgentConfig } from '@/lib/agents/types';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

interface AgentHeaderProps {
  agent: AgentConfig;
  status: AgentStatus;
}

export function AgentHeader({ agent, status }: AgentHeaderProps) {
  return (
    <header>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl',
            agent.accent.bg,
            agent.accent.border,
          )}
          aria-hidden="true"
        >
          {agent.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{agent.name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className={cn('mt-0.5 text-xs font-medium uppercase tracking-wide', agent.accent.text)}>
            {CATEGORY_LABELS[agent.category]}
          </p>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{agent.description}</p>
    </header>
  );
}
