import { NextResponse } from 'next/server';
import { GOOGLE_TOKENS_MAX_AGE, googleCookieOptions, loadGoogleClient } from '@/lib/integrations/googleAuth';
import { pushEventsToCalendar } from '@/lib/integrations/googleCalendar';
import { sendTelegramMessage } from '@/lib/integrations/telegram';
import { errorMessage, errorStatus } from '@/lib/utils';
import type { CalendarEvent } from '@/types';

export const dynamic = 'force-dynamic';

function isCalendarEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.date === 'string' &&
    typeof event.platform === 'string' &&
    typeof event.format === 'string' &&
    typeof event.hook === 'string' &&
    (event.caption === undefined || typeof event.caption === 'string')
  );
}

/** POST /api/google/calendar — pushes content-calendar items onto the dedicated Marketing OS calendar. */
export async function POST(
  request: Request,
): Promise<NextResponse<{ success: true; created: number; calendarUrl: string } | { error: string }>> {
  try {
    const body = (await request.json()) as { events?: unknown };

    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: 'No events to push.' }, { status: 400 });
    }

    const events = body.events.filter(isCalendarEvent);
    if (events.length === 0) {
      return NextResponse.json({ error: 'None of the submitted events were valid.' }, { status: 400 });
    }

    const { client, refreshedCookieValue } = await loadGoogleClient();
    const { created, calendarUrl } = await pushEventsToCalendar(client, events);

    // Never let a Telegram failure fail the calendar push it's reporting on.
    try {
      await sendTelegramMessage(`📅 Pushed ${created} content items to your Marketing OS calendar`);
    } catch (error) {
      console.error('[api/google/calendar] Telegram notification failed (push still succeeded):', error);
    }

    const response = NextResponse.json({ success: true as const, created, calendarUrl });
    if (refreshedCookieValue) {
      response.cookies.set({ ...googleCookieOptions(GOOGLE_TOKENS_MAX_AGE), value: refreshedCookieValue });
    }
    return response;
  } catch (error) {
    console.error('[api/google/calendar] Failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
