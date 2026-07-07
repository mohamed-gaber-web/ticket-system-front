import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks/hooks';
import { getTaskStats } from '@/api/tasksApi';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { useAppDispatch } from '@/redux/hooks/hooks';
import type { Task, TaskStats } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import {
  CheckSquare, Loader2, Plus, Eye,
  AlertTriangle, TrendingUp, CalendarClock, ListChecks, ArrowRight,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Design tokens ────────────────────────────────────────────────
// Status palette is reserved (state, not identity) and matches the app's badges.
const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: '#f5a524' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  done: { label: 'Done', color: '#22c55e' },
};
// Single brand hue for magnitude bars — identity lives on the axis, not the color.
const BAR_HUE = '#2f6fed';
const ACCENT = '#D83A03'; // overdue / high-priority accent

const AXIS_TICK = { fill: '#94a3b8', fontSize: 12 };

// ── Small helpers ────────────────────────────────────────────────
const getCategoryName = (cat: any): string =>
  (typeof cat === 'object' && cat !== null ? cat.name : null) ?? '';
const assigneeName = (a: any): string | null =>
  typeof a === 'object' && a ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() : null;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysOverdue = (endDate?: string): number => {
  if (!endDate) return 0;
  const diff = Date.now() - new Date(endDate).getTime();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : 0;
};

// Theme-aware tooltip (Recharts default is a white box — this respects dark mode).
function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2 shadow-lg">
      {label != null && <p className="text-xs font-semibold text-on-surface mb-0.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-on-surface-variant">
          <span className="font-bold text-on-surface">{p.value}</span> {unit || p.name}
        </p>
      ))}
    </div>
  );
}

function Panel({ title, action, children, className = '' }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-surface-container-lowest rounded-[1rem] p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, icon, tone }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  tone: 'neutral' | 'blue' | 'green' | 'accent';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-container-lowest text-on-surface',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300',
    accent: 'bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300',
  };
  const iconTones: Record<string, string> = {
    neutral: 'text-on-surface-variant', blue: 'text-blue-500', green: 'text-green-500', accent: 'text-orange-500',
  };
  return (
    <div className={`rounded-[1rem] p-5 space-y-2 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
        <span className={iconTones[tone]}>{icon}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  );
}

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

function TaskRow({ task, onClick, trailing }: { task: Task; onClick: () => void; trailing?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {task.taskNumber && (
            <span className="text-[10px] font-mono font-semibold text-primary shrink-0">{task.taskNumber}</span>
          )}
          <p className="text-sm font-medium text-on-surface truncate">{task.name}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant">
          {getCategoryName(task.category) && <span>{getCategoryName(task.category)}</span>}
          {assigneeName(task.assignedTo) && <span>· {assigneeName(task.assignedTo)}</span>}
        </div>
      </div>
      {trailing ?? (
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[task.status]}`}>
          {STATUS_META[task.status]?.label}
        </span>
      )}
    </button>
  );
}

