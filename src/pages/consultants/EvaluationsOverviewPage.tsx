import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Award,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { getAllEvaluations } from '@/api/evaluationApi';
import type { AllEvaluationsResponse, ConsultantEvaluationRow } from '@/types/evaluation.types';
import { Button } from '@/components/ui/button';

/* ── Score badge ─────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  const { bg, text, label } =
    score >= 80 ? { bg: 'bg-green-100', text: 'text-green-700',  label: 'Excellent' } :
    score >= 60 ? { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' } :
    score >= 40 ? { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Fair' } :
                  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Low' };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-base font-bold ${text}`}>{score.toFixed(1)}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bg} ${text}`}>{label}</span>
    </div>
  );
}

/* ── Mini progress bar ───────────────────────────────────────── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-on-surface-variant tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

/* ── Sort state helpers ──────────────────────────────────────── */
type SortKey = 'name' | 'totalScore' | 'tickets' | 'ticket' | 'cert' | 'sla' | 'manager' | 'module' | 'ai';
type SortDir = 'asc' | 'desc';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-on-surface-variant/40" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
}

function Th({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-on-surface transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon active={current === sortKey} dir={dir} />
      </span>
    </th>
  );
}

/* ─────────────────────────────────────────────────────────────── */

export default function EvaluationsOverviewPage() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [response, setResponse] = useState<AllEvaluationsResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [sort, setSort]   = useState<{ key: SortKey; dir: SortDir }>({ key: 'totalScore', dir: 'desc' });
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllEvaluations(period.year, period.month);
      setResponse(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [period]);

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

  const handleSort = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const rows: ConsultantEvaluationRow[] = (() => {
    if (!response) return [];
    let list = response.data;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.consultant.firstName.toLowerCase().includes(q) ||
          r.consultant.lastName.toLowerCase().includes(q) ||
          (r.consultant.position ?? '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const mul = sort.dir === 'asc' ? 1 : -1;
      switch (sort.key) {
        case 'name':
          return mul * `${a.consultant.firstName} ${a.consultant.lastName}`.localeCompare(
            `${b.consultant.firstName} ${b.consultant.lastName}`
          );
        case 'totalScore': return mul * (a.totalScore - b.totalScore);
        case 'tickets':    return mul * (a.ticketCount - b.ticketCount);
        case 'ticket':     return mul * (a.breakdown.ticketPerformance.achieved - b.breakdown.ticketPerformance.achieved);
        case 'cert':       return mul * (a.breakdown.certification.achieved - b.breakdown.certification.achieved);
        case 'sla':        return mul * (a.breakdown.clientPunctuality.achieved - b.breakdown.clientPunctuality.achieved);
        case 'manager':    return mul * (a.breakdown.managerEvaluation.achieved - b.breakdown.managerEvaluation.achieved);
        case 'module':     return mul * (a.breakdown.studyingModule.achieved - b.breakdown.studyingModule.achieved);
        case 'ai':         return mul * (a.breakdown.aiSolutions.achieved - b.breakdown.aiSolutions.achieved);
        default: return 0;
      }
    });
  })();

  /* ── Summary stats ─────────────────────────────────────────── */
  const avg = rows.length
    ? rows.reduce((s, r) => s + r.totalScore, 0) / rows.length
    : 0;
  const top = rows.reduce((m, r) => (r.totalScore > m ? r.totalScore : m), 0);
  const certified = response?.data.filter((r) => r.adminScores.hasCertification).length ?? 0;

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Employee Evaluations</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Monthly performance overview — all consultants</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Month navigator ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-surface-container-lowest rounded-full px-4 py-2 border border-outline-variant shadow-sm">
          <button onClick={prevMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-on-surface min-w-[150px] text-center">
            {response?.period.label ?? new Date(period.year, period.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="p-1 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Search consultant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full sm:w-64 rounded-lg bg-surface-container-high border border-outline-variant px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      {response && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Consultants', value: response.count, sub: 'evaluated this month', color: 'text-primary' },
            { label: 'Average Score', value: avg.toFixed(1), sub: 'out of 100', color: avg >= 60 ? 'text-green-600' : 'text-orange-600' },
            { label: 'Top Score', value: top.toFixed(1), sub: 'highest performer', color: 'text-purple-600' },
            { label: 'Certified', value: certified, sub: 'bi-annual certification', color: 'text-amber-600' },
          ].map(({ label, value, sub, color }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant p-4">
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-[1rem] border border-outline-variant overflow-hidden">

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-surface-container-highest border-t-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <AlertTriangle className="w-8 h-8 text-error" />
            <p className="text-sm text-on-surface-variant">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20">
            <Award className="w-8 h-8 text-on-surface-variant/30" />
            <p className="text-sm text-on-surface-variant">No evaluations found for this period.</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-container-high/50 border-b border-outline-variant">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide w-10">#</th>
                  <Th label="Consultant" sortKey="name"       current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Tickets"    sortKey="tickets"    current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Ticket (50)" sortKey="ticket"   current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Cert (20)"  sortKey="cert"       current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="SLA (10)"   sortKey="sla"        current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Mgr (10)"   sortKey="manager"    current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Module (5)" sortKey="module"     current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="AI (5)"     sortKey="ai"         current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <Th label="Total"      sortKey="totalScore" current={sort.key} dir={sort.dir} onSort={handleSort} />
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const { consultant, breakdown, totalScore, ticketCount } = row;
                  const name = `${consultant.firstName} ${consultant.lastName}`;
                  return (
                    <motion.tr
                      key={consultant._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-outline-variant/50 hover:bg-surface-container-high/40 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="px-3 py-3 text-xs text-on-surface-variant tabular-nums">{i + 1}</td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {consultant.firstName[0]}{consultant.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-on-surface leading-tight">{name}</p>
                            <p className="text-xs text-on-surface-variant">{consultant.position ?? consultant.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Ticket count */}
                      <td className="px-3 py-3 text-on-surface tabular-nums">{ticketCount}</td>

                      {/* KPI columns */}
                      <td className="px-3 py-3">
                        <MiniBar value={breakdown.ticketPerformance.achieved} max={50} color="#3b82f6" />
                      </td>
                      <td className="px-3 py-3">
                        {breakdown.certification.hasCertification
                          ? <span className="text-xs font-semibold text-green-600">✓ Yes</span>
                          : <span className="text-xs text-on-surface-variant/50">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={breakdown.clientPunctuality.achieved} max={10} color="#f59e0b" />
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={breakdown.managerEvaluation.achieved} max={10} color="#8b5cf6" />
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={breakdown.studyingModule.achieved} max={5} color="#14b8a6" />
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={breakdown.aiSolutions.achieved} max={5} color="#f43f5e" />
                      </td>

                      {/* Total */}
                      <td className="px-3 py-3">
                        <ScoreBadge score={totalScore} />
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => navigate(`/consultants/evaluation/${consultant._id}`)}
                          className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                          title="Open evaluation"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
