import {
  Ticket,
  CheckCircle2,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  Layers,
  GitBranch,
  FlaskConical,
  PackageCheck,
  Ban,
  ShieldCheck,
  User,
  Plus,
  CalendarDays,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets } from '@/redux/slices/ticketSlice';
import { activityDate, activityMs, buildRange, isInRange, DATE_BASIS } from '@/lib/ticketActivity';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   Skeleton key constants (stable, module-level)
───────────────────────────────────────────────────────────── */
const SKELETON_KEYS_6 = Array.from({ length: 6 }, (_, i) => i);
const SKELETON_KEYS_4 = Array.from({ length: 4 }, (_, i) => i);


/* ─────────────────────────────────────────────────────────────
   Spring presets
───────────────────────────────────────────────────────────── */
const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };
const SP_FAST = { type: 'spring' as const, stiffness: 400, damping: 30 };

/* ─────────────────────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────────────────────── */
function AnimatedNumber({ to }: { to: number }) {
  const raw = useMotionValue(0);
  const sprung = useSpring(raw, { stiffness: 75, damping: 18, restDelta: 0.5 });
  const display = useTransform(sprung, (v) => String(Math.round(v)));
  useEffect(() => { raw.set(to); }, [to, raw]);
  return <motion.span>{display}</motion.span>;
}

/* ─────────────────────────────────────────────────────────────
   Animation variants
───────────────────────────────────────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ...SP, delay: i * 0.065 },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { ...SP, stiffness: 200, damping: 20, delay: 0.25 + i * 0.1 },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { ...SP_FAST, delay: i * 0.055 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.065 } },
};

/* ─────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  numberColor: string;
  iconBg: string;
  iconColor: string;
  bar: string;
  loading: boolean;
  idx: number;
  /** Names the date this figure is measured by, when a range is active. */
  hint?: string;
}

