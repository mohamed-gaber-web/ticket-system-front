import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { SearchSelect } from '@/components/ui/search-select';
import { weekRangeLabel } from '@/utils/weekUtils';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { useAccess } from '@/redux/hooks/useAccess';
import { fetchTasks, deleteTask } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchTaskCategories } from '@/redux/slices/taskCategorySlice';
import { getTasks } from '@/api/tasksApi';
import type { Task, TaskStatus, TaskSortField } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import {
  Plus, CheckSquare, Search, Trash2, Eye, Edit,
  ChevronRight, ChevronDown, GitBranch, Loader2,
  Download, ArrowUp, ArrowDown, ChevronsUpDown,
  X, SlidersHorizontal, CircleDot, FolderKanban, Building2, UserCheck, CalendarDays, RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

const MySwal = withReactContent(Swal);

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

const getDeptId = (dept: any): string => (typeof dept === 'object' && dept !== null ? dept._id : dept) ?? '';
const getDeptName = (dept: any): string => (typeof dept === 'object' && dept !== null ? dept.name : null) ?? '';
const getCategoryName = (cat: any): string => (typeof cat === 'object' && cat !== null ? cat.name : null) ?? '';
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

function getWeekDateRange(weekNum: number, year = new Date().getFullYear()) {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const daysToFirstSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
  const firstSat = new Date(year, 0, 1 + daysToFirstSat);
  const start = new Date(firstSat);
  start.setDate(firstSat.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Total data columns (excluding the expand column) — used for subtask row colSpan.
const DATA_COLSPAN = 12;

export default function Tasks() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tasks, loading, total } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);
  const { consultantDepartment, user } = useAppSelector((state) => state.auth);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { taskCategories } = useAppSelector((state) => state.taskCategories);
  const { isAdmin, isManagerOrAdmin } = useAccess();
  // Plain employees open on "my tasks"; managers and admins on the whole
  // department. The API pins non-admins to their department either way.
  const [mineOnly, setMineOnly] = useState(!isManagerOrAdmin);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState(searchParams.get('department') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [sortField, setSortField] = useState<TaskSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const limit = 20;

  // Subtask expand state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [subTasksMap, setSubTasksMap] = useState<Record<string, Task[]>>({});
  const [loadingSubIds, setLoadingSubIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 } as any));
    dispatch(fetchTaskCategories({ limit: 1000 }));
  }, []);

  const buildParams = useCallback((extra: Record<string, any> = {}) => {
    const params: any = { ...extra };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (isAdmin && deptFilter) params.department = deptFilter;
    if (mineOnly) params.mine = 'true';
    if (categoryFilter) params.category = categoryFilter;
    if (startDateFilter) params.startDate = startDateFilter;
    if (endDateFilter) params.endDate = endDateFilter;
    if (assignedToFilter) params.assignedTo = assignedToFilter;
    if (weekFilter) params.scheduledWeek = Number(weekFilter);
    params.sort = sortField;
    params.order = sortOrder;
    return params;
  }, [search, statusFilter, deptFilter, categoryFilter, startDateFilter, endDateFilter, assignedToFilter, weekFilter, sortField, sortOrder, isAdmin, mineOnly]);

  const load = useCallback(() => {
    dispatch(fetchTasks(buildParams({ page, limit })));
  }, [buildParams, page]);

  useEffect(() => { load(); }, [page, statusFilter, deptFilter, categoryFilter, startDateFilter, endDateFilter, assignedToFilter, weekFilter, sortField, sortOrder]);

  // Live search: reload 350ms after the user stops typing (no Enter needed).
  // Skips the mount run — the effect above already loads the first page.
  const searchTouched = React.useRef(false);
  useEffect(() => {
    if (!searchTouched.current) { searchTouched.current = true; return; }
    const t = setTimeout(() => { setPage(1); dispatch(fetchTasks(buildParams({ page: 1, limit }))); }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setDeptFilter(''); setCategoryFilter('');
    setStartDateFilter(''); setEndDateFilter('');
    setAssignedToFilter(''); setWeekFilter(''); setPage(1);
  };

  // Chips summarising what is applied, each removable on its own.
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search) chips.push({ key: 'search', label: `"${search}"`, clear: () => setSearch('') });
    if (statusFilter) chips.push({ key: 'status', label: STATUS_LABELS[statusFilter], clear: () => setStatusFilter('') });
    if (categoryFilter) chips.push({ key: 'category', label: taskCategories.find((c) => c._id === categoryFilter)?.name ?? 'Category', clear: () => setCategoryFilter('') });
    if (deptFilter) chips.push({ key: 'dept', label: departments.find((d) => d._id === deptFilter)?.name ?? 'Department', clear: () => setDeptFilter('') });
    if (assignedToFilter) chips.push({ key: 'assignee', label: consultants.find((c) => c._id === assignedToFilter)?.fullName ?? 'Assignee', clear: () => setAssignedToFilter('') });
    if (weekFilter) chips.push({ key: 'week', label: `Week ${weekFilter}`, clear: () => setWeekFilter('') });
    if (startDateFilter || endDateFilter) {
      chips.push({
        key: 'dates',
        label: `${startDateFilter ? fmtDate(startDateFilter) : '…'} → ${endDateFilter ? fmtDate(endDateFilter) : '…'}`,
        clear: () => { setStartDateFilter(''); setEndDateFilter(''); },
      });
    }
    return chips;
  }, [search, statusFilter, categoryFilter, deptFilter, assignedToFilter, weekFilter, startDateFilter, endDateFilter, taskCategories, departments, consultants]);

  const setDateRange = (from: Date, to: Date) => {
    setStartDateFilter(format(from, 'yyyy-MM-dd'));
    setEndDateFilter(format(to, 'yyyy-MM-dd'));
    setPage(1);
  };
  const today = new Date();
  const DATE_PRESETS = [
    { label: 'This week', apply: () => setDateRange(startOfWeek(today, { weekStartsOn: 6 }), endOfWeek(today, { weekStartsOn: 6 })) },
    { label: 'This month', apply: () => setDateRange(startOfMonth(today), endOfMonth(today)) },
    { label: 'Next month', apply: () => { const n = new Date(today.getFullYear(), today.getMonth() + 1, 1); setDateRange(startOfMonth(n), endOfMonth(n)); } },
  ];

  const weekOptions = useMemo(
    () => Array.from({ length: 52 }, (_, i) => i + 1).map((w) => ({ value: String(w), label: `Week ${w}`, sub: getWeekDateRange(w) })),
    []
  );
  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  const categoryOptions = useMemo(() => taskCategories.map((c) => ({ value: c._id, label: c.name })), [taskCategories]);
  const departmentOptions = useMemo(() => departments.map((d) => ({ value: d._id, label: d.name })), [departments]);
  const assigneeOptions = useMemo(
    () => consultants.map((c) => ({ value: c._id, label: c.fullName || `${c.firstName} ${c.lastName}`, sub: c.email })),
    [consultants]
  );

  const handleSort = (field: TaskSortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.info('Preparing Excel export…');
      const res = await getTasks(buildParams({ limit: 10000, page: 1 }));
      const data = res.data;

      const EXPORT_HEADERS = [
        'Task #', 'Name', 'Description', 'Category', 'Department', 'Assigned To',
        'Responsible', 'Start Week', 'End Week', 'Duration (hrs)', 'Start Date', 'End Date', 'Status', 'Delay (days)', 'Created',
      ];

      const consultantName = (c: any) =>
        typeof c === 'object' && c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : '';

      const rows = data.map((t) => [
        t.taskNumber ?? '',
        t.name,
        t.description ?? '',
        getCategoryName(t.category),
        getDeptName(t.department),
        consultantName(t.assignedTo),
        consultantName(t.responsible),
        t.scheduledWeek != null ? String(t.scheduledWeek) : '',
        t.endWeek != null ? String(t.endWeek) : (t.scheduledWeek != null ? String(t.scheduledWeek) : ''),
        t.duration != null ? String(t.duration) : '',
        fmtDate(t.startDate) ?? '',
        fmtDate(t.endDate) ?? '',
        STATUS_LABELS[t.status] ?? t.status,
        t.delayDays != null ? String(t.delayDays) : '0',
        fmtDate(t.createdAt) ?? '',
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      worksheet['!cols'] = EXPORT_HEADERS.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2,
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `tasks-export-${new Date().toISOString().split('T')[0]}.xlsx`
      );
    } catch {
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = async (taskId: string) => {
    const isOpen = expandedIds.has(taskId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      isOpen ? next.delete(taskId) : next.add(taskId);
      return next;
    });

    // Fetch subtasks only once per task per page session
    if (!isOpen && subTasksMap[taskId] === undefined) {
      setLoadingSubIds((prev) => new Set(prev).add(taskId));
      try {
        const res = await getTasks({ parentTask: taskId, limit: 999 });
        setSubTasksMap((prev) => ({ ...prev, [taskId]: res.data }));
      } catch {
        setSubTasksMap((prev) => ({ ...prev, [taskId]: [] }));
      } finally {
        setLoadingSubIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    }
  };

  const handleDelete = (id: string, name: string) => {
    MySwal.fire({
      title: `Delete "${name}"?`,
      html: `<p style="color:#BA1A1A">This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Delete task',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteTask(id));
        // Remove from subtask cache if it was a subtask
        setSubTasksMap((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((parentId) => {
            next[parentId] = next[parentId].filter((t) => t._id !== id);
          });
          return next;
        });
      }
    });
  };

  const pages = Math.ceil(total / limit);

  const renderDelay = (task: Task) => {
    const d = task.delayDays ?? 0;
    if (d > 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold">+{d}d</span>;
    }
    return <span className="text-xs text-green-700 font-medium">On time</span>;
  };

  const SortHeader = ({ field, label, align = 'left' }: { field: TaskSortField; label: string; align?: 'left' | 'right' }) => {
    const active = sortField === field;
    return (
      <th className="px-4 py-3">
        <button
          type="button"
          onClick={() => handleSort(field)}
          className={`inline-flex items-center gap-1 hover:text-on-surface transition-colors ${align === 'right' ? 'justify-end w-full' : ''} ${active ? 'text-on-surface' : ''}`}
        >
          {label}
          {active ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ChevronsUpDown className="w-3 h-3 opacity-40" />
          )}
        </button>
      </th>
    );
  };

  const renderTaskRow = (task: Task, isSubTask = false): React.ReactElement => {
    const isExpanded = expandedIds.has(task._id);
    const isLoadingSub = loadingSubIds.has(task._id);
    const subTasks = subTasksMap[task._id];
    const hasSubTasks = (task.subTaskCount ?? 0) > 0;

    return (
      <>
        <tr
          key={task._id}
          className={`transition-colors ${
            isSubTask
              ? 'bg-surface-container-low/40 hover:bg-surface-container-low/70'
              : 'hover:bg-surface-container-low/50'
          }`}
        >
          {/* Expand / indent column */}
          <td className="px-2 py-3 w-8">
            {!isSubTask && hasSubTasks ? (
              <button
                onClick={() => toggleExpand(task._id)}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
              >
                {isLoadingSub ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : isSubTask ? (
              <div className="flex items-center justify-center w-7 h-7">
                <div className="w-px h-3 bg-outline-variant/40 mr-0.5" />
                <GitBranch className="w-3 h-3 text-on-surface-variant/40" />
              </div>
            ) : null}
          </td>

          {/* Task number */}
          <td className="px-4 py-3">
            {task.taskNumber
              ? <span className="text-xs font-mono font-semibold text-primary">{task.taskNumber}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          {/* Task name */}
          <td className={`px-4 py-3 ${isSubTask ? 'pl-6' : ''}`}>
            <div className="flex items-center gap-2">
              {!isSubTask && subTasks !== undefined && subTasks.length > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0">
                  <GitBranch className="w-2.5 h-2.5" />
                  {subTasks.length}
                </span>
              )}
              <div className="min-w-0">
                <p className={`font-medium text-on-surface ${isSubTask ? 'text-sm' : ''}`}>{task.name}</p>
                {task.description && (
                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{task.description}</p>
                )}
              </div>
            </div>
          </td>

          <td className="px-4 py-3">
            {getCategoryName(task.category)
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-xs font-medium">{getCategoryName(task.category)}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">
            <span className="text-sm text-on-surface">
              {getDeptName(task.department) || (departments.find((d) => d._id === getDeptId(task.department))?.name ?? '—')}
            </span>
          </td>

          <td className="px-4 py-3">
            {task.assignedTo && typeof task.assignedTo === 'object'
              ? <span className="text-sm text-on-surface">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">
            {task.scheduledWeek != null
              ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold whitespace-nowrap">{weekRangeLabel(task.scheduledWeek, task.endWeek)}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">
            {task.duration != null
              ? <span className="text-sm font-semibold text-on-surface">{task.duration}h</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">
            {task.startDate
              ? <span className="text-sm text-on-surface">{fmtDate(task.startDate)}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">
            {task.endDate
              ? <span className="text-sm text-on-surface">{fmtDate(task.endDate)}</span>
              : <span className="text-on-surface-variant/40">&mdash;</span>}
          </td>

          <td className="px-4 py-3">{renderDelay(task)}</td>

          <td className="px-4 py-3">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          </td>

          <td className="px-4 py-3">
            <div className="flex items-center justify-end gap-1">
              <Button size="icon-sm" variant="ghost" onClick={() => navigate(`/tasks/${task._id}`)} aria-label="View task">
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => navigate(`/tasks/edit/${task._id}`)} aria-label="Edit task">
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="icon-sm" variant="ghost"
                onClick={() => handleDelete(task._id, task.name)}
                className="text-error hover:text-error"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </td>
        </tr>

        {/* Subtask rows */}
        {!isSubTask && isExpanded && (
          isLoadingSub ? (
            <tr key={`${task._id}-loading`}>
              <td colSpan={DATA_COLSPAN + 1} className="px-10 py-3 bg-surface-container-low/30">
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading subtasks…
                </div>
              </td>
            </tr>
          ) : subTasks !== undefined && subTasks.length === 0 ? (
            <tr key={`${task._id}-empty`}>
              <td colSpan={DATA_COLSPAN + 1} className="px-10 py-3 bg-surface-container-low/30">
                <span className="text-xs text-on-surface-variant/50 italic">No subtasks</span>
              </td>
            </tr>
          ) : (
            subTasks?.map((sub) => renderTaskRow(sub, true))
          )
        )}
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Tasks</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {mineOnly
              ? 'My tasks'
              : consultantDepartment && !isAdmin
                ? `${(user as any)?.department?.name ?? consultantDepartment} department tasks`
                : 'All department tasks'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant accent-primary"
          />
          Only my tasks
        </label>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={exporting || tasks.length === 0}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
          <Button onClick={() => navigate('/tasks/create')}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            {activeChips.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">{activeChips.length}</span>
            )}
          </p>
          {activeChips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-on-surface-variant">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset all
            </Button>
          )}
        </div>

        {/* Row 1: search + who/what */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${isAdmin ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Task number, name or description…"
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-container text-on-surface-variant">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <SearchSelect
            label="Status"
            icon={<CircleDot className="w-4 h-4" />}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v as TaskStatus | ''); setPage(1); }}
            options={statusOptions}
            allLabel="All statuses"
            placeholder="All statuses"
          />
          <SearchSelect
            label="Category"
            icon={<FolderKanban className="w-4 h-4" />}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1); }}
            options={categoryOptions}
            allLabel="All categories"
            placeholder="All categories"
          />
          {isAdmin && (
            <SearchSelect
              label="Department"
              icon={<Building2 className="w-4 h-4" />}
              value={deptFilter}
              onChange={(v) => { setDeptFilter(v); setPage(1); }}
              options={departmentOptions}
              allLabel="All departments"
              placeholder="All departments"
            />
          )}
          <SearchSelect
            label="Assigned to"
            icon={<UserCheck className="w-4 h-4" />}
            value={assignedToFilter}
            onChange={(v) => { setAssignedToFilter(v); setPage(1); }}
            options={assigneeOptions}
            allLabel="All assignees"
            placeholder="All assignees"
          />
        </div>

        {/* Row 2: when */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
          <SearchSelect
            label="Week"
            icon={<CalendarDays className="w-4 h-4" />}
            value={weekFilter}
            onChange={(v) => { setWeekFilter(v); setPage(1); }}
            options={weekOptions}
            allLabel="All weeks"
            placeholder="All weeks"
          />
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Start date from</label>
            <input
              type="date"
              value={startDateFilter}
              max={endDateFilter || undefined}
              onChange={(e) => { setStartDateFilter(e.target.value); setPage(1); }}
              className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 ${startDateFilter ? 'border-primary/50 bg-primary/5' : 'border-outline-variant'}`}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Start date to</label>
            <input
              type="date"
              value={endDateFilter}
              min={startDateFilter || undefined}
              onChange={(e) => { setEndDateFilter(e.target.value); setPage(1); }}
              className={`w-full px-3 py-2 rounded-lg border bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 ${endDateFilter ? 'border-primary/50 bg-primary/5' : 'border-outline-variant'}`}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Quick ranges</label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={p.apply}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  {p.label}
                </button>
              ))}
              {(startDateFilter || endDateFilter) && (
                <button
                  type="button"
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setPage(1); }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-outline-variant/20">
            <span className="text-[11px] text-on-surface-variant mr-1">Showing {total} task{total === 1 ? '' : 's'} for:</span>
            {activeChips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {c.label}
                <button type="button" onClick={() => { c.clear(); setPage(1); }} aria-label={`Remove ${c.label}`} className="p-0.5 rounded-full hover:bg-primary/15">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
            <p className="text-on-surface text-lg font-semibold">No tasks found</p>
            <Button onClick={() => navigate('/tasks/create')} className="mt-6">
              Create Task
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <th className="px-2 py-3 w-8" />
                  <SortHeader field="taskNumber" label="Task #" />
                  <SortHeader field="name" label="Task" />
                  <SortHeader field="category" label="Category" />
                  <SortHeader field="department" label="Department" />
                  <SortHeader field="assignedTo" label="Assigned To" />
                  <SortHeader field="scheduledWeek" label="Weeks" />
                  <SortHeader field="duration" label="Duration" />
                  <SortHeader field="startDate" label="Start Date" />
                  <SortHeader field="endDate" label="End Date" />
                  <SortHeader field="delay" label="Delay" />
                  <SortHeader field="status" label="Status" />
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {tasks.map((task) => renderTaskRow(task))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
