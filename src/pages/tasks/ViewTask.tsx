import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTaskById, deleteTask, clearCurrentTask, fetchSubTasks, createSubTask, clearSubTasks } from '@/redux/slices/tasksSlice';
import { fetchTaskAttachments } from '@/redux/slices/taskAttachmentSlice';
import { fetchTaskComments } from '@/redux/slices/taskCommentSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import TaskFileUpload from '@/components/tasks/TaskFileUpload';
import TaskAttachmentList from '@/components/tasks/TaskAttachmentList';
import TaskComments from '@/components/tasks/TaskComments';
import { getWeekDateRange } from '@/utils/weekUtils';
import {
  Edit, Trash2, CheckSquare, User, Calendar,
  Clock, Building2, CalendarDays, Timer, UserCheck,
  CircleCheck, Circle, Loader2 as SpinnerIcon, Shield,
  Paperclip, MessageSquare, LayoutList, Plus, GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TaskStatus, CreateTaskData } from '@/types/task.types';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

type Tab = 'details' | 'attachments' | 'comments' | 'subtasks';

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

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const EMPTY_SUB_FORM = {
  name: '', description: '', department: '',
  startDate: '', endDate: '', assignedTo: '', responsible: '',
  scheduledWeek: '', duration: '', status: 'pending' as TaskStatus,
};

