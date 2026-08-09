'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, Loader2, Search } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import type { AgentConfig } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

export type OrchestratorAgentStatus = 'queued' | 'running' | 'done' | 'error';

interface AgentOutputCardProps {
  agent: AgentConfig;
  status: OrchestratorAgentStatus;
  output: string;
  error?: string;
  searchingQuery?: string;
}

const STATUS_DOT: Record<OrchestratorAgentStatus, string> = {
  queued: 'bg-zinc-400',
  running: 'bg-amber-500 animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
};

const STATUS_LABEL: Record<OrchestratorAgentStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

/**
 * One row per orchestrated agent. Doubles as both the live progress indicator (the status dot and
 * label update in real time as events stream in) and the collapsible detail view.
 *
 * CRITICAL: the expand control is a <button>; the link to the agent's own page is a sibling <div>,
 * never nested inside the button. Nesting an <a>/<Link> inside a <button> is invalid HTML and
 * silently breaks the expand handler — this exact bug shipped in a previous build of this app.
 */
export function AgentOutputCard({ agent, status, output, error, searchingQuery }: AgentOutputCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContent = output.trim().length > 0 || Boolean(error);

  return (
    <div className={cn('rounded-xl border bg-surface', agent.accent.border)}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          disabled={!hasContent}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        >
          <span
            className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[status])}
            aria-hidden="true"
          />
          <span className="shrink-0 text-base leading-none" aria-hidden="true">
            {agent.icon}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-ink">{agent.name}</span>

          <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-ink-muted">
            {status === 'running' && searchingQuery && (
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Search className="h-3 w-3" aria-hidden="true" />
                <span className="max-w-[10rem] truncate">{searchingQuery}</span>
              </span>
            )}
            {status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {STATUS_LABEL[status]}
          </span>

          {hasContent && (
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-ink-muted transition-transform', isExpanded && 'rotate-180')}
              aria-hidden="true"
            />
          )}
        </button>

        {/* Sibling of the button above, not a descendant — see the CRITICAL note in the doc comment. */}
        <Link
          href={`/agents/${agent.id}`}
          title={`Open ${agent.name}`}
          className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-field hover:text-ink"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {isExpanded && hasContent && (
        <div className="border-t border-line px-4 py-4">
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <MarkdownRenderer content={output} />
          )}
        </div>
      )}
    </div>
  );
}
