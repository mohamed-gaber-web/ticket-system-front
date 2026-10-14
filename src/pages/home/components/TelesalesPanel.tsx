import { Link } from 'react-router-dom';
import { Check, PhoneCall, Undo2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { logCall, toggleFollowUp, undoCall } from '@/redux/slices/myHomeSlice';
import { relativeTime, shortDate } from '@/lib/myHome';
import type { CallOutcome, HomeFollowUp } from '@/types/myHome.types';
import { selectTelesales } from '../selectors';
import { Bar, Card, CardHead, Empty, Pill } from './ui';

const OUTCOME: Record<CallOutcome | 'logged', { label: string; tone: string }> = {
  answered: { label: 'Answered', tone: 'ok' },
  no_answer: { label: 'No answer', tone: 'warn' },
  callback: { label: 'Callback booked', tone: 'info' },
  logged: { label: 'Called', tone: '' },
};

// Light → dark brand blue across the five funnel steps.
const FUNNEL_BG = ['#edf2ff', '#dae2ff', '#9db7f0', '#2f63c0', '#003a8f'];
const FUNNEL_FG = ['#003a8f', '#003a8f', '#002b6b', '#ffffff', '#ffffff'];

function FollowUpGroup({ title, tone, items }: { title: string; tone: string; items: HomeFollowUp[] }) {
  const dispatch = useAppDispatch();
  const open = items.filter((f) => !f.done).length;
  return (
    <div style={{ marginBottom: 14 }}>
      <h4 style={{ fontSize: 11.5, letterSpacing: '0.08em', fontWeight: 700, color: tone, margin: '0 0 4px' }}>
        {title} <span className="mh-count">{open}</span>
      </h4>
      {items.length === 0 ? (
        <div className="mh-meta" style={{ padding: '6px 0' }}>
          None
        </div>
      ) : (
        <ul className="mh-list">
          {items.map((f) => (
            <li key={f.id} className="mh-row" style={{ padding: '10px 4px' }}>
              <button
                type="button"
                className="mh-check"
                role="checkbox"
                aria-checked={f.done}
                aria-label={`${f.done ? 'Reopen' : 'Done'}: ${f.company} ${f.action}`}
                onClick={() => dispatch(toggleFollowUp(f))}
              >
                {f.done && <Check size={14} strokeWidth={3} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={f.done ? 'mh-done-text' : undefined} style={{ fontWeight: 600 }}>
                  <Link to={`/tele-sales/leads/${f.leadId}`}>{f.company || 'Lead'}</Link> · {f.action}
                </div>
                <div className="mh-meta mh-ellipsis">
                  {[f.contactName, f.note].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className="mh-meta">{shortDate(f.dueAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TelesalesPanel() {
  const dispatch = useAppDispatch();
  const ts = useAppSelector(selectTelesales);
  if (!ts) return null;
  const k = ts.kpis;
  return (
    <Card id="telesales" labelledBy="mh-ts-title">
      <CardHead id="mh-ts-title" icon={PhoneCall} title="Tele-sales & follow-ups">
        <Pill tone="purple">Tele-sales role</Pill>
      </CardHead>

      <div className="mh-grid mh-grid-kpi" style={{ marginTop: 0, gap: 12 }}>
        <div className="mh-kbox">
          <div className="mh-meta">Calls today</div>
          <div className="n">
            {k.callsToday}
            <span className="mh-meta"> / {k.callTarget}</span>
          </div>
          <Bar value={k.callsToday} max={k.callTarget} style={{ marginTop: 6 }} />
        </div>
        <div className="mh-kbox">
          <div className="mh-meta">Connect rate</div>
          <div className="n">{k.connectPct}%</div>
          <div className="mh-meta">
            {k.connected} answered of {k.callsToday}
          </div>
        </div>
        <div className="mh-kbox">
          <div className="mh-meta">Meetings booked this week</div>
          <div className="n">
            {k.meetingsWeek}
            <span className="mh-meta"> / {k.meetingsTarget}</span>
          </div>
        </div>
        <div className="mh-kbox">
          <div className="mh-meta">Follow-ups overdue</div>
          <div className="n" style={{ color: k.followUpsOverdue ? 'var(--danger-text)' : undefined }}>
            {k.followUpsOverdue}
          </div>
        </div>
      </div>

      <div className="mh-funnel" role="list" aria-label="Your pipeline">
        {ts.funnel.map((f, i) => (
          <div key={f.stage} role="listitem" style={{ background: FUNNEL_BG[i], color: FUNNEL_FG[i] }}>
            <span className="n">{f.count}</span>
            {f.stage}
          </div>
        ))}
      </div>

      <div className="mh-grid mh-grid-2" style={{ marginTop: 0 }}>
        <div>
          <h3 className="mh-h2" style={{ fontSize: 15, marginBottom: 6 }}>
            Call list today
          </h3>
          {ts.callList.length === 0 ? (
            <Empty>No calls queued for today.</Empty>
          ) : (
            <ul className="mh-list">
              {ts.callList.map((c) => (
                <li key={c.leadId} className="mh-row" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Link to={`/tele-sales/leads/${c.leadId}`} style={{ fontWeight: 700 }}>
                        {c.company}
                      </Link>
                      <Pill>{c.stage}</Pill>
                    </div>
                    <div className="mh-meta">
                      {[c.contactName, c.contactTitle].filter(Boolean).join(', ')}
                      {c.phoneMasked && (
                        <>
                          {' · '}
                          <span className="mono">{c.phoneMasked}</span>
                        </>
                      )}
                      {' · '}
                      {c.lastContactAt ? `last contact ${relativeTime(c.lastContactAt)}` : 'never contacted'}
                    </div>
                  </div>
                  {c.todayCall ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Pill tone={OUTCOME[c.todayCall.outcome].tone}>{OUTCOME[c.todayCall.outcome].label}</Pill>
                      {c.todayCall.id && (
                        <button
                          type="button"
                          className="mh-btn ghost sm"
                          onClick={() => dispatch(undoCall({ leadId: c.leadId, callId: c.todayCall!.id, outcome: c.todayCall!.outcome }))}
                        >
                          <Undo2 size={14} aria-hidden="true" /> Undo
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label={`Log a call to ${c.company}`}>
                      {(['answered', 'no_answer', 'callback'] as CallOutcome[]).map((o) => (
                        <button key={o} type="button" className="mh-btn outline sm" onClick={() => dispatch(logCall({ leadId: c.leadId, outcome: o }))}>
                          {o === 'answered' ? 'Answered' : o === 'no_answer' ? 'No answer' : 'Callback'}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mh-h2" style={{ fontSize: 15, marginBottom: 10 }}>
            Follow-ups
          </h3>
          <FollowUpGroup title="OVERDUE" tone="var(--danger-text)" items={ts.followUps.overdue} />
          <FollowUpGroup title="TODAY" tone="var(--primary)" items={ts.followUps.today} />
          <FollowUpGroup title="UPCOMING" tone="var(--text-muted)" items={ts.followUps.upcoming} />
        </div>
      </div>
    </Card>
  );
}
