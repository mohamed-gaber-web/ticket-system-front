import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchLeadStats, fetchLeads } from '@/redux/slices/teleSalesLeadsSlice';
import * as teleSalesApi from '@/api/teleSalesApi';
import { PhoneLink } from '@/components/PhoneLink';
import type { FollowUp, LeadStatus } from '@/types/teleSales.types';
import { STATUS_COLORS, LEAD_STATUS_WORKFLOW, LEAD_STATUSES, STEPS } from '@/config/leadStatusWorkflow';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  PhoneCall,
  PhoneOff,
  Clock3,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  CalendarClock,
  FileText,
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ArrowRight,
  Users,
  Wallet,
  Target,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Spring presets — matches the main Tickets dashboard's motion language.
───────────────────────────────────────────────────────────── */
const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };
const SP_FAST = { type: 'spring' as const, stiffness: 400, damping: 30 };

/* ─────────────────────────────────────────────────────────────
   Animated counter — Framer Motion spring-based
───────────────────────────────────────────────────────────── */
function AnimatedNumber({ to, format }: { to: number; format?: (v: number) => string }) {
  const raw = useMotionValue(0);
  const sprung = useSpring(raw, { stiffness: 75, damping: 18, restDelta: 0.5 });
  const display = useTransform(sprung, (v) => (format ? format(v) : String(Math.round(v))));

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
  format?: (v: number) => string;
  hint?: string;
}

function StatCard({ label, value, icon: Icon, numberColor, iconBg, iconColor, bar, loading, idx, format, hint }: StatCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      custom={idx}
      whileHover={{ y: -5, transition: SP_FAST }}
      className="group relative flex flex-col gap-3 p-5 rounded-2xl bg-surface-container-lowest shadow-sm hover:shadow-xl border border-outline-variant/10 overflow-hidden cursor-default transition-shadow duration-300"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-technical truncate">{label}</p>
          {hint && <p className="text-[10px] leading-tight text-on-surface-variant/60 mt-1 truncate">{hint}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded-lg" />
      ) : (
        <p className={`text-3xl font-bold tabular-nums leading-none ${numberColor}`}>
          <AnimatedNumber to={value} format={format} />
        </p>
      )}
    </motion.div>
  );
}

// One icon per pipeline status — used in the full Sales Pipeline breakdown below.
const STATUS_ICONS: Record<LeadStatus, React.ReactNode> = {
  'New Lead': <PhoneCall className="w-3.5 h-3.5" />,
  'No Answer': <PhoneOff className="w-3.5 h-3.5" />,
  'Call Back Later': <Clock3 className="w-3.5 h-3.5" />,
  'Wrong Number': <AlertTriangle className="w-3.5 h-3.5" />,
  'Interested': <TrendingUp className="w-3.5 h-3.5" />,
  'Follow-up': <MessageCircle className="w-3.5 h-3.5" />,
  'Meeting Scheduled': <CalendarClock className="w-3.5 h-3.5" />,
  'Proposal Sent': <FileText className="w-3.5 h-3.5" />,
  'Negotiation': <Handshake className="w-3.5 h-3.5" />,
  'Closed Won': <CheckCircle2 className="w-3.5 h-3.5" />,
  'Closed Lost': <XCircle className="w-3.5 h-3.5" />,
};

// Static brand fill per stage bar (single hue — magnitude is carried by bar
// length, not by color). Literal class name so Tailwind's scanner keeps it.
const STAGE_BAR_FILL = 'bg-brand-600';

// The 11 statuses grouped into the 7 pipeline stages they belong to (mirrors
// the step numbers PipelineStepper uses on the lead detail page), so the
// dashboard always shows the full workflow — including stages with 0 leads —
// instead of only whatever statuses happen to have data.
const PIPELINE_STAGES = STEPS.map((label, step) => ({
  label,
  step,
  statuses: LEAD_STATUSES.filter((status) => LEAD_STATUS_WORKFLOW[status].step === step),
}));

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;
const percent = (v: number) => `${Math.round(v)}%`;

