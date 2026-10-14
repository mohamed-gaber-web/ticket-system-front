import { Bell, GaugeCircle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { relativeTime } from '@/lib/myHome';
import type { MyHomeData } from '@/types/myHome.types';
import { Bar, Card, CardHead, Empty } from './ui';

export function ModulesPanel({ data }: { data: MyHomeData }) {
  return (
    <Card labelledBy="mh-modules-title">
      <CardHead id="mh-modules-title" icon={Layers} title="Tickets by module" sub="This year">
        <div className="mh-meta" style={{ display: 'flex', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="mh-dot" style={{ background: 'var(--primary)' }} aria-hidden="true" /> Closed
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className="mh-dot" style={{ background: 'var(--open-bar)' }} aria-hidden="true" /> Open
          </span>
        </div>
      </CardHead>
      {data.modules.length === 0 ? (
        <Empty>No tickets this year yet.</Empty>
      ) : (
        <ul className="mh-list">
          {data.modules.map((m) => {
            const total = m.closed + m.open || 1;
            return (
              <li key={m.name} style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                  <span className="mh-meta">
                    {m.closed} closed · {m.open} open
                  </span>
                </div>
                <div className="mh-bar stack" style={{ marginTop: 6 }} role="img" aria-label={`${m.closed} closed, ${m.open} open`}>
                  <span style={{ width: `${(m.closed / total) * 100}%`, background: 'var(--primary)' }} />
                  <span style={{ width: `${(m.open / total) * 100}%`, background: 'var(--open-bar)' }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const W = 280;
const H = 90;

export function PerformancePanel({ data }: { data: MyHomeData }) {
  const { trend, criteria, latestClientComment: quote } = data.performance;
  const points = trend.map((p, i) => ({ ...p, x: 20 + (i * (W - 40)) / Math.max(1, trend.length - 1) }));
  const y = (v: number) => H - 12 - (Math.max(0, Math.min(100, v)) / 100) * (H - 24);
  const drawn = points.filter((p) => p.value !== null);
  return (
    <Card id="performance" labelledBy="mh-perf-title">
      <CardHead id="mh-perf-title" icon={GaugeCircle} title="Performance" sub="Monthly evaluation score out of 100">
        <Link to="/consultants/evaluation/me" className="mh-btn ghost sm">
          Details
        </Link>
      </CardHead>
      <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label={`Score trend: ${trend.map((p) => `${p.label} ${p.value ?? 'no data'}`).join(', ')}`}>
        <line x1="10" x2={W - 10} y1={H - 12} y2={H - 12} stroke="var(--border)" />
        {drawn.length > 1 && (
          <polyline fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" points={drawn.map((p) => `${p.x},${y(p.value!)}`).join(' ')} />
        )}
        {drawn.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={y(p.value!)} r="4" fill="var(--bg-card)" stroke="var(--primary)" strokeWidth="2" />
            <text x={p.x} y={y(p.value!) - 9} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-2)">
              {p.value}
            </text>
          </g>
        ))}
        {points.map((p) => (
          <text key={`l-${p.label}`} x={p.x} y={H + 12} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-muted)">
            {p.label}
          </text>
        ))}
      </svg>
      {criteria.length > 0 && (
        <ul className="mh-list" style={{ marginTop: 8 }}>
          {criteria.map((c) => (
            <li key={c.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) 1fr 36px', gap: 10, alignItems: 'center', padding: '5px 0', fontSize: 12.5 }}>
              <span className="mh-ellipsis" title={c.label}>
                {c.label}
              </span>
              <Bar value={c.score} over={c.score < 84} />
              <span className="mono" style={{ textAlign: 'right' }}>
                {c.score}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {quote && (
        <figure className="mh-quote">
          <blockquote style={{ margin: 0, fontSize: 13.5 }}>&ldquo;{quote.text}&rdquo;</blockquote>
          <figcaption className="mh-meta" style={{ marginTop: 6 }}>
            {quote.clientName} · <span className="mh-code">{quote.ticketCode}</span>
            {quote.score != null && <> · {quote.score}/5</>}
          </figcaption>
        </figure>
      )}
    </Card>
  );
}

const ACTIVITY_COLOR: Record<string, string> = {
  ticket_email_reply: '#2a6fdb',
  lead_email_reply: '#2a6fdb',
  sla_alert: 'var(--over)',
  sla_breach: 'var(--over)',
  vacation_request: 'var(--primary)',
  excuse_request: 'var(--primary)',
  ticket_assigned: 'var(--purple-text)',
  ticket_reassigned: 'var(--purple-text)',
};

export function ActivityPanel({ data }: { data: MyHomeData }) {
  return (
    <Card labelledBy="mh-activity-title">
      <CardHead id="mh-activity-title" icon={Bell} title="Recent activity" />
      {data.activity.length === 0 ? (
        <Empty>Nothing new.</Empty>
      ) : (
        <ol className="mh-list">
          {data.activity.map((a) => (
            <li key={a.id} className="mh-row" style={{ alignItems: 'flex-start', padding: '10px 2px' }}>
              <span className="mh-dot" style={{ background: ACTIVITY_COLOR[a.type] ?? 'var(--prio-medium)', marginTop: 6 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                {a.ticketId ? <Link to={`/tickets/view/${a.ticketId}`}>{a.text}</Link> : a.leadId ? <Link to={`/tele-sales/leads/${a.leadId}`}>{a.text}</Link> : a.text}
                <div className="mh-meta">{relativeTime(a.createdAt)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
