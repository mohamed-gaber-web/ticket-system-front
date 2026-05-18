import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTaskById, deleteTask, clearCurrentTask } from '@/redux/slices/tasksSlice';
import { fetchTaskAttachments } from '@/redux/slices/taskAttachmentSlice';
import { fetchTaskComments } from '@/redux/slices/taskCommentSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import TaskFileUpload from '@/components/tasks/TaskFileUpload';
import TaskAttachmentList from '@/components/tasks/TaskAttachmentList';
import TaskComments from '@/components/tasks/TaskComments';
import { getWeekDateRange } from '@/utils/weekUtils';
import {
  ArrowLeft, Edit, Trash2, CheckSquare, User, Calendar,
  Clock, Building2, CalendarDays, Timer, UserCheck,
  CircleCheck, Circle, Loader2 as SpinnerIcon, Shield,
  Paperclip, MessageSquare, LayoutList,
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Tab = 'details' | 'attachments' | 'comments';

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode; bar: string; dot: string }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
    icon: <Circle className="w-3.5 h-3.5" />,
    bar: 'bg-yellow-400',
    dot: 'bg-yellow-400',
  },
  in_progress: {
    label: 'In Progress',
    classes: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    icon: <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />,
    bar: 'bg-blue-500',
    dot: 'bg-blue-500',
  },
  done: {
    label: 'Done',
    classes: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    icon: <CircleCheck className="w-3.5 h-3.5" />,
    bar: 'bg-green-500',
    dot: 'bg-green-500',
  },
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

