'use client';

import { format } from 'date-fns';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  PERCENT_BENCHMARKS,
  STATUS_TEXT_CLASS,
  statusForCpiTrend,
  statusForPercent,
} from '@/lib/metrics';
import { cn } from '@/lib/utils';
import type { CampaignMetricsRecord } from '@/types';

interface MetricsTableProps {
  /** Full loaded history, newest first — kept longer than the 10 displayed rows so CPI trend has
   *  lookback data for the oldest visible row. */
  metrics: CampaignMetricsRecord[];
  onReanalyse: (metricId: string) => void;
  reanalysingId: string | null;
}

const DISPLAY_LIMIT = 10;
const CPI_TREND_WINDOW = 3;

export function MetricsTable({ metrics, onReanalyse, reanalysingId }: MetricsTableProps) {
  if (metrics.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-surface">
        <EmptyState
          icon={History}
          title="No entries yet"
          description="Log this week's numbers above to start tracking trends."
        />
      </section>
    );
  }

  const rows = metrics.slice(0, DISPLAY_LIMIT);

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-ink">History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Week</th>
              <th className="px-4 py-2.5 font-medium">Platform</th>
              <th className="px-4 py-2.5 font-medium">Spend</th>
              <th className="px-4 py-2.5 font-medium">Installs</th>
              <th className="px-4 py-2.5 font-medium">CPI</th>
              <th className="px-4 py-2.5 font-medium">CTR</th>
              <th className="px-4 py-2.5 font-medium">Trial %</th>
              <th className="px-4 py-2.5 font-medium">D7</th>
              <th className="px-4 py-2.5 font-medium">D30</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((metric, index) => {
              const lookback = metrics.slice(index + 1, index + 1 + CPI_TREND_WINDOW);
              const previousAverage =
                lookback.length > 0
                  ? lookback.reduce((sum, m) => sum + m.cpi, 0) / lookback.length
                  : null;

              const cpiStatus = statusForCpiTrend(metric.cpi, previousAverage);
              const ctrStatus = statusForPercent(metric.ctr, PERCENT_BENCHMARKS.ctr);
              const trialStatus = statusForPercent(
                metric.trialConversionRate,
                PERCENT_BENCHMARKS.trialConversionRate,
              );
              const d7Status = statusForPercent(metric.day7Retention, PERCENT_BENCHMARKS.day7Retention);
              const d30Status = statusForPercent(metric.day30Retention, PERCENT_BENCHMARKS.day30Retention);
              const isReanalysing = reanalysingId === metric.id;

              return (
                <tr key={metric.id} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                    {format(new Date(metric.weekStart), 'd MMM')} –{' '}
                    {format(new Date(metric.weekEnd), 'd MMM')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted">{metric.platform}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                    {metric.totalSpend.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink">
                    {metric.installs.toLocaleString()}
                  </td>
                  <td className={cn('whitespace-nowrap px-4 py-2.5 font-medium', STATUS_TEXT_CLASS[cpiStatus])}>
                    {metric.cpi.toFixed(2)}
                  </td>
                  <td className={cn('whitespace-nowrap px-4 py-2.5', STATUS_TEXT_CLASS[ctrStatus])}>
                    {metric.ctr.toFixed(1)}%
                  </td>
                  <td className={cn('whitespace-nowrap px-4 py-2.5', STATUS_TEXT_CLASS[trialStatus])}>
                    {metric.trialConversionRate.toFixed(1)}%
                  </td>
                  <td className={cn('whitespace-nowrap px-4 py-2.5', STATUS_TEXT_CLASS[d7Status])}>
                    {metric.day7Retention.toFixed(1)}%
                  </td>
                  <td className={cn('whitespace-nowrap px-4 py-2.5', STATUS_TEXT_CLASS[d30Status])}>
                    {metric.day30Retention.toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onReanalyse(metric.id)}
                      disabled={isReanalysing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isReanalysing ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      )}
                      Re-analyse
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
