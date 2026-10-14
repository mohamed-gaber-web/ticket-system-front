import { Clock, Pencil } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { openLogTime, openModal, openTicket } from '@/redux/slices/myHomeSlice';
import { getAvatarUrl } from '@/lib/avatar';
import { greetingFor, hourIn, keyToDate, longDate, scrollToSection } from '@/lib/myHome';
import type { MyHomeData } from '@/types/myHome.types';
import { selectCounts, selectStartWith } from '../selectors';
import { Card } from './ui';

const AVAILABILITY: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: '#2f9e6a' },
  busy: { label: 'Busy', color: '#d9541e' },
  away: { label: 'Away', color: '#e0a82c' },
  on_leave: { label: 'On leave', color: '#7e8c85' },
};

function Tile({ n, label, target, alert, sub }: { n: number; label: string; target: string; alert?: boolean; sub?: string }) {
  return (
    <a
      href={`#${target}`}
      className={alert && n > 0 ? 'mh-tile alert' : 'mh-tile'}
      onClick={(e) => {
        e.preventDefault();
        scrollToSection(target);
      }}
    >
      <div className="n">{n}</div>
      <div className="l">{label}</div>
      {sub && <div className="l" style={{ color: '#ffd9c9' }}>{sub}</div>}
    </a>
  );
}

export function FocusHero({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const counts = useAppSelector(selectCounts)!;
  const start = useAppSelector(selectStartWith);
  const today = keyToDate(data.today);
  const dateLine = `${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} · Week ${data.weekNumber}`;
  const workTarget = data.profile.hasTickets || data.tickets.length > 0 ? 'work' : 'tasks';
  const sla = start ? start.slaText ?? (start.isOverdue ? 'overdue' : null) : null;

  return (
    <section className="mh-hero" aria-labelledby="mh-greeting" id="top">
      <div className="mh-hero-top">
        <div>
          <div className="date">{dateLine}</div>
          <h1 id="mh-greeting">
            {greetingFor(hourIn(data.timezone))}, {data.profile.firstName || data.profile.name}
          </h1>
          <div className="date">Here&apos;s what needs you first today.</div>
        </div>
        {data.profile.hasTickets && (
          <div>
            <button type="button" className="mh-btn light" onClick={() => dispatch(openLogTime({ ticketId: null }))}>
              <Clock size={16} aria-hidden="true" /> Log time
            </button>
          </div>
        )}
      </div>
      <div className="mh-tiles">
        <Tile n={counts.overdue} label="Overdue" target={workTarget} alert />
        <Tile n={counts.dueToday} label="Due today" target={workTarget} />
        <Tile
          n={counts.emailsToReply}
          label="Emails to reply"
          target="emails"
          sub={counts.emailsLate ? `${counts.emailsLate} past ${data.config.emailSlaHours}h SLA` : undefined}
        />
        {data.profile.isTelesales && <Tile n={counts.followUpsDue} label="Follow-ups" target="telesales" />}
      </div>
      {start && (
        <div className="mh-start">
          <span className="k">START WITH</span>
          <div className="t">
            <span className="mh-code">{start.code}</span> · {start.title}
            <div className="mh-meta">
              {start.clientName || 'Internal'}
              {sla && (
                <>
                  {' · '}
                  <span className="sla">{sla}</span>
                </>
              )}
            </div>
          </div>
          <button type="button" className="mh-btn primary" onClick={() => dispatch(openTicket(start.id))}>
            Open ticket
          </button>
        </div>
      )}
    </section>
  );
}

export function ProfileCard({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const p = data.profile;
  const avail = AVAILABILITY[p.availability] ?? AVAILABILITY.available;
  const avatar = getAvatarUrl(p.profilePicture);
  return (
    <Card className="mh-profile" labelledBy="mh-profile-name">
      <div className="head">
        <div className="mh-avatar">{avatar ? <img src={avatar} alt="" /> : p.initials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="mh-h2" id="mh-profile-name">
            {p.name}
          </h2>
          <div className="mh-meta">{p.jobTitle || '—'}</div>
          <div className="mh-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span className="mh-dot" style={{ background: avail.color }} aria-hidden="true" />
            {avail.label}
            {p.office && <> · {p.office}</>}
          </div>
        </div>
        <button
          type="button"
          className="mh-icon-btn"
          aria-label="Edit profile"
          onClick={() => dispatch(openModal({ modal: 'profile', open: true }))}
        >
          <Pencil size={16} />
        </button>
      </div>
      <dl className="mh-dl">
        <div>
          <dt>Employee ID</dt>
          <dd className="mono">{p.employeeCode || '—'}</dd>
        </div>
        <div>
          <dt>Team</dt>
          <dd>{p.team || '—'}</dd>
        </div>
        <div>
          <dt>Reports to</dt>
          <dd>{p.manager?.name || '—'}</dd>
        </div>
        <div>
          <dt>Joined</dt>
          <dd>{longDate(p.joinedAt)}</dd>
        </div>
      </dl>
      {p.skills.length > 0 && (
        <div aria-label="Skills">
          {p.skills.map((s) => (
            <span key={s} className="mh-skill">
              {s}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
