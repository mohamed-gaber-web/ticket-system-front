import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, CalendarCheck, ChevronRight, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_META } from '@/lib/leadStages';
import { fmtCairo } from '@/lib/teleSalesDashboard';
import { STATUS_COLORS } from '@/config/leadStatusWorkflow';
import type { DashboardActionList, DashboardFollowUpItem, DashboardStaleLead, LeadStatus, TeleSalesDashboardData } from '@/types/teleSales.types';
import { EmptyNote, Skeleton } from './DashboardUi';

type Tone = 'red' | 'amber' | 'neutral';

const TONE: Record<Tone, { bar: string; icon: string; count: string }> = {
  red: { bar: 'bg-error', icon: 'bg-error/10 text-error', count: 'bg-error/10 text-error' },
  amber: {
    bar: 'bg-amber-500',
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    count: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  neutral: { bar: 'bg-outline-variant', icon: 'bg-surface-container-high text-on-surface-variant', count: 'bg-surface-container-high text-on-surface-variant' },
};

function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', STATUS_COLORS[status] ?? 'bg-surface-container-high text-on-surface-variant')}>
      {status}
    </span>
  );
}

function ActionCard<T extends { _id: string }>({
  title,
  icon,
  tone,
  list,
  emptyTitle,
  emptyHint,
  approximate,
  renderRow,
}: {
  title: string;
  icon: ReactNode;
  tone: Tone;
  list: DashboardActionList<T>;
  emptyTitle: string;
  emptyHint: string;
  approximate?: boolean;
  renderRow: (item: T) => { to: string; primary: ReactNode; secondary: ReactNode; aside?: ReactNode };
}) {
  const t = TONE[tone];
  const shown = list.items.length;
  return (
    <section className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm">
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', t.bar)} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant/10 px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-on-surface">
          <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg', t.icon)} aria-hidden="true">
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        <span
          className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums', t.count)}
          title={approximate ? 'Approximate: a few of these may have had a call in the last 14 days' : undefined}
        >
          {approximate && list.total > 0 ? '~' : ''}
          {list.total.toLocaleString('en-US')}
        </span>
      </div>
      {shown === 0 ? (
        <EmptyNote title={emptyTitle} hint={emptyHint} />
      ) : (
        <>
          <ul className="max-h-80 flex-1 divide-y divide-outline-variant/10 overflow-y-auto">
            {list.items.map((item) => {
              const row = renderRow(item);
              return (
                <li key={item._id}>
                  <Link
                    to={row.to}
                    className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface-container focus-visible:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-on-surface">{row.primary}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">{row.secondary}</span>
                    </span>
                    {row.aside}
                    <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          {list.total > shown && (
            <p className="border-t border-outline-variant/10 px-4 py-2 text-[11px] text-on-surface-variant">
              Showing {shown} of {approximate ? 'about ' : ''}
              {list.total.toLocaleString('en-US')}
            </p>
          )}
        </>
      )}
    </section>
  );
}

const followUpRow = (when: 'overdue' | 'today') => (f: DashboardFollowUpItem) => ({
  to: `/tele-sales/leads/${f.lead._id}`,
  primary: (
    <>
      <span className="truncate">{f.lead.name}</span>
      <StatusPill status={f.lead.status} />
    </>
  ),
  secondary: [f.followUpType, f.owner?.name].filter(Boolean).join(' · '),
  aside: (
    <span className={cn('shrink-0 text-right text-[11px] font-semibold tabular-nums', when === 'overdue' ? 'text-error' : 'text-on-surface')}>
      {when === 'today'
        ? fmtCairo(f.reminderDate, { hour: '2-digit', minute: '2-digit' })
        : fmtCairo(f.reminderDate, { day: 'numeric', month: 'short' })}
    </span>
  ),
});

const staleRow = (l: DashboardStaleLead) => ({
  to: `/tele-sales/leads/${l._id}`,
  primary: (
    <>
      <span className="truncate">{l.name}</span>
      <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold', STAGE_META[l.stage]?.badge)}>{STAGE_META[l.stage]?.label ?? l.stage}</span>
    </>
  ),
  secondary: [l.status, l.assignedTo?.name ?? 'Unassigned'].join(' · '),
  aside: (
    <span className="shrink-0 text-right text-[11px] font-semibold tabular-nums text-on-surface" title={`Last activity ${fmtCairo(l.lastActivityAt, { day: 'numeric', month: 'short', year: 'numeric' })}`}>
      {l.daysIdle} d
    </span>
  ),
});

/** What needs doing now: overdue follow-ups, today's follow-ups and Leads / Opportunities idle 14+ days. */
export function ActionLists({ actions }: { actions: TeleSalesDashboardData['actions'] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <ActionCard
        title="Overdue follow-ups"
        icon={<AlarmClock className="h-4 w-4" />}
        tone="red"
        list={actions.overdueFollowUps}
        emptyTitle="Nothing overdue"
        emptyHint="Every follow-up due so far has been done."
        renderRow={followUpRow('overdue')}
      />
      <ActionCard
        title="Today's follow-ups"
        icon={<CalendarCheck className="h-4 w-4" />}
        tone="amber"
        list={actions.todayFollowUps}
        emptyTitle="No follow-ups today"
        emptyHint="Pending follow-ups due today (Cairo time) appear here."
        renderRow={followUpRow('today')}
      />
      <ActionCard
        title="Idle 14+ days"
        icon={<Hourglass className="h-4 w-4" />}
        tone="neutral"
        list={actions.staleLeads}
        approximate
        emptyTitle="No idle leads"
        emptyHint="Every open Lead and Opportunity had activity in the last 14 days."
        renderRow={staleRow}
      />
    </div>
  );
}

export function ActionListsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-2xl" />
      ))}
    </div>
  );
}
