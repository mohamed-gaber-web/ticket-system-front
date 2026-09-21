import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTask, updateTask, fetchTaskById, clearCurrentTask } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchTaskCategories } from '@/redux/slices/taskCategorySlice';
import type { TaskStatus, CreateTaskData, TaskParentRef } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, ArrowLeft, GitBranch } from 'lucide-react';
import { sendTaskAssignedEmail } from '@/api/emailApi';
import { getWeekDateRange, getWeekNumber } from '@/utils/weekUtils';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const toDay = (d?: string) => (d ? d.split('T')[0] : '');
const fmtDay = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const INPUT_CLS =
  'w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function TaskForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const dispatch = useAppDispatch();

  const { currentTask, loading } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { taskCategories } = useAppSelector((state) => state.taskCategories);
  const { consultantDepartment, user } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState({
    name: '',
    description: '',
    department: consultantDepartment ?? '',
    category: '',
    startDate: '',
    endDate: '',
    assignedTo: '',
    responsible: '',
    scheduledWeek: '',
    endWeek: '',
    duration: '',
    status: 'pending' as TaskStatus,
  });

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 }));
    dispatch(fetchTaskCategories({ limit: 1000 }));
    if (isEdit && id) dispatch(fetchTaskById(id));
    return () => { dispatch(clearCurrentTask()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (isEdit && currentTask) {
      setForm({
        name: currentTask.name,
        description: currentTask.description ?? '',
        department: typeof currentTask.department === 'object'
          ? (currentTask.department as { _id: string })._id
          : currentTask.department,
        category: typeof currentTask.category === 'object' && currentTask.category
          ? (currentTask.category as { _id: string })._id
          : (currentTask.category as string) ?? '',
        startDate: toDay(currentTask.startDate),
        endDate: toDay(currentTask.endDate),
        assignedTo: typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
          ? currentTask.assignedTo._id : (currentTask.assignedTo as string) ?? '',
        responsible: typeof currentTask.responsible === 'object' && currentTask.responsible
          ? (currentTask.responsible as { _id: string })._id : (currentTask.responsible as string) ?? '',
        scheduledWeek: currentTask.scheduledWeek != null ? String(currentTask.scheduledWeek) : '',
        endWeek: currentTask.endWeek != null ? String(currentTask.endWeek) : (currentTask.endDate ? String(getWeekNumber(currentTask.endDate) ?? '') : ''),
        duration: currentTask.duration != null ? String(currentTask.duration) : '',
        status: currentTask.status,
      });
    }
  }, [currentTask, isEdit]);

  // When editing a subtask the API populates its parent; its dates bound ours.
  const parent: TaskParentRef | null =
    isEdit && currentTask && typeof currentTask.parentTask === 'object' && currentTask.parentTask
      ? currentTask.parentTask
      : null;
  const parentStart = toDay(parent?.startDate);
  const parentEnd = toDay(parent?.endDate);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Start / end week are derived from the dates (Saturday-start weeks, same as getWeekDateRange).
  const setStartDate = (value: string) =>
    setForm((f) => {
      const week = getWeekNumber(value);
      return { ...f, startDate: value, scheduledWeek: week != null ? String(week) : '' };
    });
  const setEndDate = (value: string) =>
    setForm((f) => {
      const week = getWeekNumber(value);
      return { ...f, endDate: value, endWeek: week != null ? String(week) : '' };
    });

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Task name is required';
    if (!form.description.trim()) return 'Description is required';
    if (!form.department) return 'Department is required';
    if (!form.category) return 'Category is required';
    if (!form.assignedTo) return 'Assigned to is required';
    if (!form.responsible) return 'Responsible is required';
    if (!form.status) return 'Status is required';
    if (!form.scheduledWeek) return 'Start week is required';
    if (!form.endWeek) return 'End week is required';
    if (form.duration === '' || Number(form.duration) < 0) return 'Duration is required';
    if (!form.startDate) return 'Start date is required';
    if (!form.endDate) return 'End date is required';
    if (form.endDate < form.startDate) return 'End date must be on or after start date';
    if (parent && parentStart && parentEnd && (form.startDate < parentStart || form.endDate > parentEnd)) {
      return `Subtask dates must stay within the main task range (${fmtDay(parent.startDate)} → ${fmtDay(parent.endDate)})`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) { toast.error(error); return; }

    const data: CreateTaskData = {
      name: form.name.trim(),
      description: form.description.trim(),
      department: form.department,
      category: form.category,
      startDate: form.startDate,
      endDate: form.endDate,
      assignedTo: form.assignedTo,
      responsible: form.responsible,
      scheduledWeek: Number(form.scheduledWeek),
      endWeek: Number(form.endWeek),
      duration: Number(form.duration),
      status: form.status,
    };

    try {
      if (isEdit && id) {
        await dispatch(updateTask({ id, data })).unwrap();
        navigate(`/tasks/${id}`);
      } else {
        const created = await dispatch(createTask(data)).unwrap();

        const recipients: string[] = [];
        const assignee = consultants.find((c) => c._id === form.assignedTo);
        if (assignee?.email) recipients.push(assignee.email);
        const resp = consultants.find((c) => c._id === form.responsible);
        if (resp?.email && !recipients.includes(resp.email)) recipients.push(resp.email);

        if (recipients.length > 0) {
          const createdDept = created.department;
          const deptName = typeof createdDept === 'object' && createdDept !== null
            ? (createdDept as any).name
            : departments.find((d) => d._id === form.department)?.name ?? form.department;
          const senderName = user ? `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() : 'System';
          sendTaskAssignedEmail({
            taskId: created._id,
            taskName: created.name,
            description: created.description,
            departmentName: deptName,
            startDate: created.startDate,
            endDate: created.endDate,
            scheduledWeek: created.scheduledWeek ?? undefined,
            endWeek: created.endWeek ?? undefined,
            weekRange: created.scheduledWeek != null
              ? (created.endWeek != null && created.endWeek !== created.scheduledWeek
                ? `${getWeekDateRange(created.scheduledWeek).split(' – ')[0]} – ${getWeekDateRange(created.endWeek).split(' – ')[1]}`
                : getWeekDateRange(created.scheduledWeek))
              : undefined,
            duration: created.duration ?? undefined,
            status: created.status,
            recipients,
            senderName,
          }).catch(() => {});
        }

        navigate(`/tasks/${created._id}`);
      }
    } catch {
      // toast already shown by slice
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">
            {isEdit ? (parent ? 'Edit Subtask' : 'Edit Task') : 'New Task'}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {isEdit ? 'Update task details — all fields are required' : 'Create a new main task — all fields are required'}
          </p>
        </div>
      </div>

      {parent && (
        <div className="flex items-center gap-3 rounded-[0.875rem] border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <GitBranch className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <span className="text-on-surface-variant">Subtask of </span>
            <Link to={`/tasks/${parent._id}`} className="font-semibold text-primary hover:underline">
              {parent.taskNumber ? `${parent.taskNumber} · ` : ''}{parent.name}
            </Link>
            <span className="text-on-surface-variant"> — dates must stay between </span>
            <span className="font-semibold text-on-surface">{fmtDay(parent.startDate)}</span>
            <span className="text-on-surface-variant"> and </span>
            <span className="font-semibold text-on-surface">{fmtDay(parent.endDate)}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-[1rem] p-8 space-y-8">
        {/* Row 1: Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">Task Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Enter task name"
            className={INPUT_CLS}
          />
        </div>

        {/* Row 2: Department + Category + Assigned To + Responsible + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Department *</label>
            <select required value={form.department} onChange={(e) => set('department', e.target.value)} className={INPUT_CLS}>
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Category *</label>
            <select required value={form.category} onChange={(e) => set('category', e.target.value)} className={INPUT_CLS}>
              <option value="">Select category…</option>
              {taskCategories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Assigned To *</label>
            <select required value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} className={INPUT_CLS}>
              <option value="">Select assignee…</option>
              {consultants.map((c) => (
                <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Responsible *</label>
            <select required value={form.responsible} onChange={(e) => set('responsible', e.target.value)} className={INPUT_CLS}>
              <option value="">Select responsible…</option>
              {consultants.map((c) => (
                <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Status *</label>
            <select required value={form.status} onChange={(e) => set('status', e.target.value)} className={INPUT_CLS}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Start Date + End Date + Start Week + End Week (both auto) + Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Start Date *</label>
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={parentStart || undefined}
              max={parentEnd || undefined}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">End Date *</label>
            <input
              required
              type="date"
              value={form.endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={form.startDate || parentStart || undefined}
              max={parentEnd || undefined}
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Start Week *</label>
            <select
              required
              disabled
              value={form.scheduledWeek}
              onChange={(e) => set('scheduledWeek', e.target.value)}
              className={`${INPUT_CLS} disabled:opacity-80 disabled:cursor-not-allowed`}
            >
              <option value="">Select start date…</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={String(w)}>W{w} — {getWeekDateRange(w)}</option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant">Auto from start date</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">End Week *</label>
            <select
              required
              disabled
              value={form.endWeek}
              onChange={(e) => set('endWeek', e.target.value)}
              className={`${INPUT_CLS} disabled:opacity-80 disabled:cursor-not-allowed`}
            >
              <option value="">Select end date…</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={String(w)}>W{w} — {getWeekDateRange(w)}</option>
              ))}
            </select>
            <p className="text-[11px] text-on-surface-variant">Auto from end date</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Duration (hours) *</label>
            <input
              required
              type="number"
              min={0}
              step={0.5}
              value={form.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="e.g. 2.5"
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Row 4: Description (last) */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">Description *</label>
          <textarea
            required
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Enter task description"
            rows={5}
            className={`${INPUT_CLS} resize-y`}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
