'use client';

import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Loader2, Save } from 'lucide-react';
import { PLATFORM_OPTIONS, computeCpi } from '@/lib/metrics';
import { cn } from '@/lib/utils';

export interface MetricsFormValues {
  weekStart: string;
  weekEnd: string;
  platform: string;
  totalSpend: number;
  installs: number;
  cpi: number;
  ctr: number;
  trialConversionRate: number;
  day7Retention: number;
  day30Retention: number;
}

interface MetricsFormProps {
  onSubmit: (values: MetricsFormValues) => void;
  isSubmitting: boolean;
}

const TODAY = format(new Date(), 'yyyy-MM-dd');
const WEEK_AGO = format(subDays(new Date(), 6), 'yyyy-MM-dd');

export function MetricsForm({ onSubmit, isSubmitting }: MetricsFormProps) {
  const [weekStart, setWeekStart] = useState(WEEK_AGO);
  const [weekEnd, setWeekEnd] = useState(TODAY);
  const [platform, setPlatform] = useState<string>(PLATFORM_OPTIONS[0]);
  const [totalSpend, setTotalSpend] = useState('');
  const [installs, setInstalls] = useState('');
  const [cpi, setCpi] = useState('');
  const [cpiTouched, setCpiTouched] = useState(false);
  const [ctr, setCtr] = useState('');
  const [trialConversionRate, setTrialConversionRate] = useState('');
  const [day7Retention, setDay7Retention] = useState('');
  const [day30Retention, setDay30Retention] = useState('');

  // Auto-computes CPI from spend ÷ installs — but only until the user edits it directly, so a
  // manual override isn't silently clobbered on the next keystroke elsewhere in the form.
  useEffect(() => {
    if (cpiTouched) return;
    const spend = Number(totalSpend);
    const count = Number(installs);
    if (totalSpend && installs && spend >= 0 && count > 0) {
      setCpi(computeCpi(spend, count).toFixed(2));
    } else {
      setCpi('');
    }
  }, [totalSpend, installs, cpiTouched]);

  function handleSubmit(): void {
    const values: MetricsFormValues = {
      weekStart,
      weekEnd,
      platform,
      totalSpend: Number(totalSpend) || 0,
      installs: Number(installs) || 0,
      cpi: Number(cpi) || 0,
      ctr: Number(ctr) || 0,
      trialConversionRate: Number(trialConversionRate) || 0,
      day7Retention: Number(day7Retention) || 0,
      day30Retention: Number(day30Retention) || 0,
    };
    onSubmit(values);
  }

  const canSubmit =
    weekStart.length > 0 && weekEnd.length > 0 && totalSpend.length > 0 && installs.length > 0 && !isSubmitting;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Log this week&rsquo;s numbers</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Week Start" htmlFor="weekStart">
          <input
            id="weekStart"
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Week End" htmlFor="weekEnd">
          <input
            id="weekEnd"
            type="date"
            value={weekEnd}
            onChange={(e) => setWeekEnd(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Platform" htmlFor="platform">
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          >
            {PLATFORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Total Spend" htmlFor="totalSpend">
          <input
            id="totalSpend"
            type="number"
            min={0}
            step="0.01"
            value={totalSpend}
            onChange={(e) => setTotalSpend(e.target.value)}
            disabled={isSubmitting}
            placeholder="In your local currency"
            className={inputClass}
          />
        </Field>

        <Field label="Installs" htmlFor="installs">
          <input
            id="installs"
            type="number"
            min={0}
            step="1"
            value={installs}
            onChange={(e) => setInstalls(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="CPI" htmlFor="cpi">
          <input
            id="cpi"
            type="number"
            min={0}
            step="0.01"
            value={cpi}
            onChange={(e) => {
              setCpi(e.target.value);
              setCpiTouched(true);
            }}
            disabled={isSubmitting}
            placeholder="auto"
            className={inputClass}
          />
        </Field>

        <Field label="CTR (%)" htmlFor="ctr">
          <input
            id="ctr"
            type="number"
            min={0}
            step="0.01"
            value={ctr}
            onChange={(e) => setCtr(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Trial-to-Paid Conversion (%)" htmlFor="trialConversionRate">
          <input
            id="trialConversionRate"
            type="number"
            min={0}
            step="0.01"
            value={trialConversionRate}
            onChange={(e) => setTrialConversionRate(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Day 7 Retention (%)" htmlFor="day7Retention">
          <input
            id="day7Retention"
            type="number"
            min={0}
            step="0.01"
            value={day7Retention}
            onChange={(e) => setDay7Retention(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>

        <Field label="Day 30 Retention (%)" htmlFor="day30Retention">
          <input
            id="day30Retention"
            type="number"
            min={0}
            step="0.01"
            value={day30Retention}
            onChange={(e) => setDay30Retention(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? 'Saving & analysing…' : 'Save & Analyse'}
        </button>
      </div>
    </section>
  );
}

const inputClass = cn(
  'w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink placeholder:text-ink-muted disabled:opacity-60',
);

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
