import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ListChecks, Plus, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { addTodo, removeTodo, setTaskTab, toggleTask } from '@/redux/slices/myHomeSlice';
import { dayKey, shortDate } from '@/lib/myHome';
import type { MyHomeData } from '@/types/myHome.types';
import { selectTaskPanel } from '../selectors';
import { Card, CardHead, Empty, Pill, PriorityDot, Segmented } from './ui';

export default function TasksPanel({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.myHome.ui.tasks.tab);
  const { rows, counts } = useAppSelector(selectTaskPanel);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    const res = await dispatch(addTodo({ title: t, dueDate: data.today }));
    setBusy(false);
    if (addTodo.fulfilled.match(res)) setTitle('');
  };

  return (
    <Card id="tasks" labelledBy="mh-tasks-title">
      <CardHead id="mh-tasks-title" icon={ListChecks} title="Tasks">
        <Segmented
          label="Task filter"
          value={tab}
          onChange={(v) => dispatch(setTaskTab(v))}
          options={[
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'done', label: 'Done', count: counts.done },
          ]}
        />
      </CardHead>
      <form
        style={{ display: 'flex', gap: 8, marginBottom: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="mh-quick-task" className="sr-only">
          New task
        </label>
        <input
          id="mh-quick-task"
          className="mh-input"
          placeholder="Add a task for today…"
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="mh-icon-btn" style={{ width: 40, height: 40 }} aria-label="Add task" disabled={!title.trim() || busy}>
          <Plus size={18} />
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>{tab === 'open' ? 'Nothing open — add a task above.' : 'No finished tasks yet.'}</Empty>
      ) : (
        <ul className="mh-list">
          {rows.map((t) => {
            const isToday = t.dueDate && dayKey(t.dueDate, data.timezone) === data.today;
            const overdue = !t.done && t.dueDate && dayKey(t.dueDate, data.timezone) < data.today;
            return (
              <li key={`${t.kind}-${t.id}`} className="mh-row">
                <button
                  type="button"
                  className="mh-check"
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={`${t.done ? 'Reopen' : 'Complete'}: ${t.title}`}
                  onClick={() => dispatch(toggleTask(t))}
                >
                  {t.done && <Check size={14} strokeWidth={3} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={t.done ? 'mh-done-text' : undefined} style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {t.kind === 'task' ? <Link to={`/tasks/${t.id}`}>{t.title}</Link> : t.title}
                  </div>
                  <div className="mh-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <PriorityDot priority={t.priority} />
                    {t.code && <span className="mh-code">{t.code}</span>}
                    {t.sourceLabel}
                  </div>
                </div>
                {t.dueDate && (
                  <Pill tone={overdue ? 'danger' : isToday ? 'warn' : undefined}>{overdue ? `Overdue · ${shortDate(t.dueDate)}` : isToday ? 'Today' : shortDate(t.dueDate)}</Pill>
                )}
                {t.kind === 'todo' && (
                  <button type="button" className="mh-icon-btn" aria-label={`Delete task: ${t.title}`} onClick={() => dispatch(removeTodo(t))}>
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
