import { NextResponse } from 'next/server';
import { getIntegrationStatus } from '@/lib/integrations/status';
import type { IntegrationStatus } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/settings/status — connection state for every optional integration. */
export function GET(): NextResponse<IntegrationStatus> {
  return NextResponse.json(getIntegrationStatus());
}
