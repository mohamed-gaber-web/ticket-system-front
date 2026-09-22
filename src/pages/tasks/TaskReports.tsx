import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchTaskCategories } from '@/redux/slices/taskCategorySlice';
import { getTaskReport } from '@/api/tasksApi';
import type { Task, TaskReport, TaskReportBreakdown, TaskReportParams, TaskReportScope, TaskStatus } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import { getWeekDateRange } from '@/utils/weekUtils';
import {
  ArrowLeft, BarChart3, Download, FileSpreadsheet, FileText, Loader2, RotateCcw,
  Search, CheckCircle2, Clock, AlertTriangle, Timer, GitBranch, ListChecks, Eye,
  CalendarRange, CalendarDays,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { shapeArabic, hasArabic, anyArabic } from '@/utils/arabicText';
import { registerArabicFont, pdfSafeLatin, replaceUnsupportedSymbols } from '@/utils/pdfFont';
import { saveCsv } from '@/utils/exportFile';
import { toast } from 'sonner';

// ── Design tokens ────────────────────────────────────────────────
// Status palette (state, not identity). Steps validated for the light surface:
// lightness band, CVD separation and >= 3:1 contrast all pass.
const STATUS_META: Record<TaskStatus, { label: string; color: string; pill: string }> = {
  pending: { label: 'Pending', color: '#d97706', pill: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', color: '#2563eb', pill: 'bg-blue-100 text-blue-800' },
  done: { label: 'Done', color: '#16a34a', pill: 'bg-green-100 text-green-800' },
};
const STATUS_ORDER: TaskStatus[] = ['pending', 'in_progress', 'done'];
const AXIS_TICK = { fill: '#94a3b8', fontSize: 12 };

type BreakdownKey = 'byAssignee' | 'byResponsible' | 'byCategory' | 'byDepartment' | 'byWeek';
const BREAKDOWNS: { key: BreakdownKey; label: string }[] = [
  { key: 'byAssignee', label: 'By Assignee' },
  { key: 'byResponsible', label: 'By Responsible' },
  { key: 'byCategory', label: 'By Category' },
  { key: 'byDepartment', label: 'By Department' },
  { key: 'byWeek', label: 'By Start Week' },
];

const SCOPES: { value: TaskReportScope; label: string }[] = [
  { value: 'all', label: 'Main + subtasks' },
  { value: 'main', label: 'Main tasks only' },
  { value: 'sub', label: 'Subtasks only' },
];

// ── Helpers ──────────────────────────────────────────────────────
const nameOf = (v: any): string => (typeof v === 'object' && v !== null ? v.name ?? '' : '');
const personName = (c: any): string =>
  typeof c === 'object' && c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '';
const parentLabel = (p: any): string =>
  typeof p === 'object' && p ? (p.taskNumber ? `${p.taskNumber} · ${p.name}` : p.name) : '';
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const today = () => new Date().toISOString().split('T')[0];

const INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

// The report period is either an explicit start/end date range or a single week.
type PeriodMode = 'dates' | 'week';
const PERIOD_MODES: { value: PeriodMode; label: string; icon: React.ReactNode }[] = [
  { value: 'dates', label: 'Date range', icon: <CalendarRange className="w-3.5 h-3.5" /> },
  { value: 'week', label: 'Week', icon: <CalendarDays className="w-3.5 h-3.5" /> },
];

const EMPTY_FILTERS = {
  periodMode: 'dates' as PeriodMode,
  search: '', from: '', to: '', department: '', category: '', status: '' as TaskStatus | '',
  assignedTo: '', responsible: '', scheduledWeek: '', scope: 'all' as TaskReportScope,
};
type Filters = typeof EMPTY_FILTERS;

const parentId = (p: any): string => (typeof p === 'object' && p ? p._id : p) ?? '';

/**
 * A line of the task list: a main task (level 0) followed by its subtasks
 * (level 1). Subtasks whose main task didn't match the filters are still shown,
 * grouped under a header naming the main task.
 */
type ReportLine =
  | { kind: 'task'; task: Task; level: 0 | 1; subTotal: number; subDone: number }
  | { kind: 'group'; label: string; count: number };

const groupTasks = (tasks: Task[]): ReportLine[] => {
  const subsByParent = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.parentTask) continue;
    const pid = parentId(t.parentTask);
    subsByParent.set(pid, [...(subsByParent.get(pid) ?? []), t]);
  }
  const byStart = (a: Task, b: Task) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime();
  const lines: ReportLine[] = [];
  const placed = new Set<string>();
  for (const main of tasks.filter((t) => !t.parentTask)) {
    const subs = (subsByParent.get(main._id) ?? []).sort(byStart);
    lines.push({ kind: 'task', task: main, level: 0, subTotal: subs.length, subDone: subs.filter((x) => x.status === 'done').length });
    for (const sub of subs) { lines.push({ kind: 'task', task: sub, level: 1, subTotal: 0, subDone: 0 }); placed.add(sub._id); }
  }
  // Orphans: subtasks whose main task is outside the current filters.
  for (const [pid, subs] of subsByParent) {
    const rest = subs.filter((x) => !placed.has(x._id)).sort(byStart);
    if (!rest.length) continue;
    lines.push({ kind: 'group', label: parentLabel(rest[0].parentTask) || `Main task ${pid}`, count: rest.length });
    for (const sub of rest) lines.push({ kind: 'task', task: sub, level: 1, subTotal: 0, subDone: 0 });
  }
  return lines;
};

