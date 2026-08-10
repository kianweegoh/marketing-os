import { cookies } from 'next/headers';
import { GOOGLE_TOKENS_COOKIE, isGoogleConfigured } from '@/lib/integrations/googleAuth';
import type { IntegrationStatus } from '@/types';

/**
 * Reads env vars and the `google_tokens` cookie directly — shared by the Settings page (a Server
 * Component) and `GET /api/settings/status`, so the connection logic lives in exactly one place.
 */
export function getIntegrationStatus(): IntegrationStatus {
  const store = cookies();

  return {
    telegram: {
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim()),
    },
    google: {
      configured: isGoogleConfigured(),
      connected: Boolean(store.get(GOOGLE_TOKENS_COOKIE)?.value),
    },
  };
}
