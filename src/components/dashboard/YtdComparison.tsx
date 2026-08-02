import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarRange, PlusCircle, CheckCircle2 } from 'lucide-react';
import type { Ticket } from '@/types/ticket';
import { activityDate, isInRange, monthRange, ytdRange } from '@/lib/ticketActivity';

/**
 * "Year-to-date vs current month" comparison for tickets.
 *
 * Two windows are compared for the selected month:
 *  - Month = the selected calendar month.
 *  - YTD   = Jan 1 of that year … end of the selected month.
 *
 * Two metric bases (matching the "created & completed" request):
 *  - Created   — tickets whose `createdAt` falls in the window ("what came in").
 *  - By status — tickets that *reached* their current status in the window,
 *    measured by `activityDate` (same basis the dashboard cards use). The
 *    completed statuses (resolved/tested/delivered/closed) are also summed into
 *    a single "Completed" figure.
 *
 * The `%` column is the month's share of the YTD figure (e.g. 20 of 100 = 20%).
 */

const STATUS_ROWS = [
  { key: 'new', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'customer_pending', label: 'Customer Pending' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'tested', label: 'Tested' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'closed', label: 'Closed' },
  { key: 'not_related', label: 'Not Related' },
] as const;

const COMPLETED_STATUSES = ['resolved', 'tested', 'delivered', 'closed'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const share = (month: number, ytd: number) => (ytd > 0 ? Math.round((month / ytd) * 100) : 0);

const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };

export function YtdComparison({ tickets }: { tickets: Ticket[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const data = useMemo(() => {
    const m = monthRange(year, month);
    const y = ytdRange(year, month);

    const createdMonth = tickets.filter((t) => isInRange(m, t.createdAt)).length;
    const createdYtd = tickets.filter((t) => isInRange(y, t.createdAt)).length;

    const actMonth = tickets.filter((t) => isInRange(m, activityDate(t)));
    const actYtd = tickets.filter((t) => isInRange(y, activityDate(t)));

    const byStatus = (arr: Ticket[], s: string) => arr.filter((t) => t.status === s).length;

    const rows = STATUS_ROWS.map((r) => ({
      label: r.label,
      month: byStatus(actMonth, r.key),
      ytd: byStatus(actYtd, r.key),
    }));

    const completedMonth = actMonth.filter((t) => COMPLETED_STATUSES.includes(t.status)).length;
    const completedYtd = actYtd.filter((t) => COMPLETED_STATUSES.includes(t.status)).length;

    return { createdMonth, createdYtd, completedMonth, completedYtd, rows };
  }, [tickets, year, month]);

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear((v) => v - 1); }
    else setMonth((v) => v - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear((v) => v + 1); }
    else setMonth((v) => v + 1);
  };
  // Don't step past the live month — future windows are always empty.
  const atOrAfterCurrent =
    year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const monthLabel = `${MONTHS[month]} ${year}`;
  const ytdLabel = `Jan – ${MONTHS[month].slice(0, 3)} ${year}`;

  return (
    <motion.div
      className="mb-7 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SP, delay: 0.08 }}
    >
      {/* Header + month picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-brand-600" />
          <div>
            <h2 className="text-base font-bold text-on-surface">Month vs Year-to-Date</h2>
            <p className="text-xs text-on-surface-variant">
              Tickets created &amp; completed — {monthLabel} compared with the year so far
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold text-on-surface tabular-nums">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={atOrAfterCurrent}
            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Headline: Created & Completed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        <HeadlineCard
          icon={<PlusCircle className="h-4 w-4" />}
          title="Created"
          subtitle="by created date"
          month={data.createdMonth}
          ytd={data.createdYtd}
          monthLabel={monthLabel}
          ytdLabel={ytdLabel}
          accent="text-brand-600"
        />
        <HeadlineCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Completed"
          subtitle="resolved / tested / delivered / closed"
          month={data.completedMonth}
          ytd={data.completedYtd}
          monthLabel={monthLabel}
          ytdLabel={ytdLabel}
          accent="text-emerald-600"
        />
      </div>

      {/* Full status breakdown */}
      <div className="px-4 pb-4">
        <div className="overflow-x-auto rounded-xl border border-outline-variant/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container/50 border-b border-outline-variant/10">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">{monthLabel}</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">YTD ({ytdLabel})</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wide whitespace-nowrap">Month % of YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {data.rows.map((r) => (
                <tr key={r.label} className="hover:bg-surface-container/40 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-on-surface whitespace-nowrap">{r.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-on-surface">{r.month}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{r.ytd}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{share(r.month, r.ytd)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          Status rows count tickets that reached that status within each window. "Created" counts tickets opened in the window.
        </p>
      </div>
    </motion.div>
  );
}

function HeadlineCard({
  icon, title, subtitle, month, ytd, monthLabel, ytdLabel, accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  month: number;
  ytd: number;
  monthLabel: string;
  ytdLabel: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl bg-surface-container/40 border border-outline-variant/10 p-4">
      <div className={`flex items-center gap-1.5 text-sm font-semibold ${accent}`}>
        {icon}
        {title}
        <span className="text-xs font-normal text-on-surface-variant">· {subtitle}</span>
      </div>
      <div className="mt-3 flex items-end gap-6">
        <div>
          <p className="text-2xl font-bold text-on-surface tabular-nums leading-none">{month}</p>
          <p className="text-xs text-on-surface-variant mt-1">{monthLabel}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-on-surface tabular-nums leading-none">{ytd}</p>
          <p className="text-xs text-on-surface-variant mt-1">YTD ({ytdLabel})</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-on-surface tabular-nums leading-none">{share(month, ytd)}%</p>
          <p className="text-xs text-on-surface-variant mt-1">of YTD</p>
        </div>
      </div>
    </div>
  );
}
