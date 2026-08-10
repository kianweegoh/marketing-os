/**
 * Runs once when the Next.js server process starts. This is where `checkEnvironment()` (§16)
 * actually fires — it throws for a missing `ANTHROPIC_API_KEY` or `AUTH_PASSWORD` (the app cannot
 * function without them) and logs a warning for each unconfigured optional integration.
 *
 * Guarded to the Node.js runtime: `register()` also runs once for the Edge runtime (middleware),
 * and `checkEnvironment` has no reason to run twice.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { checkEnvironment } = await import('@/lib/utils');
    checkEnvironment();
  }
}
