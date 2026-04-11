import {
  Ticket,
  Users,
  CheckCircle2,
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchTickets } from "@/redux/slices/ticketSlice";
import { fetchCustomers } from "@/redux/slices/customerSlice";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   Spring presets
───────────────────────────────────────────────────────────── */
const SP = { type: "spring" as const, stiffness: 260, damping: 22 };
const SP_FAST = { type: "spring" as const, stiffness: 400, damping: 30 };

/* ─────────────────────────────────────────────────────────────
   Animated counter — Framer Motion spring-based
───────────────────────────────────────────────────────────── */
function AnimatedNumber({ to }: { to: number }) {
  const raw = useMotionValue(0);
  const sprung = useSpring(raw, { stiffness: 75, damping: 18, restDelta: 0.5 });
  const display = useTransform(sprung, (v) => String(Math.round(v)));

  useEffect(() => {
    raw.set(to);
  }, [to, raw]);

  return <motion.span>{display}</motion.span>;
}

/* ─────────────────────────────────────────────────────────────
   Animation variants
───────────────────────────────────────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SP, delay: i * 0.065 },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...SP, stiffness: 200, damping: 20, delay: 0.25 + i * 0.1 },
  }),
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
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
}

function StatCard({
  label,
  value,
  icon: Icon,
  numberColor,
  iconBg,
  iconColor,
  bar,
  loading,
  idx,
}: StatCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      custom={idx}
      whileHover={{ y: -5, transition: SP_FAST }}
      className="group relative flex flex-col gap-4 p-5 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-xl border border-outline-variant/10 overflow-hidden cursor-default transition-shadow duration-300"
    >
      {/* Top accent bar */}
      <div className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} />

      {/* Label + icon row */}
      <div className="flex items-start justify-between gap-2">
        <p className="label-technical mt-0.5">{label}</p>
        <div
          className={`p-2.5 rounded-xl ${iconBg} shrink-0 group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-10 w-20 bg-surface-container-high animate-pulse rounded-lg" />
      ) : (
        <p
          className={`text-4xl font-extrabold tabular-nums leading-none tracking-tight ${numberColor}`}
        >
          <AnimatedNumber to={value} />
        </p>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Section block (replaces Card to give full visual control)
───────────────────────────────────────────────────────────── */
function SectionBlock({
  bar,
  header,
  children,
}: {
  bar: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
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
   Status config helper
───────────────────────────────────────────────────────────── */
function getStatusCfg(status: string) {
  switch (status) {
    case "closed":
    case "resolved":
      return {
        Icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-500/10",
        dot: "bg-emerald-500",
        pill: "bg-emerald-500/12 text-emerald-700",
        label: status === "resolved" ? "Resolved" : "Closed",
      };
    case "in_progress":
      return {
        Icon: Activity,
        color: "text-brand-400",
        bg: "bg-brand-100",
        dot: "bg-brand-400",
        pill: "bg-brand-100 text-brand-600",
        label: "In Progress",
      };
    case "assigned":
      return {
        Icon: Ticket,
        color: "text-accent-orange-500",
        bg: "bg-accent-orange-100",
        dot: "bg-accent-orange-500",
        pill: "bg-accent-orange-100 text-accent-orange-600",
        label: "Assigned",
      };
    default:
      return {
        Icon: AlertTriangle,
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        dot: "bg-yellow-400",
        pill: "bg-yellow-100 text-yellow-700",
        label: "New",
      };
  }
}

/* ─────────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const dispatch = useAppDispatch();
  const {
    tickets,
    loading: ticketsLoading,
  } = useAppSelector((s) => s.tickets);
  const { total: totalCustomers, loading: customersLoading } =
    useAppSelector((s) => s.customers);

  useEffect(() => {
    dispatch(fetchTickets({ limit: 10000 }));
    dispatch(fetchCustomers());
  }, [dispatch]);

  /* ── Derived data ── */
  const stats = useMemo(() => {
    const closed = tickets.filter((t) => t.status === "closed").length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    const inProgress = tickets.filter((t) => t.status === "in_progress").length;
    const newT = tickets.filter((t) => t.status === "new").length;
    const assigned = tickets.filter((t) => t.status === "assigned").length;
    const total = tickets.length;
    return { total, closed, resolved, inProgress, new: newT, assigned };
  }, [tickets]);

  const metrics = useMemo(() => {
    const resolved = tickets.filter((t) => t.resolvedAt && t.createdAt);
    if (!resolved.length)
      return { response: "N/A", resolution: "N/A", totalResolved: 0 };

    const withResponse = tickets.filter((t) => t.firstResponseAt && t.createdAt);
    const avgResponseMs = withResponse.length
      ? withResponse.reduce(
          (s, t) =>
            s +
            new Date(t.firstResponseAt!).getTime() -
            new Date(t.createdAt).getTime(),
          0
        ) / withResponse.length
      : 0;

    const avgResMs =
      resolved.reduce(
        (s, t) =>
          s +
          new Date(t.resolvedAt!).getTime() -
          new Date(t.createdAt).getTime(),
        0
      ) / resolved.length;

    return {
      response: (avgResponseMs / 3_600_000).toFixed(1) + " hrs",
      resolution: (avgResMs / 3_600_000).toFixed(1) + " hrs",
      totalResolved: resolved.length,
    };
  }, [tickets]);

  const recentlyClosed = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "closed" || t.status === "resolved")
        .sort(
          (a, b) =>
            new Date(b.resolvedAt || b.closedAt || b.updatedAt).getTime() -
            new Date(a.resolvedAt || a.closedAt || a.updatedAt).getTime()
        )
        .slice(0, 5),
    [tickets]
  );

  const resolutionRate =
    stats.total > 0
      ? Math.round(((stats.closed + stats.resolved) / stats.total) * 100)
      : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  /* ── Render ── */
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
          <h1 className="display-sm text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Monitor your ticketing system at a glance
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/20 shadow-sm text-xs font-medium text-on-surface-variant">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {today}
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <StatCard label="Total Tickets"   value={stats.total}          icon={Ticket}       numberColor="text-brand-500"         iconBg="bg-brand-100"               iconColor="text-brand-600"           bar="bg-brand-500"          loading={ticketsLoading}   idx={0} />
        <StatCard label="New"             value={stats.new}            icon={AlertTriangle} numberColor="text-yellow-700"       iconBg="bg-yellow-100"              iconColor="text-yellow-600"          bar="bg-yellow-400"         loading={ticketsLoading}   idx={1} />
        <StatCard label="In Progress"     value={stats.inProgress}     icon={Activity}      numberColor="text-brand-400"        iconBg="bg-brand-50"                iconColor="text-brand-400"           bar="bg-brand-400"          loading={ticketsLoading}   idx={2} />
        <StatCard label="Customers"       value={totalCustomers}       icon={Users}         numberColor="text-brand-700"        iconBg="bg-brand-100"               iconColor="text-brand-700"           bar="bg-brand-700"          loading={customersLoading} idx={3} />
        <StatCard label="Assigned"        value={stats.assigned}       icon={Ticket}        numberColor="text-accent-orange-500" iconBg="bg-accent-orange-100"      iconColor="text-accent-orange-500"   bar="bg-accent-orange-500"  loading={ticketsLoading}   idx={4} />
        <StatCard label="Closed"          value={stats.closed}         icon={CheckCircle2}  numberColor="text-emerald-600"      iconBg="bg-emerald-100"             iconColor="text-emerald-600"         bar="bg-emerald-500"        loading={ticketsLoading}   idx={5} />
        <StatCard label="Resolved"        value={stats.resolved}        icon={TrendingUp}   numberColor="text-emerald-700"      iconBg="bg-green-100"               iconColor="text-emerald-700"         bar="bg-emerald-400"        loading={ticketsLoading}   idx={6} />

        {/* Resolution rate — inline highlight card */}
        <motion.div
          variants={cardVariants}
          custom={7}
          whileHover={{ y: -5, transition: SP_FAST }}
          className="relative flex flex-col gap-4 p-5 rounded-2xl overflow-hidden cursor-default shadow-sm hover:shadow-xl transition-shadow duration-300"
          style={{
            background: "linear-gradient(135deg, #003A8F 0%, #001F4D 100%)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-white/30" />
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60 mt-0.5">
              Resolution Rate
            </p>
            <div className="p-2.5 rounded-xl bg-white/10 shrink-0">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>
          {ticketsLoading ? (
            <div className="h-10 w-20 bg-white/10 animate-pulse rounded-lg" />
          ) : (
            <div className="flex items-end gap-1">
              <p className="text-4xl font-extrabold tabular-nums leading-none tracking-tight text-white">
                {resolutionRate}
              </p>
              <span className="text-xl font-bold text-white/60 mb-0.5">%</span>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Main 2-col layout ── */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">

        {/* ─ Primary column ─ */}
        <motion.div
          className="space-y-5"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >

          {/* Distribution */}
          <motion.div variants={sectionVariants} custom={0}>
            <SectionBlock
              bar="bg-gradient-to-r from-yellow-400 via-accent-orange-400 via-brand-400 to-emerald-500"
              header={
                <>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-on-surface-variant" />
                    <span className="text-sm font-semibold text-on-surface">
                      Ticket Distribution
                    </span>
                  </div>
                  {!ticketsLoading && stats.total > 0 && (
                    <span className="label-technical bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/20">
                      {stats.total} total
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
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="h-4 bg-surface-container-high animate-pulse rounded-full" />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Bar */}
                    <div className="flex h-4 rounded-full overflow-hidden gap-1 bg-surface-container-highest">
                      {[
                        { v: stats.new, color: "bg-yellow-400" },
                        { v: stats.assigned, color: "bg-accent-orange-500" },
                        { v: stats.inProgress, color: "bg-brand-400" },
                        { v: stats.resolved, color: "bg-emerald-400" },
                        { v: stats.closed, color: "bg-emerald-600" },
                      ]
                        .filter((s) => s.v > 0)
                        .map((seg, i) => (
                          <motion.div
                            key={i}
                            className={`${seg.color} first:rounded-l-full last:rounded-r-full`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${stats.total > 0 ? (seg.v / stats.total) * 100 : 0}%`,
                            }}
                            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.4 + i * 0.07 }}
                          />
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                      {[
                        { label: "New",         v: stats.new,        dot: "bg-yellow-400",       text: "text-yellow-700" },
                        { label: "Assigned",    v: stats.assigned,   dot: "bg-accent-orange-500", text: "text-accent-orange-600" },
                        { label: "In Progress", v: stats.inProgress, dot: "bg-brand-400",         text: "text-brand-600" },
                        { label: "Resolved",    v: stats.resolved,   dot: "bg-emerald-400",       text: "text-emerald-600" },
                        { label: "Closed",      v: stats.closed,     dot: "bg-emerald-600",       text: "text-emerald-700" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.dot}`} />
                          <span className="text-xs text-on-surface-variant flex-1">
                            {item.label}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${item.text}`}>
                            {item.v}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/50 tabular-nums">
                            {stats.total > 0
                              ? Math.round((item.v / stats.total) * 100)
                              : 0}
                            %
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
                    <span className="text-sm font-semibold text-on-surface">
                      Recent Activities
                    </span>
                  </div>
                  {!ticketsLoading && tickets.length > 0 && (
                    <span className="text-xs font-semibold text-brand-600 bg-brand-100 px-2.5 py-1 rounded-full">
                      {Math.min(tickets.length, 8)} tickets
                    </span>
                  )}
                </>
              }
            >
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-outline-variant/8"
              >
                {ticketsLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} delay={i * 0.05} />
                    ))
                  : tickets.length === 0
                  ? (
                    <p className="text-center py-12 text-sm text-on-surface-variant">
                      No recent activities
                    </p>
                  )
                  : tickets.slice(0, 8).map((ticket, i) => {
                      const cfg = getStatusCfg(ticket.status);
                      return (
                        <motion.div
                          key={ticket._id}
                          variants={rowVariants}
                          custom={i}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-container-low transition-colors duration-150 cursor-default"
                        >
                          {/* Status dot */}
                          <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />

                          {/* Icon */}
                          <div className={`p-2 rounded-xl shrink-0 ${cfg.bg}`}>
                            <cfg.Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-on-surface truncate">
                              {ticket.subject}
                            </p>
                            <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                              {ticket.ticketNumber}
                            </p>
                          </div>

                          <span
                            className={`hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.pill}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-xs text-on-surface-variant shrink-0 hidden md:block">
                            {new Date(ticket.createdAt).toLocaleDateString()}
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
                    <span className="text-sm font-semibold text-on-surface">
                      Recently Closed
                    </span>
                  </div>
                  {!ticketsLoading && recentlyClosed.length > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      {recentlyClosed.length} tickets
                    </span>
                  )}
                </>
              }
            >
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="divide-y divide-outline-variant/8"
              >
                {ticketsLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonRow key={i} delay={i * 0.05} />
                    ))
                  : recentlyClosed.length === 0
                  ? (
                    <p className="text-center py-10 text-sm text-on-surface-variant">
                      No closed tickets yet
                    </p>
                  )
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
                          <p className="text-sm font-medium text-on-surface truncate">
                            {ticket.subject}
                          </p>
                          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                            {ticket.ticketNumber}
                          </p>
                        </div>
                        <span className="text-xs text-on-surface-variant shrink-0 hidden sm:block">
                          {new Date(
                            ticket.resolvedAt ||
                              ticket.closedAt ||
                              ticket.updatedAt
                          ).toLocaleDateString()}
                        </span>
                      </motion.div>
                    ))}
              </motion.div>
            </SectionBlock>
          </motion.div>
        </motion.div>

        {/* ─ Sidebar ─ */}
        <motion.div
          className="space-y-5"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >

          {/* Resolution Rate */}
          <motion.div variants={sectionVariants} custom={0}>
            <SectionBlock
              bar="bg-emerald-500"
              header={
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-on-surface">
                    Resolution Rate
                  </span>
                </div>
              }
            >
              <div className="px-5 py-5 space-y-4">
                {ticketsLoading ? (
                  <>
                    <div className="h-14 w-32 bg-surface-container-high animate-pulse rounded-xl" />
                    <div className="h-3 w-full bg-surface-container-high animate-pulse rounded-full" />
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-extrabold text-emerald-600 tabular-nums leading-none tracking-tight">
                        <AnimatedNumber to={resolutionRate} />
                      </span>
                      <span className="text-2xl font-bold text-emerald-600/50 mb-1">%</span>
                    </div>
                    <div className="h-3 rounded-full bg-surface-container-highest overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${resolutionRate}%` }}
                        transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.5 }}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      <span className="font-bold text-on-surface">{stats.closed}</span> of{" "}
                      <span className="font-bold text-on-surface">{stats.total}</span>{" "}
                      tickets resolved
                    </p>
                  </>
                )}
              </div>
            </SectionBlock>
          </motion.div>

          {/* Performance */}
          <motion.div variants={sectionVariants} custom={1}>
            <SectionBlock
              bar="bg-brand-500"
              header={
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-500" />
                  <span className="text-sm font-semibold text-on-surface">
                    Performance
                  </span>
                </div>
              }
            >
              <div className="px-5 py-4 space-y-3">
                {/* Response time */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container">
                  <div className="p-2 rounded-lg bg-brand-100 shrink-0">
                    <Zap className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="label-technical mb-0.5">Avg Response</p>
                    {ticketsLoading ? (
                      <div className="h-6 w-20 bg-surface-container-highest animate-pulse rounded" />
                    ) : (
                      <p className="text-lg font-bold text-on-surface tabular-nums">
                        {metrics.response}
                      </p>
                    )}
                  </div>
                </div>
                {/* Resolution time */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-container">
                  <div className="p-2 rounded-lg bg-accent-orange-100 shrink-0">
                    <Clock className="h-4 w-4 text-accent-orange-500" />
                  </div>
                  <div>
                    <p className="label-technical mb-0.5">Avg Resolution</p>
                    {ticketsLoading ? (
                      <div className="h-6 w-20 bg-surface-container-highest animate-pulse rounded" />
                    ) : (
                      <p className="text-lg font-bold text-on-surface tabular-nums">
                        {metrics.resolution}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionBlock>
          </motion.div>

          {/* Active Breakdown */}
          <motion.div variants={sectionVariants} custom={2}>
            <SectionBlock
              bar="bg-accent-orange-500"
              header={
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-orange-500" />
                  <span className="text-sm font-semibold text-on-surface">
                    Active Breakdown
                  </span>
                </div>
              }
            >
              <div className="px-5 py-4 space-y-4">
                {[
                  {
                    label: "New",
                    value: stats.new,
                    bar: "bg-yellow-400",
                    dot: "bg-yellow-400",
                    text: "text-yellow-700",
                  },
                  {
                    label: "Assigned",
                    value: stats.assigned,
                    bar: "bg-accent-orange-500",
                    dot: "bg-accent-orange-500",
                    text: "text-accent-orange-600",
                  },
                  {
                    label: "In Progress",
                    value: stats.inProgress,
                    bar: "bg-brand-400",
                    dot: "bg-brand-400",
                    text: "text-brand-600",
                  },
                ].map((item, i) => {
                  const activeTotal =
                    stats.new + stats.assigned + stats.inProgress;
                  const pct =
                    activeTotal > 0 ? (item.value / activeTotal) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${item.dot}`} />
                          <span className={`text-xs font-semibold ${item.text}`}>
                            {item.label}
                          </span>
                        </div>
                        {ticketsLoading ? (
                          <div className="h-4 w-7 bg-surface-container-highest animate-pulse rounded" />
                        ) : (
                          <span className="text-sm font-bold text-on-surface tabular-nums">
                            {item.value}
                          </span>
                        )}
                      </div>
                      <div className="h-2.5 rounded-full bg-surface-container-highest overflow-hidden">
                        <motion.div
                          className={`h-full ${item.bar} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{
                            width: ticketsLoading ? "0%" : `${pct}%`,
                          }}
                          transition={{
                            duration: 1,
                            ease: [0.23, 1, 0.32, 1],
                            delay: 0.5 + i * 0.1,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBlock>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
