import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Award,
  Clock,
  Zap,
  Star,
  BookOpen,
  Bot,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAuth } from '@/redux/hooks/useAuth';
import { fetchEvaluation, saveEvaluation, clearEvaluation } from '@/redux/slices/evaluationSlice';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';
import type { AdminScores } from '@/types/evaluation.types';
import type { RootState } from '@/redux/store';

/* ── Animation ────────────────────────────────────────────────── */
const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { ...SP, delay: i * 0.06 } }),
};

/* ── Score ring ───────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  const color =
    clamped >= 80 ? '#22c55e' : clamped >= 60 ? '#f59e0b' : clamped >= 40 ? '#f97316' : '#ef4444';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="10"
          className="text-surface-container-high" />
        <circle cx="72" cy="72" r={r} fill="none" strokeWidth="10"
          stroke={color} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-on-surface">{clamped.toFixed(1)}</span>
        <span className="text-xs text-on-surface-variant">/ 100</span>
      </div>
    </div>
  );
}

/* ── KPI row ──────────────────────────────────────────────────── */
function KpiBar({
  label, weight, achieved, icon: Icon, color,
}: {
  label: string; weight: number; achieved: number; icon: React.ElementType; color: string;
}) {
  const pct = Math.min(100, Math.max(0, (achieved / weight) * 100));
  return (
    <div className="flex items-center gap-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-on-surface truncate">{label}</span>
          <span className="text-xs text-on-surface-variant ml-2 whitespace-nowrap">
            {achieved.toFixed(2)} / {weight}
          </span>
        </div>
        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color.replace('bg-', '').includes('#') ? color : undefined }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="w-full h-full rounded-full" style={{
              background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444',
            }} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ── Number input ─────────────────────────────────────────────── */
function ScoreInput({
  label, value, onChange, max = 100,
}: {
  label: string; value: number; onChange: (v: number) => void; max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-on-surface-variant">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
          className="w-full h-9 rounded-lg bg-surface-container-high border border-outline-variant px-3 pr-10 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant pointer-events-none">
          /100
        </span>
      </div>
    </label>
  );
}

/* ── Ticket detail helpers ────────────────────────────────────── */
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const CATEGORY_META: Record<'early' | 'onTime' | 'late', { label: string; cls: string }> = {
  early:  { label: 'Early',   cls: 'bg-emerald-100 text-emerald-700' },
  onTime: { label: 'On-Time', cls: 'bg-blue-100 text-blue-700' },
  late:   { label: 'Late',    cls: 'bg-red-100 text-red-700' },
};
const NOT_COUNTED_META = { label: 'Not counted', cls: 'bg-surface-container-high text-on-surface-variant' };

/* ── Module-level constants (stable across renders) ───────────── */
const KPI_CONFIG = [
  { key: 'ticketPerformance',  icon: Clock,      color: 'bg-brand-600' },
  { key: 'certification',      icon: Award,      color: 'bg-purple-600' },
  { key: 'clientPunctuality',  icon: Star,       color: 'bg-amber-500' },
  { key: 'managerEvaluation',  icon: Zap,        color: 'bg-blue-600' },
  { key: 'studyingModule',     icon: BookOpen,   color: 'bg-teal-600' },
  { key: 'aiSolutions',        icon: Bot,        color: 'bg-rose-600' },
] as const;

/* ─────────────────────────────────────────────────────────────── */

export default function EmployeeEvaluationPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAdmin } = useAuth();
  const authUser = useAppSelector((s: RootState) => s.auth.user);
  const { data, loading, saving, error } = useAppSelector((s) => s.evaluation);

  const id = rawId === 'me' ? authUser?._id : rawId;

  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [draft, setDraft] = useState<AdminScores>({
    hasCertification: false,
    clientPunctualityScore: 0,
    managerEvaluationScore: 0,
    studyingModuleScore: 0,
    aiSolutionsScore: 0,
    notes: '',
  });

  /* sync draft when data loads */
  useEffect(() => {
    if (data?.adminScores) setDraft(data.adminScores);
  }, [data?.adminScores]);

  /* fetch on id / period change */
  useEffect(() => {
    if (!id) return;
    dispatch(fetchEvaluation({ employeeId: id, year: period.year, month: period.month }));
    return () => { dispatch(clearEvaluation()); };
  }, [id, period, dispatch]);

  const prevMonth = () =>
    setPeriod(({ year, month }) => {
      const d = new Date(year, month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const nextMonth = () =>
    setPeriod(({ year, month }) => {
      const d = new Date(year, month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const now = new Date();
  const isCurrentMonth = period.year === now.getFullYear() && period.month === now.getMonth();

  const handleSave = () => {
    if (!id) return;
    dispatch(saveEvaluation({ employeeId: id, year: period.year, month: period.month, scores: draft }));
  };

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <div className="w-10 h-10 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
          <p className="text-sm">Loading evaluation…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-error mx-auto" />
          <p className="text-on-surface font-medium">{error}</p>
          <Button variant="outline" onClick={() => id && dispatch(fetchEvaluation({ employeeId: id, ...period }))}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const consultantName = data
    ? `${data.consultant.firstName} ${data.consultant.lastName}`
    : '…';

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Avatar className="w-14 h-14">
          {getAvatarUrl(data?.consultant.profilePicture) && (
            <AvatarImage
              src={getAvatarUrl(data?.consultant.profilePicture)}
              alt={consultantName}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-bold">
            {data ? `${data.consultant.firstName[0] ?? ''}${data.consultant.lastName[0] ?? ''}`.toUpperCase() : '…'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{consultantName}</h1>
          <p className="text-sm text-on-surface-variant">
            {data?.consultant.position ?? data?.consultant.role ?? 'Performance Evaluation'}
          </p>
        </div>
      </div>

      {/* ── Month navigator ──────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="flex items-center gap-3 bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant shadow-sm">
          <button onClick={prevMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-on-surface min-w-[150px] text-center">
            {data?.period.label ?? new Date(period.year, period.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          {/* ── Left: score + KPI bars ───────────────────────── */}
          <div className="space-y-5">

            {/* Score card */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={data.totalScore} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
                    Total Score
                  </p>
                  <p className="text-4xl font-bold text-on-surface mb-1">
                    {data.totalScore.toFixed(2)}<span className="text-lg font-normal text-on-surface-variant"> / 100</span>
                  </p>
                  <p className="text-sm text-on-surface-variant">{data.period.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.totalScore >= 80 && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Excellent</span>}
                    {data.totalScore >= 60 && data.totalScore < 80 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Good</span>}
                    {data.totalScore >= 40 && data.totalScore < 60 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Needs Improvement</span>}
                    {data.totalScore < 40 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Underperforming</span>}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* KPI breakdown bars */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-6 space-y-5">
              <h2 className="text-sm font-semibold text-on-surface">KPI Breakdown</h2>
              {KPI_CONFIG.map(({ key, icon, color }) => {
                const kpi = data.breakdown[key as keyof typeof data.breakdown];
                return (
                  <KpiBar
                    key={key}
                    label={kpi.label}
                    weight={kpi.weight}
                    achieved={kpi.achieved}
                    icon={icon}
                    color={color}
                  />
                );
              })}
            </motion.div>

            {/* Ticket details */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant overflow-hidden">
              <div className="p-5 border-b border-outline-variant">
                <h2 className="text-sm font-semibold text-on-surface">Ticket Performance Details</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Weight: 50% · Contribution: {data.breakdown.ticketPerformance.achieved.toFixed(2)} pts
                </p>
              </div>

              {/* Formula summary */}
              <div className="p-5 border-b border-outline-variant bg-surface-container-high/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Early (+2)', value: data.breakdown.ticketPerformance.details.earlyCount, color: 'text-emerald-600' },
                    { label: 'On-Time (+1)', value: data.breakdown.ticketPerformance.details.onTimeCount, color: 'text-blue-600' },
                    { label: 'Late (−1)', value: data.breakdown.ticketPerformance.details.lateCount, color: 'text-red-600' },
                    { label: 'Total', value: data.breakdown.ticketPerformance.details.totalTickets, color: 'text-on-surface' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Net Points</span>
                  <span className={`font-bold ${data.breakdown.ticketPerformance.details.netPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.breakdown.ticketPerformance.details.netPoints}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Counted Tickets (Main / Sub)</span>
                  <span className="font-bold text-on-surface">
                    <span className="text-brand-600">{data.breakdown.ticketPerformance.details.mainTickets}</span>
                    <span className="text-on-surface-variant"> / </span>
                    <span className="text-purple-600">{data.breakdown.ticketPerformance.details.subTickets}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Performance %</span>
                  <span className="font-bold text-on-surface">
                    {data.breakdown.ticketPerformance.details.performancePercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Contribution to Final Score</span>
                  <span className="font-bold text-primary">
                    {data.breakdown.ticketPerformance.achieved.toFixed(2)} / 50
                  </span>
                </div>
                {data.breakdown.ticketPerformance.details.totalTickets === 0 && (
                  <p className="text-xs text-on-surface-variant/60 pt-1">
                    No countable tickets this month (tickets need a delivery date to be categorized).
                  </p>
                )}
              </div>

              {/* Per-ticket breakdown — every ticket behind the number above */}
              {data.tickets && data.tickets.length > 0 && (
                <div className="border-t border-outline-variant">
                  <div className="px-5 py-3 flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-on-surface">Tickets in this period</h3>
                    <span className="text-xs text-on-surface-variant">
                      {data.tickets.filter((t) => t.counted).length} counted · {data.tickets.length} total
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container-high/50 sticky top-0">
                        <tr className="text-xs text-on-surface-variant uppercase tracking-wide">
                          <th className="px-4 py-2 text-left font-semibold">Ticket</th>
                          <th className="px-4 py-2 text-left font-semibold">Type</th>
                          <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">Customer Delivery Date</th>
                          <th className="px-4 py-2 text-left font-semibold whitespace-nowrap">Delivered</th>
                          <th className="px-4 py-2 text-center font-semibold">Result</th>
                          <th className="px-4 py-2 text-right font-semibold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.tickets.map((t) => {
                          const meta = t.category ? CATEGORY_META[t.category] : NOT_COUNTED_META;
                          return (
                            <tr
                              key={t._id}
                              onClick={() => window.open(`/tickets/view/${t._id}`, '_blank')}
                              className={`border-t border-outline-variant/50 hover:bg-surface-container-high/40 cursor-pointer transition-colors ${t.counted ? '' : 'opacity-60'}`}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  {t.ticketNumber != null && (
                                    <span className="text-xs font-semibold text-brand-600 whitespace-nowrap">#{t.ticketNumber}</span>
                                  )}
                                  <span className="text-on-surface truncate max-w-[220px]" title={t.subject}>
                                    {t.subject || '—'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                  t.isSubTicket
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-brand-100 text-brand-700'
                                }`}>
                                  {t.isSubTicket ? 'Sub' : 'Main'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{fmtDate(t.deadline)}</td>
                              <td className="px-4 py-2.5 text-on-surface-variant whitespace-nowrap">{fmtDate(t.resolvedDate)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.cls}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${t.points > 0 ? 'text-green-600' : t.points < 0 ? 'text-red-600' : 'text-on-surface-variant'}`}>
                                {t.points > 0 ? `+${t.points}` : t.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Right: admin scores panel ────────────────────── */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="space-y-5">

            {/* Certification */}
            <div className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-on-surface">Bi-annual Certification</h3>
                </div>
                <span className="text-xs text-on-surface-variant">Weight: 20%</span>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => setDraft((d) => ({ ...d, hasCertification: !d.hasCertification }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-colors ${
                    draft.hasCertification
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-outline-variant bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {draft.hasCertification ? 'Certified ✓' : 'Not certified'}
                  </span>
                  {draft.hasCertification
                    ? <CheckCircle2 className="w-5 h-5" />
                    : <XCircle className="w-5 h-5" />}
                </button>
              ) : (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
                  data.adminScores.hasCertification ? 'bg-green-50 text-green-700' : 'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {data.adminScores.hasCertification
                    ? <><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">Certified</span></>
                    : <><XCircle className="w-4 h-4" /><span className="text-sm font-medium">Not certified</span></>}
                </div>
              )}

              <p className="text-xs text-on-surface-variant mt-2">
                Achieved: <span className="font-semibold">{data.breakdown.certification.achieved} / 20</span>
              </p>
            </div>

            {/* Score inputs */}
            <div className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-5 space-y-4">
              <h3 className="text-sm font-semibold text-on-surface">Admin Scores</h3>

              {isAdmin ? (
                <>
                  <ScoreInput
                    label={`Client Punctuality / SLA (weight 10%)`}
                    value={draft.clientPunctualityScore}
                    onChange={(v) => setDraft((d) => ({ ...d, clientPunctualityScore: v }))}
                  />
                  <ScoreInput
                    label={`Manager's General Evaluation (weight 10%)`}
                    value={draft.managerEvaluationScore}
                    onChange={(v) => setDraft((d) => ({ ...d, managerEvaluationScore: v }))}
                  />
                  <ScoreInput
                    label={`Studying a New Module (weight 5%)`}
                    value={draft.studyingModuleScore}
                    onChange={(v) => setDraft((d) => ({ ...d, studyingModuleScore: v }))}
                  />
                  <ScoreInput
                    label={`Providing AI Solutions (weight 5%)`}
                    value={draft.aiSolutionsScore}
                    onChange={(v) => setDraft((d) => ({ ...d, aiSolutionsScore: v }))}
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-on-surface-variant">Notes</span>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="Optional notes…"
                      className="w-full rounded-lg bg-surface-container-high border border-outline-variant px-3 py-2 text-sm text-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                  <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save Evaluation'}
                  </Button>
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Client Punctuality / SLA', val: data.adminScores.clientPunctualityScore, weight: 10 },
                    { label: "Manager's Evaluation",     val: data.adminScores.managerEvaluationScore, weight: 10 },
                    { label: 'Studying New Module',      val: data.adminScores.studyingModuleScore,    weight: 5  },
                    { label: 'AI Solutions',             val: data.adminScores.aiSolutionsScore,       weight: 5  },
                  ].map(({ label, val, weight }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-on-surface-variant">{label}</span>
                      <span className="font-medium text-on-surface">{val} / 100
                        <span className="text-on-surface-variant ml-1 text-xs">
                          (→ {((val / 100) * weight).toFixed(2)} pts)
                        </span>
                      </span>
                    </div>
                  ))}
                  {data.adminScores.notes && (
                    <div className="pt-2 border-t border-outline-variant">
                      <p className="text-xs text-on-surface-variant">{data.adminScores.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Score summary table */}
            <div className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant overflow-hidden">
              <div className="p-4 border-b border-outline-variant">
                <h3 className="text-sm font-semibold text-on-surface">Score Summary</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-container-high/50 text-xs text-on-surface-variant uppercase tracking-wide">
                    <th className="px-4 py-2 text-left">KPI</th>
                    <th className="px-4 py-2 text-center">Weight</th>
                    <th className="px-4 py-2 text-right">Achieved</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.breakdown).map(([key, kpi]) => (
                    <tr key={key} className="border-t border-outline-variant/50">
                      <td className="px-4 py-2.5 text-on-surface">{kpi.label}</td>
                      <td className="px-4 py-2.5 text-center text-on-surface-variant">{kpi.weight}%</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-semibold ${kpi.achieved >= kpi.weight * 0.7 ? 'text-green-600' : kpi.achieved >= kpi.weight * 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                          {kpi.achieved.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-outline-variant bg-surface-container-high/40">
                    <td className="px-4 py-3 font-bold text-on-surface">Total</td>
                    <td className="px-4 py-3 text-center font-bold text-on-surface">100%</td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-base">
                      {data.totalScore.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