export default function TeleSalesDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, leads, loading } = useAppSelector((state) => state.teleSalesLeads);
  const { user } = useAppSelector((state) => state.auth);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  const agentName = (user as any)?.firstName ? `${(user as any).firstName} ${(user as any).lastName}` : 'Agent';
  const statsLoading = !stats;

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchLeads({ limit: 5 }));
    teleSalesApi.getUpcomingFollowUps().then((res) => setUpcomingFollowUps(res.data)).catch(() => {});
  }, [dispatch]);

  const getStatCount = (status: LeadStatus) =>
    stats?.byStatus.find((s) => s._id === status)?.count ?? 0;

  const stageTotal = (statuses: LeadStatus[]) => statuses.reduce((sum, s) => sum + getStatCount(s), 0);
  const maxStageTotal = Math.max(1, ...PIPELINE_STAGES.map((s) => stageTotal(s.statuses)));

  // Pipeline value & win rate — the "money view": how much is still in play,
  // and how often an open deal ends up won once it closes.
  const openPipelineValue = (stats?.byStatus ?? [])
    .filter((s) => s._id !== 'Closed Won' && s._id !== 'Closed Lost')
    .reduce((sum, s) => sum + (s.value || 0), 0);
  const wonCount = getStatCount('Closed Won');
  const lostCount = getStatCount('Closed Lost');
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0;

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={SP}>
        <h1 className="text-2xl font-bold text-on-surface">Welcome back, {agentName}</h1>
        <p className="text-on-surface-variant text-sm mt-1">Here's your TeleSales overview</p>
      </motion.div>

      {/* Key Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <StatCard idx={0} label="New Leads" value={getStatCount('New Lead')} icon={PhoneCall}
          numberColor="text-on-surface" iconBg="bg-blue-50" iconColor="text-blue-600" bar="bg-blue-500" loading={statsLoading} />
        <StatCard idx={1} label="Interested" value={getStatCount('Interested')} icon={TrendingUp}
          numberColor="text-on-surface" iconBg="bg-green-50" iconColor="text-green-600" bar="bg-green-500" loading={statsLoading} />
        <StatCard idx={2} label="Closed Won" value={wonCount} icon={CheckCircle2}
          numberColor="text-on-surface" iconBg="bg-emerald-50" iconColor="text-emerald-600" bar="bg-emerald-500" loading={statsLoading} />
        <StatCard idx={3} label="Closed Lost" value={lostCount} icon={XCircle}
          numberColor="text-on-surface" iconBg="bg-red-50" iconColor="text-red-600" bar="bg-red-500" loading={statsLoading} />
        <StatCard idx={4} label="Pipeline Value" value={openPipelineValue} format={money} icon={Wallet}
          numberColor="text-brand-600" iconBg="bg-brand-50" iconColor="text-brand-600" bar="bg-brand-500" loading={statsLoading}
          hint="Open deals, potential value" />
        <StatCard idx={5} label="Win Rate" value={winRate} format={percent} icon={Target}
          numberColor="text-amber-600" iconBg="bg-amber-50" iconColor="text-amber-600" bar="bg-amber-500" loading={statsLoading}
          hint={closedCount > 0 ? `${wonCount} won / ${closedCount} closed` : 'No closed deals yet'} />
      </motion.div>

      {/* Total */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SP, delay: 0.15 }}
        className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-5 text-white flex items-center justify-between"
      >
        <div>
          <p className="text-white/70 text-sm">Total Leads</p>
          <p className="text-4xl font-bold mt-1 tabular-nums">
            <AnimatedNumber to={stats?.total ?? 0} />
          </p>
        </div>
        <Users className="w-12 h-12 text-white/30" />
      </motion.div>

      {/* Sales Pipeline — the full 11-status workflow, grouped into its 7 stages.
          Every stage renders even with 0 leads, so the whole pipeline is always visible. */}
      <motion.div
        variants={sectionVariants}
        custom={0}
        initial="hidden"
        animate="visible"
        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-semibold text-on-surface">Sales Pipeline</h2>
          <span className="text-xs text-on-surface-variant">{stats?.total ?? 0} total leads</span>
        </div>
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
        >
          {PIPELINE_STAGES.map(({ label, statuses }, idx) => {
            const total = stageTotal(statuses);
            const barPct = Math.max((total / maxStageTotal) * 100, total > 0 ? 6 : 0);
            return (
              <motion.div
                key={label}
                variants={cardVariants}
                custom={idx}
                whileHover={{ y: -3, transition: SP_FAST }}
                className="rounded-xl border border-outline-variant/10 bg-surface-container/40 p-3 flex flex-col gap-2"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant truncate" title={label}>
                    {label}
                  </p>
                  <p className="text-lg font-bold text-on-surface leading-tight">{total}</p>
                </div>
                <div className="h-1.5 rounded-full bg-outline-variant/15 overflow-hidden" aria-hidden>
                  <motion.div
                    className={`h-full rounded-full ${STAGE_BAR_FILL}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: 0.5 + idx * 0.07 }}
                  />
                </div>
                <div className="space-y-1">
                  {statuses.map((status) => (
                    <div
                      key={status}
                      className={`flex items-center justify-between gap-1 text-[11px] font-medium px-2 py-1 rounded-lg ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      <span className="flex items-center gap-1 min-w-0">
                        {STATUS_ICONS[status]}
                        <span className="truncate">{status}</span>
                      </span>
                      <span>{getStatCount(status)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div variants={sectionVariants} custom={1} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-ups */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h2 className="font-semibold text-on-surface flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              Upcoming Follow-ups
            </h2>
            <span className="text-xs text-on-surface-variant">Next 7 days</span>
          </div>
          <motion.div variants={stagger} initial="hidden" animate="visible" className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto">
            {upcomingFollowUps.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">No upcoming follow-ups</p>
            )}
            {upcomingFollowUps.map((fu, idx) => {
              const lead = typeof fu.lead === 'object' ? fu.lead : null;
              return (
                <motion.div
                  key={fu._id}
                  variants={rowVariants}
                  custom={idx}
                  whileHover={{ x: 4 }}
                  className="px-5 py-3 flex items-center justify-between hover:bg-surface-container cursor-pointer"
                  onClick={() => lead && navigate(`/tele-sales/leads/${(lead as any)._id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-on-surface">{(lead as any)?.companyName ?? 'Unknown'}</p>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(fu.reminderDate)} · {fu.followUpType}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-on-surface-variant" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Recent Leads */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
            <h2 className="font-semibold text-on-surface">Recent Leads</h2>
            <button onClick={() => navigate('/tele-sales/leads')} className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto">
              {leads.length === 0 && (
                <p className="text-on-surface-variant text-sm text-center py-8">No leads yet</p>
              )}
              {leads.map((lead, idx) => (
                <motion.div
                  key={lead._id}
                  variants={rowVariants}
                  custom={idx}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/tele-sales/leads/${lead._id}`)}
                  className="px-5 py-3 flex items-center justify-between hover:bg-surface-container cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{lead.companyName}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{lead.contactPersonName}</span>
                      {(lead.phonePrimary || lead.phoneSecondary) && (
                        <>
                          <span aria-hidden>·</span>
                          <PhoneLink number={lead.phonePrimary || lead.phoneSecondary} showIcon={false} className="text-xs" />
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {lead.status}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
