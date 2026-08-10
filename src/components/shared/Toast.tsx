'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  variant?: ToastVariant;
  actionLabel?: string;
  actionHref?: string;
}

interface ToastItem extends Required<Pick<ToastOptions, 'variant'>> {
  id: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Fires a toast from any client component under `ToastProvider` — for save/push/copy results. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider.');
  return context;
}

const AUTO_DISMISS_MS = 5000;

/** Root-mounted provider. No toast library — a small self-contained stack in the corner. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    (message, options) => {
      const id = crypto.randomUUID();
      setToasts((current) => [
        ...current,
        {
          id,
          message,
          variant: options?.variant ?? 'success',
          actionLabel: options?.actionLabel,
          actionHref: options?.actionHref,
        },
      ]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS),
      );
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const VARIANT_ICON_CLASS: Record<ToastVariant, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-ink-muted',
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = VARIANT_ICON[toast.variant];

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg animate-fade-in"
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', VARIANT_ICON_CLASS[toast.variant])} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{toast.message}</p>
        {toast.actionHref && toast.actionLabel && (
          <a
            href={toast.actionHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs font-medium text-ink underline underline-offset-2"
          >
            {toast.actionLabel}
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded text-ink-muted transition-colors hover:text-ink"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
