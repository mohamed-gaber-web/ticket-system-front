import { ArrowDownRight, ArrowUpRight, Clock, GaugeCircle, PieChart, Plane, type LucideIcon } from 'lucide-react';
import { shortDate } from '@/lib/myHome';
import type { MyHomeData } from '@/types/myHome.types';
import { Bar, Card, Pill } from './ui';

function KpiLabel({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div className="label">{children}</div>
      <span className="mh-head-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
    </div>
  );
}

function Ring({ pct, size = 76 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const shown = Math.min(100, Math.max(0, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pct}% billable`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(shown / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="600" fontSize="16" fill="var(--text)">
        {pct}%
      </text>
    </svg>
  );
}

export default function KpiTiles({ data }: { data: MyHomeData }) {
  const { hours, utilization, rating, leave } = data.kpis;
  const pace = hours.paceText;
  const delta = rating.deltaVsPrev;
  return (
    <div className="mh-grid mh-grid-kpi">
      <Card className="mh-kpi">
        <div>
          <KpiLabel icon={Clock}>Hours this month</KpiLabel>
          <div className="big mono">
            {hours.logged}
            <small> / {hours.target}h</small>
          </div>
          <Bar value={hours.logged} max={hours.target} style={{ margin: '12px 0 8px' }} label={`${hours.pct}% of the monthly target`} />
          <div className="mh-meta">
            {hours.pct}% of target ·{' '}
            <Pill tone={pace === 'Behind' ? 'warn' : 'ok'}>{pace}</Pill>
          </div>
        </div>
      </Card>
      <Card className="mh-kpi">
        <KpiLabel icon={PieChart}>Billable utilization</KpiLabel>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Ring pct={utilization.pct} />
          <div>
            <div className="mh-meta mono">
              {utilization.billable}h client · {utilization.internal}h internal
            </div>
            <div className="mh-meta">Target {utilization.target}%</div>
          </div>
        </div>
      </Card>
      <Card className="mh-kpi">
        <div>
          <KpiLabel icon={GaugeCircle}>Performance score YTD</KpiLabel>
          <div className="big mono">
            {rating.ytd ?? '—'}
            <small> / {rating.outOf}</small>
          </div>
          <div style={{ marginTop: 10 }}>
            {delta === null ? (
              <span className="mh-meta">No previous month to compare</span>
            ) : (
              <Pill tone={delta >= 0 ? 'ok' : 'danger'}>
                {delta >= 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                {delta >= 0 ? '+' : ''}
                {delta} vs last month
              </Pill>
            )}
          </div>
        </div>
      </Card>
      <Card className="mh-kpi">
        <div>
          <KpiLabel icon={Plane}>Vacation balance</KpiLabel>
          <div className="big mono">
            {leave.daysLeft}
            <small> days left</small>
          </div>
          <div className="mh-meta" style={{ marginTop: 10 }}>
            {leave.next ? (
              <>
                Next: {shortDate(leave.next.from)} – {shortDate(leave.next.to)}{' '}
                <Pill tone={leave.next.status === 'approved' ? 'ok' : 'warn'}>{leave.next.status === 'approved' ? 'Approved' : 'Pending'}</Pill>
              </>
            ) : (
              'No upcoming leave'
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
