import type { Metadata } from 'next';
import { getCompanyContext } from '@/lib/companyContext';
import { getIntegrationStatus } from '@/lib/integrations/status';
import { SettingsWorkspace } from '@/components/settings/SettingsWorkspace';

export const metadata: Metadata = { title: 'Settings · Kalo AI Marketing OS' };

// Reads the company context and cookie-based Google connection state at request time.
export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  searchParams: { google_connected?: string; google_error?: string };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const context = await getCompanyContext();
  const status = getIntegrationStatus();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Company context and integrations.
      </p>

      <div className="mt-8">
        <SettingsWorkspace
          initialContext={context}
          initialStatus={status}
          googleConnected={searchParams.google_connected === '1'}
          googleError={searchParams.google_error}
        />
      </div>
    </div>
  );
}
