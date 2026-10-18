import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCollectMeta } from '@/redux/slices/collectSlice';
import { fmtDate } from '@/lib/collect';
import { ContractDrawer } from '@/components/collect/ContractDrawer';
import { ContractEditor } from '@/components/collect/ContractEditor';
import { ErrorState } from '@/components/collect/CollectUi';
import '@/pages/collect/collect.css';

export const COLLECT_BASE = '/hr/collect';
export const LAST_TAB_KEY = 'collect.lastTab';

const TABS = [
  { to: 'analytics', label: 'Monthly Analysis' },
  { to: 'backlog', label: 'Backlog (Contracts)' },
  { to: 'collection', label: 'Collection', badge: 'collection' as const },
  { to: 'signatures', label: 'Signatures & Cheques', badge: 'signatures' as const },
  { to: 'reminders', label: 'Reminders', badge: 'reminders' as const },
  { to: 'settings/general', label: 'Settings', match: 'settings' },
];

/**
 * Frame of every Grow Path Collect screen: header with the
 * system's "today", tabs with red count badges, then the screen. The contract
 * drawer and editor live here so any screen can open them.
 */
export function CollectLayout({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { meta, metaStatus, metaError } = useAppSelector((s) => s.collect);

  useEffect(() => {
    if (metaStatus === 'idle') void dispatch(fetchCollectMeta());
  }, [dispatch, metaStatus]);

  // Remember the last tab (the module's index route opens it).
  useEffect(() => {
    const tab = location.pathname.slice(COLLECT_BASE.length + 1);
    if (tab) {
      try {
        localStorage.setItem(LAST_TAB_KEY, tab);
      } catch {
        /* storage blocked: the module just opens on its first tab */
      }
    }
  }, [location.pathname]);

  return (
    <div className="gpc min-w-0 space-y-4 p-4 sm:p-6">
      <header className="sticky top-0 z-20 -mx-4 space-y-2 bg-background/95 px-4 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/collect/gp-mark.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1" />
            <div className="min-w-0">
              <h1 className="gpc-h text-[19px] font-semibold leading-tight text-on-surface">
                Grow Path Collect
              </h1>
              <p className="text-xs text-on-surface-variant">Collections &amp; backlog analysis</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {meta && (
              <p className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                System date <b className={cn('text-on-surface', meta.simulated && 'text-amber-700 dark:text-amber-300')}>{fmtDate(meta.today)}</b>
                {meta.simulated && <span className="text-amber-700 dark:text-amber-300">(simulated)</span>}
                {meta.canAdmin && (
                  <Link to={`${COLLECT_BASE}/settings/general`} className="font-semibold text-primary hover:underline">
                    Change
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>
        <nav aria-label="Grow Path Collect sections" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1 border-b border-outline-variant/40 px-1">
            {TABS.map((t) => {
              const count = t.badge ? meta?.badges[t.badge] ?? 0 : 0;
              const active = location.pathname.startsWith(`${COLLECT_BASE}/${t.match ?? t.to}`);
              return (
                <li key={t.to}>
                  <NavLink
                    to={`${COLLECT_BASE}/${t.to}`}
                    className={cn(
                      '-mb-px inline-flex h-10 items-center gap-1.5 rounded-t-md border-b-2 px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-[2px] focus-visible:ring-primary/40',
                      active ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {t.label}
                    {count > 0 && (
                      <span className="rounded-full bg-error px-1.5 text-[11px] font-bold leading-5 tabular-nums text-white">{count}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      {metaStatus === 'failed' && !meta ? <ErrorState message={metaError ?? 'Could not load data'} onRetry={() => void dispatch(fetchCollectMeta())} /> : children}
      <ContractDrawer />
      <ContractEditor />
    </div>
  );
}
