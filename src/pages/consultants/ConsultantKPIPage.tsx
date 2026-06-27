import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Ticket as TicketIcon,
  Settings2,
  Save,
  X,
  Pencil,
  Check,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { useAuth } from '@/redux/hooks/useAuth';
import { useAppSelector } from '@/redux/hooks/hooks';
import StatCard from '@/components/consultant-reports/StatCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getConsultantKpi,
  updateKpiSettings,
  setTicketAdminPoints,
} from '@/api/kpiApi';
import type { KpiResponse, KpiSettings, KpiSummary, KpiTicketItem } from '@/types/kpi.types';

/* ── Animation constants ─────────────────────────────────────── */
const SP = { type: 'spring' as const, stiffness: 260, damping: 22 };

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SP, delay: i * 0.07 },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ── Status badge helper ─────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  customer_pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  tested: 'bg-teal-100 text-teal-700',
  closed: 'bg-gray-100 text-gray-600',
  delivered: 'bg-emerald-100 text-emerald-700',
  reopened: 'bg-red-100 text-red-700',
  not_related: 'bg-slate-100 text-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

/* ── Points re-computation (mirrors backend formula) ─────────── */
function recomputeSummary(tickets: KpiTicketItem[], rules: KpiSettings): KpiSummary {
  return {
    totalTickets: tickets.length,
    resolvedTickets: tickets.filter((t) => t.isResolved).length,
    delayedTickets: tickets.filter((t) => t.isDelayed).length,
    nonDelayedTickets: tickets.filter((t) => !t.isDelayed).length,
    basePoints: tickets.reduce((acc, t) => acc + t.basePoints, 0),
    adminPoints: tickets.reduce((acc, t) => acc + (t.adminPoints ?? 0), 0),
    totalPoints: tickets.reduce((acc, t) => acc + t.calculatedPoints, 0),
  };
}

function recalcTicketPoints(ticket: KpiTicketItem, rules: KpiSettings): KpiTicketItem {
  const basePoints =
    (ticket.isResolved ? rules.resolvedPoints : 0) +
    (ticket.isResolved && !ticket.isDelayed ? rules.nonDelayedBonus : 0) -
    (ticket.isDelayed ? rules.delayedDeduction : 0);
  return {
    ...ticket,
    basePoints,
    calculatedPoints: basePoints + (ticket.adminPoints ?? 0),
  };
}

/* ─────────────────────────────────────────────────────────────── */

