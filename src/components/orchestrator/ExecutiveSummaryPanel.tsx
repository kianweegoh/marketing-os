import { Loader2, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';

interface ExecutiveSummaryPanelProps {
  summary: string;
  isGenerating: boolean;
}

export function ExecutiveSummaryPanel({ summary, isGenerating }: ExecutiveSummaryPanelProps) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-ink-muted" aria-hidden="true" />
        <h2 className="text-sm font-medium text-ink">Executive Summary</h2>
        {isGenerating && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-muted" aria-hidden="true" />}
      </div>

      <div className="mt-3">
        {summary.trim() ? (
          <MarkdownRenderer content={summary} />
        ) : (
          <p className="text-sm text-ink-muted">
            {isGenerating ? 'Synthesising the team’s findings…' : 'Waiting on the agent team.'}
          </p>
        )}
      </div>
    </section>
  );
}