function StatCard({ label, value, icon: Icon, numberColor, iconBg, iconColor, bar, loading, idx, hint }: StatCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      custom={idx}
      whileHover={{ y: -5, transition: SP_FAST }}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-xl border border-outline-variant/10 overflow-hidden cursor-default transition-shadow duration-300"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-technical mt-0.5">{label}</p>
          {hint && <p className="text-[10px] leading-tight text-on-surface-variant/60 mt-1">{hint}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <div className="h-10 w-20 bg-surface-container-high animate-pulse rounded-lg" />
      ) : (
        <p className={`text-4xl font-extrabold tabular-nums leading-none tracking-tight ${numberColor}`}>
          <AnimatedNumber to={value} />
        </p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section block
───────────────────────────────────────────────────────────── */
function SectionBlock({ bar, header, children }: { bar: string; header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm overflow-hidden">
      <div className={`h-[3px] ${bar}`} />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/10 bg-surface-container-low/60">
        {header}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Skeleton row
───────────────────────────────────────────────────────────── */
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex items-center gap-3 px-5 py-3.5"
    >
      <div className="h-8 w-8 rounded-xl bg-surface-container-high animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-3/5 bg-surface-container-high animate-pulse rounded-full" />
        <div className="h-2.5 w-2/5 bg-surface-container-high/70 animate-pulse rounded-full" />
      </div>
      <div className="h-5 w-16 bg-surface-container-high animate-pulse rounded-full shrink-0 hidden sm:block" />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Status config
───────────────────────────────────────────────────────────── */
function getStatusCfg(status: string) {
  switch (status) {
    case 'new':            return { Icon: AlertTriangle, color: 'text-yellow-600',        bg: 'bg-yellow-100',       dot: 'bg-yellow-400',    pill: 'bg-yellow-100 text-yellow-700',        label: 'New' };
    case 'assigned':       return { Icon: Ticket,        color: 'text-accent-orange-500', bg: 'bg-accent-orange-100',dot: 'bg-accent-orange-500', pill: 'bg-accent-orange-100 text-accent-orange-600', label: 'Assigned' };
    case 'in_progress':    return { Icon: Activity,      color: 'text-brand-400',         bg: 'bg-brand-100',        dot: 'bg-brand-400',     pill: 'bg-brand-100 text-brand-600',          label: 'In Progress' };
    case 'customer_pending': return { Icon: Clock,       color: 'text-purple-600',        bg: 'bg-purple-100',       dot: 'bg-purple-500',    pill: 'bg-purple-100 text-purple-700',        label: 'Cust. Pending' };
    case 'resolved':       return { Icon: CheckCircle2,  color: 'text-emerald-600',       bg: 'bg-emerald-500/10',   dot: 'bg-emerald-400',   pill: 'bg-emerald-500/12 text-emerald-700',   label: 'Resolved' };
    case 'tested':         return { Icon: FlaskConical,  color: 'text-cyan-600',          bg: 'bg-cyan-100',         dot: 'bg-cyan-500',      pill: 'bg-cyan-100 text-cyan-700',            label: 'Tested' };
    case 'delivered':      return { Icon: PackageCheck,  color: 'text-teal-600',          bg: 'bg-teal-100',         dot: 'bg-teal-500',      pill: 'bg-teal-100 text-teal-700',            label: 'Delivered' };
    case 'closed':         return { Icon: CheckCircle2,  color: 'text-emerald-700',       bg: 'bg-emerald-500/10',   dot: 'bg-emerald-600',   pill: 'bg-emerald-500/12 text-emerald-800',   label: 'Closed' };
    case 'not_related':    return { Icon: Ban,           color: 'text-slate-500',         bg: 'bg-slate-100',        dot: 'bg-slate-400',     pill: 'bg-slate-100 text-slate-600',          label: 'Not Related' };
    default:               return { Icon: AlertTriangle, color: 'text-yellow-600',        bg: 'bg-yellow-100',       dot: 'bg-yellow-400',    pill: 'bg-yellow-100 text-yellow-700',        label: status };
  }
}

/* ─────────────────────────────────────────────────────────────
   Breakdown list
───────────────────────────────────────────────────────────── */
interface BreakdownItem { label: string; value: number; bar: string; dot: string; text: string; }

function BreakdownList({ items, total, loading }: { items: BreakdownItem[]; total: number; loading: boolean }) {
  return (
    <div className="px-5 py-4 space-y-4">
      {items.map((item, i) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                <span className={`text-xs font-semibold ${item.text}`}>{item.label}</span>
              </div>
              {loading ? (
                <div className="h-4 w-7 bg-surface-container-highest animate-pulse rounded" />
              ) : (
                <span className="text-sm font-bold text-on-surface tabular-nums">{item.value}</span>
              )}
            </div>
            <div className="h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
              <motion.div
                className={`h-full ${item.bar} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: loading ? '0%' : `${pct}%` }}
                transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.5 + i * 0.1 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Customer Dashboard
───────────────────────────────────────────────────────────── */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, customerRole } = useAppSelector((state) => state.auth);
  const { tickets, loading: ticketsLoading } = useAppSelector((s) => s.tickets);

  const companyName = (user as any)?.companyName || '';
  const contactPerson = (user as any)?.contactPerson || 'there';

  /* ── Date filter ──
     Every status figure is measured by the date it reached that status (see
     activityDate), not by createdAt alone. So a ticket created 30/6 and resolved 5/7
     counts as resolved in a 1/7–10/7 range, a ticket delivered 5/7 counts as
     delivered, and so on for every status. The three totals stay on createdAt —
     they answer "how many tickets came in during the range". */
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params: Record<string, any> = { limit: 10000, includeSubTickets: true };
    if (companyName) params.companyName = companyName;
    dispatch(fetchTickets(params));
  }, [dispatch, companyName]);

  const range = useMemo(() => buildRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const inRange = useCallback((date?: string) => isInRange(range, date), [range]);

  // Tickets created in the range — basis for the three "what came in" totals.
  const createdTickets = useMemo(
    () => tickets.filter((t) => inRange(t.createdAt)),
    [tickets, inRange]
  );

  // Tickets that reached their current status inside the range — basis for every
  // per-status figure, whenever the ticket itself was created.
  const activityTickets = useMemo(
    () => tickets.filter((t) => inRange(activityDate(t))),
    [tickets, inRange]
  );

  // Every distinct ticket the range touches, most recent activity first.
  const shownTickets = useMemo(() => {
    if (!range.active) return tickets;
    const byId = new Map([...createdTickets, ...activityTickets].map((t) => [t._id, t]));
    return [...byId.values()].toSorted((a, b) => activityMs(b) - activityMs(a));
  }, [range.active, tickets, createdTickets, activityTickets]);

  // Quick presets — fill From/To relative to today (local date, yyyy-mm-dd).
  const applyPreset = (preset: 'today' | '7d' | '30d' | 'month' | 'year') => {
    const now = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const from =
      preset === 'today' ? new Date(now)
      : preset === '7d' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      : preset === '30d' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      : preset === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);
    setDateFrom(fmt(from));
    setDateTo(fmt(now));
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const main = activityTickets.filter((t) => !t.isSubTicket);
    const subs = activityTickets.filter((t) => t.isSubTicket);
    const byStatus = (arr: typeof tickets, s: string) => arr.filter((t) => t.status === s).length;
    return {
      total:           createdTickets.length,
      mainTickets:     createdTickets.filter((t) => !t.isSubTicket).length,
      subTicketsCount: createdTickets.filter((t) => t.isSubTicket).length,
      closed:          byStatus(main, 'closed'),
      resolved:        byStatus(main, 'resolved'),
      inProgress:      byStatus(main, 'in_progress'),
      new:             byStatus(main, 'new'),
      assigned:        byStatus(main, 'assigned'),
      customerPending: byStatus(main, 'customer_pending'),
      tested:          byStatus(main, 'tested'),
      delivered:       byStatus(main, 'delivered'),
      notRelated:      byStatus(main, 'not_related'),
      subNew:             byStatus(subs, 'new'),
      subAssigned:        byStatus(subs, 'assigned'),
      subInProgress:      byStatus(subs, 'in_progress'),
      subCustomerPending: byStatus(subs, 'customer_pending'),
      subResolved:        byStatus(subs, 'resolved'),
      subTested:          byStatus(subs, 'tested'),
      subDelivered:       byStatus(subs, 'delivered'),
      subClosed:          byStatus(subs, 'closed'),
      subNotRelated:      byStatus(subs, 'not_related'),
    };
  }, [createdTickets, activityTickets]);

  // Each status is dated by its own field, and 'reopened' has no card, so bars are
  // drawn as a share of what's actually charted rather than of the created-in-range total.
  const chartTotals = useMemo(() => ({
    main: stats.new + stats.assigned + stats.inProgress + stats.customerPending
        + stats.resolved + stats.tested + stats.delivered + stats.closed + stats.notRelated,
    sub:  stats.subNew + stats.subAssigned + stats.subInProgress + stats.subCustomerPending
        + stats.subResolved + stats.subTested + stats.subDelivered + stats.subClosed + stats.subNotRelated,
  }), [stats]);

  const metrics = useMemo(() => {
    const resolved = tickets.filter((t) => t.resolvedAt && t.createdAt && inRange(t.resolvedAt));
    const withResponse = tickets.filter((t) => t.firstResponseAt && t.createdAt && inRange(t.firstResponseAt));
    const avg = (arr: typeof tickets, field: 'firstResponseAt' | 'resolvedAt') =>
      arr.reduce((s, t) => s + new Date(t[field]!).getTime() - new Date(t.createdAt).getTime(), 0) / arr.length;
    return {
      response:   withResponse.length ? (avg(withResponse, 'firstResponseAt') / 3_600_000).toFixed(1) + ' hrs' : 'N/A',
      resolution: resolved.length ? (avg(resolved, 'resolvedAt') / 3_600_000).toFixed(1) + ' hrs' : 'N/A',
    };
  }, [tickets, inRange]);

  const recentlyClosed = useMemo(
    () => activityTickets
      .filter((t) => t.status === 'closed' || t.status === 'resolved')
      .toSorted((a, b) => activityMs(b) - activityMs(a))
      .slice(0, 5),
    [activityTickets]
  );

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const basis = (status: string) => (range.active ? DATE_BASIS[status] : undefined);

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8 w-full max-w-full overflow-x-hidden">

      {/* ── Header ── */}
      <motion.div
        className="flex flex-wrap items-start justify-between gap-3 mb-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SP, delay: 0 }}
      >
        <div>
          <h1 className="display-sm text-on-surface">Welcome back, {contactPerson}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            {companyName && <span className="text-sm text-on-surface-variant">{companyName}</span>}
            {customerRole === 'company_admin' ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Company Admin
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                <User className="h-3 w-3" /> Company User
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 shadow-sm text-xs font-medium text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {today}
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => navigate('/tickets/new')}>
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Button>
        </div>
      </motion.div>

      {/* ── Date filter ── */}
      <motion.div
        className="mb-7 p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SP, delay: 0.05 }}
      >
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {/* Title */}
          <div className="flex items-center gap-2 h-10 text-on-surface-variant">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">Filter by date</span>
          </div>

          {/* From */}
          <div className="space-y-1 w-36">
            <label className="text-xs text-on-surface-variant" htmlFor="cust-date-from">From</label>
            <Input
              id="cust-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="[color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* To */}
          <div className="space-y-1 w-36">
            <label className="text-xs text-on-surface-variant" htmlFor="cust-date-to">To</label>
            <Input
              id="cust-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="[color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 h-10">
            {([
              { key: 'today', label: 'Today' },
              { key: '7d', label: 'Last 7d' },
              { key: '30d', label: 'Last 30d' },
              { key: 'month', label: 'This Month' },
              { key: 'year', label: 'This Year' },
            ] as const).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                className="px-3 h-8 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-brand-100 hover:text-brand-700 transition-colors"
              >
                {p.label}
              </button>
            ))}
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs font-semibold bg-accent-orange-100 text-accent-orange-600 hover:bg-accent-orange-200 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Count */}
          <div className="ml-auto h-10 flex items-center text-xs text-on-surface-variant whitespace-nowrap">
            Showing{' '}
            <span className="font-bold text-on-surface tabular-nums mx-1">{shownTickets.length}</span>{' '}
            ticket{shownTickets.length !== 1 ? 's' : ''}
            {range.active && <span className="ml-1">created or updated in this range</span>}
          </div>
        </div>
      </motion.div>

      {/* ── Empty date-range notice ── */}
      {!ticketsLoading && range.active && shownTickets.length === 0 && (
        <motion.div
          className="mb-7 p-4 rounded-2xl bg-accent-orange-50 border border-accent-orange-200 text-accent-orange-700 text-sm flex items-center gap-2"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            No tickets were <strong>created or updated</strong> in the selected date range. Try a wider range (e.g. “This Year”) or click <strong>Clear</strong> to see all tickets.
          </span>
        </motion.div>
      )}

      {/* ── Stat cards ── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="All Tickets"     value={stats.total}             icon={Layers}       numberColor="text-brand-500"          iconBg="bg-brand-100"               iconColor="text-brand-600"           bar="bg-brand-500"          loading={ticketsLoading} idx={0}  hint={basis('new')} />
        <StatCard label="Tickets"         value={stats.mainTickets}       icon={Ticket}       numberColor="text-brand-600"          iconBg="bg-brand-50"                iconColor="text-brand-500"           bar="bg-brand-600"          loading={ticketsLoading} idx={1}  hint={basis('new')} />
        <StatCard label="Sub Tickets"     value={stats.subTicketsCount}   icon={GitBranch}    numberColor="text-violet-600"         iconBg="bg-violet-100"              iconColor="text-violet-600"          bar="bg-violet-500"         loading={ticketsLoading} idx={2}  hint={basis('new')} />
        <StatCard label="New"             value={stats.new}               icon={AlertTriangle} numberColor="text-yellow-700"        iconBg="bg-yellow-100"              iconColor="text-yellow-600"          bar="bg-yellow-400"         loading={ticketsLoading} idx={3}  hint={basis('new')} />
        <StatCard label="In Progress"     value={stats.inProgress}        icon={Activity}     numberColor="text-brand-400"          iconBg="bg-brand-50"                iconColor="text-brand-400"           bar="bg-brand-400"          loading={ticketsLoading} idx={4}  hint={basis('in_progress')} />
        <StatCard label="Assigned"        value={stats.assigned}          icon={Ticket}       numberColor="text-accent-orange-500"  iconBg="bg-accent-orange-100"       iconColor="text-accent-orange-500"   bar="bg-accent-orange-500"  loading={ticketsLoading} idx={5}  hint={basis('assigned')} />
        <StatCard label="Cust. Pending"   value={stats.customerPending}   icon={Clock}        numberColor="text-purple-600"         iconBg="bg-purple-100"              iconColor="text-purple-600"          bar="bg-purple-500"         loading={ticketsLoading} idx={6}  hint={basis('customer_pending')} />
        <StatCard label="Closed"          value={stats.closed}            icon={CheckCircle2} numberColor="text-emerald-600"        iconBg="bg-emerald-100"             iconColor="text-emerald-600"         bar="bg-emerald-500"        loading={ticketsLoading} idx={7}  hint={basis('closed')} />
        <StatCard label="Resolved"        value={stats.resolved}          icon={TrendingUp}   numberColor="text-emerald-700"        iconBg="bg-green-100"               iconColor="text-emerald-700"         bar="bg-emerald-400"        loading={ticketsLoading} idx={8}  hint={basis('resolved')} />
        <StatCard label="Tested"          value={stats.tested}            icon={FlaskConical} numberColor="text-cyan-600"           iconBg="bg-cyan-100"                iconColor="text-cyan-600"            bar="bg-cyan-500"           loading={ticketsLoading} idx={9}  hint={basis('tested')} />
        <StatCard label="Delivered"       value={stats.delivered}         icon={PackageCheck} numberColor="text-teal-600"           iconBg="bg-teal-100"                iconColor="text-teal-600"            bar="bg-teal-500"           loading={ticketsLoading} idx={10} hint={basis('delivered')} />
        <StatCard label="Not Related"     value={stats.notRelated}        icon={Ban}          numberColor="text-slate-600"          iconBg="bg-slate-100"               iconColor="text-slate-600"           bar="bg-slate-500"          loading={ticketsLoading} idx={11} hint={basis('not_related')} />
      </motion.div>

      {/* ── Main 2-col layout ── */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">

        {/* ─ Primary column ─ */}
        <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">

          {/* Distribution */}
          <motion.div variants={sectionVariants} custom={0}>
            <SectionBlock
              bar="bg-gradient-to-r from-yellow-400 via-accent-orange-400 via-brand-400 to-emerald-500"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-on-surface-variant" />
                    <span className="text-sm font-semibold text-on-surface">Ticket Distribution</span>
                  </div>
                  {!ticketsLoading && chartTotals.main > 0 && (
                    <span className="label-technical bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/20">
                      {chartTotals.main} total
                    </span>
                  )}
                </>
              }
            >
              <div className="px-5 py-4 space-y-4">
                {ticketsLoading ? (
                  <>
                    <div className="h-4 w-full bg-surface-container-high animate-pulse rounded-full" />
                    <div className="grid grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((i) => <div key={i} className="h-4 bg-surface-container-high animate-pulse rounded-full" />)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-4 rounded-full overflow-hidden gap-1 bg-surface-container-highest">
                      {[
                        { v: stats.new,             color: 'bg-yellow-400' },
                        { v: stats.assigned,        color: 'bg-accent-orange-500' },
                        { v: stats.inProgress,      color: 'bg-brand-400' },
                        { v: stats.customerPending, color: 'bg-purple-500' },
                        { v: stats.resolved,        color: 'bg-emerald-400' },
                        { v: stats.tested,          color: 'bg-cyan-500' },
                        { v: stats.delivered,       color: 'bg-teal-500' },
                        { v: stats.closed,          color: 'bg-emerald-600' },
                        { v: stats.notRelated,      color: 'bg-slate-500' },
                      ].filter((s) => s.v > 0).map((seg, i) => (
                        <motion.div
                          key={seg.color}
                          className={`${seg.color} first:rounded-l-full last:rounded-r-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${chartTotals.main > 0 ? (seg.v / chartTotals.main) * 100 : 0}%` }}
                          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.4 + i * 0.07 }}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                      {[
                        { label: 'New',           v: stats.new,             dot: 'bg-yellow-400',        text: 'text-yellow-700' },
                        { label: 'Assigned',      v: stats.assigned,        dot: 'bg-accent-orange-500', text: 'text-accent-orange-600' },
                        { label: 'In Progress',   v: stats.inProgress,      dot: 'bg-brand-400',         text: 'text-brand-600' },
                        { label: 'Cust. Pending', v: stats.customerPending, dot: 'bg-purple-500',        text: 'text-purple-600' },
                        { label: 'Resolved',      v: stats.resolved,        dot: 'bg-emerald-400',       text: 'text-emerald-600' },
                        { label: 'Tested',        v: stats.tested,          dot: 'bg-cyan-500',          text: 'text-cyan-600' },
                        { label: 'Delivered',     v: stats.delivered,       dot: 'bg-teal-500',          text: 'text-teal-600' },
                        { label: 'Closed',        v: stats.closed,          dot: 'bg-emerald-600',       text: 'text-emerald-700' },
                        { label: 'Not Related',   v: stats.notRelated,      dot: 'bg-slate-500',         text: 'text-slate-600' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.dot}`} />
                          <span className="text-xs text-on-surface-variant flex-1">{item.label}</span>
                          <span className={`text-xs font-bold tabular-nums ${item.text}`}>{item.v}</span>
                          <span className="text-[10px] text-on-surface-variant/50 tabular-nums">
                            {chartTotals.main > 0 ? Math.round((item.v / chartTotals.main) * 100) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </SectionBlock>
          </motion.div>

          {/* Recent Activities */}
          <motion.div variants={sectionVariants} custom={1}>
            <SectionBlock
              bar="bg-brand-400"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-brand-500" />
                    <span className="text-sm font-semibold text-on-surface">Recent Activities</span>
                  </div>
                  {!ticketsLoading && shownTickets.length > 0 && (
                    <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2.5 py-1 rounded-full">
                      {Math.min(shownTickets.length, 8)} tickets
                    </span>
                  )}
                </>
              }
            >
              <motion.div variants={stagger} initial="hidden" animate="visible" className="divide-y divide-outline-variant/8">
                {ticketsLoading
                  ? SKELETON_KEYS_6.map((k) => <SkeletonRow key={k} delay={k * 0.05} />)
                  : shownTickets.length === 0
                  ? <p className="text-center py-12 text-sm text-on-surface-variant">No recent activities</p>
                  : shownTickets.slice(0, 8).map((ticket, i) => {
                      const cfg = getStatusCfg(ticket.status);
                      return (
                        <motion.div
                          key={ticket._id}
                          variants={rowVariants}
                          custom={i}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-150 cursor-default"
                        >
                          <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <div className={`p-2 rounded-xl shrink-0 ${cfg.bg}`}>
                            <cfg.Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-on-surface truncate">{ticket.subject}</p>
                            <p className="text-xs text-on-surface-variant font-mono mt-0.5">{ticket.ticketNumber}</p>
                          </div>
                          <span className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.pill}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-on-surface-variant shrink-0 hidden md:block">
                            {new Date(activityDate(ticket)).toLocaleDateString()}
                          </span>
                        </motion.div>
                      );
                    })}
              </motion.div>
            </SectionBlock>
          </motion.div>

          {/* Recently Closed */}
          <motion.div variants={sectionVariants} custom={2}>
            <SectionBlock
              bar="bg-emerald-500"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-on-surface">Recently Closed</span>
                  </div>
                  {!ticketsLoading && recentlyClosed.length > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {recentlyClosed.length} tickets
                    </span>
                  )}
                </>
              }
            >
              <motion.div variants={stagger} initial="hidden" animate="visible" className="divide-y divide-outline-variant/8">
                {ticketsLoading
                  ? SKELETON_KEYS_4.map((k) => <SkeletonRow key={k} delay={k * 0.05} />)
                  : recentlyClosed.length === 0
                  ? <p className="text-center py-10 text-sm text-on-surface-variant">No closed tickets yet</p>
                  : recentlyClosed.map((ticket, i) => (
                      <motion.div
                        key={ticket._id}
                        variants={rowVariants}
                        custom={i}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-150 cursor-default"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{ticket.subject}</p>
                          <p className="text-xs text-on-surface-variant font-mono mt-0.5">{ticket.ticketNumber}</p>
                        </div>
                        <span className="text-xs text-on-surface-variant shrink-0 hidden sm:block">
                          {new Date(activityDate(ticket)).toLocaleDateString()}
                        </span>
                      </motion.div>
                    ))}
              </motion.div>
            </SectionBlock>
          </motion.div>

        </motion.div>

        {/* ─ Sidebar ─ */}
        <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">

          {/* Performance */}
          <motion.div variants={sectionVariants} custom={1}>
            <SectionBlock
              bar="bg-brand-500"
              header={
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-500" />
                  <span className="text-sm font-semibold text-on-surface">Performance</span>
                </div>
              }
            >
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container">
                  <div className="p-2 rounded-lg bg-brand-100 shrink-0">
                    <Zap className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="label-technical mb-0.5">Avg Response</p>
                    {ticketsLoading ? (
                      <div className="h-6 w-20 bg-surface-container-highest animate-pulse rounded" />
                    ) : (
                      <p className="text-lg font-bold text-on-surface tabular-nums">{metrics.response}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container">
                  <div className="p-2 rounded-lg bg-accent-orange-100 shrink-0">
                    <Clock className="h-4 w-4 text-accent-orange-500" />
                  </div>
                  <div>
                    <p className="label-technical mb-0.5">Avg Resolution</p>
                    {ticketsLoading ? (
                      <div className="h-6 w-20 bg-surface-container-highest animate-pulse rounded" />
                    ) : (
                      <p className="text-lg font-bold text-on-surface tabular-nums">{metrics.resolution}</p>
                    )}
                  </div>
                </div>
              </div>
            </SectionBlock>
          </motion.div>

          {/* Main Tickets Breakdown */}
          <motion.div variants={sectionVariants} custom={2}>
            <SectionBlock
              bar="bg-brand-500"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-brand-500" />
                    <span className="text-sm font-semibold text-on-surface">Main Tickets</span>
                  </div>
                  {!ticketsLoading && (
                    <span className="label-technical bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/20">
                      {chartTotals.main} total
                    </span>
                  )}
                </>
              }
            >
              <BreakdownList
                items={[
                  { label: 'New',           value: stats.new,             bar: 'bg-yellow-400',        dot: 'bg-yellow-400',        text: 'text-yellow-700' },
                  { label: 'Assigned',      value: stats.assigned,        bar: 'bg-accent-orange-500', dot: 'bg-accent-orange-500', text: 'text-accent-orange-600' },
                  { label: 'In Progress',   value: stats.inProgress,      bar: 'bg-brand-400',         dot: 'bg-brand-400',         text: 'text-brand-600' },
                  { label: 'Cust. Pending', value: stats.customerPending, bar: 'bg-purple-500',        dot: 'bg-purple-500',        text: 'text-purple-600' },
                  { label: 'Resolved',      value: stats.resolved,        bar: 'bg-emerald-400',       dot: 'bg-emerald-400',       text: 'text-emerald-600' },
                  { label: 'Tested',        value: stats.tested,          bar: 'bg-cyan-500',          dot: 'bg-cyan-500',          text: 'text-cyan-600' },
                  { label: 'Delivered',     value: stats.delivered,       bar: 'bg-teal-500',          dot: 'bg-teal-500',          text: 'text-teal-600' },
                  { label: 'Closed',        value: stats.closed,          bar: 'bg-emerald-600',       dot: 'bg-emerald-600',       text: 'text-emerald-700' },
                  { label: 'Not Related',   value: stats.notRelated,      bar: 'bg-slate-500',         dot: 'bg-slate-500',         text: 'text-slate-600' },
                ]}
                total={chartTotals.main}
                loading={ticketsLoading}
              />
            </SectionBlock>
          </motion.div>

          {/* Sub Tickets Breakdown */}
          <motion.div variants={sectionVariants} custom={3}>
            <SectionBlock
              bar="bg-violet-500"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-semibold text-on-surface">Sub Tickets</span>
                  </div>
                  {!ticketsLoading && (
                    <span className="label-technical bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/20">
                      {chartTotals.sub} total
                    </span>
                  )}
                </>
              }
            >
              <BreakdownList
                items={[
                  { label: 'New',           value: stats.subNew,             bar: 'bg-yellow-400',        dot: 'bg-yellow-400',        text: 'text-yellow-700' },
                  { label: 'Assigned',      value: stats.subAssigned,        bar: 'bg-accent-orange-500', dot: 'bg-accent-orange-500', text: 'text-accent-orange-600' },
                  { label: 'In Progress',   value: stats.subInProgress,      bar: 'bg-brand-400',         dot: 'bg-brand-400',         text: 'text-brand-600' },
                  { label: 'Cust. Pending', value: stats.subCustomerPending, bar: 'bg-purple-500',        dot: 'bg-purple-500',        text: 'text-purple-600' },
                  { label: 'Resolved',      value: stats.subResolved,        bar: 'bg-emerald-400',       dot: 'bg-emerald-400',       text: 'text-emerald-600' },
                  { label: 'Tested',        value: stats.subTested,          bar: 'bg-cyan-500',          dot: 'bg-cyan-500',          text: 'text-cyan-600' },
                  { label: 'Delivered',     value: stats.subDelivered,       bar: 'bg-teal-500',          dot: 'bg-teal-500',          text: 'text-teal-600' },
                  { label: 'Closed',        value: stats.subClosed,          bar: 'bg-emerald-600',       dot: 'bg-emerald-600',       text: 'text-emerald-700' },
                  { label: 'Not Related',   value: stats.subNotRelated,      bar: 'bg-slate-500',         dot: 'bg-slate-500',         text: 'text-slate-600' },
                ]}
                total={chartTotals.sub}
                loading={ticketsLoading}
              />
            </SectionBlock>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
