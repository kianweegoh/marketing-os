'use client';

import { useEffect } from 'react';
import { CompanyContextEditor } from '@/components/settings/CompanyContextEditor';
import { IntegrationsPanel } from '@/components/settings/IntegrationsPanel';
import { useToast } from '@/components/shared/Toast';
import type { IntegrationStatus } from '@/types';

interface SettingsWorkspaceProps {
  initialContext: string;
  initialStatus: IntegrationStatus;
  googleConnected: boolean;
  googleError?: string;
}

export function SettingsWorkspace({
  initialContext,
  initialStatus,
  googleConnected,
  googleError,
}: SettingsWorkspaceProps) {
  const { showToast } = useToast();

  // The OAuth callback redirects here with a query flag rather than an API response — surface it
  // once, then scrub the URL so a refresh doesn't re-fire the toast.
  useEffect(() => {
    if (googleConnected) {
      showToast('Google connected.');
      window.history.replaceState(null, '', '/settings');
    } else if (googleError) {
      showToast(`Google connection failed: ${googleError}`, { variant: 'error' });
      window.history.replaceState(null, '', '/settings');
    }
    // Intentionally runs once on mount — these flags describe the navigation that just happened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <CompanyContextEditor initialContent={initialContext} />
      <IntegrationsPanel initialStatus={initialStatus} />
    </div>
  );
}
