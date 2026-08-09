'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Home, Library, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { getAllAgents } from '@/lib/agents/registry';
import { CATEGORY_LABELS, type AgentConfig } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

const CATEGORY_ORDER: Array<AgentConfig['category']> = ['intelligence', 'creative', 'growth'];

const PRIMARY_LINKS = [
  { href: '/', label: 'Orchestrator', icon: Home },
  { href: '/metrics', label: 'Campaign Metrics', icon: BarChart3 },
  { href: '/library', label: 'Output Library', icon: Library },
];

/**
 * Left navigation. Agents are grouped by category exactly as Section 14 specifies. Active state is
 * driven by `usePathname()`; on narrow viewports the sidebar collapses to an icon rail rather than
 * a hidden drawer, so navigation is always reachable without an extra toggle.
 */
export function Sidebar() {
  const pathname = usePathname();
  const agentsByCategory = getAllAgents();

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <nav className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-line bg-sidebar lg:w-64">
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-line px-3 lg:justify-start lg:px-5">
        <span className="hidden text-sm font-semibold tracking-tight text-ink lg:inline">
          Kalo AI <span className="text-ink-muted">· Marketing OS</span>
        </span>
        <span className="text-sm font-semibold text-ink lg:hidden" aria-hidden="true">
          K
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        <ul className="space-y-0.5">
          {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} icon={Icon} active={isActive(href)} />
          ))}
        </ul>

        <div className="my-4 border-t border-line" />

        {CATEGORY_ORDER.map((category) => {
          const inCategory = agentsByCategory.filter((agent) => agent.category === category);

          return (
            <div key={category} className="mb-4">
              <p className="hidden px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted lg:block">
                {CATEGORY_LABELS[category]}
              </p>
              <ul className="space-y-0.5">
                {inCategory.map((agent) => {
                  const href = `/agents/${agent.id}`;
                  return (
                    <li key={agent.id}>
                      <Link
                        href={href}
                        title={agent.name}
                        aria-current={isActive(href) ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive(href)
                            ? cn(agent.accent.bg, agent.accent.text, 'font-medium')
                            : 'text-ink-muted hover:bg-field hover:text-ink',
                        )}
                      >
                        <span className="shrink-0 text-base leading-none" aria-hidden="true">
                          {agent.icon}
                        </span>
                        <span className="hidden truncate lg:inline">{agent.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <div className="my-4 border-t border-line" />

        <ul>
          <NavItem href="/settings" label="Settings" icon={Settings} active={isActive('/settings')} />
        </ul>
      </div>

      <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-line p-3 lg:flex-row lg:items-center lg:justify-between">
        <ThemeToggle />
        <LogoutButton />
      </div>
    </nav>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}

function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        title={label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          active ? 'bg-field font-medium text-ink' : 'text-ink-muted hover:bg-field hover:text-ink',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden lg:inline">{label}</span>
      </Link>
    </li>
  );
}