export default function ViewTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTask, loading, subTasks, subTasksLoading, subTasksTotal } = useAppSelector((s) => s.tasks);
  const { departments } = useAppSelector((s) => s.departments);
  const { consultants } = useAppSelector((s) => s.consultants);
  const { total: attachmentCount } = useAppSelector((s) => s.taskAttachments);
  const { total: commentCount } = useAppSelector((s) => s.taskComments);

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [subForm, setSubForm] = useState(EMPTY_SUB_FORM);
  const [subSubmitting, setSubSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskById(id));
      dispatch(fetchTaskAttachments(id));
      dispatch(fetchTaskComments(id));
      dispatch(fetchSubTasks(id));
    }
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 }));
    return () => {
      dispatch(clearCurrentTask());
      dispatch(clearSubTasks());
    };
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

  const handleDeleteSubTask = (subId: string, subName: string) => {
    MySwal.fire({
      title: `Delete "${subName}"?`,
      html: `<p style="color:#BA1A1A">This action cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#BA1A1A', cancelButtonColor: '#434653',
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteTask(subId));
    });
  };

  const openSubDialog = () => {
    const deptId = currentTask
      ? typeof currentTask.department === 'object'
        ? (currentTask.department as any)._id
        : currentTask.department ?? ''
      : '';
    setSubForm({ ...EMPTY_SUB_FORM, department: deptId });
    setShowSubDialog(true);
  };

  const setSubField = (field: string, value: string) =>
    setSubForm((f) => ({ ...f, [field]: value }));

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name.trim()) { toast.error('Subtask name is required'); return; }
    if (!subForm.department) { toast.error('Department is required'); return; }
    if (subForm.startDate && subForm.endDate && subForm.endDate < subForm.startDate) {
      toast.error('End date must be on or after start date'); return;
    }
    // Subtasks inherit the parent task's category.
    const parentCategoryId = typeof currentTask!.category === 'object' && currentTask!.category
      ? (currentTask!.category as any)._id
      : (currentTask!.category as string) ?? '';
    if (!parentCategoryId) { toast.error('Parent task has no category'); return; }

    const data: CreateTaskData = {
      name: subForm.name.trim(),
      description: subForm.description.trim() || undefined,
      department: subForm.department,
      category: parentCategoryId,
      startDate: subForm.startDate || undefined,
      endDate: subForm.endDate || undefined,
      assignedTo: subForm.assignedTo || null,
      responsible: subForm.responsible || null,
      scheduledWeek: subForm.scheduledWeek ? Number(subForm.scheduledWeek) : null,
      duration: subForm.duration ? Number(subForm.duration) : null,
      status: subForm.status,
      parentTask: currentTask!._id,
    };
    setSubSubmitting(true);
    try {
      await dispatch(createSubTask(data)).unwrap();
      setShowSubDialog(false);
    } catch {
      // toast shown in thunk
    } finally {
      setSubSubmitting(false);
    }
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
  const categoryName = typeof currentTask.category === 'object' && currentTask.category
    ? (currentTask.category as any).name
    : null;
  const delayDays = currentTask.delayDays ?? 0;

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
    { key: 'subtasks', label: 'Subtasks', icon: <GitBranch className="w-4 h-4" />, count: subTasksTotal },
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
                {currentTask.taskNumber && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-[0.5rem] bg-brand-50 text-brand-700 text-xs font-mono font-bold">
                    {currentTask.taskNumber}
                  </span>
                )}
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
                {categoryName && (
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider">{categoryName}</span>
                  </div>
                )}
                {delayDays > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[0.5rem] bg-red-100 text-red-700 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {delayDays}d late
                  </span>
                )}
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
              {currentTask.completedAt && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <CircleCheck className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium">Completed</p>
                    <p className="text-sm font-semibold text-on-surface">{fmtDate(currentTask.completedAt) ?? '—'}</p>
                  </div>
                </div>
              )}
              {delayDays > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium">Delay</p>
                    <p className="text-sm font-semibold text-red-700">{delayDays} day{delayDays === 1 ? '' : 's'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subtasks' && (
        <div className="bg-surface-container-lowest rounded-[1.25rem] p-6 shadow-sm ring-1 ring-outline-variant/20 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Subtasks {subTasksTotal > 0 && <span className="ml-1 text-primary">({subTasksTotal})</span>}
            </h2>
            <Button size="sm" onClick={openSubDialog} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Subtask
            </Button>
          </div>

          {subTasksLoading ? (
            <div className="flex justify-center py-8">
              <SpinnerIcon className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : subTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3">
                <GitBranch className="w-5 h-5 text-on-surface-variant/50" />
              </div>
              <p className="text-sm font-medium text-on-surface-variant">No subtasks yet</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Break this task into smaller pieces</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subTasks.map((sub) => {
                const sc = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
                const subAssignee = typeof sub.assignedTo === 'object' && sub.assignedTo
                  ? `${sub.assignedTo.firstName} ${sub.assignedTo.lastName}` : null;
                return (
                  <div
                    key={sub._id}
                    className="group flex items-center gap-4 p-4 rounded-[0.875rem] border border-outline-variant/20 bg-surface hover:bg-surface-container-low transition-colors"
                  >
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/tasks/${sub._id}`)}
                        className="text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left truncate w-full"
                      >
                        {sub.name}
                      </button>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-on-surface-variant">
                        {subAssignee && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> {subAssignee}
                          </span>
                        )}
                        {sub.scheduledWeek != null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> W{sub.scheduledWeek}
                          </span>
                        )}
                        {sub.startDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {fmtDate(sub.startDate)}
                          </span>
                        )}
                        {sub.duration != null && (
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {sub.duration}h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-[0.4rem] text-[11px] font-bold flex-shrink-0 ${sc.classes}`}>
                      {sc.icon}
                      {sc.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/tasks/edit/${sub._id}`)}
                        className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubTask(sub._id, sub.name)}
                        className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Add Subtask Dialog */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Add Subtask
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubSubmit} className="space-y-6 py-2">
            {/* Row 1: Name + Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Subtask Name *</label>
                <input
                  value={subForm.name}
                  onChange={(e) => setSubField('name', e.target.value)}
                  placeholder="Enter subtask name"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Description</label>
                <textarea
                  value={subForm.description}
                  onChange={(e) => setSubField('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
              </div>
            </div>

            {/* Row 2: Department + Assigned To + Responsible + Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Department *</label>
                <select
                  value={subForm.department}
                  onChange={(e) => setSubField('department', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select…</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Assigned To</label>
                <select
                  value={subForm.assignedTo}
                  onChange={(e) => setSubField('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Unassigned</option>
                  {consultants.map((c) => (
                    <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Responsible</label>
                <select
                  value={subForm.responsible}
                  onChange={(e) => setSubField('responsible', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">None</option>
                  {consultants.map((c) => (
                    <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Status</label>
                <select
                  value={subForm.status}
                  onChange={(e) => setSubField('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Week + Duration + Start Date + End Date */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Week</label>
                <select
                  value={subForm.scheduledWeek}
                  onChange={(e) => setSubField('scheduledWeek', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select week…</option>
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={String(w)}>W{w} — {getWeekDateRange(w)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Duration (h)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={subForm.duration}
                  onChange={(e) => setSubField('duration', e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Start Date</label>
                <input
                  type="date"
                  value={subForm.startDate}
                  onChange={(e) => setSubField('startDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">End Date</label>
                <input
                  type="date"
                  value={subForm.endDate}
                  onChange={(e) => setSubField('endDate', e.target.value)}
                  min={subForm.startDate || undefined}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSubDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={subSubmitting}>
                {subSubmitting ? <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Subtask
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
