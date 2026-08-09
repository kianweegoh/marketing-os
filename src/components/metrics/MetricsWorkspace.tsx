'use client';

import { useState } from 'react';
import { AgentOutputPanel } from '@/components/agents/AgentOutputPanel';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsForm, type MetricsFormValues } from '@/components/metrics/MetricsForm';
import { MetricsTable } from '@/components/metrics/MetricsTable';
import { AGENTS } from '@/lib/agents/registry';
import { PERCENT_BENCHMARKS, statusForCpiTrend, statusForPercent } from '@/lib/metrics';
import { errorMessage } from '@/lib/utils';
import type { CampaignMetricsRecord } from '@/types';

const PERFORMANCE_ANALYST = AGENTS['performance-analyst'];
const CPI_TREND_WINDOW = 3;

interface MetricsWorkspaceProps {
  initialMetrics: CampaignMetricsRecord[];
}

export function MetricsWorkspace({ initialMetrics }: MetricsWorkspaceProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [reanalysingId, setReanalysingId] = useState<string | null>(null);
  const [analysisRaw, setAnalysisRaw] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasAnalysis, setHasAnalysis] = useState(initialMetrics.some((m) => m.analysisRunId));

  const isBusy = formSubmitting || reanalysingId !== null;

  /**
   * Shared stream handler for both "Save & Analyse" and "Re-analyse" — same wire format. The
   * target row's id is threaded through the stream itself (captured from `metric_saved`, the
   * first event either flow emits) rather than tracked as component state, so it can't drift
   * across a re-render triggered mid-stream by `setReanalysingId`/`setFormSubmitting`.
   */
  async function runAnalysis(body: MetricsFormValues | { metricId: string }): Promise<void> {
    setAnalysisError(null);
    setAnalysisRaw('');
    setHasAnalysis(true);

    let targetMetricId: string | null = null;

    function handleEvent(event: Record<string, unknown>): void {
      switch (event.type) {
        case 'metric_saved': {
          const metric = event.metric as CampaignMetricsRecord;
          targetMetricId = metric.id;
          setMetrics((current) => {
            const exists = current.some((m) => m.id === metric.id);
            return exists
              ? current.map((m) => (m.id === metric.id ? metric : m))
              : [metric, ...current];
          });
          break;
        }
        case 'analysis_delta':
          setAnalysisRaw((current) => current + (event.chunk as string));
          break;
        case 'analysis_search': {
          // Same "<!--SEARCH:query-->" convention the solo agent run route uses, so this stream
          // can reuse AgentOutputPanel's marker parsing directly instead of a second impl.
          const query = (event.query as string).replace(/-->/g, '--&gt;');
          setAnalysisRaw((current) => `${current}\n\n<!--SEARCH:${query}-->\n\n`);
          break;
        }
        case 'analysis_done': {
          const runId = event.runId as string;
          setMetrics((current) =>
            current.map((m) => (m.id === targetMetricId ? { ...m, analysisRunId: runId } : m)),
          );
          break;
        }
        case 'analysis_error':
          setAnalysisError(event.error as string);
          break;
        default:
          break;
      }
    }

    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');
          if (line.trim()) handleEvent(JSON.parse(line) as Record<string, unknown>);
        }
      }
    } catch (caught) {
      setAnalysisError(errorMessage(caught));
    } finally {
      setFormSubmitting(false);
      setReanalysingId(null);
    }
  }

  async function handleSave(values: MetricsFormValues): Promise<void> {
    setFormSubmitting(true);
    await runAnalysis(values);
  }

  async function handleReanalyse(metricId: string): Promise<void> {
    setReanalysingId(metricId);
    await runAnalysis({ metricId });
  }

  const latest = metrics[0] ?? null;
  const cpiLookback = metrics.slice(1, 1 + CPI_TREND_WINDOW);
  const cpiPreviousAverage =
    cpiLookback.length > 0 ? cpiLookback.reduce((sum, m) => sum + m.cpi, 0) / cpiLookback.length : null;

  return (
    <div className="space-y-6">
      {latest && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Spend"
            value={latest.totalSpend.toLocaleString()}
            caption="Most recent entry"
            status="neutral"
          />
          <MetricCard
            label="Installs"
            value={latest.installs.toLocaleString()}
            caption="Most recent entry"
            status="neutral"
          />
          <MetricCard
            label="CPI"
            value={latest.cpi.toFixed(2)}
            caption={cpiPreviousAverage !== null ? `vs. ${cpiPreviousAverage.toFixed(2)} recent avg` : 'No prior entries yet'}
            status={statusForCpiTrend(latest.cpi, cpiPreviousAverage)}
          />
          <MetricCard
            label="D30 Retention"
            value={`${latest.day30Retention.toFixed(1)}%`}
            caption={`Industry default: ≥ ${PERCENT_BENCHMARKS.day30Retention}%`}
            status={statusForPercent(latest.day30Retention, PERCENT_BENCHMARKS.day30Retention)}
          />
        </div>
      )}

      <MetricsForm onSubmit={(values) => void handleSave(values)} isSubmitting={formSubmitting} />

      {hasAnalysis && (
        <AgentOutputPanel
          agent={PERFORMANCE_ANALYST}
          raw={analysisRaw}
          isRunning={isBusy}
          error={analysisError}
        />
      )}

      <MetricsTable metrics={metrics} onReanalyse={(id) => void handleReanalyse(id)} reanalysingId={reanalysingId} />
    </div>
  );
}
