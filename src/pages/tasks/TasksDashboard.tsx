import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTasks } from '@/redux/slices/tasksSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import { CheckSquare, Clock, Loader2, Plus, Eye, CircleCheck } from 'lucide-react';

export default function TasksDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tasks, loading, total } = useAppSelector((state) => state.tasks);
  const { departments } = useAppSelector((state) => state.departments);
  const { consultantDepartment, consultantRole } = useAppSelector((state) => state.auth);
  const isAdmin = consultantRole === 'admin';

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    const params: any = { page: 1, limit: 50 };
    if (!isAdmin && consultantDepartment) params.department = consultantDepartment;
    dispatch(fetchTasks(params));
  }, []);

  const pending = tasks.filter((t) => t.status === 'pending').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const done = tasks.filter((t) => t.status === 'done').length;

  const getDeptName = (dept: any): string => {
    if (!dept) return '';
    if (typeof dept === 'object' && dept !== null) return dept.name ?? '';
    return departments.find((d) => d._id === dept)?.name ?? dept;
  };

  const recentTasks = tasks.slice(0, 8);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    done: 'Done',
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-sm text-on-surface">Tasks Dashboard</h1>
          <p className="text-on-surface-variant mt-1">
            {isAdmin ? 'Overview of all department tasks' : `Overview of your department tasks`}
          </p>
        </div>
        <Button onClick={() => navigate('/tasks/create')}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-[1rem] p-5 space-y-2">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Total</p>
          <p className="text-3xl font-bold text-on-surface">{loading ? '—' : total}</p>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <CheckSquare className="w-4 h-4" />
            <span className="text-xs">All tasks</span>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-[1rem] p-5 space-y-2">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Pending</p>
          <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-300">{loading ? '—' : pending}</p>
          <div className="flex items-center gap-1.5 text-yellow-600">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Awaiting start</span>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-[1rem] p-5 space-y-2">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">In Progress</p>
          <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{loading ? '—' : inProgress}</p>
          <div className="flex items-center gap-1.5 text-blue-600">
            <Loader2 className="w-4 h-4" />
            <span className="text-xs">Active tasks</span>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 rounded-[1rem] p-5 space-y-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Done</p>
          <p className="text-3xl font-bold text-green-800 dark:text-green-300">{loading ? '—' : done}</p>
          <div className="flex items-center gap-1.5 text-green-600">
            <CircleCheck className="w-4 h-4" />
            <span className="text-xs">Completed</span>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-surface-container-lowest rounded-[1rem] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <h2 className="text-base font-semibold text-on-surface">Recent Tasks</h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
            <Eye className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="mx-auto h-10 w-10 text-on-surface-variant/40 mb-3" />
            <p className="text-on-surface-variant">No tasks yet</p>
            <Button onClick={() => navigate('/tasks/create')} className="mt-4" size="sm">
              Create your first task
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {recentTasks.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between px-6 py-4 hover:bg-surface-container-low cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task._id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{task.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {task.department && (
                      <span className="text-xs text-on-surface-variant">{getDeptName(task.department)}</span>
                    )}
                    {task.assignedTo && typeof task.assignedTo === 'object' && (
                      <span className="text-xs text-on-surface-variant">
                        → {task.assignedTo.firstName} {task.assignedTo.lastName}
                      </span>
                    )}
                    {task.scheduledWeek != null && (
                      <span className="text-xs font-bold text-brand-600">W{task.scheduledWeek}</span>
                    )}
                  </div>
                </div>
                <span className={`ml-4 shrink-0 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