// Rows for the task detail table and every export share one shape.
const TASK_HEADERS = [
  'Task #', 'Type', 'Main Task', 'Name', 'Subtasks', 'Description', 'Category', 'Department', 'Assigned To',
  'Responsible', 'Start Week', 'End Week', 'Duration (hrs)', 'Start Date', 'End Date', 'Status', 'Delay (days)', 'Completed At',
];
const taskRow = (t: Task, opts: { level?: 0 | 1; subTotal?: number; subDone?: number } = {}): (string | number)[] => [
  t.taskNumber ?? '',
  t.parentTask ? 'Subtask' : 'Main',
  parentLabel(t.parentTask),
  opts.level === 1 ? `    ↳ ${t.name}` : t.name,
  t.parentTask ? '' : opts.subTotal ? `${opts.subDone ?? 0}/${opts.subTotal} done` : '0',
  t.description ?? '',
  nameOf(t.category),
  nameOf(t.department),
  personName(t.assignedTo),
  personName(t.responsible),
  t.scheduledWeek ?? '',
  t.endWeek ?? t.scheduledWeek ?? '',
  t.duration ?? '',
  fmtDate(t.startDate),
  fmtDate(t.endDate),
  STATUS_META[t.status]?.label ?? t.status,
  t.delayDays ?? 0,
  fmtDate(t.completedAt ?? undefined),
];

const BREAKDOWN_HEADERS = ['Name', 'Total', 'Pending', 'In Progress', 'Done', 'Overdue', 'Completion %', 'Hours', 'Avg delay (days)'];
const breakdownRow = (b: TaskReportBreakdown): (string | number)[] => [
  b.name, b.total, b.pending, b.inProgress, b.done, b.overdue, pct(b.done, b.total),
  Math.round(b.totalDuration * 10) / 10,
  b.delayed > 0 ? Math.round((b.totalDelayDays / b.delayed) * 10) / 10 : 0,
];

// Theme-aware tooltip (Recharts default is a white box).
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-high px-3 py-2 shadow-lg">
      {label != null && <p className="text-xs font-semibold text-on-surface mb-0.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
          <span className="font-bold text-on-surface">{p.value}</span> {p.name}
        </p>
      ))}
    </div>
  );
}

