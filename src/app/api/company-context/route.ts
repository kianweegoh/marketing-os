import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMPANY_CONTEXT_ID, getCompanyContext } from '@/lib/companyContext';
import { errorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/company-context — the current context (falls back to the demo context if unset). */
export async function GET(): Promise<NextResponse<{ content: string } | { error: string }>> {
  try {
    return NextResponse.json({ content: await getCompanyContext() });
  } catch (error) {
    console.error('[api/company-context] Failed to load:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

/**
 * PUT /api/company-context — replaces the stored context. Used both by the editor's Save button
 * and by "Reset to demo context" (the client just PUTs `DEMO_COMPANY_CONTEXT` back).
 */
export async function PUT(request: Request): Promise<NextResponse<{ success: true } | { error: string }>> {
  try {
    const body = (await request.json()) as { content?: unknown };

    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Company context cannot be empty.' }, { status: 400 });
    }

    await prisma.companyContext.upsert({
      where: { id: COMPANY_CONTEXT_ID },
      update: { content: body.content },
      create: { id: COMPANY_CONTEXT_ID, content: body.content },
    });

    return NextResponse.json({ success: true as const });
  } catch (error) {
    console.error('[api/company-context] Failed to save:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
