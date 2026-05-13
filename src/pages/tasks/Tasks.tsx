import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTasks, deleteTask } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import type { TaskStatus } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import { Plus, CheckSquare, Search, Trash2, Eye, Edit } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
};

const getDeptId = (dept: any): string => (typeof dept === 'object' && dept !== null ? dept._id : dept) ?? '';
const getDeptName = (dept: any): string => (typeof dept === 'object' && dept !== null ? dept.name : null) ?? '';

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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
};

export default function Tasks() {
  const dispatch = useAppDispatch();
  const { tasks, loading, total } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);
  const { consultantDepartment, consultantRole } = useAppSelector((state) => state.auth);
  const isAdmin = consultantRole === 'admin';

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState(searchParams.get('department') || '');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { consultants } = useAppSelector((state) => state.consultants);

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 } as any));
  }, []);

  const load = () => {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (deptFilter) params.department = deptFilter;
    else if (!isAdmin && consultantDepartment) params.department = consultantDepartment;
    if (startDateFilter) params.startDate = startDateFilter;
    if (endDateFilter) params.endDate = endDateFilter;
    if (assignedToFilter) params.assignedTo = assignedToFilter;
    if (weekFilter) params.scheduledWeek = Number(weekFilter);
    dispatch(fetchTasks(params));
  };

  useEffect(() => { load(); }, [page, statusFilter, deptFilter, startDateFilter, endDateFilter, assignedToFilter, weekFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
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
      if (result.isConfirmed) dispatch(deleteTask(id));
    });
  };

  const pages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Tasks</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {consultantDepartment && !isAdmin
              ? `${departments.find(d => d._id === consultantDepartment)?.name ?? consultantDepartment} department tasks`
              : 'All department tasks'}
          </p>
        </div>
        <Button onClick={() => window.location.href = '/tasks/create'}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 space-y-3">
        {/* Row 1: Search + Status + Department + Assigned To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </form>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as TaskStatus | ''); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {isAdmin && (
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          )}

          <select
            value={assignedToFilter}
            onChange={(e) => { setAssignedToFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Assignees</option>
            {consultants.map((c) => (
              <option key={c._id} value={c._id}>{c.fullName}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Start Date + End Date + Week + Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <label className="absolute -top-2 left-2 px-1 text-xs text-on-surface-variant bg-surface rounded">Start Date</label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => { setStartDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-2 px-1 text-xs text-on-surface-variant bg-surface rounded">End Date</label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => { setEndDateFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={weekFilter}
            onChange={(e) => { setWeekFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Weeks</option>
            {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={String(w)}>W{w} — {getWeekDateRange(w)}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch(''); setStatusFilter(''); setDeptFilter('');
              setStartDateFilter(''); setEndDateFilter('');
              setAssignedToFilter(''); setWeekFilter(''); setPage(1);
            }}
          >
            Reset Filters
          </Button>
        </div>
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
            <Button onClick={() => window.location.href = '/tasks/create'} className="mt-6">
              Create Task
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-on-surface">{task.name}</p>
                      {task.description && (
                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-on-surface">
                        {getDeptName(task.department) || (departments.find(d => d._id === getDeptId(task.department))?.name ?? '—')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {task.assignedTo && typeof task.assignedTo === 'object'
                        ? <span className="text-sm text-on-surface">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      {task.scheduledWeek != null
                        ? <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">W{task.scheduledWeek}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      {task.duration != null
                        ? <span className="text-sm font-semibold text-on-surface">{task.duration}h</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      {task.startDate
                        ? <span className="text-sm text-on-surface">{new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      {task.endDate
                        ? <span className="text-sm text-on-surface">{new Date(task.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[task.status]}`}>
                        {STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => window.open(`/tasks/${task._id}`, '_blank')}
                          aria-label="View task"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/tasks/edit/${task._id}`}
                          aria-label="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleDelete(task._id, task.name)}
                          className="text-error hover:text-error"
                          aria-label="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
