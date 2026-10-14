import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import {
  addGoal,
  clearToast,
  fetchMyHome,
  logTime,
  markEmailReplied,
  openEmail,
  openLogTime,
  openModal,
  openTicket,
  replyToEmail,
  requestLeave,
  setTicketStatus,
  showToast,
} from '@/redux/slices/myHomeSlice';
import { updateProfile } from '@/redux/slices/authSlice';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  firstNameOf,
  htmlToText,
  longDate,
  workingDaysBetween,
} from '@/lib/myHome';
import type { GrowthGoal, MyHomeData } from '@/types/myHome.types';
import { selectTickets } from '../selectors';
import { AgePill, RefPill } from './EmailsPanel';
import { StatusPill } from './TicketsPanel';
import { Bar, Overlay, Pill, PriorityDot } from './ui';

// ── Ticket drawer ────────────────────────────────────────────────────────────

export function TicketDrawer() {
  const dispatch = useAppDispatch();
  const id = useAppSelector((s) => s.myHome.ui.drawers.ticketId);
  const tickets = useAppSelector(selectTickets);
  const t = tickets.find((x) => x.id === id);
  const close = () => dispatch(openTicket(null));
  if (!t) return null;

  const needsHours = t.loggedHours <= 0;
  const waitingStatus = t.kind === 'client' ? 'customer_pending' : 'on_hold';
  const change = (status: string, label: string) => dispatch(setTicketStatus({ id: t.id, status, prev: t.status, label }));
  const over = t.estimateHours > 0 && t.loggedHours > t.estimateHours;

  return (
    <Overlay
      open
      onClose={close}
      width={460}
      title={<span className="mh-code" style={{ fontSize: 15 }}>{t.code}</span>}
      footer={
        <>
          <button type="button" className="mh-btn outline" onClick={() => dispatch(logTime({ ticketId: t.id, hours: 1, kind: t.kind, code: t.code }))}>
            +1h logged
          </button>
          {t.open && t.board !== 'in_progress' && (
            <button type="button" className="mh-btn outline" disabled={needsHours} onClick={() => change('in_progress', `${t.code} is in progress`)}>
              Start progress
            </button>
          )}
          {t.open && t.board === 'in_progress' && (
            <button type="button" className="mh-btn outline" disabled={needsHours} onClick={() => change(waitingStatus, `${t.code} is waiting${t.kind === 'client' ? ' on the client' : ''}`)}>
              {t.kind === 'client' ? 'Waiting on client' : 'Put on hold'}
            </button>
          )}
          {t.open ? (
            <button type="button" className="mh-btn primary" disabled={needsHours} onClick={() => change('resolved', `${t.code} marked as done`)}>
              Mark as done
            </button>
          ) : (
            <button type="button" className="mh-btn primary" onClick={() => change('reopened', `${t.code} reopened`)}>
              Reopen
            </button>
          )}
        </>
      }
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>{t.title}</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatusPill t={t} />
        <Pill>
          <PriorityDot priority={t.priority} /> {PRIORITY_LABEL[t.priority]}
        </Pill>
        {t.isOverdue && <Pill tone="danger">Overdue</Pill>}
      </div>
      {t.slaText && t.open && (
        <div className="mh-banner" role="status">
          <AlertTriangle size={14} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> SLA {t.slaText}
          {t.slaDueAt && <> · due {new Date(t.slaDueAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</>}
        </div>
      )}
      <dl className="mh-dl">
        <div>
          <dt>{t.kind === 'client' ? 'Client' : 'Category'}</dt>
          <dd>{t.kind === 'client' ? t.clientName || '—' : t.category || 'Internal'}</dd>
        </div>
        <div>
          <dt>Module</dt>
          <dd>{t.module || '—'}</dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{t.dueDate ? longDate(t.dueDate) : '—'}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>{t.contactName || '—'}</dd>
        </div>
      </dl>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
          <span className="mh-meta">Time logged</span>
          <span className="mono" style={{ color: over ? 'var(--over)' : undefined }}>
            {t.loggedHours}h of {t.estimateHours || '—'}h {t.hasExplicitEstimate ? 'estimate' : t.estimateHours ? 'estimate (from estimation days)' : ''}
          </span>
        </div>
        <Bar value={t.loggedHours} max={t.estimateHours || t.loggedHours || 1} over={over} />
      </div>
      {needsHours && t.open && (
        <p className="mh-meta" role="note">
          Log time first — a ticket needs its hours before it can move past Assigned.
        </p>
      )}
      <h4 className="mh-label" style={{ marginTop: 12 }}>
        Description
      </h4>
      <div className="mh-body-box">{htmlToText(t.description) || 'No description.'}</div>
      <p style={{ marginTop: 14 }}>
        <Link to={`/tickets/view/${t.id}`} className="mh-btn ghost sm" style={{ paddingLeft: 0 }}>
          Open the full ticket ({STATUS_LABEL[t.status] ?? t.status}) →
        </Link>
      </p>
    </Overlay>
  );
}

// ── Email drawer ─────────────────────────────────────────────────────────────

const TEMPLATES = [
  { key: 'ack', label: 'Acknowledge', text: (n: string) => `Hi ${n},\n\nThanks for your email — I'm looking into it now and will get back to you today.\n\nBest regards,` },
  { key: 'details', label: 'Ask for details', text: (n: string) => `Hi ${n},\n\nThanks for reaching out. Could you share a screenshot and the exact steps that lead to the issue, so I can reproduce it?\n\nBest regards,` },
  { key: 'call', label: 'Schedule a call', text: (n: string) => `Hi ${n},\n\nIt may be quicker to go through this together. Would a 30-minute call tomorrow work for you? Let me know a time that suits you.\n\nBest regards,` },
];

export function EmailDrawer({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const id = useAppSelector((s) => s.myHome.ui.drawers.emailId);
  const email = data.emails.find((e) => e.id === id);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => setBody(''), [id]);
  const close = () => dispatch(openEmail(null));
  if (!email) return null;
  const first = firstNameOf(email.fromName || '');

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const res = await dispatch(replyToEmail({ email, body }));
    setSending(false);
    if (replyToEmail.fulfilled.match(res)) close();
  };

  return (
    <Overlay
      open
      onClose={close}
      width={560}
      title="Client email"
      headerExtra={<AgePill email={email} config={data.config} />}
      footer={
        email.repliedAt ? (
          <button type="button" className="mh-btn outline" onClick={close}>
            Close
          </button>
        ) : (
          <>
            <button
              type="button"
              className="mh-btn outline"
              onClick={() => {
                dispatch(markEmailReplied(email));
                close();
              }}
            >
              Mark as replied
            </button>
            <button type="button" className="mh-btn primary" disabled={!body.trim() || sending} onClick={send}>
              {sending ? 'Sending…' : 'Send reply'}
            </button>
          </>
        )
      }
    >
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', overflowWrap: 'anywhere' }}>{email.subject}</h3>
      <div className="mh-meta" style={{ marginBottom: 10 }}>
        From <strong style={{ color: 'var(--text)' }}>{email.fromName}</strong> &lt;{email.fromEmail}&gt;
        {email.company && <> · {email.company}</>} · {new Date(email.receivedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <RefPill email={email} />
        {email.source === 'ticket' ? (
          <Link className="mh-btn ghost sm" to={`/tickets/view/${email.refId}`}>
            Open ticket thread
          </Link>
        ) : (
          <Link className="mh-btn ghost sm" to={`/tele-sales/leads/${email.refId}`}>
            Open lead
          </Link>
        )}
      </div>
      <div className="mh-body-box">{htmlToText(email.body) || email.snippet}</div>
      {email.repliedAt ? (
        <p className="mh-meta" style={{ marginTop: 14 }}>
          Replied {new Date(email.repliedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.
        </p>
      ) : (
        <>
          <div className="mh-chips" style={{ marginTop: 16 }} role="group" aria-label="Quick replies">
            {TEMPLATES.map((tpl) => (
              <button key={tpl.key} type="button" className="mh-chip" onClick={() => setBody(tpl.text(first || 'there'))}>
                {tpl.label}
              </button>
            ))}
          </div>
          <label htmlFor="mh-reply" className="mh-label">
            Your reply
          </label>
          <textarea id="mh-reply" className="mh-textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Reply to ${email.fromName}…`} />
          <p className="mh-meta">Sent from the shared {email.source === 'ticket' ? 'support' : 'sales'} mailbox, in the same thread.</p>
        </>
      )}
    </Overlay>
  );
}

// ── Log time ─────────────────────────────────────────────────────────────────

export function LogTimeModal() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.myHome.ui.modals.logTime);
  const tickets = useAppSelector(selectTickets);
  const open = useMemo(() => tickets.filter((t) => t.open), [tickets]);
  const [ticketId, setTicketId] = useState('');
  const [hours, setHours] = useState('1');
  useEffect(() => {
    if (state) {
      setTicketId(state.ticketId ?? open[0]?.id ?? '');
      setHours('1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const close = () => dispatch(openLogTime(null));
  const h = Number(hours);
  const valid = !!ticketId && Number.isFinite(h) && h > 0 && h <= 24 && Math.round(h * 4) === h * 4;
  const save = () => {
    const t = tickets.find((x) => x.id === ticketId);
    if (!t || !valid) return;
    dispatch(logTime({ ticketId, hours: h, kind: t.kind, code: t.code }));
    close();
  };
  return (
    <Overlay
      open={!!state}
      onClose={close}
      kind="modal"
      title="Log time"
      footer={
        <>
          <button type="button" className="mh-btn outline" onClick={close}>
            Cancel
          </button>
          <button type="button" className="mh-btn primary" disabled={!valid} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="mh-field">
          <label htmlFor="mh-lt-ticket" className="mh-label">
            Ticket
          </label>
          <select id="mh-lt-ticket" className="mh-select" value={ticketId} onChange={(e) => setTicketId(e.target.value)} data-autofocus>
            {open.length === 0 && <option value="">No open tickets</option>}
            {open.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} · {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="mh-field">
          <label htmlFor="mh-lt-hours" className="mh-label">
            Hours
          </label>
          <input id="mh-lt-hours" className="mh-input mono" type="number" min="0.25" max="24" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          {!valid && hours !== '' && <p className="mh-meta" style={{ color: 'var(--danger-text)' }}>Enter between 0.25 and 24 hours, in quarter hours.</p>}
        </div>
        <button type="submit" hidden />
      </form>
    </Overlay>
  );
}

// ── Leave request ────────────────────────────────────────────────────────────

export function LeaveRequestModal({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.myHome.ui.modals.leave);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setFrom('');
      setTo('');
      setReason('');
    }
  }, [open]);
  const close = () => dispatch(openModal({ modal: 'leave', open: false }));
  const working = workingDaysBetween(from, to);
  const valid = !!from && !!to && from <= to && from >= data.today && working > 0;
  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    await dispatch(requestLeave({ startDate: from, endDate: to, reason: reason.trim() || undefined }));
    setSaving(false);
  };
  const manager = data.profile.manager?.name || 'your manager';
  return (
    <Overlay
      open={open}
      onClose={close}
      kind="modal"
      title="Request leave"
      footer={
        <>
          <button type="button" className="mh-btn outline" onClick={close}>
            Cancel
          </button>
          <button type="button" className="mh-btn primary" disabled={!valid || saving} onClick={submit}>
            {saving ? 'Sending…' : 'Submit request'}
          </button>
        </>
      }
    >
      <div className="mh-field">
        <label htmlFor="mh-lv-type" className="mh-label">
          Type
        </label>
        <select id="mh-lv-type" className="mh-select" value="vacation" disabled>
          <option value="vacation">Vacation</option>
        </select>
        <p className="mh-meta">
          Excuses (hours) are requested from <Link to="/employee-requests">My Requests</Link>.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mh-field">
        <div>
          <label htmlFor="mh-lv-from" className="mh-label">
            From
          </label>
          <input id="mh-lv-from" type="date" className="mh-input" min={data.today} value={from} onChange={(e) => setFrom(e.target.value)} data-autofocus />
        </div>
        <div>
          <label htmlFor="mh-lv-to" className="mh-label">
            To
          </label>
          <input id="mh-lv-to" type="date" className="mh-input" min={from || data.today} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {from && to && from <= to && (
        <p className="mh-meta">
          {working} working day{working === 1 ? '' : 's'} counted against your balance (Fri/Sat and holidays are not counted)
        </p>
      )}
      <div className="mh-field">
        <label htmlFor="mh-lv-reason" className="mh-label">
          Note (optional)
        </label>
        <input id="mh-lv-reason" className="mh-input" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </div>
      <p className="mh-meta" style={{ marginTop: 14 }}>
        Goes to {manager} for approval. Your open tickets that week will be flagged for handover.
      </p>
    </Overlay>
  );
}

// ── Growth goal ──────────────────────────────────────────────────────────────

export function GoalModal() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.myHome.ui.modals.goal);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<GrowthGoal['type']>('certification');
  const [target, setTarget] = useState('');
  const [steps, setSteps] = useState('');
  useEffect(() => {
    if (open) {
      setTitle('');
      setType('certification');
      setTarget('');
      setSteps('');
    }
  }, [open]);
  const close = () => dispatch(openModal({ modal: 'goal', open: false }));
  const stepList = steps
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = title.trim().length > 0 && stepList.length > 0 && stepList.length <= 30;
  return (
    <Overlay
      open={open}
      onClose={close}
      kind="modal"
      title="Add a growth goal"
      footer={
        <>
          <button type="button" className="mh-btn outline" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="mh-btn primary"
            disabled={!valid}
            onClick={() => dispatch(addGoal({ title: title.trim(), type, targetLabel: target.trim(), steps: stepList }))}
          >
            Add goal
          </button>
        </>
      }
    >
      <div className="mh-field">
        <label htmlFor="mh-g-title" className="mh-label">
          Goal
        </label>
        <input id="mh-g-title" className="mh-input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} data-autofocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="mh-field">
        <div>
          <label htmlFor="mh-g-type" className="mh-label">
            Type
          </label>
          <select id="mh-g-type" className="mh-select" value={type} onChange={(e) => setType(e.target.value as GrowthGoal['type'])}>
            <option value="certification">Certification</option>
            <option value="course">Course</option>
            <option value="skill">Skill</option>
          </select>
        </div>
        <div>
          <label htmlFor="mh-g-target" className="mh-label">
            Target
          </label>
          <input id="mh-g-target" className="mh-input" placeholder="e.g. Dec 2026" maxLength={100} value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
      </div>
      <div className="mh-field">
        <label htmlFor="mh-g-steps" className="mh-label">
          Steps (one per line)
        </label>
        <textarea id="mh-g-steps" className="mh-textarea" style={{ minHeight: 110 }} value={steps} onChange={(e) => setSteps(e.target.value)} />
      </div>
    </Overlay>
  );
}

// ── Edit profile ─────────────────────────────────────────────────────────────

export function EditProfileModal({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.myHome.ui.modals.profile);
  const user = useAppSelector((s) => s.auth.user) as Record<string, unknown> | null;
  const p = data.profile;
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', position: '', office: '', skills: '', availability: 'available' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open)
      setForm({
        firstName: String(user?.firstName ?? p.firstName ?? ''),
        lastName: String(user?.lastName ?? ''),
        phone: p.phone ?? '',
        position: p.jobTitle ?? '',
        office: p.office ?? '',
        skills: p.skills.join(', '),
        availability: p.availability,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => dispatch(openModal({ modal: 'profile', open: false }));
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const phoneOk = !form.phone || /^\d{10,15}$/.test(form.phone.replace(/[\s-]/g, ''));
  const valid = form.firstName.trim() && form.lastName.trim() && phoneOk;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await dispatch(
        updateProfile({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          position: form.position.trim(),
          office: form.office.trim(),
          skills: form.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20),
          availability: form.availability,
        } as never)
      ).unwrap();
      close();
      dispatch(fetchMyHome());
    } catch (err) {
      alertToast(dispatch, String(err || 'Could not save your profile'));
    } finally {
      setSaving(false);
    }
  };

  const saveAvatar = async (fileId: string | null) => {
    try {
      await dispatch(updateProfile({ profilePicture: fileId } as never)).unwrap();
      dispatch(fetchMyHome());
    } catch (err) {
      alertToast(dispatch, String(err || 'Could not update the picture'));
    }
  };

  return (
    <Overlay
      open={open}
      onClose={close}
      kind="modal"
      width={520}
      title="Edit profile"
      footer={
        <>
          <button type="button" className="mh-btn outline" onClick={close}>
            Cancel
          </button>
          <button type="button" className="mh-btn primary" disabled={!valid || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <ProfilePictureUpload value={p.profilePicture} name={p.name} onChange={saveAvatar} size={80} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div>
          <label htmlFor="mh-p-first" className="mh-label">First name</label>
          <input id="mh-p-first" className="mh-input" value={form.firstName} onChange={set('firstName')} data-autofocus />
        </div>
        <div>
          <label htmlFor="mh-p-last" className="mh-label">Last name</label>
          <input id="mh-p-last" className="mh-input" value={form.lastName} onChange={set('lastName')} />
        </div>
        <div>
          <label htmlFor="mh-p-pos" className="mh-label">Job title</label>
          <input id="mh-p-pos" className="mh-input" value={form.position} onChange={set('position')} />
        </div>
        <div>
          <label htmlFor="mh-p-phone" className="mh-label">Phone</label>
          <input id="mh-p-phone" className="mh-input" value={form.phone} onChange={set('phone')} aria-invalid={!phoneOk} />
          {!phoneOk && <p className="mh-meta" style={{ color: 'var(--danger-text)' }}>10–15 digits</p>}
        </div>
        <div>
          <label htmlFor="mh-p-office" className="mh-label">Office</label>
          <input id="mh-p-office" className="mh-input" maxLength={100} value={form.office} onChange={set('office')} />
        </div>
        <div>
          <label htmlFor="mh-p-avail" className="mh-label">Availability</label>
          <select id="mh-p-avail" className="mh-select" value={form.availability} onChange={set('availability')}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
            <option value="on_leave">On leave</option>
          </select>
        </div>
      </div>
      <div className="mh-field" style={{ marginTop: 12 }}>
        <label htmlFor="mh-p-skills" className="mh-label">Skills (comma separated)</label>
        <input id="mh-p-skills" className="mh-input" value={form.skills} onChange={set('skills')} />
      </div>
      <p className="mh-meta" style={{ marginTop: 12 }}>
        Email, employee ID, team and manager are kept by HR. <Link to="/change-password">Change password</Link>
      </p>
    </Overlay>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────

const alertToast = (dispatch: ReturnType<typeof useAppDispatch>, text: string) => dispatch(showToast({ text, tone: 'error' }));

export function Toast() {
  const dispatch = useAppDispatch();
  const toast = useAppSelector((s) => s.myHome.ui.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(clearToast(toast.id)), toast.tone === 'error' ? 4000 : 2400);
    return () => clearTimeout(t);
  }, [toast, dispatch]);
  return (
    <div className="mh mh-portal" aria-live="polite">
      {toast && (
        <div className={toast.tone === 'error' ? 'mh-toast error' : 'mh-toast'} role="status">
          <span className="ic" aria-hidden="true">
            {toast.tone === 'error' ? <AlertTriangle size={14} /> : <Check size={14} strokeWidth={3} />}
          </span>
          {toast.text}
        </div>
      )}
    </div>
  );
}

