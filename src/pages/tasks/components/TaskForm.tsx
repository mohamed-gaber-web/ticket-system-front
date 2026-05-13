import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTask, updateTask, fetchTaskById, clearCurrentTask } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import type { TaskStatus } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, ArrowLeft } from 'lucide-react';
import { sendTaskAssignedEmail } from '@/api/emailApi';

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

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const dispatch = useAppDispatch();

  const { currentTask, loading } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { consultantDepartment, consultantRole, user } = useAppSelector((state) => state.auth);
  const isAdmin = consultantRole === 'admin';

  const [form, setForm] = useState({
    name: '',
    description: '',
    department: consultantDepartment ?? '',
    startDate: '',
    endDate: '',
    assignedTo: '',
    scheduledWeek: '',
    duration: '',
    status: 'pending' as TaskStatus,
  });

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    dispatch(fetchConsultants({ limit: 999 }));
    if (isEdit && id) dispatch(fetchTaskById(id));
    return () => { dispatch(clearCurrentTask()); };
  }, [id]);

  useEffect(() => {
    if (isEdit && currentTask) {
      setForm({
        name: currentTask.name,
        description: currentTask.description ?? '',
        department: currentTask.department,
        startDate: currentTask.startDate ? currentTask.startDate.split('T')[0] : '',
        endDate: currentTask.endDate ? currentTask.endDate.split('T')[0] : '',
        assignedTo: typeof currentTask.assignedTo === 'object' && currentTask.assignedTo
          ? currentTask.assignedTo._id : (currentTask.assignedTo as string) ?? '',
        scheduledWeek: currentTask.scheduledWeek != null ? String(currentTask.scheduledWeek) : '',
        duration: currentTask.duration != null ? String(currentTask.duration) : '',
        status: currentTask.status,
      });
    }
  }, [currentTask]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) { toast.error('Task name is required'); return; }
    if (!form.department) { toast.error('Department is required'); return; }

    const data: any = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      department: form.department,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      assignedTo: form.assignedTo || null,
      scheduledWeek: form.scheduledWeek ? Number(form.scheduledWeek) : null,
      duration: form.duration ? Number(form.duration) : null,
      status: form.status,
    };

    try {
      if (isEdit && id) {
        await dispatch(updateTask({ id, data })).unwrap();
        window.location.href = `/tasks/${id}`;
      } else {
        const created = await dispatch(createTask(data)).unwrap();

        if (form.assignedTo) {
          const assignee = consultants.find((c) => c._id === form.assignedTo);
          if (assignee?.email) {
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
              weekRange: created.scheduledWeek != null ? getWeekDateRange(created.scheduledWeek) : undefined,
              duration: created.duration ?? undefined,
              status: created.status,
              recipients: [assignee.email],
              senderName,
            }).catch(() => {});
          }
        }

        window.location.href = `/tasks/${created._id}`;
      }
    } catch {
      // toast already shown by slice
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">{isEdit ? 'Edit Task' : 'New Task'}</h1>
          <p className="text-on-surface-variant mt-1">{isEdit ? 'Update task details' : 'Create a new task'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-container-lowest rounded-[1rem] p-8 space-y-8">
        {/* Row 1: Name + Description */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Task Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Enter task name"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Enter task description"
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
        </div>

        {/* Row 2: Department + Assigned To + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Department *</label>
            <select
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Assigned To</label>
            <select
              value={form.assignedTo}
              onChange={(e) => set('assignedTo', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Unassigned</option>
              {consultants.map((c) => (
                <option key={c._id} value={c._id}>{c.fullName || `${c.firstName} ${c.lastName}`}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Week + Duration + Start Date + End Date */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Week</label>
            <select
              value={form.scheduledWeek}
              onChange={(e) => set('scheduledWeek', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select week…</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={String(w)}>W{w} — {getWeekDateRange(w)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Duration (hours)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={form.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2 border-t border-outline-variant/20">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
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
