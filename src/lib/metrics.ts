/**
 * Shared metric benchmarks and formatting helpers for the Campaign Metrics dashboard.
 *
 * The build spec's benchmark table (CPI RM 3–8, D30 ≥ 20%, etc.) is one company's numbers. Since
 * the company context is free-text swapped at runtime, there is no reliable way to extract a
 * currency-specific target like CPI from it in plain TypeScript — only the Performance Analyst
 * agent, reading the actual context, can judge that correctly. So the color-coding here works two
 * ways:
 *   - Percentage metrics (CTR, trial conversion, retention) use widely-cited industry defaults,
 *     labelled as defaults in the UI, not as "your target" — percentages are at least roughly
 *     comparable across a subscription app regardless of currency.
 *   - CPI is currency-denominated and cannot get a fair fixed threshold across arbitrary
 *     contexts, so it is colour-coded by trend against this company's own recent history instead
 *     of an absolute number.
 */

export type MetricStatus = 'good' | 'warn' | 'bad' | 'neutral';

export const PERCENT_BENCHMARKS = {
  ctr: 1.5,
  trialConversionRate: 40,
  day7Retention: 30,
  day30Retention: 15,
} as const;

export function statusForPercent(value: number, benchmark: number): MetricStatus {
  if (value >= benchmark) return 'good';
  if (value >= benchmark * 0.7) return 'warn';
  return 'bad';
}

/** CPI is a cost — lower is better, so the comparison direction is inverted vs. the percentages. */
export function statusForCpiTrend(current: number, previousAverage: number | null): MetricStatus {
  if (previousAverage === null || previousAverage <= 0) return 'neutral';
  if (current <= previousAverage) return 'good';
  if (current <= previousAverage * 1.15) return 'warn';
  return 'bad';
}

export const STATUS_DOT_CLASS: Record<MetricStatus, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-zinc-400',
};

export const STATUS_TEXT_CLASS: Record<MetricStatus, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
  neutral: 'text-ink-muted',
};

export const PLATFORM_OPTIONS = ['TikTok', 'Meta', 'Google', 'All Platforms'] as const;
export type PlatformOption = (typeof PLATFORM_OPTIONS)[number];

/** Computes CPI from spend and installs, guarding the divide-by-zero case. */
export function computeCpi(totalSpend: number, installs: number): number {
  if (!Number.isFinite(totalSpend) || !Number.isFinite(installs) || installs <= 0) return 0;
  return totalSpend / installs;
}
