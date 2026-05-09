import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Ticket as TicketIcon,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  CalendarCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchWeeklySummary } from '@/redux/slices/assignmentSlice';
import type { ConsultantWeeklySummary, WeeklyTicketItem } from '@/types/assignment.types';
import { cn } from '@/lib/utils';

// ─── Spring presets ───────────────────────────────────────────────────────────
const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };
const SP_FAST = { type: 'spring' as const, stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({ opacity: 1, y: 0, scale: 1, transition: { ...SP, delay: i * 0.07 } }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { ...SP_FAST, delay: i * 0.04 } }),
};

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ to }: { to: number }) {
  const raw = useMotionValue(0);
  const sprung = useSpring(raw, { stiffness: 75, damping: 18, restDelta: 0.5 });
  const display = useTransform(sprung, (v) => String(Math.round(v)));
  useEffect(() => { raw.set(to); }, [to, raw]);
  return <motion.span>{display}</motion.span>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
};

const STATUS_STYLE: Record<string, string> = {
  new:              'bg-accent-orange-100 text-accent-orange-700',
  assigned:         'bg-brand-100 text-brand-700',
  in_progress:      'bg-yellow-100 text-yellow-700',
  customer_pending: 'bg-purple-100 text-purple-700',
  resolved:         'bg-green-100 text-green-700',
  tested:           'bg-cyan-100 text-cyan-700',
  delivered:        'bg-teal-100 text-teal-700',
  closed:           'bg-surface-container-high text-on-surface-variant',
  not_related:      'bg-slate-100 text-slate-700',
};

const DONE = new Set(['resolved', 'closed', 'delivered', 'tested']);

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Week starts Saturday (Egypt calendar)
function getSaturdayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = -((day + 1) % 7); // go back to the most-recent Saturday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekBounds(saturday: Date) {
  const start = new Date(saturday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(saturday);
  end.setDate(end.getDate() + 6); // Saturday + 6 = Friday
  end.setHours(23, 59, 59, 999);
  return { weekStart: start.toISOString(), weekEnd: end.toISOString() };
}

