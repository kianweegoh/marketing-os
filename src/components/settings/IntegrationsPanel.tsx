'use client';

import { useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';
import { cn, errorMessage } from '@/lib/utils';
import type { IntegrationStatus } from '@/types';

interface IntegrationsPanelProps {
  initialStatus: IntegrationStatus;
}

export function IntegrationsPanel({ initialStatus }: IntegrationsPanelProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);

  async function handleDisconnect(): Promise<void> {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/auth/google', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not disconnect Google.');
      setStatus((current) => ({ ...current, google: { ...current.google, connected: false } }));
      showToast('Google disconnected.');
      setIsConfirmingDisconnect(false);
    } catch (caught) {
      showToast(errorMessage(caught), { variant: 'error' });
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Integrations</h2>

      <div className="mt-3 divide-y divide-line">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm text-ink">Telegram</p>
            <p className="mt-0.5 max-w-md text-xs text-ink-muted">
              Performance Analyst runs and calendar pushes notify this chat automatically. Set
              TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable.
            </p>
          </div>
          <StatusPill ok={status.telegram.configured} okLabel="Configured" notOkLabel="Not configured" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm text-ink">Google — Docs &amp; Calendar</p>
            <p className="mt-0.5 max-w-md text-xs text-ink-muted">
              {status.google.configured
                ? 'Save any agent report to Google Docs, and push a Content & Social calendar to a dedicated Google Calendar.'
                : 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable.'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusPill ok={status.google.connected} okLabel="Connected" notOkLabel="Not connected" />

            {status.google.configured &&
              (status.google.connected ? (
                isConfirmingDisconnect ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleDisconnect()}
                      disabled={isDisconnecting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
                    >
                      {isDisconnecting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                      {isDisconnecting ? 'Disconnecting…' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDisconnect(false)}
                      disabled={isDisconnecting}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDisconnect(true)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
                  >
                    Disconnect
                  </button>
                )
              ) : (
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
                >
                  Connect
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ ok, okLabel, notOkLabel }: { ok: boolean; okLabel: string; notOkLabel: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
        ok ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-line text-ink-muted',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {ok ? okLabel : notOkLabel}
    </span>
  );
}
