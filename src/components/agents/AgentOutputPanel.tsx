'use client';

import { useState } from 'react';
import { AlertCircle, Check, Copy, Download, Search, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import { EmptyState } from '@/components/shared/EmptyState';
import { PushToCalendarButton } from '@/components/shared/PushToCalendarButton';
import { SaveToDocsButton } from '@/components/shared/SaveToDocsButton';
import { useToast } from '@/components/shared/Toast';
import type { AgentConfig } from '@/lib/agents/types';
import { cn, parseOutputSegments, stripMarkers, toIsoDate } from '@/lib/utils';

interface AgentOutputPanelProps {
  agent: AgentConfig;
  /** Raw stream text, still containing search markers. */
  raw: string;
  isRunning: boolean;
  error: string | null;
  /** The run's goal — feeds the Save to Docs title. Optional so non-agent callers still compile. */
  goal?: string;
}

export function AgentOutputPanel({ agent, raw, isRunning, error, goal }: AgentOutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const segments = parseOutputSegments(raw);
  const plainText = stripMarkers(raw);
  const hasOutput = plainText.length > 0;
  const isFinal = hasOutput && !isRunning;

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      showToast('Copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch (caught) {
      console.error('[output] Copy failed:', caught);
      showToast('Could not copy — your browser blocked clipboard access.', { variant: 'error' });
    }
  }

  function handleExport(): void {
    const blob = new Blob([plainText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${agent.id}-${toIsoDate(new Date())}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported as Markdown.');
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-ink">Output</h2>

        {hasOutput && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
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

            {/* Wait for the run to finish — exporting a partial stream mid-run would save
                incomplete output. */}
            {isFinal && (
              <>
                <SaveToDocsButton agentName={agent.name} goal={goal ?? ''} content={plainText} />
                {agent.id === 'content-social' && <PushToCalendarButton content={plainText} />}
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-5">
        {error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!hasOutput && !isRunning && !error && (
          <EmptyState
            icon={Sparkles}
            title="No output yet"
            description={`Give ${agent.shortName} an objective above and run it.`}
          />
        )}

        {segments.map((segment, index) =>
          segment.kind === 'search' ? (
            <span
              // Segments are positional and have no stable id; the list is append-only per run.
              key={`search-${index}`}
              className={cn(
                'my-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
                agent.accent.bg,
                agent.accent.border,
                agent.accent.text,
              )}
            >
              <Search className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{segment.query}</span>
            </span>
          ) : (
            <MarkdownRenderer key={`text-${index}`} content={segment.content} />
          ),
        )}

        {isRunning && (
          <div className="mt-3 flex items-center gap-1" aria-label="Generating">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
