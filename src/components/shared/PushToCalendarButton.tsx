'use client';

import { useMemo, useState } from 'react';
import { Calendar, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';
import { errorMessage, getNextMonday, parseContentCalendar, toIsoDate } from '@/lib/utils';

interface PushToCalendarButtonProps {
  /** Agent output markdown — the button renders nothing if it has no parseable calendar table. */
  content: string;
}

/**
 * Content & Social only: parses the output's "Content Calendar" table and, if it found anything,
 * offers a modal to push selected items to the dedicated Google Calendar.
 */
export function PushToCalendarButton({ content }: PushToCalendarButtonProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => toIsoDate(getNextMonday()));
  const [isPushing, setIsPushing] = useState(false);

  const events = useMemo(
    () => parseContentCalendar(content, new Date(`${startDate}T00:00:00`)),
    [content, startDate],
  );

  const [uncheckedIndexes, setUncheckedIndexes] = useState<Set<number>>(new Set());
  const selectedCount = events.length - uncheckedIndexes.size;

  function toggle(index: number): void {
    setUncheckedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleConfirm(): Promise<void> {
    const selected = events.filter((_, index) => !uncheckedIndexes.has(index));
    if (selected.length === 0) return;

    setIsPushing(true);
    try {
      const response = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: selected }),
      });

      const data = (await response.json()) as { success?: boolean; created?: number; calendarUrl?: string; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? `Push failed (${response.status}).`);
      }

      showToast(`Pushed ${data.created ?? selected.length} content items to your calendar.`, {
        variant: 'success',
        actionLabel: 'Open calendar',
        actionHref: data.calendarUrl,
      });
      setIsOpen(false);
    } catch (caught) {
      showToast(errorMessage(caught), { variant: 'error' });
    } finally {
      setIsPushing(false);
    }
  }

  // No parseable calendar in this output — nothing to offer.
  if (events.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
      >
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        Push to Calendar
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-to-calendar-title"
          onClick={() => !isPushing && setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-line bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="push-to-calendar-title" className="text-sm font-medium text-ink">
                Push to Calendar
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPushing}
                aria-label="Close"
                className="rounded text-ink-muted hover:text-ink disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="calendar-start-date" className="mt-4 block text-xs font-medium text-ink-muted">
              Start date
            </label>
            <input
              id="calendar-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={isPushing}
              className="mt-1.5 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink disabled:opacity-60"
            />

            <p className="mt-4 text-xs font-medium text-ink-muted">
              {events.length} item{events.length === 1 ? '' : 's'} found
            </p>
            <ul className="mt-1.5 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-line p-2">
              {events.map((event, index) => (
                <li key={`${event.date}-${index}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-field">
                  <input
                    type="checkbox"
                    checked={!uncheckedIndexes.has(index)}
                    onChange={() => toggle(index)}
                    disabled={isPushing}
                    className="mt-0.5 shrink-0"
                  />
                  <span className="min-w-0 text-xs">
                    <span className="font-medium text-ink">
                      {event.date} · {event.platform}
                    </span>
                    <span className="block truncate text-ink-muted">{event.hook || event.format}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPushing}
                className="rounded-lg border border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isPushing || selectedCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPushing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                {isPushing ? 'Pushing…' : `Push ${selectedCount} event${selectedCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