function StatTile({ label, value, sub, icon, tone = 'neutral' }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'accent' | 'yellow';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-container-lowest text-on-surface',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300',
    accent: 'bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300',
  };
  return (
    <div className={`rounded-[1rem] p-4 space-y-1.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</p>
        <span className="opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  );
}

function Panel({ title, action, children, className = '' }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-surface-container-lowest rounded-[1rem] p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function TaskReports() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { departments } = useAppSelector((s) => s.departments);
  const { consultants } = useAppSelector((s) => s.consultants);
  const { taskCategories } = useAppSelector((s) => s.taskCategories);
  const { consultantDepartment, consultantRole } = useAppSelector((s) => s.auth);
  const isAdmin = consultantRole === 'admin';

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [report, setReport] = useState<TaskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<BreakdownKey>('byAssignee');
  const [showAllTasks, setShowAllTasks] = useState(false);

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 }));
    dispatch(fetchTaskCategories({ limit: 1000 }));
  }, [dispatch]);

  const params = useMemo<TaskReportParams>(() => {
    const p: TaskReportParams = { scope: applied.scope };
    if (applied.search) p.search = applied.search;
    if (applied.periodMode === 'dates') {
      if (applied.from) p.from = applied.from;
      if (applied.to) p.to = applied.to;
    }
    if (isAdmin && applied.department) p.department = applied.department;
    if (applied.category) p.category = applied.category;
    if (applied.status) p.status = applied.status;
    if (applied.assignedTo) p.assignedTo = applied.assignedTo;
    if (applied.responsible) p.responsible = applied.responsible;
    if (applied.periodMode === 'week' && applied.scheduledWeek) p.scheduledWeek = Number(applied.scheduledWeek);
    return p;
  }, [applied, isAdmin]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTaskReport(params)
      .then((res) => { if (!cancelled) setReport(res.data); })
      .catch(() => { if (!cancelled) { setReport(null); toast.error('Failed to load task report'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params]);

  const set = (field: keyof Filters, value: string) => setDraft((f) => ({ ...f, [field]: value }));
  const apply = (e?: React.FormEvent) => { e?.preventDefault(); setApplied(draft); setShowAllTasks(false); };
  const reset = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setShowAllTasks(false); };

  const scopeLabel = useMemo(() => {
    if (!isAdmin && consultantDepartment) {
      return `${departments.find((d) => d._id === consultantDepartment)?.name ?? 'Department'} tasks`;
    }
    if (applied.department) return `${departments.find((d) => d._id === applied.department)?.name ?? ''} tasks`;
    return 'All departments';
  }, [isAdmin, consultantDepartment, applied.department, departments]);

  const periodLabel = useMemo(() => {
    if (applied.periodMode === 'week') {
      return applied.scheduledWeek
        ? `Week ${applied.scheduledWeek} (${getWeekDateRange(Number(applied.scheduledWeek))})`
        : 'All weeks';
    }
    return applied.from || applied.to
      ? `${applied.from ? fmtDate(applied.from) : '…'} → ${applied.to ? fmtDate(applied.to) : '…'}`
      : 'All time';
  }, [applied.periodMode, applied.scheduledWeek, applied.from, applied.to]);

  // File name carries the chosen period so exports are easy to tell apart.
  const periodSlug = useMemo(() => {
    if (applied.periodMode === 'week') return applied.scheduledWeek ? `W${applied.scheduledWeek}` : 'all-weeks';
    if (applied.from || applied.to) return `${applied.from || 'start'}_to_${applied.to || 'end'}`;
    return 'all-time';
  }, [applied.periodMode, applied.scheduledWeek, applied.from, applied.to]);

  // ── Chart data ────────────────────────────────────────────────
  const statusData = useMemo(
    () => (report?.byStatus ?? []).map((s) => ({ name: STATUS_META[s.status].label, value: s.count, fill: STATUS_META[s.status].color })),
    [report]
  );
  const assigneeChart = useMemo(
    () => (report?.byAssignee ?? []).slice(0, 10).map((b) => ({
      name: b.name, Pending: b.pending, 'In Progress': b.inProgress, Done: b.done,
    })),
    [report]
  );

  const rows = report?.[breakdown] ?? [];
  const tasks = report?.tasks ?? [];
  const lines = useMemo(() => groupTasks(tasks), [tasks]);
  const visibleLines = showAllTasks ? lines : lines.slice(0, 60);
  // Export rows follow the same grouping: main task, then its subtasks indented.
  const exportRows = useMemo(
    () => lines.filter((l): l is Extract<ReportLine, { kind: 'task' }> => l.kind === 'task').map((l) => taskRow(l.task, l)),
    [lines]
  );
  const s = report?.summary;

  // ── Exports ───────────────────────────────────────────────────
  const filename = useCallback((ext: string) => `task-report-${periodSlug}-${today()}.${ext}`, [periodSlug]);

  const summaryRows = (): (string | number)[][] => {
    if (!s) return [];
    return [
      ['Scope', scopeLabel],
      ['Report by', applied.periodMode === 'week' ? 'Week' : 'Date range (start / end)'],
      ['Period', periodLabel],
      ['Task type', SCOPES.find((x) => x.value === applied.scope)?.label ?? ''],
      ['Generated', new Date(report!.generatedAt).toLocaleString()],
      [],
      ['Total tasks', s.total],
      ['Main tasks', s.mainTasks],
      ['Subtasks', s.subTasks],
      ['Pending', s.pending],
      ['In progress', s.inProgress],
      ['Done', s.done],
      ['Overdue (open, past end date)', s.overdue],
      ['Completed late', s.doneLate],
      ['Completion rate %', s.completionRate],
      ['On-time completion %', s.onTimeRate],
      ['Avg delay (days)', s.avgDelayDays],
      ['Total planned hours', s.totalDuration],
    ];
  };

  const autoWidth = (ws: XLSX.WorkSheet, data: (string | number)[][]) => {
    const cols = Math.max(...data.map((r) => r.length));
    ws['!cols'] = Array.from({ length: cols }, (_, i) => ({
      wch: Math.min(60, Math.max(8, ...data.map((r) => String(r[i] ?? '').length)) + 2),
    }));
  };

  const exportExcel = () => {
    if (!report || !s) { toast.error('No data to export'); return; }
    try {
      const wb = XLSX.utils.book_new();
      const summary = summaryRows();
      const wsSummary = XLSX.utils.aoa_to_sheet([['Task Report'], [], ...summary]);
      autoWidth(wsSummary, summary);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      BREAKDOWNS.forEach(({ key, label }) => {
        const data = [BREAKDOWN_HEADERS, ...report[key].map(breakdownRow)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autoWidth(ws, data);
        XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
      });

      const taskData = [TASK_HEADERS, ...exportRows];
      const wsTasks = XLSX.utils.aoa_to_sheet(taskData);
      autoWidth(wsTasks, taskData);
      XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename('xlsx'));
      toast.success('Report exported as Excel');
    } catch {
      toast.error('Failed to export Excel');
    }
  };

  const exportCsv = () => {
    if (!tasks.length) { toast.error('No data to export'); return; }
    try {
      const ws = XLSX.utils.aoa_to_sheet([TASK_HEADERS, ...exportRows]);
      // Written with a BOM so Excel reads the Arabic columns as UTF-8.
      saveCsv(XLSX.utils.sheet_to_csv(ws), filename('csv'));
      toast.success('Task list exported as CSV');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const exportPdf = async () => {
    if (!report || !s) { toast.error('No data to export'); return; }
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      // jsPDF's built-in fonts hold no Arabic glyphs and it applies no shaping
      // or bidi, so Arabic reports get an embedded font and every cell goes
      // through shapeArabic(). The font is only fetched when it is needed.
      const needsArabic = anyArabic([summaryRows(), exportRows, ...BREAKDOWNS.map(({ key }) => report[key].map(breakdownRow)), [scopeLabel, periodLabel]]);
      const arabicFont = needsArabic ? await registerArabicFont(doc) : null;
      if (needsArabic && !arabicFont) toast.error('Arabic font unavailable — the PDF may not show Arabic text');
      // Latin keeps Helvetica; only Arabic cells switch font, so English
      // reports look exactly as before.
      // One place prepares every string: Arabic is shaped for the embedded
      // font, Latin is limited to what the built-in WinAnsi fonts can encode
      // (a stray "↳" garbles the whole run it sits in).
      const forPdf = (value: unknown) => {
        const text = replaceUnsupportedSymbols(String(value ?? ''));
        return hasArabic(text) ? shapeArabic(text) : pdfSafeLatin(text);
      };
      const write = (text: string, x: number, y: number) => {
        const out = forPdf(text);
        doc.setFont(arabicFont && hasArabic(out) ? arabicFont : 'helvetica', 'normal');
        doc.text(out, x, y);
      };
      const styleArabicCells = (data: CellHookData) => {
        if (!arabicFont) return;
        if (data.cell.text.some((line) => hasArabic(line))) {
          data.cell.styles.font = arabicFont;
          data.cell.styles.halign = 'right';
        }
      };

      doc.setFontSize(18);
      write('Task Report', 14, 18);
      doc.setFontSize(10);
      write(`${scopeLabel} · ${periodLabel} · ${SCOPES.find((x) => x.value === applied.scope)?.label}`, 14, 25);
      write(`Generated on ${new Date(report.generatedAt).toLocaleString()}`, 14, 30);

      autoTable(doc, {
        startY: 36,
        head: [['Total', 'Main', 'Subtasks', 'Pending', 'In Progress', 'Done', 'Overdue', 'Completion', 'On-time', 'Avg delay', 'Hours']],
        body: [[
          s.total, s.mainTasks, s.subTasks, s.pending, s.inProgress, s.done, s.overdue,
          `${s.completionRate}%`, `${s.onTimeRate}%`, `${s.avgDelayDays}d`, s.totalDuration,
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [47, 111, 237] },
      });

      BREAKDOWNS.forEach(({ key, label }) => {
        if (!report[key].length) return;
        const y = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(12);
        write(label, 14, y);
        autoTable(doc, {
          startY: y + 3,
          head: [BREAKDOWN_HEADERS.map(pdfSafeLatin)],
          body: report[key].map((r) => breakdownRow(r).map(forPdf)),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [47, 111, 237] },
          didParseCell: styleArabicCells,
        });
      });

      doc.addPage();
      doc.setFontSize(12);
      write(`Tasks (${tasks.length})`, 14, 16);
      const subRowIdx = new Set<number>();
      const pdfBody = exportRows.map((r, i) => {
        if (r[1] === 'Subtask') subRowIdx.add(i);
        const weeks = r[11] !== '' && r[11] !== r[10] ? `W${r[10]} – W${r[11]}` : r[10] !== '' ? `W${r[10]}` : '';
        // Task #, Name (indented for subtasks), Subtasks, Category, Assigned, Responsible, Weeks, Hrs, Start, End, Status, Delay
        return [r[0], r[3], r[4], r[6], r[8], r[9], weeks, r[12], r[13], r[14], r[15], r[16]].map(forPdf);
      });
      autoTable(doc, {
        startY: 20,
        head: [['Task #', 'Task / ↳ Subtask', 'Subtasks', 'Category', 'Assigned To', 'Responsible', 'Weeks', 'Hrs', 'Start', 'End', 'Status', 'Delay'].map(pdfSafeLatin)],
        body: pdfBody,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [47, 111, 237] },
        columnStyles: { 1: { cellWidth: 60 } },
        // Subtask rows: lighter text on a grey tint so the hierarchy is visible on paper.
        didParseCell: (data) => {
          styleArabicCells(data);
          if (data.section === 'body' && subRowIdx.has(data.row.index)) {
            data.cell.styles.fillColor = [245, 246, 250];
            data.cell.styles.textColor = [90, 96, 110];
          } else if (data.section === 'body' && data.column.index === 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      doc.save(filename('pdf'));
      toast.success('Report exported as PDF');
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/tasks/dashboard')} aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Task Reports
            </h1>
            <p className="text-sm text-on-surface-variant mt-0.5">{scopeLabel} · {periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || !tasks.length}>
            <FileText className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading || !report}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={loading || !report}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={apply} className="bg-surface-container-lowest rounded-[1rem] p-4 space-y-3">
        {/* Period: by start/end date or by week */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
          <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 w-fit">
            {PERIOD_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => set('periodMode', m.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  draft.periodMode === m.value
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          {draft.periodMode === 'dates' ? (
            <>
              <div className="flex items-center gap-2 lg:col-span-2">
                <label className="text-xs font-medium text-on-surface-variant whitespace-nowrap w-10">Start</label>
                <input type="date" value={draft.from} onChange={(e) => set('from', e.target.value)} max={draft.to || undefined} className={INPUT_CLS} />
              </div>
              <div className="flex items-center gap-2 lg:col-span-2">
                <label className="text-xs font-medium text-on-surface-variant whitespace-nowrap w-10">End</label>
                <input type="date" value={draft.to} onChange={(e) => set('to', e.target.value)} min={draft.from || undefined} className={INPUT_CLS} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 lg:col-span-4">
              <label className="text-xs font-medium text-on-surface-variant whitespace-nowrap w-10">Week</label>
              <select value={draft.scheduledWeek} onChange={(e) => set('scheduledWeek', e.target.value)} className={INPUT_CLS}>
                <option value="">All weeks</option>
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={String(w)}>Week {w} — {getWeekDateRange(w)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-[11px] text-on-surface-variant -mt-1">
          {draft.periodMode === 'dates'
            ? 'Includes every task whose start–end range overlaps the selected dates.'
            : 'Includes every task whose start–end weeks cover the selected week.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              value={draft.search}
              onChange={(e) => set('search', e.target.value)}
              placeholder="Search by task #, name or description…"
              className={`${INPUT_CLS} pl-9`}
            />
          </div>
          <select value={draft.scope} onChange={(e) => set('scope', e.target.value)} className={INPUT_CLS}>
            {SCOPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {isAdmin && (
            <select value={draft.department} onChange={(e) => set('department', e.target.value)} className={INPUT_CLS}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          )}
          <select value={draft.category} onChange={(e) => set('category', e.target.value)} className={INPUT_CLS}>
            <option value="">All Categories</option>
            {taskCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={draft.status} onChange={(e) => set('status', e.target.value)} className={INPUT_CLS}>
            <option value="">All Statuses</option>
            {STATUS_ORDER.map((st) => <option key={st} value={st}>{STATUS_META[st].label}</option>)}
          </select>
          <select value={draft.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} className={INPUT_CLS}>
            <option value="">All Assignees</option>
            {consultants.map((c) => <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>)}
          </select>
          <select value={draft.responsible} onChange={(e) => set('responsible', e.target.value)} className={INPUT_CLS}>
            <option value="">All Responsible</option>
            {consultants.map((c) => <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Run Report
          </Button>
        </div>
      </form>

      {loading && !report ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : !report || !s ? (
        <div className="bg-surface-container-lowest rounded-[1rem] p-12 text-center text-sm text-on-surface-variant">
          Could not load the report.
        </div>
      ) : (
        <div className={`space-y-6 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <StatTile label="Total" value={s.total} sub={`${s.mainTasks} main · ${s.subTasks} sub`} icon={<ListChecks className="w-4 h-4" />} />
            <StatTile label="Pending" value={s.pending} sub={`${pct(s.pending, s.total)}% of total`} icon={<Clock className="w-4 h-4" />} tone="yellow" />
            <StatTile label="In Progress" value={s.inProgress} sub={`${pct(s.inProgress, s.total)}% of total`} icon={<Loader2 className="w-4 h-4" />} tone="blue" />
            <StatTile label="Done" value={s.done} sub={`${s.completionRate}% completion`} icon={<CheckCircle2 className="w-4 h-4" />} tone="green" />
            <StatTile label="Overdue" value={s.overdue} sub="open & past end date" icon={<AlertTriangle className="w-4 h-4" />} tone="accent" />
            <StatTile label="On-time" value={`${s.onTimeRate}%`} sub={`${s.doneLate} finished late`} icon={<CheckCircle2 className="w-4 h-4" />} />
            <StatTile label="Avg delay" value={`${s.avgDelayDays}d`} sub="across delayed tasks" icon={<Timer className="w-4 h-4" />} />
            <StatTile label="Planned hours" value={s.totalDuration} sub="sum of durations" icon={<Timer className="w-4 h-4" />} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel title="Status split">
              {s.total === 0 ? (
                <p className="text-sm text-on-surface-variant/60 italic text-center py-10">No tasks match</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                        {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="space-y-2 flex-1">
                    {statusData.map((d) => (
                      <li key={d.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-on-surface-variant">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                          {d.name}
                        </span>
                        <span className="font-semibold text-on-surface">
                          {d.value} <span className="text-xs text-on-surface-variant font-normal">({pct(d.value, s.total)}%)</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            <Panel title="Workload by assignee (top 10)" className="xl:col-span-2">
              {assigneeChart.length === 0 ? (
                <p className="text-sm text-on-surface-variant/60 italic text-center py-10">No tasks match</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, assigneeChart.length * 32)}>
                  <BarChart data={assigneeChart} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={6}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    {STATUS_ORDER.map((st, i) => (
                      <Bar
                        key={st}
                        dataKey={STATUS_META[st].label}
                        stackId="a"
                        fill={STATUS_META[st].color}
                        stroke="#fff"
                        strokeWidth={1}
                        radius={i === STATUS_ORDER.length - 1 ? [0, 4, 4, 0] : 0}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* Breakdown table */}
          <Panel
            title="Breakdown"
            action={
              <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1">
                {BREAKDOWNS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => setBreakdown(b.key)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      breakdown === b.key ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-on-surface-variant border-b border-outline-variant/20">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Pending</th>
                    <th className="px-3 py-2 text-right">In Progress</th>
                    <th className="px-3 py-2 text-right">Done</th>
                    <th className="px-3 py-2 text-right">Overdue</th>
                    <th className="px-3 py-2 w-44">Completion</th>
                    <th className="px-3 py-2 text-right">Hours</th>
                    <th className="px-3 py-2 text-right">Avg delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-on-surface-variant/60 italic">No data</td></tr>
                  ) : rows.map((b) => {
                    const completion = pct(b.done, b.total);
                    const avgDelay = b.delayed > 0 ? Math.round((b.totalDelayDays / b.delayed) * 10) / 10 : 0;
                    return (
                      <tr key={String(b._id)} className="hover:bg-surface-container-low/50">
                        <td className="px-3 py-2 font-medium text-on-surface">
                          {breakdown === 'byWeek' && typeof b._id === 'number'
                            ? <>W{b._id} <span className="text-xs text-on-surface-variant font-normal">— {getWeekDateRange(b._id)}</span></>
                            : b.name}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-on-surface">{b.total}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{b.pending}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{b.inProgress}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{b.done}</td>
                        <td className="px-3 py-2 text-right">
                          {b.overdue > 0
                            ? <span className="inline-flex px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold">{b.overdue}</span>
                            : <span className="text-on-surface-variant/50">0</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${completion}%`, background: STATUS_META.done.color }} />
                            </div>
                            <span className="text-xs font-semibold text-on-surface w-9 text-right">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{Math.round(b.totalDuration * 10) / 10}</td>
                        <td className="px-3 py-2 text-right text-on-surface-variant">{avgDelay > 0 ? `${avgDelay}d` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Task detail */}
          <Panel
            title={`Tasks (${tasks.length}${report.truncated ? '+, showing first 5000' : ''})`}
            action={lines.length > 60 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllTasks((v) => !v)}>
                {showAllTasks ? 'Show first 60 rows' : `Show all ${tasks.length} tasks`}
              </Button>
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-on-surface-variant border-b border-outline-variant/20">
                    <th className="px-3 py-2">Task #</th>
                    <th className="px-3 py-2">Task / subtask</th>
                    <th className="px-3 py-2">Subtasks</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Assigned To</th>
                    <th className="px-3 py-2">Responsible</th>
                    <th className="px-3 py-2">Weeks</th>
                    <th className="px-3 py-2 text-right">Hrs</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Delay</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {visibleLines.length === 0 ? (
                    <tr><td colSpan={13} className="px-3 py-8 text-center text-on-surface-variant/60 italic">No tasks match the filters</td></tr>
                  ) : visibleLines.map((line, i) => line.kind === 'group' ? (
                    <tr key={`g-${i}`} className="bg-surface-container-low/60">
                      <td colSpan={13} className="px-3 py-1.5 text-xs text-on-surface-variant">
                        <GitBranch className="inline w-3 h-3 mr-1 -mt-0.5" />
                        Subtasks of <span className="font-semibold text-on-surface">{line.label}</span>
                        <span className="opacity-70"> · main task is outside the current filters · {line.count} subtask{line.count === 1 ? '' : 's'}</span>
                      </td>
                    </tr>
                  ) : (() => { const t = line.task; const sub = line.level === 1; return (
                    <tr key={t._id} className={`hover:bg-surface-container-low/50 ${sub ? 'bg-surface-container-low/30' : ''}`}>
                      <td className={`px-3 py-2 font-mono text-xs font-semibold whitespace-nowrap ${sub ? 'text-on-surface-variant' : 'text-primary'}`}>{t.taskNumber ?? '—'}</td>
                      <td className="px-3 py-2">
                        <div className={`flex items-center gap-1.5 min-w-[12rem] ${sub ? 'pl-6' : ''}`}>
                          {sub && <span className="text-on-surface-variant/60 shrink-0">↳</span>}
                          <span className={`line-clamp-1 ${sub ? 'text-on-surface' : 'font-semibold text-on-surface'}`}>{t.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {!sub && line.subTotal > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden">
                              <span className="block h-full rounded-full" style={{ width: `${pct(line.subDone, line.subTotal)}%`, background: STATUS_META.done.color }} />
                            </span>
                            <span className="font-semibold text-on-surface">{line.subDone}/{line.subTotal}</span>
                            <span className="text-on-surface-variant">done</span>
                          </span>
                        ) : sub ? <span className="text-xs text-on-surface-variant">—</span> : <span className="text-xs text-on-surface-variant/60">none</span>}
                      </td>
                      <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{nameOf(t.category) || '—'}</td>
                      <td className="px-3 py-2 text-on-surface whitespace-nowrap">{personName(t.assignedTo) || '—'}</td>
                      <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{personName(t.responsible) || '—'}</td>
                      <td className="px-3 py-2">
                        {t.scheduledWeek != null
                          ? <span className="inline-flex px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold whitespace-nowrap">{t.endWeek != null && t.endWeek !== t.scheduledWeek ? `W${t.scheduledWeek} – W${t.endWeek}` : `W${t.scheduledWeek}`}</span>
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-on-surface whitespace-nowrap">{t.duration != null ? `${t.duration}h` : '—'}</td>
                      <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{fmtDate(t.startDate) || '—'}</td>
                      <td className="px-3 py-2 text-on-surface-variant whitespace-nowrap">{fmtDate(t.endDate) || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_META[t.status]?.pill}`}>
                          {STATUS_META[t.status]?.label ?? t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {(t.delayDays ?? 0) > 0
                          ? <span className="inline-flex px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold">+{t.delayDays}d</span>
                          : <span className="text-xs text-green-700 font-medium">On time</span>}
                      </td>
                      <td className="px-3 py-2">
                        <Button size="icon-sm" variant="ghost" onClick={() => navigate(`/tasks/${t._id}`)} aria-label="View task">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ); })())}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