export default function ViewTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTask, loading } = useAppSelector((s) => s.tasks);
  const { departments } = useAppSelector((s) => s.departments);
  const { total: attachmentCount } = useAppSelector((s) => s.taskAttachments);
  const { total: commentCount } = useAppSelector((s) => s.taskComments);

  const [activeTab, setActiveTab] = useState<Tab>('details');

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
      dispatch(fetchTaskAttachments(id));
      dispatch(fetchTaskComments(id));
    }
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    return () => { dispatch(clearCurrentTask()); };
  }, [id, dispatch]);

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
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#BA1A1A', cancelButtonColor: '#434653',
      confirmButtonText: 'Delete task', cancelButtonText: 'Cancel', reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(deleteTask(currentTask._id)).then(() => navigate('/tasks'));
      }
    });
  };

  if (loading || !currentTask) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <SpinnerIcon className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading task…</p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[currentTask.status] ?? STATUS_CONFIG.pending;
  const deptName = getDeptName(currentTask.department);

  const assignee = typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
    ? `${currentTask.assignedTo.firstName} ${currentTask.assignedTo.lastName}` : null;
  const assigneeInitials = typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
    ? `${currentTask.assignedTo.firstName?.[0] ?? ''}${currentTask.assignedTo.lastName?.[0] ?? ''}`.toUpperCase() : null;

  const responsible = typeof currentTask.responsible === 'object' && currentTask.responsible
    ? `${(currentTask.responsible as any).firstName} ${(currentTask.responsible as any).lastName}` : null;
  const responsibleInitials = typeof currentTask.responsible === 'object' && currentTask.responsible
    ? `${(currentTask.responsible as any).firstName?.[0] ?? ''}${(currentTask.responsible as any).lastName?.[0] ?? ''}`.toUpperCase() : null;

  const createdBy = typeof currentTask.createdBy === 'object' && currentTask.createdBy
    ? `${currentTask.createdBy.firstName} ${currentTask.createdBy.lastName}` : null;
  const createdByInitials = typeof currentTask.createdBy === 'object' && currentTask.createdBy
    ? `${currentTask.createdBy.firstName?.[0] ?? ''}${currentTask.createdBy.lastName?.[0] ?? ''}`.toUpperCase() : null;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'details', label: 'Details', icon: <LayoutList className="w-4 h-4" /> },
    { key: 'attachments', label: 'Attachments', icon: <Paperclip className="w-4 h-4" />, count: attachmentCount },
    { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" />, count: commentCount },
  ];

  return (
    <div className="p-8 space-y-0 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <button onClick={() => navigate('/tasks')} className="hover:text-brand-500 transition-colors font-medium">
          Tasks
        </button>
        <span className="text-on-surface-variant/40">›</span>
        <span className="text-on-surface font-semibold truncate max-w-xs">{currentTask.name}</span>
      </div>

      {/* Hero Header */}
      <div className="bg-surface-container-lowest rounded-[1.5rem] overflow-hidden mb-6">
        <div className={`h-1 w-full ${status.bar}`} />
        <div className="p-8">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
            {/* Left: Task identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[0.5rem] text-xs font-bold ${status.classes}`}>
                    {status.icon}
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-semibold uppercase tracking-wider">{deptName}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="mt-1 w-9 h-9 rounded-[0.75rem] bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="w-4.5 h-4.5 text-brand-600" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight leading-tight">
                    {currentTask.name}
                  </h1>
                  {currentTask.description && (
                    <p className="mt-2 text-sm text-on-surface-variant leading-relaxed max-w-2xl">
                      {currentTask.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{fmtDate(currentTask.createdAt)}</span>
                </div>
                {assignee && (
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Assigned to <span className="font-medium text-on-surface">{assignee}</span></span>
                  </div>
                )}
                {responsible && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Responsible: <span className="font-medium text-on-surface">{responsible}</span></span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => navigate(`/tasks/edit/${currentTask._id}`)} className="gap-1.5">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-error border-error/30 hover:bg-error/5 hover:text-error"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant/30 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* People Card */}
          <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 space-y-4 shadow-sm ring-1 ring-outline-variant/20">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">People</h2>

            <PersonRow label="Assigned To" name={assignee} initials={assigneeInitials}
              icon={<UserCheck className="w-4 h-4 text-brand-500" />} color="bg-brand-50 text-brand-700" />
            <div className="border-t border-outline-variant/15" />
            <PersonRow label="Responsible" name={responsible} initials={responsibleInitials}
              icon={<Shield className="w-4 h-4 text-accent-orange-500" />} color="bg-accent-orange-50 text-accent-orange-700" />
            <div className="border-t border-outline-variant/15" />
            <PersonRow label="Created By" name={createdBy} initials={createdByInitials}
              icon={<User className="w-4 h-4 text-on-surface-variant" />} color="bg-surface-container text-on-surface-variant" />
          </div>

          {/* Schedule Card */}
          <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 space-y-4 shadow-sm ring-1 ring-outline-variant/20">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Schedule</h2>

            {currentTask.scheduledWeek != null && (
              <SchedRow icon={<Calendar className="w-4 h-4 text-brand-500" />} label="Week"
                value={`W${currentTask.scheduledWeek}`} sub={getWeekDateRange(currentTask.scheduledWeek)} />
            )}
            {currentTask.duration != null && (
              <SchedRow icon={<Timer className="w-4 h-4 text-accent-orange-500" />} label="Duration" value={`${currentTask.duration}h`} />
            )}
            {(currentTask.startDate || currentTask.endDate) && (
              <>
                {(currentTask.scheduledWeek != null || currentTask.duration != null) && <div className="border-t border-outline-variant/15" />}
                {currentTask.startDate && <SchedRow icon={<CalendarDays className="w-4 h-4 text-green-600" />} label="Start Date" value={fmtDate(currentTask.startDate)!} />}
                {currentTask.endDate && <SchedRow icon={<CalendarDays className="w-4 h-4 text-error" />} label="End Date" value={fmtDate(currentTask.endDate)!} />}
              </>
            )}
            {currentTask.scheduledWeek == null && currentTask.duration == null && !currentTask.startDate && !currentTask.endDate && (
              <p className="text-sm text-on-surface-variant/50 italic">No schedule set</p>
            )}
          </div>

          {/* Activity Card */}
          <div className="bg-surface-container-lowest rounded-[1.25rem] p-5 shadow-sm ring-1 ring-outline-variant/20 md:col-span-2">
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
      )}

      {activeTab === 'attachments' && (
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-6 shadow-sm ring-1 ring-outline-variant/20 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Upload File</h2>
            <TaskFileUpload taskId={currentTask._id} onUploadSuccess={() => id && dispatch(fetchTaskAttachments(id))} />
          </div>
          <div className="border-t border-outline-variant/20" />
          <TaskAttachmentList taskId={currentTask._id} />
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-6 shadow-sm ring-1 ring-outline-variant/20">
          <TaskComments taskId={currentTask._id} />
        </div>
      )}
    </div>
  );
}

function PersonRow({ label, name, initials, icon, color }: {
  label: string; name: string | null; initials: string | null; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {name && initials ? (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
          {initials}
        </div>
      ) : (
        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">{icon}</div>
      )}
      <div>
        <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        <p className="text-sm font-semibold text-on-surface">{name ?? '—'}</p>
      </div>
    </div>
  );
}

function SchedRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">{icon}</div>
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
