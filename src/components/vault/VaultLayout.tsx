import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccess } from '@/redux/hooks/useAccess';

const TABS = [
  { to: '/vault', label: 'Dashboard', end: true },
  { to: '/vault/accounts', label: 'Accounts' },
  { to: '/vault/send', label: 'Send Credentials' },
  { to: '/vault/log', label: 'Send Log' },
  { to: '/vault/settings', label: 'Settings', adminOnly: true },
];

/** Page frame of every vault screen: title, sub-tabs, then the screen. */
export function VaultLayout({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const { isAdmin } = useAccess();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Credentials Vault
            </p>
            <h1 className="display-sm text-on-surface">{title}</h1>
            {description && <p className="mt-1 text-on-surface-variant">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <nav aria-label="Credentials Vault sections" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1 border-b border-outline-variant/40 px-1">
            {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      '-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40 rounded-t-md',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface',
                    )
                  }
                >
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      {children}
    </div>
  );
}
