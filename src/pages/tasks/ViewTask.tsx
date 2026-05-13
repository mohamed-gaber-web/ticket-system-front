import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTaskById, deleteTask, clearCurrentTask } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Edit, Trash2, CheckSquare, User, Calendar,
  Clock, Building2, CalendarDays, Timer, UserCheck, CircleCheck,
  Circle, Loader2 as SpinnerIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode; bar: string }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    icon: <Circle className="w-3.5 h-3.5" />,
    bar: 'bg-yellow-400',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    icon: <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />,
    bar: 'bg-blue-500',
  },
  done: {
    label: 'Done',
    classes: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    icon: <CircleCheck className="w-3.5 h-3.5" />,
    bar: 'bg-green-500',
  },
};

function getWeekDateRange(weekNum: number, year = new Date().getFullYear()) {
  const jan1 = new Date(year, 0, 1);
  const daysToFirstSat = jan1.getDay() === 6 ? 0 : (6 - jan1.getDay() + 7) % 7;
  const firstSat = new Date(year, 0, 1 + daysToFirstSat);
  const start = new Date(firstSat);
  start.setDate(firstSat.getDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

const fmtDateShort = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

export default function ViewTask() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentTask, loading } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);

  useEffect(() => {
    if (id) dispatch(fetchTaskById(id));
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    return () => { dispatch(clearCurrentTask()); };
  }, [id]);

  const getDeptName = (dept?: any): string => {
    if (!dept) return '—';
    if (typeof dept === 'object' && dept !== null) return dept.name ?? '—';
    return departments.find((d) => d._id === dept)?.name ?? dept;
  };

  const handleDelete = () => {
    if (!currentTask) return;
    MySwal.fire({
      title: `Delete "${currentTask.name}"?`,
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
        dispatch(deleteTask(currentTask._id)).then(() => {
          window.location.href = '/tasks';
        });
      }
    });
  };

  if (loading || !currentTask) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const status = STATUS_CONFIG[currentTask.status] ?? STATUS_CONFIG.pending;

  const assignee = typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
    ? `${currentTask.assignedTo.firstName} ${currentTask.assignedTo.lastName}`
    : null;

  const assigneeInitials = typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
    ? `${currentTask.assignedTo.firstName?.[0] ?? ''}${currentTask.assignedTo.lastName?.[0] ?? ''}`.toUpperCase()
    : null;

  const createdBy = typeof currentTask.createdBy === 'object' && currentTask.createdBy
    ? `${currentTask.createdBy.firstName} ${currentTask.createdBy.lastName}`
    : null;

  const createdByInitials = typeof currentTask.createdBy === 'object' && currentTask.createdBy
    ? `${currentTask.createdBy.firstName?.[0] ?? ''}${currentTask.createdBy.lastName?.[0] ?? ''}`.toUpperCase()
    : null;

  const deptName = getDeptName(currentTask.department);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/tasks/edit/${currentTask._id}`}
          >
            <Edit className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-error border-error/30 hover:bg-error/5"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-surface-container-lowest rounded-[1.25rem] overflow-hidden shadow-sm ring-1 ring-outline-variant/20">
        {/* Accent bar */}
        <div className={`h-1 w-full ${status.bar}`} />

        <div className="p-6 space-y-4">
          {/* Dept chip + Status */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-on-surface-variant" />
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {deptName}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.classes}`}>
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Task Name */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface leading-snug">{currentTask.name}</h1>
              {currentTask.description && (
                <p className="mt-2 text-sm text-on-surface-variant leading-relaxed max-w-2xl">
                  {currentTask.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* People Card */}
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 space-y-4 shadow-sm ring-1 ring-outline-variant/20">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">People</h2>

          <PersonRow
            label="Assigned To"
            name={assignee}
            initials={assigneeInitials}
            icon={<UserCheck className="w-4 h-4 text-brand-500" />}
            color="bg-brand-50 text-brand-700"
          />

          <div className="border-t border-outline-variant/15" />

          <PersonRow
            label="Created By"
            name={createdBy}
            initials={createdByInitials}
            icon={<User className="w-4 h-4 text-on-surface-variant" />}
            color="bg-surface-container text-on-surface-variant"
          />
        </div>

        {/* Schedule Card */}
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 space-y-4 shadow-sm ring-1 ring-outline-variant/20">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Schedule</h2>

          {currentTask.scheduledWeek != null && (
            <SchedRow
              icon={<Calendar className="w-4 h-4 text-brand-500" />}
              label="Week"
              value={`W${currentTask.scheduledWeek}`}
              sub={getWeekDateRange(currentTask.scheduledWeek)}
            />
          )}

          {currentTask.duration != null && (
            <SchedRow
              icon={<Timer className="w-4 h-4 text-accent-orange-500" />}
              label="Duration"
              value={`${currentTask.duration}h`}
            />
          )}

          {(currentTask.startDate || currentTask.endDate) && (
            <>
              {currentTask.scheduledWeek != null || currentTask.duration != null
                ? <div className="border-t border-outline-variant/15" />
                : null}

              {currentTask.startDate && (
                <SchedRow
                  icon={<CalendarDays className="w-4 h-4 text-green-600" />}
                  label="Start Date"
                  value={fmtDateShort(currentTask.startDate)!}
                />
              )}
              {currentTask.endDate && (
                <SchedRow
                  icon={<CalendarDays className="w-4 h-4 text-error" />}
                  label="End Date"
                  value={fmtDateShort(currentTask.endDate)!}
                />
              )}
            </>
          )}

          {currentTask.scheduledWeek == null && currentTask.duration == null
            && !currentTask.startDate && !currentTask.endDate && (
            <p className="text-sm text-on-surface-variant/50 italic">No schedule set</p>
          )}
        </div>
      </div>

      {/* Activity Card */}
      <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 shadow-sm ring-1 ring-outline-variant/20">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Activity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Created</p>
              <p className="text-sm font-semibold text-on-surface">{fmtDate(currentTask.createdAt) ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <Edit className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Last Updated</p>
              <p className="text-sm font-semibold text-on-surface">{fmtDate(currentTask.updatedAt) ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function PersonRow({
  label, name, initials, icon, color,
}: {
  label: string;
  name: string | null;
  initials: string | null;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {name && initials ? (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
          {initials}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        <p className="text-sm font-semibold text-on-surface">{name ?? '—'}</p>
      </div>
    </div>
  );
}

function SchedRow({
  icon, label, value, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        <p className="text-sm font-semibold text-on-surface">
          {value}
          {sub && <span className="ml-2 text-xs font-normal text-on-surface-variant">({sub})</span>}
        </p>
      </div>
    </div>
  );
}
