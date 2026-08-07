import { PrismaClient } from '@prisma/client';
// Relative rather than the `@/` alias: this script runs through tsx, outside the Next.js resolver.
import { DEMO_COMPANY_CONTEXT } from '../src/lib/contexts/demo';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const existing = await prisma.companyContext.findUnique({ where: { id: 'singleton' } });

  if (existing) {
    console.log('[seed] CompanyContext already present — leaving it untouched.');
    console.log('[seed] Use "Reset to demo context" in Settings to overwrite it.');
    return;
  }

  await prisma.companyContext.create({
    data: { id: 'singleton', content: DEMO_COMPANY_CONTEXT },
  });

  console.log('[seed] Seeded CompanyContext with the Verda demo company.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
