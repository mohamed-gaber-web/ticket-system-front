import { Check, GraduationCap, Plane, Plus, Trash2 } from 'lucide-react';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { openModal, removeGoal, toggleGoalStep } from '@/redux/slices/myHomeSlice';
import Swal from 'sweetalert2';
import { dayKey, shortDate } from '@/lib/myHome';
import type { GrowthGoal, LeaveRequestRow, MyHomeData } from '@/types/myHome.types';
import { Bar, Card, CardHead, Empty, Pill } from './ui';

const REQUEST_TONE: Record<LeaveRequestRow['status'], { tone: string; label: string }> = {
  approved: { tone: 'ok', label: 'Approved' },
  pending: { tone: 'warn', label: 'Pending' },
  rejected: { tone: 'danger', label: 'Rejected' },
  cancelled: { tone: '', label: 'Cancelled' },
};

export function LeavePanel({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const today = data.today;
  return (
    <Card id="leave" labelledBy="mh-leave-title">
      <CardHead id="mh-leave-title" icon={Plane} title="Leave">
        <button type="button" className="mh-btn outline" onClick={() => dispatch(openModal({ modal: 'leave', open: true }))}>
          Request leave
        </button>
      </CardHead>
      {data.leave.balances.map((b) => (
        <div key={b.type} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>{b.label}</span>
            <span className="mh-meta">
              {b.unit === 'days' && b.total !== null ? `${b.left} left of ${b.total}` : `${b.used}h used this year · as needed`}
            </span>
          </div>
          {b.unit === 'days' && b.total !== null && (
            <div className="mh-cells" role="img" aria-label={`${b.used} days used, ${b.left} left`}>
              {Array.from({ length: Math.min(b.total, 40) }, (_, i) => (
                <span key={i} className={i < b.used ? 'used' : undefined} />
              ))}
            </div>
          )}
        </div>
      ))}
      <h3 className="mh-h2" style={{ fontSize: 14, margin: '6px 0 4px' }}>
        Requests
      </h3>
      {data.leave.requests.length === 0 ? (
        <Empty>No requests yet.</Empty>
      ) : (
        <ul className="mh-list">
          {data.leave.requests.map((r) => {
            const taken = r.status === 'approved' && !!r.to && dayKey(r.to, data.timezone) < today;
            const tone = taken ? { tone: '', label: 'Taken' } : REQUEST_TONE[r.status];
            return (
              <li key={r.id} className="mh-row" style={{ padding: '10px 2px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>
                    {r.from && r.to && dayKey(r.from, data.timezone) !== dayKey(r.to, data.timezone) ? `${shortDate(r.from)} – ${shortDate(r.to)}` : shortDate(r.from)}
                  </div>
                  <div className="mh-meta">
                    {r.type === 'vacation' ? 'Vacation' : 'Excuse'} · {r.type === 'vacation' ? `${r.days ?? '—'} days` : `${r.hours ?? '—'}h`}
                  </div>
                </div>
                <Pill tone={tone.tone}>{tone.label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const GOAL_TONE: Record<GrowthGoal['type'], { tone: string; label: string }> = {
  certification: { tone: 'info', label: 'Certification' },
  course: { tone: 'purple', label: 'Course' },
  skill: { tone: 'ok', label: 'Skill' },
};

export function GrowthPanel({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  return (
    <Card id="growth" labelledBy="mh-growth-title">
      <CardHead id="mh-growth-title" icon={GraduationCap} title="Growth plan" sub="What you want to learn or improve">
        <button type="button" className="mh-btn outline" onClick={() => dispatch(openModal({ modal: 'goal', open: true }))}>
          <Plus size={15} aria-hidden="true" /> Add goal
        </button>
      </CardHead>
      {data.goals.length === 0 ? (
        <Empty>Add a certification, course or skill you are working towards.</Empty>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.goals.map((g) => (
            <article key={g.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{g.title}</h3>
                  <Pill tone={GOAL_TONE[g.type].tone} className="mh-goal-type">
                    {GOAL_TONE[g.type].label}
                  </Pill>
                </div>
                <button
                  type="button"
                  className="mh-icon-btn"
                  aria-label={`Delete goal: ${g.title}`}
                  onClick={async () => {
                    const res = await Swal.fire({
                      title: 'Delete this goal?',
                      text: g.title,
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonText: 'Delete',
                    });
                    if (res.isConfirmed) dispatch(removeGoal(g));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 6px' }}>
                <Bar value={g.pct} style={{ flex: 1 }} label={`${g.pct}% complete`} />
                <span className="mh-meta mono">
                  {g.pct}%{g.targetLabel ? ` · ${g.targetLabel}` : ''}
                </span>
              </div>
              <ul className="mh-list">
                {g.steps.map((s) => (
                  <li key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
                    <button
                      type="button"
                      className="mh-check"
                      role="checkbox"
                      aria-checked={s.done}
                      aria-label={s.text}
                      onClick={() => dispatch(toggleGoalStep({ goalId: g.id, stepId: s.id, done: !s.done }))}
                    >
                      {s.done && <Check size={14} strokeWidth={3} />}
                    </button>
                    <span className={s.done ? 'mh-done-text' : undefined} style={{ fontSize: 13 }}>
                      {s.text}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
