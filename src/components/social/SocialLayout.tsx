import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAccess } from '@/redux/hooks/useAccess';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSocialMeta } from '@/redux/slices/socialSlice';

export const SOCIAL_BASE = '/marketing/social-media';

/** Page frame of every Social Pulse screen: brand title, sub-tabs with counters, then the screen. */
export function SocialLayout({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { canWriteSocial } = useAccess();
  const meta = useAppSelector((s) => s.social.meta);
  const metaStatus = useAppSelector((s) => s.social.metaStatus);
  const compareCount = useAppSelector((s) => s.social.ui.compareIds.length);

  useEffect(() => {
    if (metaStatus === 'idle') void dispatch(fetchSocialMeta());
  }, [dispatch, metaStatus]);

  const tabs: { to: string; label: string; end?: boolean; count?: number; due?: boolean; hidden?: boolean }[] = [
    { to: SOCIAL_BASE, label: 'Dashboard', end: true },
    { to: `${SOCIAL_BASE}/posts`, label: 'Posts', count: meta?.postCount },
    { to: `${SOCIAL_BASE}/monthly`, label: 'Monthly pull', count: meta?.dueCount, due: true, hidden: !canWriteSocial },
    { to: `${SOCIAL_BASE}/compare`, label: 'Compare', count: compareCount },
  ];

  return (
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent-orange-500 text-sm font-extrabold tracking-wide text-white"
            >
              SP
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">Social Pulse · Grow Path social media results</p>
              <h1 className="display-sm text-on-surface">{title}</h1>
              {description && <p className="mt-0.5 text-sm text-on-surface-variant">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <nav aria-label="Social Pulse sections" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1 border-b border-outline-variant/40 px-1">
            {tabs
              .filter((t) => !t.hidden)
              .map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                      cn(
                        '-mb-px inline-flex h-10 items-center gap-1.5 rounded-t-md border-b-2 px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-[2px] focus-visible:ring-primary/40',
                        isActive ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface',
                      )
                    }
                  >
                    {t.label}
                    {t.count != null && (t.count > 0 || !t.due) && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 text-[11px] font-bold leading-5 tabular-nums',
                          t.due ? 'bg-accent-orange-500 text-white' : 'bg-surface-container-high text-on-surface-variant',
                        )}
                        aria-label={t.due ? `${t.count} posts not pulled this month` : undefined}
                      >
                        {t.count}
                      </span>
                    )}
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