function ListPanel({ title, icon, tasks, empty, navigate, trailing }: {
  title: string; icon: React.ReactNode; tasks: Task[]; empty: string;
  navigate: (p: string) => void; trailing?: (t: Task) => React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-[1rem] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant/20">
        {icon}
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        <span className="ml-auto text-xs text-on-surface-variant">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-on-surface-variant/60 italic px-5 py-8 text-center">{empty}</p>
      ) : (
        <div className="divide-y divide-outline-variant/15">
          {tasks.map((t) => (
            <TaskRow key={t._id} task={t} onClick={() => navigate(`/tasks/${t._id}`)} trailing={trailing?.(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { departments } = useAppSelector((s) => s.departments);
  const { consultantDepartment, consultantRole } = useAppSelector((s) => s.auth);
  const isAdmin = consultantRole === 'admin';

  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTaskStats(isAdmin && deptFilter ? { department: deptFilter } : undefined)
      .then((res) => { if (!cancelled) setStats(res.data); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin, deptFilter]);

  const t = stats?.totals;

  const statusChartData = useMemo(
    () => (stats?.byStatus ?? [])
      .filter((s) => s.count > 0)
      .map((s) => ({ name: STATUS_META[s.status]?.label ?? s.status, value: s.count, color: STATUS_META[s.status]?.color ?? BAR_HUE })),
    [stats],
  );

  const deptName = departments.find((d) => d._id === consultantDepartment)?.name ?? consultantDepartment;

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isEmpty = !t || t.total === 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Tasks Dashboard</h1>
          <p className="text-on-surface-variant mt-1">
            {isAdmin
              ? (deptFilter ? `${departments.find((d) => d._id === deptFilter)?.name ?? ''} department` : 'Overview of all department tasks')
              : `Overview of ${deptName ?? 'your'} department tasks`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={() => navigate('/tasks')}>
            <Eye className="w-4 h-4 mr-2" />
            All Tasks
          </Button>
          <Button onClick={() => navigate('/tasks/create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-surface-container-lowest rounded-[1rem] text-center py-20">
          <CheckSquare className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
          <p className="text-on-surface text-lg font-semibold">No tasks yet</p>
          <p className="text-on-surface-variant text-sm mt-1">Create your first task to populate the dashboard</p>
          <Button onClick={() => navigate('/tasks/create')} className="mt-6">
            <Plus className="w-4 h-4 mr-2" /> Create Task
          </Button>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tasks" value={t!.total} sub={`${t!.pending} pending`} tone="neutral" icon={<CheckSquare className="w-5 h-5" />} />
            <StatCard label="In Progress" value={t!.inProgress} sub="Currently active" tone="blue" icon={<Loader2 className="w-5 h-5" />} />
            <StatCard
              label="Overdue" value={t!.overdue}
              sub={t!.overdue > 0 ? `Avg ${t!.avgDelayDays}d late` : 'All on schedule'}
              tone="accent" icon={<AlertTriangle className="w-5 h-5" />}
            />
            <StatCard label="Completion" value={`${t!.completionRate}%`} sub={`${t!.done} of ${t!.total} done`} tone="green" icon={<TrendingUp className="w-5 h-5" />} />
          </div>

          {/* Completion progress bar */}
          <div className="bg-surface-container-lowest rounded-[1rem] p-5">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-semibold text-on-surface">Overall Progress</span>
              <span className="text-on-surface-variant">{t!.done}/{t!.total} completed</span>
            </div>
            <div className="h-3 w-full rounded-full bg-surface-container-high overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: `${(t!.done / t!.total) * 100}%` }} />
              <div className="h-full bg-blue-500" style={{ width: `${(t!.inProgress / t!.total) * 100}%` }} />
              <div className="h-full bg-yellow-400" style={{ width: `${(t!.pending / t!.total) * 100}%` }} />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Done {t!.done}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> In Progress {t!.inProgress}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" /> Pending {t!.pending}</span>
            </div>
          </div>

          {/* Charts: status donut + weekly workload */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Status Breakdown">
              {statusChartData.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 py-16 text-center">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                        {statusChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip unit="tasks" />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {statusChartData.map((e) => (
                      <div key={e.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-on-surface-variant">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} /> {e.name}
                        </span>
                        <span className="font-semibold text-on-surface">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            <Panel title="Weekly Workload" className="lg:col-span-2">
              {stats!.byWeek.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 py-16 text-center">No scheduled weeks</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats!.byWeek} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(w) => `W${w}`} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#64748b', fillOpacity: 0.08 }} content={<ChartTooltip unit="tasks" />} labelFormatter={(w) => `Week ${w}`} />
                    <Bar dataKey="count" fill={BAR_HUE} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Charts: category + assignees (+ department for admin) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Tasks by Category">
              {stats!.byCategory.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 py-16 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, stats!.byCategory.length * 38)}>
                  <BarChart data={stats!.byCategory} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                    <Tooltip cursor={{ fill: '#64748b', fillOpacity: 0.08 }} content={<ChartTooltip unit="tasks" />} />
                    <Bar dataKey="count" fill={BAR_HUE} radius={[0, 4, 4, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            <Panel title="Top Assignees">
              {stats!.topAssignees.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 py-16 text-center">No assigned tasks</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, stats!.topAssignees.length * 38)}>
                  <BarChart data={stats!.topAssignees} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                    <Tooltip cursor={{ fill: '#64748b', fillOpacity: 0.08 }} content={<ChartTooltip unit="tasks" />} />
                    <Bar dataKey="count" fill={BAR_HUE} radius={[0, 4, 4, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {isAdmin && stats!.byDepartment.length > 1 && (
            <Panel title="Tasks by Department">
              <ResponsiveContainer width="100%" height={Math.max(200, stats!.byDepartment.length * 38)}>
                <BarChart data={stats!.byDepartment} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.15} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={130} />
                  <Tooltip cursor={{ fill: '#64748b', fillOpacity: 0.08 }} content={<ChartTooltip unit="tasks" />} />
                  <Bar dataKey="count" fill={BAR_HUE} radius={[0, 4, 4, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          )}

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ListPanel
              title="Overdue" icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
              tasks={stats!.overdue} empty="Nothing overdue 🎉" navigate={navigate}
              trailing={(t) => (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: ACCENT }}>
                  {daysOverdue(t.endDate)}d late
                </span>
              )}
            />
            <ListPanel
              title="Upcoming Deadlines" icon={<CalendarClock className="w-4 h-4 text-blue-500" />}
              tasks={stats!.upcoming} empty="No upcoming deadlines" navigate={navigate}
              trailing={(t) => <span className="shrink-0 text-xs font-medium text-on-surface-variant">{fmtDate(t.endDate)}</span>}
            />
            <ListPanel
              title="Recent Tasks" icon={<ListChecks className="w-4 h-4 text-on-surface-variant" />}
              tasks={stats!.recent} empty="No tasks yet" navigate={navigate}
            />
          </div>

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => navigate('/tasks')} className="text-on-surface-variant">
              View all tasks <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