export default function ConsultantKPIPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const authUser = useAppSelector((state) => state.auth.user) as any;

  // Support /consultants/kpi/me as an alias for the logged-in consultant's own KPI
  const id = rawId === 'me' ? authUser?._id : rawId;

  const [kpiData, setKpiData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [period, setPeriod] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<KpiSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  /* ── Data fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    getConsultantKpi(id, period.year, period.month)
      .then((data) => {
        setKpiData(data);
        setSettingsDraft({
          resolvedPoints: data.pointRules.resolvedPoints,
          nonDelayedBonus: data.pointRules.nonDelayedBonus,
          delayedDeduction: data.pointRules.delayedDeduction,
        });
      })
      .catch((e) => setError(e.response?.data?.message ?? 'Failed to load KPI data'))
      .finally(() => setLoading(false));
  }, [id, period, retryKey]);

  /* ── Month navigation ───────────────────────────────────────── */
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

  const periodLabel = new Date(period.year, period.month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const isCurrentMonth = (() => {
    const now = new Date();
    return period.year === now.getFullYear() && period.month === now.getMonth();
  })();

  /* ── Settings save ──────────────────────────────────────────── */
  const saveSettings = async () => {
    if (!settingsDraft || !kpiData) return;
    setSettingsSaving(true);
    try {
      await updateKpiSettings(settingsDraft);

      const updatedTickets = kpiData.tickets.map((t) => recalcTicketPoints(t, settingsDraft));
      const updatedSummary = recomputeSummary(updatedTickets, settingsDraft);

      setKpiData({
        ...kpiData,
        pointRules: settingsDraft,
        tickets: updatedTickets,
        summary: updatedSummary,
      });

      toast.success('KPI settings updated');
      setSettingsOpen(false);
    } catch {
      toast.error('Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  /* ── Inline admin points edit ───────────────────────────────── */
  const startEdit = (ticket: KpiTicketItem) => {
    setEditingId(ticket._id);
    setEditingValue(ticket.adminPoints != null ? String(ticket.adminPoints) : '');
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const commitEdit = async (ticketId: string) => {
    if (!kpiData) return;
    const raw = editingValue.trim();
    const points = raw === '' ? null : Number(raw);

    if (raw !== '' && (isNaN(points as number))) {
      toast.error('Enter a valid number');
      return;
    }

    setEditingId(null);

    const rules = kpiData.pointRules;
    const updatedTickets = kpiData.tickets.map((t) => {
      if (t._id !== ticketId) return t;
      const updated = { ...t, adminPoints: points };
      return recalcTicketPoints(updated, rules);
    });

    setKpiData({
      ...kpiData,
      tickets: updatedTickets,
      summary: recomputeSummary(updatedTickets, rules),
    });

    try {
      await setTicketAdminPoints(ticketId, points);
    } catch {
      toast.error('Failed to save points — reverting');
      setKpiData(kpiData);
    }
  };

  const cancelEdit = () => setEditingId(null);

  /* ── Render ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <div className="w-10 h-10 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
          <p className="text-sm">Loading KPI data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-error mx-auto" />
          <p className="text-on-surface font-medium">{error}</p>
          <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!kpiData) return null;

  const { consultant, summary, pointRules, tickets } = kpiData;
  const consultantName = `${consultant.firstName} ${consultant.lastName}`;

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{consultantName}</h1>
            <p className="text-sm text-on-surface-variant">KPI Dashboard</p>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen((v) => !v)}
            className="gap-1.5"
          >
            <Settings2 className="w-4 h-4" />
            {settingsOpen ? 'Hide Settings' : 'KPI Settings'}
          </Button>
        )}
      </div>

      {/* ── Month navigator ─────────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant shadow-sm">
          <button
            onClick={prevMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-on-surface min-w-[140px] text-center">
            {periodLabel}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Settings panel (admin only) ──────────────────────────── */}
      <AnimatePresence>
        {isAdmin && settingsOpen && settingsDraft && (
          <motion.div
            key="settings"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-6">
              <h2 className="text-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Point Rules
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    Resolved ticket points
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settingsDraft.resolvedPoints}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, resolvedPoints: Number(e.target.value) })
                    }
                    className="w-full h-9 rounded-lg bg-surface-container-high border border-outline-variant px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    On-time bonus points
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settingsDraft.nonDelayedBonus}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, nonDelayedBonus: Number(e.target.value) })
                    }
                    className="w-full h-9 rounded-lg bg-surface-container-high border border-outline-variant px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    Delayed deduction points
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={settingsDraft.delayedDeduction}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, delayedDeduction: Number(e.target.value) })
                    }
                    className="w-full h-9 rounded-lg bg-surface-container-high border border-outline-variant px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={saveSettings} disabled={settingsSaving} className="gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  {settingsSaving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSettingsDraft({
                      resolvedPoints: pointRules.resolvedPoints,
                      nonDelayedBonus: pointRules.nonDelayedBonus,
                      delayedDeduction: pointRules.delayedDeduction,
                    });
                    setSettingsOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: 'Total Tickets',
            value: summary.totalTickets,
            icon: TicketIcon,
            colorClass: 'text-brand-600',
          },
          {
            title: 'Resolved',
            value: summary.resolvedTickets,
            icon: CheckCircle2,
            colorClass: 'text-green-600',
            subtitle: `${summary.totalTickets > 0 ? Math.round((summary.resolvedTickets / summary.totalTickets) * 100) : 0}% resolution rate`,
          },
          {
            title: 'Delayed',
            value: summary.delayedTickets,
            icon: AlertTriangle,
            colorClass: 'text-red-600',
          },
          {
            title: 'On Time',
            value: summary.nonDelayedTickets,
            icon: ShieldCheck,
            colorClass: 'text-emerald-600',
          },
        ].map((card, i) => (
          <motion.div key={card.title} variants={cardVariants} custom={i}>
            <StatCard
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              colorClass={card.colorClass}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Points summary card ──────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        custom={4}
        initial="hidden"
        animate="visible"
        className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant overflow-hidden"
      >
        <div className="h-[3px] bg-gradient-to-r from-primary to-emerald-500" />
        <div className="p-6">
          <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-4">
            Points Summary
          </h2>
          <div className="grid grid-cols-3 gap-4 divide-x divide-outline-variant">
            <div className="text-center">
              <p className="text-3xl font-bold text-on-surface">{summary.basePoints}</p>
              <p className="text-xs text-on-surface-variant mt-1">Base Points</p>
              <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                from rules
              </p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${summary.adminPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.adminPoints >= 0 ? '+' : ''}{summary.adminPoints}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">Admin Adjustments</p>
              {isAdmin && (
                <p className="text-[11px] text-on-surface-variant/70 mt-0.5">editable per ticket</p>
              )}
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${summary.totalPoints >= 0 ? 'text-primary' : 'text-red-600'}`}>
                {summary.totalPoints}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">Total Points</p>
              <p className="text-[11px] text-on-surface-variant/70 mt-0.5">for {periodLabel}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Point rules legend ───────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100">
          +{pointRules.resolvedPoints} pts resolved
        </span>
        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">
          +{pointRules.nonDelayedBonus} pts on-time bonus
        </span>
        <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-100">
          −{pointRules.delayedDeduction} pts delayed
        </span>
      </div>

      {/* ── Tickets table ────────────────────────────────────────── */}
      <motion.div
        variants={cardVariants}
        custom={5}
        initial="hidden"
        animate="visible"
        className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant overflow-hidden"
      >
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-sm font-semibold text-on-surface">
            Tickets ({tickets.length})
          </h2>
          {isAdmin && (
            <p className="text-xs text-on-surface-variant">
              Click the Admin Pts cell to add a custom adjustment
            </p>
          )}
        </div>

        {tickets.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant text-sm">
            No tickets found for {periodLabel}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-high/50">
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Ticket #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Resolved
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Delayed
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Delay Days
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Base Pts
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                      Admin Pts
                    </th>
                  )}
                  <th className="px-4 py-3 text-center font-medium text-on-surface-variant text-xs uppercase tracking-wide">
                    Net Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, idx) => {
                  const isEditing = editingId === ticket._id;
                  return (
                    <tr
                      key={ticket._id}
                      className={`border-b border-outline-variant/50 transition-colors hover:bg-surface-container-high/40 ${
                        ticket.isDelayed ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                      } ${idx % 2 === 0 ? '' : 'bg-surface-container-high/20'}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {ticket.ticketNumber}
                      </td>
                      <td className="px-4 py-3 text-on-surface max-w-[240px] truncate">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ticket.isResolved ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-on-surface-variant/40 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {ticket.isDelayed ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />
                        ) : (
                          <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-on-surface-variant">
                        {ticket.isDelayed ? (
                          <span className="text-red-600 font-medium">{ticket.delayedDays}d</span>
                        ) : (
                          <span className="text-on-surface-variant/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-medium ${ticket.basePoints >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {ticket.basePoints >= 0 ? '+' : ''}
                          {ticket.basePoints}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                ref={editInputRef}
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(ticket._id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onBlur={() => commitEdit(ticket._id)}
                                className="w-16 h-7 text-center text-xs rounded bg-surface-container-high border border-primary px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(ticket)}
                              className="group inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-surface-container-high transition-colors text-on-surface-variant"
                            >
                              <span className="text-xs font-medium">
                                {ticket.adminPoints != null
                                  ? `${ticket.adminPoints >= 0 ? '+' : ''}${ticket.adminPoints}`
                                  : '—'}
                              </span>
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </button>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold text-sm ${ticket.calculatedPoints >= 0 ? 'text-primary' : 'text-red-600'}`}
                        >
                          {ticket.calculatedPoints >= 0 ? '+' : ''}
                          {ticket.calculatedPoints}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
