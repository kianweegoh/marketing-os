'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronDown, Copy, Download, Search } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import type { AgentConfig } from '@/lib/agents/types';
import { cn, truncate } from '@/lib/utils';
import type { AgentRunSummary } from '@/types';

interface LibraryResultCardProps {
  run: AgentRunSummary;
  agent: AgentConfig;
}

const PREVIEW_LENGTH = 200;

export function LibraryResultCard({ run, agent }: LibraryResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: React.MouseEvent): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(run.output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (caught) {
      console.error('[library] Copy failed:', caught);
    }
  }

  function handleExport(event: React.MouseEvent): void {
    event.stopPropagation();
    const blob = new Blob([run.output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agent.id}-${run.createdAt.slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn('rounded-xl border bg-surface', agent.accent.border)}>
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base',
            agent.accent.bg,
            agent.accent.border,
          )}
          aria-hidden="true"
        >
          {agent.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-ink">{agent.name}</span>
            <span className="text-xs text-ink-muted">
              {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
            </span>
            {run.searchesUsed > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                <Search className="h-3 w-3" aria-hidden="true" />
                {run.searchesUsed}
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-ink">{run.goal}</p>

          {!isExpanded && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{truncate(run.output, PREVIEW_LENGTH)}</p>
          )}
        </div>

        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform', isExpanded && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="border-t border-line px-4 py-4">
          <div className="mb-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export .md
            </button>
            {/* Save to Docs button lands with the Google integration batch. */}
          </div>

          <MarkdownRenderer content={run.output} />
        </div>
      )}
    </div>
  );
}