function fmtRange(saturday: Date): string {
  const friday = new Date(saturday);
  friday.setDate(friday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${saturday.toLocaleDateString('en-US', opts)} – ${friday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function fmtDuration(ms: number): string {
  const totalHours = ms / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.round(totalHours % 24);
  if (days === 0) return `${hours}h`;
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
}

function getActualDuration(ticket: WeeklyTicketItem): string | null {
  const end = ticket.resolvedAt || ticket.closedAt;
  if (!end || !ticket.acceptedAt) return null;
  const ms = new Date(end).getTime() - new Date(ticket.acceptedAt).getTime();
  return ms > 0 ? fmtDuration(ms) : null;
}

function formatLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, bar, iconBg, iconColor, numberColor, idx,
}: {
  label: string; value: number; icon: React.ElementType;
  bar: string; iconBg: string; iconColor: string; numberColor: string; idx: number;
}) {
  return (
    <motion.div
      custom={idx}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden bg-surface-container-lowest rounded-[1rem] p-5 flex items-center gap-4"
    >
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', bar)} />
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className={cn('text-2xl font-bold leading-none mt-0.5', numberColor)}>
          <AnimatedNumber to={value} />
        </p>
      </div>
    </motion.div>
  );
}

// ─── Consultant card ──────────────────────────────────────────────────────────
function ConsultantCard({ summary, idx }: { summary: ConsultantWeeklySummary; idx: number }) {
  const { consultant, tickets: allTickets, totalTickets, resolvedCount, pendingCount,
          totalEstimatedDays, totalActualDays, availableDaysInWeek } = summary;

  // Calculate actual hours from ticket dates on the frontend
  const computedActualHours = allTickets.reduce((sum, t) => {
    const end = t.resolvedAt || t.closedAt;
    if (!end || !t.acceptedAt) return sum;
    const ms = new Date(end).getTime() - new Date(t.acceptedAt).getTime();
    return ms > 0 ? sum + ms / (1000 * 60 * 60) : sum;
  }, 0);

  const [expanded, setExpanded] = useState(false);
  const [internalDateFilter, setInternalDateFilter] = useState('');

  // Show all tickets (including resolved/closed) so actual hours are visible
  const baseTickets = allTickets.filter((t) => t.status !== 'not_related');
  const tickets = internalDateFilter
    ? allTickets.filter((t) => t.internalDeliveryDate?.startsWith(internalDateFilter))
    : baseTickets;

  const allDone = pendingCount === 0 && totalTickets > 0;

  return (
    <motion.div
      custom={idx}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-surface-container-lowest rounded-[1rem] overflow-hidden"
    >
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-brand-700">
                {consultant.firstName[0]}{consultant.lastName[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">
                {consultant.firstName} {consultant.lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[11px] text-on-surface-variant capitalize">{formatLabel(consultant.role)}</span>
                <span className="text-on-surface-variant/30">·</span>
                <span className={cn('text-[11px] font-semibold capitalize', {
                  'text-green-600': consultant.status === 'active',
                  'text-red-500': consultant.status === 'inactive',
                  'text-yellow-600': consultant.status === 'on_leave',
                })}>
                  {formatLabel(consultant.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: ticket count + expand */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
              <TicketIcon className="w-3 h-3" />
              {internalDateFilter ? tickets.length : totalTickets} ticket{(internalDateFilter ? tickets.length : totalTickets) !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span><span className="font-semibold text-on-surface">{resolvedCount}</span> resolved</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <Clock className="w-3.5 h-3.5 text-yellow-500" />
            <span><span className="font-semibold text-on-surface">{pendingCount}</span> pending</span>
          </div>
          {totalEstimatedDays > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <CalendarDays className="w-3.5 h-3.5 text-brand-400" />
              <span>Est <span className="font-semibold text-on-surface">{totalEstimatedDays}d</span></span>
            </div>
          )}
          {totalActualDays > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Clock className="w-3.5 h-3.5 text-accent-orange-500" />
              <span>Actual <span className="font-semibold text-on-surface">{totalActualDays.toFixed(1)}d</span></span>
            </div>
          )}
          {computedActualHours > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span><span className="font-semibold text-on-surface">{computedActualHours.toFixed(1)}h</span> actual</span>
            </div>
          )}
        </div>

        {/* Spillover badge */}
        {allDone && availableDaysInWeek > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
            <CalendarCheck className="w-3.5 h-3.5" />
            {availableDaysInWeek} day{availableDaysInWeek !== 1 ? 's' : ''} available this week
          </div>
        )}
        {allDone && availableDaysInWeek === 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All tickets completed this week
          </div>
        )}
        {!allDone && pendingCount > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            {pendingCount} ticket{pendingCount !== 1 ? 's' : ''} still in progress
          </div>
        )}
      </div>

      {/* Internal date filter — shown only when expanded */}
      {expanded && (
        <div className="px-5 pb-3 flex items-center gap-2 border-t border-surface-container-high pt-3">
          <CalendarDays className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider shrink-0">Internal Date</span>
          <div className="relative flex items-center">
            <input
              type="date"
              value={internalDateFilter}
              onChange={(e) => setInternalDateFilter(e.target.value)}
              className="h-7 pl-2.5 pr-7 rounded-md border border-border bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
            />
            {internalDateFilter && (
              <button
                onClick={() => setInternalDateFilter('')}
                className="absolute right-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {internalDateFilter && tickets.length === 0 && (
            <span className="text-[11px] text-on-surface-variant/60">No tickets for this date</span>
          )}
        </div>
      )}

      {/* Ticket list */}
      <AnimatePresence>
        {expanded && tickets.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...SP, stiffness: 300, damping: 28 }}
            className="overflow-hidden border-t border-surface-container-high"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Ticket</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Week</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Internal Date</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Delivery Date</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Actual</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Delayed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {tickets.map((ticket, i) => {
                    const actual = getActualDuration(ticket);
                    return (
                      <motion.tr
                        key={ticket._id}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => window.open(`/tickets/view/${ticket._id}`, '_blank')}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-bold text-brand-600">#{ticket.ticketNumber}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm text-on-surface truncate">{ticket.subject}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide', STATUS_STYLE[ticket.status] ?? STATUS_STYLE.new)}>
                            {formatLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide', PRIORITY_STYLE[ticket.priority] ?? PRIORITY_STYLE.medium)}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-on-surface-variant">
                            {ticket.scheduledWeek != null ? `W${ticket.scheduledWeek}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.internalDeliveryDate ? (
                            <span className={cn('text-sm font-medium', internalDateFilter && ticket.internalDeliveryDate.startsWith(internalDateFilter) ? 'text-brand-600' : 'text-on-surface-variant')}>
                              {new Date(ticket.internalDeliveryDate + (ticket.internalDeliveryDate.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/40 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.deliveryEstimationDate ? (
                            <span className="text-sm text-on-surface-variant">
                              {new Date(ticket.deliveryEstimationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant/40 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-on-surface-variant">
                            {ticket.durationHours != null ? `${ticket.durationHours}h` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {actual ? (
                            <span className={cn('text-sm font-semibold', DONE.has(ticket.status) ? 'text-green-600' : 'text-on-surface-variant')}>
                              {actual}
                            </span>
                          ) : (
                            <span className="text-sm text-on-surface-variant/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.delayedDays != null && ticket.delayedDays > 0 ? (
                            <span className="text-sm font-semibold text-error">
                              +{ticket.delayedDays}d
                            </span>
                          ) : ticket.deliveryEstimationDate ? (
                            <span className="text-sm text-green-600 font-semibold">On time</span>
                          ) : (
                            <span className="text-sm text-on-surface-variant/50">—</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WeeklyConsultantReport() {
  const dispatch = useAppDispatch();
  const { weeklySummary, weeklyLoading } = useAppSelector((state) => state.assignments);

  const [currentSaturday, setCurrentSaturday] = useState<Date>(() => getSaturdayOfWeek(new Date()));

  useEffect(() => {
    const { weekStart, weekEnd } = getWeekBounds(currentSaturday);
    dispatch(fetchWeeklySummary({ weekStart, weekEnd }));
  }, [dispatch, currentSaturday]);

  const shiftWeek = (delta: number) => {
    setCurrentSaturday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  };

  const isCurrentWeek = getSaturdayOfWeek(new Date()).toDateString() === currentSaturday.toDateString();

  // Summary stats
  const totalTickets = weeklySummary.reduce((s, c) => s + c.totalTickets, 0);
  const activeConsultants = weeklySummary.filter((c) => c.totalTickets > 0).length;
  const avgTickets = activeConsultants > 0 ? Math.round(totalTickets / activeConsultants) : 0;
  const totalResolved = weeklySummary.reduce((s, c) => s + c.resolvedCount, 0);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Weekly Consultant Report</h1>
          <p className="text-on-surface-variant mt-1">
            Week of <span className="font-semibold text-on-surface">{fmtRange(currentSaturday)}</span>
            {isCurrentWeek && (
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 uppercase tracking-wide">
                Current Week
              </span>
            )}
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => shiftWeek(-1)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[0.5rem] border border-border text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev Week
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setCurrentSaturday(getSaturdayOfWeek(new Date()))}
              className="h-8 px-3 rounded-[0.5rem] border border-brand-200 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
            >
              Today
            </button>
          )}
          <button
            onClick={() => shiftWeek(1)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[0.5rem] border border-border text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
          >
            Next Week
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Consultants" value={activeConsultants} icon={Users}
          bar="bg-brand-500" iconBg="bg-brand-100" iconColor="text-brand-600" numberColor="text-brand-600" idx={0} />
        <StatCard label="Total Tickets" value={totalTickets} icon={TicketIcon}
          bar="bg-accent-orange-500" iconBg="bg-accent-orange-100" iconColor="text-accent-orange-600" numberColor="text-accent-orange-600" idx={1} />
        <StatCard label="Resolved" value={totalResolved} icon={CheckCircle2}
          bar="bg-green-500" iconBg="bg-green-100" iconColor="text-green-600" numberColor="text-green-600" idx={2} />
        <StatCard label="Avg Tickets / Consultant" value={avgTickets} icon={CalendarDays}
          bar="bg-purple-500" iconBg="bg-purple-100" iconColor="text-purple-600" numberColor="text-purple-600" idx={3} />
      </div>

      {/* Loading */}
      {weeklyLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      {/* Empty state */}
      {!weeklyLoading && weeklySummary.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
          <CalendarDays className="h-12 w-12 opacity-30 mb-4" />
          <p className="text-sm font-medium">No consultant assignments found for this week</p>
          <p className="text-xs mt-1">Try navigating to a different week</p>
        </div>
      )}

      {/* Consultant cards */}
      {!weeklyLoading && weeklySummary.length > 0 && (
        <div className="space-y-4">
          {weeklySummary.map((summary, i) => (
            <ConsultantCard key={summary.consultant._id} summary={summary} idx={i} />
          ))}
        </div>
      )}
    </div>
  );
}
