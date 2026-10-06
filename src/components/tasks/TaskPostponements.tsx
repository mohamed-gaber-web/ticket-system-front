import { CalendarClock } from 'lucide-react';
import type { TaskPostponement } from '@/types/task.types';

const fmtDay = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const byName = (p: TaskPostponement['postponedBy']) =>
  p && typeof p === 'object' ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';

/** Postponement history of a task, newest first. */
export default function TaskPostponements({ items }: { items?: TaskPostponement[] }) {
  if (!items?.length) {
    return <p className="text-sm text-on-surface-variant/60 italic">Not postponed yet</p>;
  }

  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ol className="space-y-3">
      {sorted.map((p, i) => (
        <li key={p._id} className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-orange-50 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-4 h-4 text-accent-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold text-on-surface">
                #{sorted.length - i} · {p.previousEndDate ? `${fmtDay(p.previousEndDate)} → ${fmtDay(p.date)}` : `Postponed to ${fmtDay(p.date)}`}
              </span>
              <span className="text-xs text-on-surface-variant">
                {fmtDay(p.createdAt)}{byName(p.postponedBy) ? ` by ${byName(p.postponedBy)}` : ''}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant whitespace-pre-wrap break-words">{p.comment}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
