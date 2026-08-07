'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok) {
        setError(data.error ?? `Login failed (${response.status}).`);
        setIsSubmitting(false);
        return;
      }

      // A hard navigation, not router.push: a client-side push reuses the router cache from
      // before the cookie existed, so the middleware bounces the user straight back to /login.
      window.location.href = '/';
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not reach the server. Is it running?',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface">
            <LockKeyhole className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Kalo AI <span className="text-ink-muted">· Marketing OS</span>
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface p-6 shadow-sm"
          noValidate
        >
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? 'password-error' : undefined}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink placeholder:text-ink-muted disabled:opacity-60"
            placeholder="••••••••••••"
          />

          {error && (
            <p
              id="password-error"
              role="alert"
              className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || password.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">
          Access is controlled by a single shared password set in <code>AUTH_PASSWORD</code>.
        </p>
      </div>
    </main>
  );
}
