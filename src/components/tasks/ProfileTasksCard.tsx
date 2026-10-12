import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import * as tasksApi from '@/api/tasksApi';
import type { Task } from '@/types/task.types';
import { Button } from '@/components/ui/button';
import { useAccess } from '@/redux/hooks/useAccess';
import { cn } from '@/lib/utils';

const TASK_LIMIT = 10;

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

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const nameOf = (v: unknown): string => {
  if (v && typeof v === 'object' && 'name' in v) return String((v as { name: string }).name ?? '');
  return '';
};

interface ProfileTasksCardProps {
  /** The employee whose assigned tasks are listed. */
  employeeId?: string;
  className?: string;
}

/**
 * The tasks assigned to an employee, for the profile pages. Renders nothing
 * when they have none, or when the viewer has no access to the tasks module
 * (the API refuses the list then).
 */
const ProfileTasksCard = ({ employeeId, className }: ProfileTasksCardProps) => {
  const navigate = useNavigate();
  const access = useAccess();
  const canSeeTasks = access.hasModule('tasks');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (nextPage: number) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await tasksApi.getTasks({
        assignedTo: employeeId,
        page: nextPage,
        limit: TASK_LIMIT,
        sort: 'endDate',
        order: 'desc',
      });
      setTasks(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setPage(nextPage);
    } catch {
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => {
    setLoaded(false);
    if (canSeeTasks && employeeId) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, canSeeTasks]);

  if (!canSeeTasks || !employeeId || !loaded || total === 0) return null;

  return (
    <div className={cn('bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col', className)}>
      <div className="px-6 py-4 border-b border-surface-container-high flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-on-surface-variant" />
        <h3 className="text-base font-semibold text-on-surface">Assigned Tasks</h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
          {total}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead className="bg-surface-container-low">
                <tr>
                  {['Task #', 'Name', 'Department', 'Status', 'Start', 'End', 'Hours', 'Delay'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {tasks.map((task) => {
                  const delay = task.status === 'done' ? 0 : task.delayDays ?? 0;
                  return (
                    <tr
                      key={task._id}
                      className="hover:bg-surface-container-low cursor-pointer transition-colors"
                      onClick={() => navigate(`/tasks/${task._id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-brand-600">{task.taskNumber ? `#${task.taskNumber}` : '—'}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-sm font-medium text-on-surface truncate">{task.name}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface-variant">{nameOf(task.department) || '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide', STATUS_COLORS[task.status] ?? STATUS_COLORS.pending)}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface-variant">{fmtDate(task.startDate)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface-variant">{fmtDate(task.endDate)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-on-surface-variant">{task.duration != null ? `${task.duration}h` : '—'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {delay > 0 ? (
                          <span className="text-sm font-semibold text-error">+{delay}d</span>
                        ) : (
                          <span className="text-sm font-semibold text-green-600">On time</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="px-4 py-3 border-t border-surface-container-high flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">
                Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pages}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfileTasksCard;
